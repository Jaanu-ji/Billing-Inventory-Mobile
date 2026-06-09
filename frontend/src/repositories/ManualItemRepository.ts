import {getDatabase} from '../db/database';
import {Tables, ManualItemColumns as MI} from '../db/schema';
import type {ManualItem, NewManualItemInput} from '../models/ManualItem';
import type {IManualItemRepository} from './IManualItemRepository';
import {SyncQueue} from '../services/sync/SyncQueue';

/**
 * op-sqlite implementation of IManualItemRepository (Phase C3). Only place that
 * knows manual_items SQL.
 */
class ManualItemRepository implements IManualItemRepository {
  private rowTo(row: any): ManualItem {
    return {
      id: Number(row[MI.id]),
      name: String(row[MI.name]),
      price: Number(row[MI.price]),
      hsnCode: row[MI.hsnCode] ?? null,
      gstRate: Number(row[MI.gstRate] ?? 0),
      unit: row[MI.unit] ?? 'pcs',
      createdAt: Number(row[MI.createdAt]),
      updatedAt: Number(row[MI.updatedAt]),
    };
  }

  async getAll(): Promise<ManualItem[]> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT * FROM ${Tables.manualItems} ORDER BY ${MI.updatedAt} DESC;`,
    );
    return (res.rows ?? []).map(r => this.rowTo(r));
  }

  async upsert(input: NewManualItemInput): Promise<ManualItem> {
    const db = await getDatabase();
    const now = Date.now();
    const name = input.name.trim();

    // Reuse the same row when the name already exists (case-insensitive).
    const existingRes = await db.execute(
      `SELECT * FROM ${Tables.manualItems}
        WHERE LOWER(${MI.name}) = LOWER(?) LIMIT 1;`,
      [name],
    );
    const existing = (existingRes.rows ?? [])[0];

    // When the shop isn't billing GST the caller omits hsnCode/gstRate
    // (undefined). Don't clobber a previously-saved code/rate with null/0 —
    // preserve the existing values so they survive a GST-off re-save.
    const hsnCode =
      input.hsnCode !== undefined
        ? input.hsnCode?.trim() || null
        : ((existing?.[MI.hsnCode] as string | null | undefined) ?? null);
    const gstRate =
      input.gstRate !== undefined
        ? input.gstRate
        : Number(existing?.[MI.gstRate] ?? 0);
    // Unit isn't GST-gated (always known from the modal), but preserve the
    // existing value if a caller omits it, mirroring hsnCode/gstRate.
    const unit =
      input.unit !== undefined
        ? input.unit || 'pcs'
        : ((existing?.[MI.unit] as string | undefined) ?? 'pcs');

    if (existing) {
      const id = Number(existing[MI.id]);
      await db.execute(
        `UPDATE ${Tables.manualItems} SET
           ${MI.name} = ?, ${MI.price} = ?, ${MI.hsnCode} = ?,
           ${MI.gstRate} = ?, ${MI.unit} = ?, ${MI.updatedAt} = ?
         WHERE ${MI.id} = ?;`,
        [name, input.price, hsnCode, gstRate, unit, now, id],
      );
      SyncQueue.upsert('manual_items', id);
      return {
        id,
        name,
        price: input.price,
        hsnCode,
        gstRate,
        unit,
        createdAt: Number(existing[MI.createdAt]),
        updatedAt: now,
      };
    }

    const res = await db.execute(
      `INSERT INTO ${Tables.manualItems}
         (${MI.name}, ${MI.price}, ${MI.hsnCode}, ${MI.gstRate}, ${MI.unit},
          ${MI.createdAt}, ${MI.updatedAt})
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [name, input.price, hsnCode, gstRate, unit, now, now],
    );
    const id = Number(res.insertId);
    SyncQueue.upsert('manual_items', id);
    return {
      id,
      name,
      price: input.price,
      hsnCode,
      gstRate,
      unit,
      createdAt: now,
      updatedAt: now,
    };
  }

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM ${Tables.manualItems} WHERE ${MI.id} = ?;`, [id]);
    SyncQueue.remove('manual_items', id);
  }
}

/** Shared instance used across the app. */
export const manualItemRepository: IManualItemRepository = new ManualItemRepository();
