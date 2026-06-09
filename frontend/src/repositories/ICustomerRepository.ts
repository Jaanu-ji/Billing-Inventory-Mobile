import type {
  Customer,
  CustomerWithPending,
  NewCustomerInput,
} from '../models/Customer';

/**
 * Data-access contract for saved customers (Phase F udhaar ledger).
 * Screens depend on this interface, never on SQL.
 */
export interface ICustomerRepository {
  /**
   * Save for reuse, keyed by phone: updates the same-phone row's name if it
   * exists, else inserts. Returns the saved customer (with its id).
   */
  upsertByPhone(input: NewCustomerInput): Promise<Customer>;

  /** A single customer by id, or null. */
  getById(id: number): Promise<Customer | null>;

  /**
   * All customers with their outstanding udhaar (sum of unpaid bill totals),
   * pending-first. Powers the ledger list.
   */
  getAllWithPending(): Promise<CustomerWithPending[]>;
}
