import type {SavedService, NewServiceInput} from '../models/Service';

/**
 * Data-access contract for saved services (Phase C4).
 * Screens depend on this interface, never on SQL.
 */
export interface IServiceRepository {
  /** All saved services, newest first (for the quick-pick list). */
  getAll(): Promise<SavedService[]>;

  /**
   * Save for reuse: updates the existing row when a same-name (case-insensitive)
   * service exists, otherwise inserts a new one. Returns the saved row.
   */
  upsert(input: NewServiceInput): Promise<SavedService>;

  /** Delete a saved service. */
  delete(id: number): Promise<void>;
}
