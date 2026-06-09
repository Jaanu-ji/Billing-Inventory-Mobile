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

/**
 * Columns whose cloud type differs from the local SQLite storage, so the PUSH
 * payload must be converted to match `backend/schema.sql`:
 *  - JSON columns: stored locally as TEXT (stringified) → cloud `jsonb` (object).
 *  - boolean columns: stored locally as INTEGER 0/1 → cloud `boolean`.
 * (The reverse — cloud → local — is handled by `toScalar` in applyRemote.)
 */
const JSON_COLUMNS: Partial<Record<SyncableTable, string[]>> = {
  products: ['attributes'],
  bill_items: ['attributes'],
  parked_bills: ['items_json'],
};
const BOOL_COLUMNS: Partial<Record<SyncableTable, string[]>> = {
  shop_profile: ['gst_enabled'],
  bills: ['is_inter_state'],
};

/**
 * Columns the CLOUD owns — never pushed from the device and never overwritten
 * by a pull. The local `updated_at` is device-millis bookkeeping; the cloud has
 * its own server-managed `updated_at timestamptz` (the LWW clock). Pushing the
 * local millis value would type-collide with the timestamptz column, and pulling
 * the timestamptz string would corrupt the local integer column — so we strip it
 * on push and regenerate a fresh local value on apply.
 */
const CLOUD_MANAGED = ['updated_at'];

/** Convert a raw local row into a cloud-shaped row for push. Exported for tests. */
export function toRemoteRow(table: SyncableTable, row: RemoteRow): RemoteRow {
  const out: RemoteRow = {...row};
  for (const c of CLOUD_MANAGED) {
    delete out[c];
  }
  for (const c of JSON_COLUMNS[table] ?? []) {
    const v = out[c];
    if (typeof v === 'string' && v.length > 0) {
      try {
        out[c] = JSON.parse(v);
      } catch {
        out[c] = null;
      }
    } else if (v === '' || v === undefined) {
      out[c] = null;
    }
  }
  for (const c of BOOL_COLUMNS[table] ?? []) {
    if (out[c] !== undefined && out[c] !== null) {
      out[c] = Number(out[c]) === 1;
    }
  }
  return out;
}

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
    // Convert each raw local row to its cloud shape (jsonb / boolean columns).
    return (res.rows ?? []).map(r => toRemoteRow(table, r as RemoteRow));
  }

  async applyRemote(table: SyncableTable, rows: RemoteRow[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    const db = await getDatabase();
    const cols = TABLE_COLUMNS[table];
    const holes = cols.map(() => '?').join(',');
    const now = Date.now();
    for (const row of rows) {
      // Keep only the columns the local table has (drops cloud-only user_id).
      // `updated_at` is regenerated locally (the cloud value is a timestamptz
      // string that doesn't belong in the local integer column).
      const values = cols.map(c =>
        CLOUD_MANAGED.includes(c) ? now : toScalar(row[c]),
      );
      await db.execute(
        `INSERT OR REPLACE INTO ${TABLE_NAME[table]} (${cols.join(',')})
         VALUES (${holes});`,
        values,
      );
    }
  }
}

export const localSyncStore: ILocalSyncStore = new SqlLocalSyncStore();
