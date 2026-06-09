import {getDatabase} from '../db/database';
import {
  Tables,
  BillColumns as B,
  BillItemColumns as BI,
} from '../db/schema';
import {calculateBillTotals} from '../services/GstService';
import type {BillType} from '../constants/gst';
import type {PaymentMode, PaymentStatus} from '../constants/payments';
import type {Bill, BillItem, BillSummary, ItemKind, NewBillInput} from '../models/Bill';
import type {IBillRepository} from './IBillRepository';
import {SyncQueue} from '../services/sync/SyncQueue';

/**
 * op-sqlite implementation of IBillRepository. Only place that knows bill SQL.
 */
class BillRepository implements IBillRepository {
  /** Parse the bill line's attributes JSON; bad/old values degrade to {}. */
  private parseAttributes(raw: unknown): Record<string, string> {
    if (typeof raw !== 'string' || raw.length === 0) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, string>)
        : {};
    } catch {
      return {};
    }
  }

  /** Serialise attributes for storage; empty => null (no blob). */
  private serialiseAttributes(attrs?: Record<string, string>): string | null {
    if (!attrs) {
      return null;
    }
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(attrs)) {
      const t = typeof v === 'string' ? v.trim() : '';
      if (t) {
        cleaned[k] = t;
      }
    }
    return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null;
  }

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
      // Discount + round-off (Phase G). Pre-G bills read back as 0.
      discount: Number(row[B.discount] ?? 0),
      roundOff: Number(row[B.roundOff] ?? 0),
      // Payments (Phase F). Pre-F bills read back as paid, no mode, no customer.
      paymentStatus: (row[B.paymentStatus] ?? 'paid') as PaymentStatus,
      paymentMode: (row[B.paymentMode] ?? null) as PaymentMode | null,
      customerId: row[B.customerId] != null ? Number(row[B.customerId]) : null,
    };
  }

  private rowToBillItem(row: any): BillItem {
    return {
      id: Number(row[BI.id]),
      billId: Number(row[BI.billId]),
      productId: row[BI.productId] != null ? Number(row[BI.productId]) : null,
      // Pre-C3 rows read back as 'product' via the column default.
      kind: (row[BI.itemKind] ?? 'product') as ItemKind,
      name: String(row[BI.name]),
      price: Number(row[BI.price]),
      quantity: Number(row[BI.quantity]),
      // Pre-units rows (pre-v9) read back as 'pcs' via the column default.
      unit: row[BI.unit] ?? 'pcs',
      lineTotal: Number(row[BI.lineTotal]),
      gstRate: Number(row[BI.gstRate] ?? 0),
      hsnCode: row[BI.hsnCode] ?? null,
      sacCode: row[BI.sacCode] ?? null,
      gstAmount: Number(row[BI.gstAmount] ?? 0),
      // Pre-v16 rows read back null => {} (no attributes).
      attributes: this.parseAttributes(row[BI.attributes]),
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

    // All tax + adjustment maths happens in the pure service-layer calculator.
    const totals = calculateBillTotals(
      input.items,
      shopStateCode,
      customerStateCode,
      isGstBill,
      {
        discountType: input.discountType,
        discountValue: input.discountValue,
        roundOff: input.roundOff,
      },
    );

    const createdAt = Date.now();
    const customerName = input.customerName?.trim() || null;
    const customerPhone = input.customerPhone?.trim() || null;

    // Payments (Phase F). An unpaid (udhaar) bill carries no mode; a paid bill
    // keeps whichever mode was chosen (cash/upi/card), if any.
    const paymentStatus: PaymentStatus =
      input.paymentStatus === 'unpaid' ? 'unpaid' : 'paid';
    const paymentMode: PaymentMode | null =
      paymentStatus === 'paid' ? input.paymentMode ?? null : null;
    const customerId = input.customerId ?? null;

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
            ${B.cgst}, ${B.sgst}, ${B.igst},
            ${B.discount}, ${B.roundOff},
            ${B.paymentStatus}, ${B.paymentMode}, ${B.customerId})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
          totals.discount,
          totals.roundOff,
          paymentStatus,
          paymentMode,
          customerId,
        ],
      );
      const billId = Number(billRes.insertId);

      const items: BillItem[] = [];
      for (let i = 0; i < input.items.length; i++) {
        const ci = input.items[i];
        const line = totals.lines[i];
        const gstRate = isGstBill ? ci.gstRate || 0 : 0;
        const kind: ItemKind = ci.kind ?? 'product';
        // One code field on the cart line routes to HSN (goods) or SAC (service).
        const code = ci.hsnCode ?? null;
        const hsnCode = kind === 'service' ? null : code;
        const sacCode = kind === 'service' ? code : null;
        const unit = ci.unit || 'pcs';
        // Snapshot business-adaptive attributes (Phase H) onto the line.
        const attributes = ci.attributes ?? {};
        const attributesJson = this.serialiseAttributes(attributes);
        const itemRes = await tx.execute(
          `INSERT INTO ${Tables.billItems}
             (${BI.billId}, ${BI.productId}, ${BI.itemKind}, ${BI.name},
              ${BI.price}, ${BI.quantity}, ${BI.unit}, ${BI.lineTotal}, ${BI.gstRate},
              ${BI.hsnCode}, ${BI.sacCode}, ${BI.gstAmount}, ${BI.attributes})
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            billId,
            ci.productId,
            kind,
            ci.name,
            ci.price,
            ci.quantity,
            unit,
            line.taxableValue,
            gstRate,
            hsnCode,
            sacCode,
            line.gstAmount,
            attributesJson,
          ],
        );
        items.push({
          id: Number(itemRes.insertId),
          billId,
          productId: ci.productId,
          kind,
          name: ci.name,
          price: ci.price,
          quantity: ci.quantity,
          unit,
          lineTotal: line.taxableValue,
          gstRate,
          hsnCode,
          sacCode,
          gstAmount: line.gstAmount,
          attributes: this.parseAttributes(attributesJson),
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
        discount: totals.discount,
        roundOff: totals.roundOff,
        paymentStatus,
        paymentMode,
        customerId,
        items,
      };
    });

    // savedBill is always set if the transaction committed. Queue the bill and
    // its line items for cloud sync (no-op + cheap when sync is disabled).
    const bill = savedBill!;
    SyncQueue.upsert('bills', bill.id);
    for (const it of bill.items ?? []) {
      SyncQueue.upsert('bill_items', it.id);
    }
    return bill;
  }

  async getAll(): Promise<Bill[]> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT * FROM ${Tables.bills} ORDER BY ${B.createdAt} DESC;`,
    );
    return (res.rows ?? []).map(r => this.rowToBill(r));
  }

  async getRecent(limit: number): Promise<Bill[]> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT * FROM ${Tables.bills} ORDER BY ${B.createdAt} DESC LIMIT ?;`,
      [limit],
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

  async getSummarySince(sinceEpochMs: number): Promise<BillSummary> {
    const db = await getDatabase();
    // One pass: total sales + a paid/unpaid (cash-in vs udhaar) split for the
    // dashboard's "aaj ki sales" hero.
    const res = await db.execute(
      `SELECT
         COUNT(*) AS c,
         COALESCE(SUM(${B.total}), 0) AS t,
         COALESCE(SUM(CASE WHEN ${B.paymentStatus} = 'unpaid' THEN ${B.total} ELSE 0 END), 0) AS u
         FROM ${Tables.bills}
        WHERE ${B.createdAt} >= ?;`,
      [sinceEpochMs],
    );
    const row = res.rows?.[0] ?? {};
    const total = Number(row.t ?? 0);
    const udhaar = Number(row.u ?? 0);
    return {
      count: Number(row.c ?? 0),
      total,
      cashIn: total - udhaar,
      udhaar,
    };
  }

  async getTotalPending(): Promise<number> {
    const db = await getDatabase();
    // All outstanding udhaar across every bill (any date), for the dashboard's
    // "total udhaar pending" card. Derived, never stored.
    const res = await db.execute(
      `SELECT COALESCE(SUM(${B.total}), 0) AS p
         FROM ${Tables.bills}
        WHERE ${B.paymentStatus} = 'unpaid';`,
    );
    return Number(res.rows?.[0]?.p ?? 0);
  }

  async getByCustomer(customerId: number): Promise<Bill[]> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT * FROM ${Tables.bills}
        WHERE ${B.customerId} = ?
        ORDER BY ${B.createdAt} DESC;`,
      [customerId],
    );
    return (res.rows ?? []).map(r => this.rowToBill(r));
  }

  async markPaid(billId: number, mode: PaymentMode | null): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `UPDATE ${Tables.bills}
         SET ${B.paymentStatus} = 'paid', ${B.paymentMode} = ?
       WHERE ${B.id} = ?;`,
      [mode, billId],
    );
    SyncQueue.upsert('bills', billId);
  }

  /** Clear all of a customer's outstanding udhaar in one go (mark-paid-later). */
  async clearUdhaar(
    customerId: number,
    mode: PaymentMode | null,
  ): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `UPDATE ${Tables.bills}
         SET ${B.paymentStatus} = 'paid', ${B.paymentMode} = ?
       WHERE ${B.customerId} = ? AND ${B.paymentStatus} = 'unpaid';`,
      [mode, customerId],
    );
    // Queue all of this customer's bills for sync (upsert is idempotent, so
    // re-queuing the already-paid ones is harmless).
    const theirs = await this.getByCustomer(customerId);
    for (const b of theirs) {
      SyncQueue.upsert('bills', b.id);
    }
  }
}

/** Shared instance used across the app. */
export const billRepository: IBillRepository = new BillRepository();
