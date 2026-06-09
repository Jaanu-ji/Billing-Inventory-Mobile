/**
 * App-wide configuration.
 *
 * Keep tunables here (NOT hardcoded across files) so behaviour can be changed
 * in one place. Future phases can extend this (e.g. sync endpoints, GST rates).
 */
export const Config = {
  /** Local SQLite database file name. */
  dbName: 'bill.db',

  /**
   * Minimum gap (ms) before the SAME barcode is processed again.
   * Prevents one physical scan from firing the handler many times.
   */
  scanDebounceMs: 2000,

  /** How long the "Matched" confirmation card stays on screen (ms). */
  matchedCardTimeoutMs: 2500,

  /** Currency symbol used across the UI. */
  currencySymbol: '₹',

  /**
   * Authentication (Phase J). A phone-OTP login gate.
   *  - `enabled` is **false** during scaffolding, so the app + offline billing
   *    behave exactly as before (no gate). Flip to `true` after wiring Firebase
   *    Auth (see services/AuthService) — then a session is required to enter.
   *  - `otpLength` is the SMS code length Firebase sends (6 in India).
   */
  auth: {
    enabled: false,
    otpLength: 6,
  },

  /**
   * Supabase cloud backend (Phase J wiring; Phase K does the actual sync).
   * Fill these from your Supabase project (Settings → API). Empty = not
   * configured, so SupabaseClient.isConfigured() is false and nothing cloud runs
   * — billing stays fully offline/local.
   */
  supabase: {
    url: '',
    anonKey: '',
  },

  /**
   * Cloud sync (Phase K). **Disabled by default** — local SQLite is the source
   * of truth and billing must never wait on the network. When enabled AND
   * Supabase is configured AND a user is signed in, the SyncEngine drains the
   * outbox (push) and pulls remote changes best-effort. Flip on after wiring the
   * Supabase transport (see services/sync/SyncTransport).
   */
  sync: {
    enabled: false,
    /** Max outbox ops drained per push pass. */
    pushBatchSize: 50,
    /** Max rows pulled per table per pull pass. */
    pullPageSize: 200,
    /** Drop an op after this many failed push attempts (poison guard). */
    maxAttempts: 8,
  },
} as const;

export type AppConfig = typeof Config;
