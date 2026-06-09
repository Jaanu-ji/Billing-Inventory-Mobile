/**
 * LocalSyncStore — the SQLite side of sync (Phase K).
 *
 * Sync works at the RAW ROW level (snake_case columns), which is exactly how the
 * cloud mirror (backend/schema.sql) is shaped — so no domain mapping is needed.
 *  - `fetchRows`  : read live local rows by id, to PUSH.
 *  - `applyRemote`: write pulled cloud rows into the local table (INSERT OR
 *                   REPLACE on the `id` PK), keeping only the columns the local
 *                   table actually has (cloud-only `user_id`/`updated_at` dropped).
 *
 * The per-table column list is derived straight from db/schema.ts, so it can
 * never drift from the real tables.
 */
import {getDatabase} from '../../db/database';
import {
  Tables,
  ProductColumns,
  BillColumns,
  BillItemColumns,
  ShopProfileColumns,
  ManualItemColumns,
  ServiceColumns,
  CustomerColumns,
  ParkedBillColumns,
} from '../../db/schema';
import type {SyncableTable} from '../../models/Sync';
import type {RemoteRow} from './SyncTransport';

/** Local column names per synced table (snake_case), straight from schema. */
const TABLE_COLUMNS: Record<SyncableTable, string[]> = {
  shop_profile: Object.values(ShopProfileColumns),
  products: Object.values(ProductColumns),
  manual_items: Object.values(ManualItemColumns),
  services: Object.values(ServiceColumns),
  customers: Object.values(CustomerColumns),
  bills: Object.values(BillColumns),
  bill_items: Object.values(BillItemColumns),
  parked_bills: Object.values(ParkedBillColumns),
};

/** Local table name per synced table (all are 1:1 with the Tables map). */
const TABLE_NAME: Record<SyncableTable, string> = {
  shop_profile: Tables.shopProfile,
  products: Tables.products,
  manual_items: Tables.manualItems,
  services: Tables.services,
  customers: Tables.customers,
  bills: Tables.bills,
  bill_items: Tables.billItems,
  parked_bills: Tables.parkedBills,
};

/**
 * Coerce a cloud value into a SQLite-storable scalar: JSON objects (jsonb
 * `attributes`/`items_json`) → TEXT, booleans (gst_enabled/is_inter_state) → 0/1,
 * null/undefined → null, primitives as-is.
 */
function toScalar(v: unknown): string | number | null {
  if (v === null || v === undefined) {
    return null;
  }
  if (typeof v === 'boolean') {
    return v ? 1 : 0;
  }
  if (typeof v === 'object') {
    return JSON.stringify(v);
  }
  if (typeof v === 'number' || typeof v === 'string') {
    return v;
  }
  return String(v);
}

export interface ILocalSyncStore {
  /** Live local rows (raw, snake_case) for the given ids. */
  fetchRows(table: SyncableTable, ids: number[]): Promise<RemoteRow[]>;
  /** Write pulled cloud rows into the local table (upsert by id). */
  applyRemote(table: SyncableTable, rows: RemoteRow[]): Promise<void>;
}

class SqlLocalSyncStore implements ILocalSyncStore {
  async fetchRows(table: SyncableTable, ids: number[]): Promise<RemoteRow[]> {
    if (ids.length === 0) {
      return [];
    }
    const db = await getDatabase();
    const holes = ids.map(() => '?').join(',');
    const res = await db.execute(
      `SELECT * FROM ${TABLE_NAME[table]} WHERE id IN (${holes});`,
      ids,
    );
    return (res.rows ?? []) as RemoteRow[];
  }

  async applyRemote(table: SyncableTable, rows: RemoteRow[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    const db = await getDatabase();
    const cols = TABLE_COLUMNS[table];
    const holes = cols.map(() => '?').join(',');
    for (const row of rows) {
      // Keep only the columns the local table has (drops cloud-only user_id /
      // updated_at), coercing each into a SQLite scalar.
      const values = cols.map(c => toScalar(row[c]));
      await db.execute(
        `INSERT OR REPLACE INTO ${TABLE_NAME[table]} (${cols.join(',')})
         VALUES (${holes});`,
        values,
      );
    }
  }
}

export const localSyncStore: ILocalSyncStore = new SqlLocalSyncStore();
