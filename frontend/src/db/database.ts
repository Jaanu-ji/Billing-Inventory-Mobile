import {open, type DB} from '@op-engineering/op-sqlite';
import {Config} from '../constants/config';
import {runMigrations} from './migrations';

/**
 * Database bootstrap.
 *
 * Owns the single op-sqlite connection and runs migrations on first access.
 * Everything else in the app talks to the DB through the repository layer
 * (see src/repositories) — never import this file directly from UI.
 *
 * We chose op-sqlite (@op-engineering/op-sqlite) because it is the most actively
 * maintained, fastest (JSI-based, no bridge) SQLite library for React Native and
 * supports the New Architecture that RN 0.85 uses by default.
 */
let dbInstance: DB | null = null;
let initPromise: Promise<DB> | null = null;

/**
 * Returns a ready-to-use DB handle, opening it and running migrations exactly
 * once. Safe to call from multiple places concurrently.
 */
export async function getDatabase(): Promise<DB> {
  if (dbInstance) {
    return dbInstance;
  }
  if (!initPromise) {
    initPromise = (async () => {
      const db = open({name: Config.dbName});
      // Pragmas for reliable, fast offline writes.
      await db.execute('PRAGMA journal_mode = WAL;');
      await db.execute('PRAGMA foreign_keys = ON;');
      await runMigrations(db as any);
      dbInstance = db;
      return db;
    })();
  }
  return initPromise;
}

/**
 * Call once early in app startup (App.tsx) so the DB + migrations are ready
 * before the first scan. Returns nothing; throws if init fails.
 */
export async function initDatabase(): Promise<void> {
  await getDatabase();
}

// Phase 4: a cloud-sync layer can hook here (e.g. open a second connection or
// register change listeners) without touching repositories or screens.
