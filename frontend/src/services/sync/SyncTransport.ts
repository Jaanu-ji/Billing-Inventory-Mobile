/**
 * SyncTransport — the network seam for cloud sync (Phase K).
 *
 * The SyncEngine talks ONLY to this interface, so the real Supabase calls live
 * in one swappable place. Until creds + `@supabase/supabase-js` are wired the
 * default is `NoopSyncTransport` (does nothing) — so even with sync "enabled"
 * nothing leaves the device and billing is unaffected.
 */
import type {SyncableTable} from '../../models/Sync';

/** A row as it travels to/from the cloud (snake_case columns + owner user_id). */
export type RemoteRow = Record<string, unknown>;

export interface PullPage {
  /** Rows whose cloud `updated_at` is newer than the requested cursor (ascending). */
  rows: RemoteRow[];
  /** The newest cloud `updated_at` (epoch millis) in this page — the next cursor. */
  latest: number;
}

export interface ISyncTransport {
  /** Upsert rows into a cloud table (PK = (user_id, id)). */
  upsert(table: SyncableTable, rows: RemoteRow[]): Promise<void>;

  /** Delete rows by local id from a cloud table. */
  remove(table: SyncableTable, ids: number[]): Promise<void>;

  /** Page of rows changed strictly after `cursorMs`, oldest-first, up to `limit`. */
  pullSince(
    table: SyncableTable,
    cursorMs: number,
    limit: number,
  ): Promise<PullPage>;
}

/**
 * Default transport: a no-op. Push silently succeeds (so the outbox drains and
 * doesn't grow unbounded while unconfigured? — no: the engine only runs when
 * `isSupabaseConfigured()`, so this is used only in tests / as a safe default).
 * Pull returns nothing and leaves the cursor where it was.
 */
export class NoopSyncTransport implements ISyncTransport {
  async upsert(): Promise<void> {}
  async remove(): Promise<void> {}
  async pullSince(
    _table: SyncableTable,
    cursorMs: number,
  ): Promise<PullPage> {
    return {rows: [], latest: cursorMs};
  }
}

/**
 * --- SupabaseSyncTransport template (Phase K activation) ---
 * Uncomment after `npm i @supabase/supabase-js`, filling Config.supabase, and
 * applying backend/schema.sql. Then in SyncEngine wiring use:
 *   new SupabaseSyncTransport(getSupabase(), () => authService.getSession())
 *
 *   import type {SupabaseClient} from '@supabase/supabase-js';
 *   export class SupabaseSyncTransport implements ISyncTransport {
 *     constructor(
 *       private readonly db: SupabaseClient,
 *       private readonly uid: () => Promise<string>,   // Firebase uid
 *     ) {}
 *     async upsert(table, rows) {
 *       const uid = await this.uid();
 *       const owned = rows.map(r => ({...r, user_id: uid}));
 *       const {error} = await this.db.from(table).upsert(owned, {onConflict: 'user_id,id'});
 *       if (error) throw error;
 *     }
 *     async remove(table, ids) {
 *       const uid = await this.uid();
 *       const {error} = await this.db.from(table).delete().eq('user_id', uid).in('id', ids);
 *       if (error) throw error;
 *     }
 *     async pullSince(table, cursorMs, limit) {
 *       const uid = await this.uid();
 *       const {data, error} = await this.db.from(table)
 *         .select('*').eq('user_id', uid)
 *         .gt('updated_at', new Date(cursorMs).toISOString())
 *         .order('updated_at', {ascending: true}).limit(limit);
 *       if (error) throw error;
 *       const rows = data ?? [];
 *       const latest = rows.reduce(
 *         (m, r) => Math.max(m, Date.parse(r.updated_at)), cursorMs);
 *       return {rows, latest};
 *     }
 *   }
 */
