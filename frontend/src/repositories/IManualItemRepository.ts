import type {ManualItem, NewManualItemInput} from '../models/ManualItem';

/**
 * Data-access contract for reusable manual (no-barcode) goods (Phase C3).
 * Screens depend on this interface, never on SQL.
 */
export interface IManualItemRepository {
  /** All saved manual items, newest first (for the reuse list). */
  getAll(): Promise<ManualItem[]>;

  /**
   * Save for reuse: updates the existing row when a same-name (case-insensitive)
   * item exists, otherwise inserts a new one. Returns the saved row.
   */
  upsert(input: NewManualItemInput): Promise<ManualItem>;

  /** Delete a saved manual item. */
  delete(id: number): Promise<void>;
}
