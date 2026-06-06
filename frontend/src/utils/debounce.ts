/**
 * Per-key time gate.
 *
 * Used by the scan flow: the camera fires a barcode value many times per second.
 * We only want to act on a given barcode once per `gapMs`. This tracks the last
 * time each key (barcode) was accepted and tells us whether enough time passed.
 */
export class TimeGate {
  private lastSeen = new Map<string, number>();

  constructor(private readonly gapMs: number) {}

  /**
   * Returns true and records the time if `key` hasn't passed through within
   * `gapMs`; returns false otherwise.
   */
  shouldPass(key: string, now: number = Date.now()): boolean {
    const last = this.lastSeen.get(key);
    if (last !== undefined && now - last < this.gapMs) {
      return false;
    }
    this.lastSeen.set(key, now);
    return true;
  }

  /** Forget a key so it can pass immediately again (e.g. after editing). */
  reset(key: string): void {
    this.lastSeen.delete(key);
  }

  clear(): void {
    this.lastSeen.clear();
  }
}
