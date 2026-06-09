import {getDatabase} from '../db/database';
import {
  Tables,
  SyncQueueColumns as SQ,
  SyncMetaColumns as SM,
} from '../db/schema';
import type {SyncOp, SyncQueueItem, SyncableTable} from '../models/Sync';
import type {
  ISyncMetaRepository,
  ISyncQueueRepository,
} from './ISyncRepository';

/** op-sqlite implementation of the sync outbox. Only place that knows its SQL. */
class SyncQueueRepository implements ISyncQueueRepository {
  async enqueue(
    tableName: SyncableTable,
    rowId: number,
    op: SyncOp,
  ): Promise<void> {
    const db = await getDatabase();
    // Coalesce: a row's latest op supersedes any earlier pending one (the push
    // reads live state anyway), so we never push the same row twice in a pass.
    await db.execute(
      `DELETE FROM ${Tables.syncQueue}
        WHERE ${SQ.tableName} = ? AND ${SQ.rowId} = ?;`,
      [tableName, rowId],
    );
    await db.execute(
      `INSERT INTO ${Tables.syncQueue}
         (${SQ.tableName}, ${SQ.rowId}, ${SQ.op}, ${SQ.createdAt}, ${SQ.attempts})
       VALUES (?, ?, ?, ?, 0);`,
      [tableName, rowId, op, Date.now()],
    );
  }

  async nextBatch(limit: number): Promise<SyncQueueItem[]> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT * FROM ${Tables.syncQueue}
        ORDER BY ${SQ.id} ASC LIMIT ?;`,
      [limit],
    );
    return (res.rows ?? []).map(r => ({
      id: Number(r[SQ.id]),
      tableName: String(r[SQ.tableName]) as SyncableTable,
      rowId: Number(r[SQ.rowId]),
      op: String(r[SQ.op]) as SyncOp,
      createdAt: Number(r[SQ.createdAt]),
      attempts: Number(r[SQ.attempts] ?? 0),
    }));
  }

  async remove(ids: number[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const db = await getDatabase();
    const holes = ids.map(() => '?').join(',');
    await db.execute(
      `DELETE FROM ${Tables.syncQueue} WHERE ${SQ.id} IN (${holes});`,
      ids,
    );
  }

  async bumpAttempts(ids: number[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const db = await getDatabase();
    const holes = ids.map(() => '?').join(',');
    await db.execute(
      `UPDATE ${Tables.syncQueue}
          SET ${SQ.attempts} = ${SQ.attempts} + 1
        WHERE ${SQ.id} IN (${holes});`,
      ids,
    );
  }

  async dropExhausted(maxAttempts: number): Promise<number> {
    const db = await getDatabase();
    const res = await db.execute(
      `DELETE FROM ${Tables.syncQueue} WHERE ${SQ.attempts} >= ?;`,
      [maxAttempts],
    );
    return Number(res.rowsAffected ?? 0);
  }

  async pendingRowIds(tableName: SyncableTable): Promise<Set<number>> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT ${SQ.rowId} FROM ${Tables.syncQueue} WHERE ${SQ.tableName} = ?;`,
      [tableName],
    );
    return new Set((res.rows ?? []).map(r => Number(r[SQ.rowId])));
  }

  async count(): Promise<number> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT COUNT(*) AS c FROM ${Tables.syncQueue};`,
    );
    return Number(res.rows?.[0]?.c ?? 0);
  }
}

/** op-sqlite implementation of per-table pull cursors. */
class SyncMetaRepository implements ISyncMetaRepository {
  async getCursor(tableName: SyncableTable): Promise<number> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT ${SM.lastPulledAt} AS v FROM ${Tables.syncMeta}
        WHERE ${SM.tableName} = ? LIMIT 1;`,
      [tableName],
    );
    return Number(res.rows?.[0]?.v ?? 0);
  }

  async setCursor(tableName: SyncableTable, lastPulledAt: number): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO ${Tables.syncMeta} (${SM.tableName}, ${SM.lastPulledAt})
       VALUES (?, ?)
       ON CONFLICT(${SM.tableName})
       DO UPDATE SET ${SM.lastPulledAt} = excluded.${SM.lastPulledAt};`,
      [tableName, lastPulledAt],
    );
  }
}

export const syncQueueRepository: ISyncQueueRepository =
  new SyncQueueRepository();
export const syncMetaRepository: ISyncMetaRepository = new SyncMetaRepository();
