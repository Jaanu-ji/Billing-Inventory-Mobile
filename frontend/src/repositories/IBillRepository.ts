import type {Bill, NewBillInput} from '../models/Bill';

/**
 * Data-access contract for bills. Screens depend on this interface, never on
 * SQL. A Phase 4 sync-aware implementation can replace it without UI changes.
 */
export interface IBillRepository {
  /** Persist a bill + its items atomically. Returns the saved bill (with items). */
  create(input: NewBillInput): Promise<Bill>;

  /** All bills, newest first (header only, no items). For the history list. */
  getAll(): Promise<Bill[]>;

  /** Full bill with its line items, or null if not found. */
  getById(id: number): Promise<Bill | null>;
}
