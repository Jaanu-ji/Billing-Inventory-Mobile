/**
 * Domain models for cloud sync (Phase K).
 *
 * Sync uses an OUTBOX: each local write to a synced table appends an op here,
 * and the SyncEngine later drains it to Supabase. The op stores only the target
 * (table + row id); the actual payload is read live from the table at push time,
 * so multiple edits to a row coalesce to its latest state.
 */

/** What happened to a row. */
export type SyncOp = 'upsert' | 'delete';

/** One queued outbox entry. */
export interface SyncQueueItem {
  id: number;
  tableName: SyncableTable;
  rowId: number;
  op: SyncOp;
  createdAt: number;
  /** Push attempts so far (backoff / poison detection). */
  attempts: number;
}

/**
 * Tables that sync to the cloud, in dependency order (parents before children —
 * `bills` before `bill_items` — so a pull never inserts an orphan line).
 * Mirrors backend/schema.sql. NOT synced: schema_version, auth_session,
 * sync_queue, sync_meta (all device-local bookkeeping).
 */
export const SYNCABLE_TABLES = [
  'shop_profile',
  'products',
  'manual_items',
  'services',
  'customers',
  'bills',
  'bill_items',
  'parked_bills',
] as const;

export type SyncableTable = (typeof SYNCABLE_TABLES)[number];
