/**
 * Domain models for billing (Phase 2 Part 1).
 *
 * A Bill is an immutable record of one checkout: its line items snapshot the
 * product name + price at sale time, so editing a product later never changes a
 * past bill.
 */

import type {BillType} from '../constants/gst';

/** One line on a saved bill. */
export interface BillItem {
  id: number;
  billId: number;
  /** Link back to the catalog product, if it still exists. May be null. */
  productId: number | null;
  /** Snapshot of the product name at sale time. */
  name: string;
  /** Snapshot of the unit price (taxable value per unit) at sale time. */
  price: number;
  quantity: number;
  /** price * quantity, stored so the bill is self-contained. */
  lineTotal: number;
  /** Snapshot of the GST rate at sale time (0 for simple bills). */
  gstRate: number;
  /** Snapshot of the HSN code at sale time, if any. */
  hsnCode: string | null;
  /** GST amount charged on this line (0 for simple bills / 0% items). */
  gstAmount: number;
}

/** A saved bill. `items` is populated only when loading the full detail. */
export interface Bill {
  id: number;
  /** Human-facing, auto-incrementing, unique bill number (GST: sequential & unique). */
  billNumber: number;
  customerName: string | null;
  customerPhone: string | null;
  /** Sum of line taxable values (price * qty), before tax. */
  subtotal: number;
  /** Amount payable = subtotal + cgst + sgst + igst. */
  total: number;
  createdAt: number;
  /** 'simple' (kacha, no tax) or 'gst' (pakka, with tax breakup). */
  billType: BillType;
  /** Customer's GSTIN for a B2B GST bill, if captured. */
  customerGstin: string | null;
  /** Customer's state name (place of supply), if captured. */
  customerState: string | null;
  /** Customer's GST state code, used to decide intra vs inter-state. */
  customerStateCode: string | null;
  /** True when the sale is inter-state (=> IGST instead of CGST/SGST). */
  isInterState: boolean;
  /** Central GST (intra-state only). */
  cgst: number;
  /** State GST (intra-state only). */
  sgst: number;
  /** Integrated GST (inter-state only). */
  igst: number;
  items?: BillItem[];
}

/**
 * A row in the in-progress cart (lives in screen state, not the DB).
 * Becomes a BillItem on checkout.
 */
export interface CartItem {
  /** Catalog product id (cart items always come from a saved product). */
  productId: number;
  /** Used as the stable merge key when the same code is scanned again. */
  barcode: string;
  name: string;
  price: number;
  quantity: number;
  /** GST rate snapshotted from the product (0/5/12/18/28). */
  gstRate: number;
  /** HSN code snapshotted from the product, if any. */
  hsnCode: string | null;
}

/** Payload handed to the repository to persist a bill. */
export interface NewBillInput {
  customerName?: string | null;
  customerPhone?: string | null;
  items: CartItem[];
  /** Bill type chosen at checkout. Defaults to 'simple' when omitted. */
  billType?: BillType;
  /** Shop's own GST state code — the default place of supply. */
  shopStateCode?: string | null;
  /** Customer GST identity (only meaningful on a GST bill). */
  customerGstin?: string | null;
  customerState?: string | null;
  customerStateCode?: string | null;
}
