/**
 * Domain model: ManualItem (Phase C3).
 *
 * A no-barcode goods line the shopkeeper typed in once. Saved so the manual-add
 * modal can offer it again ("reuse-search"). Distinct from `products`, which are
 * barcode-keyed.
 */
export interface ManualItem {
  id: number;
  name: string;
  price: number;
  /** HSN code, when the shop bills GST. */
  hsnCode: string | null;
  gstRate: number;
  /** Selling unit code (pcs/kg/litre/...). Default 'pcs'. */
  unit: string;
  createdAt: number;
  updatedAt: number;
}

/** Values used to save/reuse a manual item (upsert by name). */
export interface NewManualItemInput {
  name: string;
  price: number;
  hsnCode?: string | null;
  gstRate?: number;
  /** Selling unit; defaults to 'pcs'/existing when omitted. */
  unit?: string;
}
