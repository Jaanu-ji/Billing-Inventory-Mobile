/**
 * SyncQueue — the tiny facade repositories call after a local write (Phase K).
 *
 * It is **fire-and-forget and guarded**: when sync is disabled (the default) it
 * returns immediately and writes nothing, so billing/catalog writes pay ~zero
 * cost and never wait on or fail because of sync. When enabled it appends to the
 * outbox best-effort, swallowing any error (the local write already succeeded —
 * sync must never break it).
 */
import {Config} from '../../constants/config';
import {syncQueueRepository} from '../../repositories/SyncRepository';
import type {SyncableTable} from '../../models/Sync';

function enqueue(table: SyncableTable, rowId: number, op: 'upsert' | 'delete') {
  if (!Config.sync.enabled || rowId == null) {
    return;
  }
  // Fire-and-forget: do NOT await in the caller's write path.
  syncQueueRepository.enqueue(table, rowId, op).catch(err => {
    if (__DEV__) {
      console.warn('[sync] enqueue failed', table, rowId, op, err);
    }
  });
}

export const SyncQueue = {
  /** Record that a row was created/updated and should be pushed. */
  upsert(table: SyncableTable, rowId: number): void {
    enqueue(table, rowId, 'upsert');
  },
  /** Record that a row was deleted and should be removed in the cloud. */
  remove(table: SyncableTable, rowId: number): void {
    enqueue(table, rowId, 'delete');
  },
};
