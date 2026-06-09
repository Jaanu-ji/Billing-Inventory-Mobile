/**
 * Domain model: Customer (Phase F).
 *
 * A saved customer the shop bills repeatedly. Identified by phone number (the
 * "number remembered" requirement) so the next bill can reuse them and their
 * udhaar (pending) ledger accumulates across bills.
 */
export interface Customer {
  id: number;
  name: string;
  /** Phone number — the dedupe key. May be blank for a name-only walk-in. */
  phone: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * A customer plus their outstanding udhaar (sum of unpaid bill totals). Used by
 * the ledger list so each row can show "₹450 baaki".
 */
export interface CustomerWithPending extends Customer {
  /** Total of this customer's unpaid bills. 0 when all clear. */
  pending: number;
}

/** Values used to save/reuse a customer (upsert by phone). */
export interface NewCustomerInput {
  name: string;
  phone: string;
}
