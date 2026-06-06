import {getDatabase} from '../db/database';
import {
  Tables,
  BillColumns as B,
  BillItemColumns as BI,
} from '../db/schema';
import {calculateBillTotals} from '../services/GstService';
import type {BillType} from '../constants/gst';
import type {Bill, BillItem, NewBillInput} from '../models/Bill';
import type {IBillRepository} from './IBillRepository';

/**
 * op-sqlite implementation of IBillRepository. Only place that knows bill SQL.
 */
class BillRepository implements IBillRepository {
  private rowToBill(row: any): Bill {
    return {
      id: Number(row[B.id]),
      billNumber: Number(row[B.billNumber]),
      customerName: row[B.customerName] ?? null,
      customerPhone: row[B.customerPhone] ?? null,
      subtotal: Number(row[B.subtotal]),
      total: Number(row[B.total]),
      createdAt: Number(row[B.createdAt]),
      // GST fields. Older (pre-GST) rows read back via column defaults.
      billType: (row[B.billType] ?? 'simple') as BillType,
      customerGstin: row[B.customerGstin] ?? null,
      customerState: row[B.customerState] ?? null,
      customerStateCode: row[B.customerStateCode] ?? null,
      isInterState: Number(row[B.isInterState] ?? 0) === 1,
      cgst: Number(row[B.cgst] ?? 0),
      sgst: Number(row[B.sgst] ?? 0),
      igst: Number(row[B.igst] ?? 0),
    };
  }

  private rowToBillItem(row: any): BillItem {
    return {
      id: Number(row[BI.id]),
      billId: Number(row[BI.billId]),
      productId: row[BI.productId] != null ? Number(row[BI.productId]) : null,
      name: String(row[BI.name]),
      price: Number(row[BI.price]),
      quantity: Number(row[BI.quantity]),
      lineTotal: Number(row[BI.lineTotal]),
      gstRate: Number(row[BI.gstRate] ?? 0),
      hsnCode: row[BI.hsnCode] ?? null,
      gstAmount: Number(row[BI.gstAmount] ?? 0),
    };
  }

  async create(input: NewBillInput): Promise<Bill> {
    if (input.items.length === 0) {
      throw new Error('Cannot save a bill with an empty cart');
    }

    const db = await getDatabase();

    // Normalise the GST inputs. A simple bill carries no customer GST identity
    // and no tax; this keeps the pre-GST behaviour exactly when billType isn't 'gst'.
    const billType: BillType = input.billType === 'gst' ? 'gst' : 'simple';
    const isGstBill = billType === 'gst';
    const shopStateCode = input.shopStateCode ?? null;
    const customerStateCode = isGstBill ? input.customerStateCode ?? null : null;
    const customerState = isGstBill ? input.customerState ?? null : null;
    const customerGstin = isGstBill
      ? input.customerGstin?.trim() || null
      : null;

    // All tax maths happens in the pure service-layer calculator.
    const totals = calculateBillTotals(
      input.items,
      shopStateCode,
      customerStateCode,
      isGstBill,
    );

    const createdAt = Date.now();
    const customerName = input.customerName?.trim() || null;
    const customerPhone = input.customerPhone?.trim() || null;

    let savedBill: Bill | null = null;

    // Bill header + all items are written atomically: a failure rolls back so
    // we never store a bill without its items.
    await db.transaction(async tx => {
      // Sequential, unique bill number (a GST invoicing requirement).
      const numRes = await tx.execute(
        `SELECT COALESCE(MAX(${B.billNumber}), 0) + 1 AS next FROM ${Tables.bills};`,
      );
      const billNumber = Number(numRes.rows?.[0]?.next ?? 1);

      const billRes = await tx.execute(
        `INSERT INTO ${Tables.bills}
           (${B.billNumber}, ${B.customerName}, ${B.customerPhone},
            ${B.subtotal}, ${B.total}, ${B.createdAt},
            ${B.billType}, ${B.customerGstin}, ${B.customerState},
            ${B.customerStateCode}, ${B.isInterState},
            ${B.cgst}, ${B.sgst}, ${B.igst})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          billNumber,
          customerName,
          customerPhone,
          totals.subtotal,
          totals.total,
          createdAt,
          billType,
          customerGstin,
          customerState,
          customerStateCode,
          totals.isInterState ? 1 : 0,
          totals.cgst,
          totals.sgst,
          totals.igst,
        ],
      );
      const billId = Number(billRes.insertId);

      const items: BillItem[] = [];
      for (let i = 0; i < input.items.length; i++) {
        const ci = input.items[i];
        const line = totals.lines[i];
        const gstRate = isGstBill ? ci.gstRate || 0 : 0;
        const itemRes = await tx.execute(
          `INSERT INTO ${Tables.billItems}
             (${BI.billId}, ${BI.productId}, ${BI.name}, ${BI.price},
              ${BI.quantity}, ${BI.lineTotal}, ${BI.gstRate}, ${BI.hsnCode},
              ${BI.gstAmount})
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            billId,
            ci.productId,
            ci.name,
            ci.price,
            ci.quantity,
            line.taxableValue,
            gstRate,
            ci.hsnCode ?? null,
            line.gstAmount,
          ],
        );
        items.push({
          id: Number(itemRes.insertId),
          billId,
          productId: ci.productId,
          name: ci.name,
          price: ci.price,
          quantity: ci.quantity,
          lineTotal: line.taxableValue,
          gstRate,
          hsnCode: ci.hsnCode ?? null,
          gstAmount: line.gstAmount,
        });
      }

      savedBill = {
        id: billId,
        billNumber,
        customerName,
        customerPhone,
        subtotal: totals.subtotal,
        total: totals.total,
        createdAt,
        billType,
        customerGstin,
        customerState,
        customerStateCode,
        isInterState: totals.isInterState,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        items,
      };
    });

    // savedBill is always set if the transaction committed.
    return savedBill!;
  }

  async getAll(): Promise<Bill[]> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT * FROM ${Tables.bills} ORDER BY ${B.createdAt} DESC;`,
    );
    return (res.rows ?? []).map(r => this.rowToBill(r));
  }

  async getById(id: number): Promise<Bill | null> {
    const db = await getDatabase();
    const billRes = await db.execute(
      `SELECT * FROM ${Tables.bills} WHERE ${B.id} = ? LIMIT 1;`,
      [id],
    );
    const rows = billRes.rows ?? [];
    if (rows.length === 0) {
      return null;
    }
    const bill = this.rowToBill(rows[0]);

    const itemsRes = await db.execute(
      `SELECT * FROM ${Tables.billItems} WHERE ${BI.billId} = ? ORDER BY ${BI.id} ASC;`,
      [id],
    );
    bill.items = (itemsRes.rows ?? []).map(r => this.rowToBillItem(r));
    return bill;
  }
}

/** Shared instance used across the app. */
export const billRepository: IBillRepository = new BillRepository();
