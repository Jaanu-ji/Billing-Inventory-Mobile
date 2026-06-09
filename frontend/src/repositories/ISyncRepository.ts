import type {SyncOp, SyncQueueItem, SyncableTable} from '../models/Sync';

/**
 * The cloud-sync outbox (Phase K). Records local writes to be pushed later.
 * Screens never touch this — repositories enqueue, the SyncEngine drains.
 */
export interface ISyncQueueRepository {
  /** Append an op (coalescing: a pending op for the same row is replaced). */
  enqueue(tableName: SyncableTable, rowId: number, op: SyncOp): Promise<void>;

  /** Oldest `limit` pending ops, FIFO. */
  nextBatch(limit: number): Promise<SyncQueueItem[]>;

  /** Delete ops by id (after a successful push). */
  remove(ids: number[]): Promise<void>;

  /** Increment the attempt counter for ops that failed to push. */
  bumpAttempts(ids: number[]): Promise<void>;

  /** Drop ops that have exceeded the attempt ceiling (poison guard). */
  dropExhausted(maxAttempts: number): Promise<number>;

  /** Row ids in a table that still have a pending op (pull-skip / local-wins). */
  pendingRowIds(tableName: SyncableTable): Promise<Set<number>>;

  /** Total pending ops (for a status badge / debugging). */
  count(): Promise<number>;
}

/** Per-table pull cursors (Phase K). */
export interface ISyncMetaRepository {
  /** Cloud `updated_at` (epoch millis) of the last row pulled for `tableName`. */
  getCursor(tableName: SyncableTable): Promise<number>;

  /** Advance the pull cursor for `tableName`. */
  setCursor(tableName: SyncableTable, lastPulledAt: number): Promise<void>;
}
