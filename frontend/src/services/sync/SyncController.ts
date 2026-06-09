/**
 * SyncController — decides WHEN to sync (Phase K). The SyncEngine decides HOW.
 *
 * `maybeSync()` is the single guarded entry point the app calls (on launch and
 * when it returns to the foreground). It runs only when sync is enabled AND
 * Supabase is configured AND a user is signed in — otherwise it's a no-op, so
 * billing is never affected. It's fire-and-forget and never throws.
 *
 * NOTE: the default `syncEngine` uses `NoopSyncTransport`, so even when all
 * guards pass nothing actually leaves the device until the real Supabase
 * transport is wired. To activate (Phase K go-live): install
 * `@supabase/supabase-js`, build a `SupabaseSyncTransport` (template in
 * SyncTransport.ts), and construct a `SyncEngine` with it here instead of the
 * default. Then flip `Config.sync.enabled = true`.
 */
import {Config} from '../../constants/config';
import {authService} from '../AuthService';
import {isSupabaseConfigured} from '../SupabaseClient';
import {syncEngine} from './SyncEngine';

let inFlight = false;

export const SyncController = {
  /** Run a sync pass if all guards pass. Best-effort; never throws. */
  async maybeSync(): Promise<void> {
    if (inFlight || !Config.sync.enabled || !isSupabaseConfigured()) {
      return;
    }
    inFlight = true;
    try {
      const session = await authService.getSession();
      if (!session) {
        return;
      }
      await syncEngine.sync();
    } catch (err) {
      if (__DEV__) {
        console.warn('[sync] pass failed', err);
      }
    } finally {
      inFlight = false;
    }
  },
};
