/**
 * GST calculation — a pure, testable function with no UI and no DB.
 *
 * The shop profile decides whether GST billing is even offered; this module
 * only does the maths once a GST (or simple) bill is requested.
 *
 * Model used (standard for small Indian retailers):
 *  - A product's `price` is the TAXABLE VALUE (tax-exclusive). GST is added on
 *    top, so total = taxable value + tax.
 *  - Intra-state sale (customer in the shop's state, or no customer state given
 *    => place of supply defaults to the shop's own state): the item's GST is
 *    split into CGST + SGST, each half of the rate.
 *  - Inter-state sale (customer in a different state): a single IGST equal to
 *    the full rate.
 *  - A 'simple' bill carries no tax at all (behaviour unchanged from before GST).
 *
 * All money values are rounded to 2 decimals.
 */

/** Minimal shape the calculator needs from each cart/bill line. */
export interface TaxableLine {
  /** Unit taxable value. */
  price: number;
  quantity: number;
  /** GST rate slab in percent (0/5/12/18/28). */
  gstRate: number;
}

/** Per-line tax result, index-aligned with the input items. */
export interface LineTax {
  /** price * quantity (taxable value, before tax). */
  taxableValue: number;
  /** GST amount on this line. */
  gstAmount: number;
}

/** How a bill-level discount is expressed (Phase G). */
export type DiscountType = 'percent' | 'rupees';

/** Optional bill-level adjustments applied after tax (Phase G). */
export interface BillAdjustments {
  /** Discount kind; omit for no discount. */
  discountType?: DiscountType;
  /** Percent (0–100) or rupees, per `discountType`. */
  discountValue?: number;
  /** Round the final payable to the nearest rupee. */
  roundOff?: boolean;
}

/** Aggregated totals for a whole bill. */
export interface BillTotals {
  /** Sum of taxable values (price * qty across all lines), before discount. */
  subtotal: number;
  /** Central GST (intra-state bills only; 0 otherwise). */
  cgst: number;
  /** State GST (intra-state bills only; 0 otherwise). */
  sgst: number;
  /** Integrated GST (inter-state bills only; 0 otherwise). */
  igst: number;
  /** cgst + sgst + igst. */
  taxTotal: number;
  /** Bill-level discount amount applied to the payable (Phase G; 0 if none). */
  discount: number;
  /** Round-off delta added to reach a whole-rupee total (Phase G; +/- or 0). */
  roundOff: number;
  /** subtotal + taxTotal − discount + roundOff — the amount payable. */
  total: number;
  /** True when the sale crosses state lines (=> IGST instead of CGST/SGST). */
  isInterState: boolean;
  /** Per-line breakdown, aligned with the input order. */
  lines: LineTax[];
}

/** Round to 2 decimal places, avoiding binary float drift (e.g. 1.005). */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Compute a bill's taxable value, taxes and grand total.
 *
 * @param items            lines with unit price, quantity and GST rate.
 * @param shopStateCode    the shop's GST state code (place of supply default).
 * @param customerStateCode the customer's GST state code, or null/empty if not
 *                          given (treated as intra-state — same as the shop).
 * @param isGstBill        true for a GST (pakka) bill; false => no tax at all.
 */
export function calculateBillTotals(
  items: TaxableLine[],
  shopStateCode: string | null,
  customerStateCode: string | null,
  isGstBill: boolean,
  adjustments?: BillAdjustments,
): BillTotals {
  // Inter-state only when we actually have both codes and they differ.
  // No customer state => place of supply = shop's own state => intra-state.
  const isInterState =
    isGstBill &&
    !!shopStateCode &&
    !!customerStateCode &&
    customerStateCode !== shopStateCode;

  let subtotal = 0;
  let gstTotal = 0;

  const lines: LineTax[] = items.map(item => {
    const taxableValue = round2(item.price * item.quantity);
    const rate = isGstBill ? item.gstRate || 0 : 0;
    const gstAmount = round2((taxableValue * rate) / 100);
    subtotal += taxableValue;
    gstTotal += gstAmount;
    return {taxableValue, gstAmount};
  });

  subtotal = round2(subtotal);
  gstTotal = round2(gstTotal);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (isGstBill && gstTotal > 0) {
    if (isInterState) {
      igst = gstTotal;
    } else {
      cgst = round2(gstTotal / 2);
      // Derive sgst as the remainder so cgst + sgst === gstTotal exactly,
      // even when half a rounded amount lands on a half-paisa.
      sgst = round2(gstTotal - cgst);
    }
  }

  const taxTotal = round2(cgst + sgst + igst);

  // Bill-level adjustments (Phase G), applied to the payable AFTER tax so the
  // per-line taxable/GST figures stay clean. `payable` is what the customer owes
  // before a discount; the discount reduces it, then round-off snaps to a rupee.
  const payable = round2(subtotal + taxTotal);
  const discount = computeDiscount(payable, adjustments);
  const afterDiscount = round2(payable - discount);

  let roundOff = 0;
  let total = afterDiscount;
  if (adjustments?.roundOff) {
    const rounded = Math.round(afterDiscount);
    roundOff = round2(rounded - afterDiscount);
    total = rounded;
  }

  return {
    subtotal,
    cgst,
    sgst,
    igst,
    taxTotal,
    discount,
    roundOff,
    total,
    isInterState,
    lines,
  };
}

/**
 * Resolve a bill-level discount amount (Phase G). Percent is taken on the
 * pre-discount payable; rupees is a flat amount. Either way it's clamped to
 * [0, payable] so a bill can never go negative, and invalid input => 0.
 */
/** Public helper for previews (discount sheet / checkout "You save"). */
export function discountAmount(
  payable: number,
  type: DiscountType,
  value: number,
): number {
  return computeDiscount(payable, {discountType: type, discountValue: value});
}

function computeDiscount(payable: number, adj?: BillAdjustments): number {
  if (!adj || adj.discountValue == null || !Number.isFinite(adj.discountValue)) {
    return 0;
  }
  const value = adj.discountValue;
  if (value <= 0) {
    return 0;
  }
  const raw =
    adj.discountType === 'rupees' ? value : (payable * Math.min(value, 100)) / 100;
  return round2(Math.min(Math.max(raw, 0), payable));
}
