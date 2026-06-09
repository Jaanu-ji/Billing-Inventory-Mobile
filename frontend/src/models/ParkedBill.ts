/**
 * Domain model: ParkedBill (Phase G).
 *
 * An in-progress cart the shopkeeper set aside to serve another customer first.
 * The cart lines are stored verbatim (as JSON) so resuming restores the exact
 * cart; parking is purely a convenience and never creates a real bill.
 */
import type {CartItem} from './Bill';

export interface ParkedBill {
  id: number;
  /** Short label (customer name or "Walk-in"). */
  label: string;
  /** Total physical units held. */
  itemCount: number;
  /** Cart grand total at park time. */
  total: number;
  /** The held cart lines, restored on resume. */
  items: CartItem[];
  createdAt: number;
}

/** Values used to park a cart. */
export interface NewParkedBillInput {
  label: string;
  items: CartItem[];
}
