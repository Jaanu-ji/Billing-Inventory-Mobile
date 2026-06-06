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

/** Aggregated totals for a whole bill. */
export interface BillTotals {
  /** Sum of taxable values (price * qty across all lines). */
  subtotal: number;
  /** Central GST (intra-state bills only; 0 otherwise). */
  cgst: number;
  /** State GST (intra-state bills only; 0 otherwise). */
  sgst: number;
  /** Integrated GST (inter-state bills only; 0 otherwise). */
  igst: number;
  /** cgst + sgst + igst. */
  taxTotal: number;
  /** subtotal + taxTotal — the amount payable. */
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
  const total = round2(subtotal + taxTotal);

  return {subtotal, cgst, sgst, igst, taxTotal, total, isInterState, lines};
}
