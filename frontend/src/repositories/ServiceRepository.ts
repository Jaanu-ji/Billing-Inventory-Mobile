import {getDatabase} from '../db/database';
import {Tables, ServiceColumns as SV} from '../db/schema';
import type {SavedService, NewServiceInput} from '../models/Service';
import type {IServiceRepository} from './IServiceRepository';
import {SyncQueue} from '../services/sync/SyncQueue';

/**
 * op-sqlite implementation of IServiceRepository (Phase C4). Only place that
 * knows services SQL.
 */
class ServiceRepository implements IServiceRepository {
  private rowTo(row: any): SavedService {
    return {
      id: Number(row[SV.id]),
      name: String(row[SV.name]),
      price: Number(row[SV.price]),
      sacCode: row[SV.sacCode] ?? null,
      gstRate: Number(row[SV.gstRate] ?? 0),
      createdAt: Number(row[SV.createdAt]),
      updatedAt: Number(row[SV.updatedAt]),
    };
  }

  async getAll(): Promise<SavedService[]> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT * FROM ${Tables.services} ORDER BY ${SV.updatedAt} DESC;`,
    );
    return (res.rows ?? []).map(r => this.rowTo(r));
  }

  async upsert(input: NewServiceInput): Promise<SavedService> {
    const db = await getDatabase();
    const now = Date.now();
    const name = input.name.trim();

    const existingRes = await db.execute(
      `SELECT * FROM ${Tables.services}
        WHERE LOWER(${SV.name}) = LOWER(?) LIMIT 1;`,
      [name],
    );
    const existing = (existingRes.rows ?? [])[0];

    // When the shop isn't billing GST the caller omits sacCode/gstRate
    // (undefined). Don't clobber a previously-saved code/rate with null/0 —
    // preserve the existing values so they survive a GST-off re-save.
    const sacCode =
      input.sacCode !== undefined
        ? input.sacCode?.trim() || null
        : ((existing?.[SV.sacCode] as string | null | undefined) ?? null);
    const gstRate =
      input.gstRate !== undefined
        ? input.gstRate
        : Number(existing?.[SV.gstRate] ?? 0);

    if (existing) {
      const id = Number(existing[SV.id]);
      await db.execute(
        `UPDATE ${Tables.services} SET
           ${SV.name} = ?, ${SV.price} = ?, ${SV.sacCode} = ?,
           ${SV.gstRate} = ?, ${SV.updatedAt} = ?
         WHERE ${SV.id} = ?;`,
        [name, input.price, sacCode, gstRate, now, id],
      );
      SyncQueue.upsert('services', id);
      return {
        id,
        name,
        price: input.price,
        sacCode,
        gstRate,
        createdAt: Number(existing[SV.createdAt]),
        updatedAt: now,
      };
    }

    const res = await db.execute(
      `INSERT INTO ${Tables.services}
         (${SV.name}, ${SV.price}, ${SV.sacCode}, ${SV.gstRate},
          ${SV.createdAt}, ${SV.updatedAt})
       VALUES (?, ?, ?, ?, ?, ?);`,
      [name, input.price, sacCode, gstRate, now, now],
    );
    const id = Number(res.insertId);
    SyncQueue.upsert('services', id);
    return {
      id,
      name,
      price: input.price,
      sacCode,
      gstRate,
      createdAt: now,
      updatedAt: now,
    };
  }

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM ${Tables.services} WHERE ${SV.id} = ?;`, [id]);
    SyncQueue.remove('services', id);
  }
}

/** Shared instance used across the app. */
export const serviceRepository: IServiceRepository = new ServiceRepository();
