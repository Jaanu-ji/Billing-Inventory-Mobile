/**
 * Domain models for billing (Phase 2 Part 1).
 *
 * A Bill is an immutable record of one checkout: its line items snapshot the
 * product name + price at sale time, so editing a product later never changes a
 * past bill.
 */

import type {BillType} from '../constants/gst';
import type {PaymentMode, PaymentStatus} from '../constants/payments';
import type {DiscountType} from '../services/GstService';

/**
 * What a line represents (Phase C3/C4):
 *  - 'product' : scanned catalog product (HSN code).
 *  - 'manual'  : no-barcode goods typed in at sale time (HSN code).
 *  - 'service' : a service/labour line (SAC code).
 */
export type ItemKind = 'product' | 'manual' | 'service';

/** One line on a saved bill. */
export interface BillItem {
  id: number;
  billId: number;
  /** Link back to the catalog product, if it still exists. May be null. */
  productId: number | null;
  /** What this line is (Phase C3/C4). Pre-C3 rows read back as 'product'. */
  kind: ItemKind;
  /** Snapshot of the product name at sale time. */
  name: string;
  /** Snapshot of the unit price (taxable value per unit) at sale time. */
  price: number;
  quantity: number;
  /** Selling unit snapshot (pcs/kg/litre/...). Services read back as 'pcs'. */
  unit: string;
  /** price * quantity, stored so the bill is self-contained. */
  lineTotal: number;
  /** Snapshot of the GST rate at sale time (0 for simple bills). */
  gstRate: number;
  /** Snapshot of the HSN code (goods), if any. */
  hsnCode: string | null;
  /** Snapshot of the SAC code (services), if any. */
  sacCode: string | null;
  /** GST amount charged on this line (0 for simple bills / 0% items). */
  gstAmount: number;
  /** Business-adaptive extras snapshot (Phase H): batch/expiry, size/colour, … */
  attributes: Record<string, string>;
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
  /** Bill-level discount applied to the payable (Phase G; 0 if none). */
  discount: number;
  /** Round-off delta added to reach a whole-rupee total (Phase G; 0 if none). */
  roundOff: number;
  /** Paid or unpaid (udhaar). Pre-F bills read back as 'paid'. */
  paymentStatus: PaymentStatus;
  /** How a paid bill was settled (cash/upi/card); null for udhaar/older bills. */
  paymentMode: PaymentMode | null;
  /** Linked saved customer (udhaar ledger); null for a walk-in sale. */
  customerId: number | null;
  items?: BillItem[];
}

/**
 * A row in the in-progress cart (lives in screen state, not the DB).
 * Becomes a BillItem on checkout.
 *
 * Lines can be scanned products, manual (no-barcode) goods or services
 * (Phase C3/C4). `key` is the stable identity for all cart operations: for a
 * product it's the barcode (so scanning the same code again merges/bumps qty);
 * for manual/service lines it's a generated unique id (each add is its own row).
 */
export interface CartItem {
  /** Stable cart key (product: barcode; manual/service: generated). */
  key: string;
  /** What this line is. */
  kind: ItemKind;
  /** Catalog product id — only for scanned products; null otherwise. */
  productId: number | null;
  /** Scanned barcode — only for products; null otherwise. */
  barcode: string | null;
  name: string;
  price: number;
  quantity: number;
  /** Selling unit code (pcs/kg/litre/...). Services carry 'pcs' (unit hidden). */
  unit: string;
  /** GST rate snapshot (0/5/12/18/28). */
  gstRate: number;
  /** Tax code the user set: HSN for goods, SAC for services. */
  hsnCode: string | null;
  /**
   * Business-adaptive extras (Phase H), copied from the catalog product so the
   * bill can show them. Empty for manual/service lines and plain shop types.
   */
  attributes: Record<string, string>;
}

/** Aggregate over a set of bills (e.g. today's sales) for the dashboard. */
export interface BillSummary {
  /** Number of bills in the range. */
  count: number;
  /** Sum of bill totals (sales) in the range. */
  total: number;
  /** Sum of PAID bill totals in the range (cash/upi/card collected). */
  cashIn: number;
  /** Sum of UNPAID (udhaar) bill totals in the range. */
  udhaar: number;
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
  /** Payment status (Phase F). Defaults to 'paid' when omitted. */
  paymentStatus?: PaymentStatus;
  /** Payment mode for a paid bill (cash/upi/card). */
  paymentMode?: PaymentMode | null;
  /** Linked saved customer id for the udhaar ledger. */
  customerId?: number | null;
  /** Bill-level discount (Phase G). Repo computes the amount via GstService. */
  discountType?: DiscountType;
  discountValue?: number;
  /** Round the payable to the nearest rupee (Phase G). */
  roundOff?: boolean;
}
