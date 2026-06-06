/**
 * GST constants for the GST-billing part.
 *
 * Indian GST has a fixed set of rate slabs. A product carries one of these
 * rates; "0" means the item is not taxed (or the shop simply isn't billing GST
 * on it). Keeping the slabs in one place means the dropdown, validation and
 * calculator can never drift apart.
 */

/** Allowed GST rate slabs (percent). 0 = no GST on the item. */
export const GST_SLABS = [0, 5, 12, 18, 28] as const;

export type GstRate = (typeof GST_SLABS)[number];

/** True if `rate` is one of the allowed slabs. */
export function isValidGstRate(rate: number): boolean {
  return (GST_SLABS as readonly number[]).includes(rate);
}

/** Options for the GST-rate dropdown (SelectField). Value is the rate as text. */
export const GST_RATE_OPTIONS = GST_SLABS.map(r => ({
  label: r === 0 ? 'No GST (0%)' : `${r}%`,
  value: String(r),
}));

/**
 * Bill type chosen per sale.
 *  - 'simple' : kacha bill, no tax (the only option when the shop isn't GST-registered).
 *  - 'gst'    : pakka GST-compliant bill with CGST/SGST or IGST.
 */
export type BillType = 'simple' | 'gst';

export const BillTypes = {simple: 'simple', gst: 'gst'} as const;
