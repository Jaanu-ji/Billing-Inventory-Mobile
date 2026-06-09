import type {Bill, BillSummary, NewBillInput} from '../models/Bill';
import type {PaymentMode} from '../constants/payments';

/**
 * Data-access contract for bills. Screens depend on this interface, never on
 * SQL. A Phase 4 sync-aware implementation can replace it without UI changes.
 */
export interface IBillRepository {
  /** Persist a bill + its items atomically. Returns the saved bill (with items). */
  create(input: NewBillInput): Promise<Bill>;

  /** All bills, newest first (header only, no items). For the history list. */
  getAll(): Promise<Bill[]>;

  /**
   * The `limit` most-recent bills, newest first (header only, no items). For the
   * home dashboard (Phase C2) — bounded so it doesn't scan the whole table.
   */
  getRecent(limit: number): Promise<Bill[]>;

  /** Full bill with its line items, or null if not found. */
  getById(id: number): Promise<Bill | null>;

  /**
   * Count + total of bills created at/after `sinceEpochMs` (e.g. start of today).
   * Used by the home dashboard (Phase C2).
   */
  getSummarySince(sinceEpochMs: number): Promise<BillSummary>;

  /**
   * Total outstanding udhaar across all bills (any date). Powers the dashboard
   * "total udhaar pending" card. Derived from unpaid bills, never stored.
   */
  getTotalPending(): Promise<number>;

  /** A customer's bills, newest first (Phase F ledger detail). */
  getByCustomer(customerId: number): Promise<Bill[]>;

  /** Mark one bill paid, recording how it was settled (Phase F). */
  markPaid(billId: number, mode: PaymentMode | null): Promise<void>;

  /** Mark all of a customer's unpaid bills paid in one go (Phase F). */
  clearUdhaar(customerId: number, mode: PaymentMode | null): Promise<void>;
}
