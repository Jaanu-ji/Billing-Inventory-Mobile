import {getDatabase} from '../db/database';
import {Tables, ParkedBillColumns as PB} from '../db/schema';
import type {CartItem} from '../models/Bill';
import type {ParkedBill, NewParkedBillInput} from '../models/ParkedBill';
import type {IParkedBillRepository} from './IParkedBillRepository';
import {SyncQueue} from '../services/sync/SyncQueue';

/**
 * op-sqlite implementation of IParkedBillRepository (Phase G). The cart is
 * stored as a JSON blob; a corrupt/unparseable row degrades to an empty cart
 * rather than throwing, so the parked list always renders.
 */
class ParkedBillRepository implements IParkedBillRepository {
  private rowTo(row: any): ParkedBill {
    let items: CartItem[] = [];
    try {
      const parsed = JSON.parse(String(row[PB.itemsJson] ?? '[]'));
      if (Array.isArray(parsed)) {
        items = parsed as CartItem[];
      }
    } catch {
      items = [];
    }
    return {
      id: Number(row[PB.id]),
      label: String(row[PB.label] ?? 'Walk-in'),
      itemCount: Number(row[PB.itemCount] ?? 0),
      total: Number(row[PB.total] ?? 0),
      items,
      createdAt: Number(row[PB.createdAt]),
    };
  }

  async park(input: NewParkedBillInput): Promise<ParkedBill> {
    const db = await getDatabase();
    const now = Date.now();
    const items = input.items;
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const itemsJson = JSON.stringify(items);

    const res = await db.execute(
      `INSERT INTO ${Tables.parkedBills}
         (${PB.label}, ${PB.itemCount}, ${PB.total}, ${PB.itemsJson}, ${PB.createdAt})
       VALUES (?, ?, ?, ?, ?);`,
      [input.label, itemCount, total, itemsJson, now],
    );
    const id = Number(res.insertId);
    SyncQueue.upsert('parked_bills', id);
    return {
      id,
      label: input.label,
      itemCount,
      total,
      items,
      createdAt: now,
    };
  }

  async getAll(): Promise<ParkedBill[]> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT * FROM ${Tables.parkedBills} ORDER BY ${PB.createdAt} DESC;`,
    );
    return (res.rows ?? []).map(r => this.rowTo(r));
  }

  async resume(id: number): Promise<ParkedBill | null> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT * FROM ${Tables.parkedBills} WHERE ${PB.id} = ? LIMIT 1;`,
      [id],
    );
    const rows = res.rows ?? [];
    if (rows.length === 0) {
      return null;
    }
    const parked = this.rowTo(rows[0]);
    await db.execute(`DELETE FROM ${Tables.parkedBills} WHERE ${PB.id} = ?;`, [id]);
    SyncQueue.remove('parked_bills', id);
    return parked;
  }

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM ${Tables.parkedBills} WHERE ${PB.id} = ?;`, [id]);
    SyncQueue.remove('parked_bills', id);
  }
}

/** Shared instance used across the app. */
export const parkedBillRepository: IParkedBillRepository = new ParkedBillRepository();
