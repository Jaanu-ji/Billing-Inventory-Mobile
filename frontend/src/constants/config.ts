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

  // Phase 4: cloud sync config (API base URL, deviceId, auth) will live here.
} as const;

export type AppConfig = typeof Config;
