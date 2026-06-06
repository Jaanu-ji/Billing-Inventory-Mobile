/**
 * Shop categories the app supports. The app is generic across retail shops.
 *
 * To add a new category, just append an entry here — the setup screen reads
 * this list directly.
 *
 * `id` is the stable key stored in the DB; `label` is what the shopkeeper sees.
 */
export interface ShopType {
  id: string;
  label: string;
}

export const SHOP_TYPES: ShopType[] = [
  {id: 'kirana', label: 'Kirana / General Store'},
  {id: 'medical', label: 'Medical / Pharmacy'},
  {id: 'garment', label: 'Garment / Clothing'},
  {id: 'footwear', label: 'Footwear'},
  {id: 'sports', label: 'Sports'},
  {id: 'hardware', label: 'Hardware'},
  {id: 'electronics', label: 'Electronics'},
  {id: 'restaurant', label: 'Restaurant / Food'},
  {id: 'other', label: 'Other'},
];

// Future: per-shop-type default GST rates can be added here (e.g. a `defaultGst`
// field) so each category suggests sensible tax rates in the GST billing part.

/** Look up a human label for a stored shop-type id. */
export function shopTypeLabel(id: string | null | undefined): string {
  return SHOP_TYPES.find(t => t.id === id)?.label ?? 'Other';
}
