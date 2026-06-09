import type {ParkedBill, NewParkedBillInput} from '../models/ParkedBill';

/**
 * Data-access contract for held/parked bills (Phase G).
 * Screens depend on this interface, never on SQL.
 */
export interface IParkedBillRepository {
  /** Park the current cart for later. Returns the saved parked bill. */
  park(input: NewParkedBillInput): Promise<ParkedBill>;

  /** All parked bills, newest first. */
  getAll(): Promise<ParkedBill[]>;

  /** Fetch + remove a parked bill (resume restores its cart). */
  resume(id: number): Promise<ParkedBill | null>;

  /** Discard a parked bill without resuming it. */
  delete(id: number): Promise<void>;
}
