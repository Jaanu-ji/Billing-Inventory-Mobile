/**
 * SupabaseClient — cloud backend wiring (Phase J).
 *
 * Phase J only WIRES Supabase (config + a typed accessor + the cloud schema in
 * `backend/schema.sql`). The actual push/pull SYNC is Phase K. Until creds are
 * set and `@supabase/supabase-js` is installed, `isSupabaseConfigured()` is
 * false and nothing cloud runs — the app stays fully offline/local.
 *
 * --- To activate (Phase K, or to test connectivity) ---
 *   1. `npm i @supabase/supabase-js`
 *   2. Fill Config.supabase.url + anonKey (Supabase dashboard → Settings → API)
 *   3. Apply backend/schema.sql to the Supabase project (SQL editor)
 *   4. Uncomment the template below and export `getSupabase()`.
 *
 *   import {createClient, type SupabaseClient} from '@supabase/supabase-js';
 *   let client: SupabaseClient | null = null;
 *   export function getSupabase(): SupabaseClient {
 *     if (!isSupabaseConfigured()) {
 *       throw new Error('Supabase not configured — set Config.supabase url/anonKey');
 *     }
 *     if (!client) {
 *       client = createClient(Config.supabase.url, Config.supabase.anonKey, {
 *         auth: {persistSession: false}, // we own the session via Firebase Auth
 *       });
 *     }
 *     return client;
 *   }
 */
import {Config} from '../constants/config';

/** True once both the Supabase URL and anon key are set in Config. */
export function isSupabaseConfigured(): boolean {
  return Boolean(Config.supabase.url) && Boolean(Config.supabase.anonKey);
}
