/**
 * SyncEngine — drains the outbox to the cloud (push) and applies remote changes
 * (pull). Phase K.
 *
 * Principles:
 *  - **Offline-first / never block billing:** the engine is only ever called by
 *    the SyncController (which guards on enabled + configured + signed-in). The
 *    local DB is always the source of truth; sync is best-effort on top.
 *  - **Never throws:** every table is isolated in try/catch; a failure bumps the
 *    op's attempts (kept for retry) or skips a table's pull, but never propagates.
 *  - **Conflict rule (LWW, local-wins on pending):** a pulled row is skipped if
 *    that row still has a pending outbox op (the device has an unpushed local
 *    edit that will push and win); otherwise the remote row is applied. Cloud
 *    `updated_at` drives the per-table pull cursor so each pass only fetches new.
 *
 * Collaborators are injected so the whole engine is unit-testable with in-memory
 * fakes (no DB, no network).
 */
import {Config} from '../../constants/config';
import {SYNCABLE_TABLES, type SyncableTable} from '../../models/Sync';
import type {
  ISyncMetaRepository,
  ISyncQueueRepository,
} from '../../repositories/ISyncRepository';
import {
  syncMetaRepository,
  syncQueueRepository,
} from '../../repositories/SyncRepository';
import {localSyncStore, type ILocalSyncStore} from './LocalSyncStore';
import {NoopSyncTransport, type ISyncTransport} from './SyncTransport';

export interface SyncResult {
  pushed: number;
  pushFailed: number;
  pulled: number;
}

export interface SyncEngineConfig {
  pushBatchSize: number;
  pullPageSize: number;
  maxAttempts: number;
}

export class SyncEngine {
  private running = false;

  constructor(
    private readonly queue: ISyncQueueRepository,
    private readonly meta: ISyncMetaRepository,
    private readonly store: ILocalSyncStore,
    private readonly transport: ISyncTransport,
    private readonly cfg: SyncEngineConfig,
  ) {}

  /** Push then pull. Re-entrancy-guarded; never throws. */
  async sync(): Promise<SyncResult> {
    if (this.running) {
      return {pushed: 0, pushFailed: 0, pulled: 0};
    }
    this.running = true;
    try {
      const push = await this.push();
      const pull = await this.pull();
      return {...push, pulled: pull};
    } finally {
      this.running = false;
    }
  }

  /** Drain a batch of outbox ops to the cloud. Never throws. */
  async push(): Promise<{pushed: number; pushFailed: number}> {
    const batch = await this.queue.nextBatch(this.cfg.pushBatchSize);
    if (batch.length === 0) {
      return {pushed: 0, pushFailed: 0};
    }

    // Group op ids by table, split into upserts (by row id) and deletes.
    const byTable = new Map<
      SyncableTable,
      {upserts: Map<number, number>; deletes: Map<number, number>}
    >();
    for (const item of batch) {
      let g = byTable.get(item.tableName);
      if (!g) {
        g = {upserts: new Map(), deletes: new Map()};
        byTable.set(item.tableName, g);
      }
      (item.op === 'delete' ? g.deletes : g.upserts).set(item.rowId, item.id);
    }

    let pushed = 0;
    let pushFailed = 0;
    for (const [table, g] of byTable) {
      const opIds = [...g.upserts.values(), ...g.deletes.values()];
      try {
        if (g.upserts.size > 0) {
          const rows = await this.store.fetchRows(table, [...g.upserts.keys()]);
          await this.transport.upsert(table, rows);
        }
        if (g.deletes.size > 0) {
          await this.transport.remove(table, [...g.deletes.keys()]);
        }
        await this.queue.remove(opIds);
        pushed += opIds.length;
      } catch (err) {
        // Keep the ops for retry; count the attempt. One table's failure must
        // not abort the others.
        await this.queue.bumpAttempts(opIds);
        pushFailed += opIds.length;
        if (__DEV__) {
          console.warn(`[sync] push ${table} failed`, err);
        }
      }
    }

    // Poison guard: drop ops that have failed too many times.
    await this.queue.dropExhausted(this.cfg.maxAttempts);
    return {pushed, pushFailed};
  }

  /** Pull remote changes per table since each cursor. Never throws. */
  async pull(): Promise<number> {
    let pulled = 0;
    for (const table of SYNCABLE_TABLES) {
      try {
        const cursor = await this.meta.getCursor(table);
        const page = await this.transport.pullSince(
          table,
          cursor,
          this.cfg.pullPageSize,
        );
        if (page.rows.length > 0) {
          // Local-wins: skip rows with an unpushed local edit pending.
          const pending = await this.queue.pendingRowIds(table);
          const toApply = page.rows.filter(r => !pending.has(Number(r.id)));
          await this.store.applyRemote(table, toApply);
          pulled += toApply.length;
        }
        if (page.latest > cursor) {
          await this.meta.setCursor(table, page.latest);
        }
      } catch (err) {
        if (__DEV__) {
          console.warn(`[sync] pull ${table} failed`, err);
        }
      }
    }
    return pulled;
  }
}

/**
 * Default engine instance — wired to the real repos/store but a **NoopSync
 * transport**, so importing it is harmless and nothing leaves the device. The
 * SyncController swaps in the real `SupabaseSyncTransport` once configured.
 */
export const syncEngine = new SyncEngine(
  syncQueueRepository,
  syncMetaRepository,
  localSyncStore,
  new NoopSyncTransport(),
  {
    pushBatchSize: Config.sync.pushBatchSize,
    pullPageSize: Config.sync.pullPageSize,
    maxAttempts: Config.sync.maxAttempts,
  },
);
