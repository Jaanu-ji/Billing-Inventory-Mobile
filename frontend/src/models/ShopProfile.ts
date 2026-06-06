/**
 * Domain model: ShopProfile.
 *
 * A single profile describing the shop. Captured on first launch and editable
 * later from Settings. The `gstEnabled` flag drives whether GST billing is
 * available (read by the next part).
 */
export interface ShopProfile {
  id: number;
  /** Stable id of the selected shop type (see constants/shopTypes). */
  shopType: string;
  shopName: string;
  phone: string;
  address: string | null;
  gstEnabled: boolean;
  /** GST identification number — only when gstEnabled. */
  gstin: string | null;
  /** State name — only when gstEnabled. */
  state: string | null;
  /** GST state code (e.g. "27" for Maharashtra) — only when gstEnabled. */
  stateCode: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Values captured from the setup/settings form. */
export interface ShopProfileInput {
  shopType: string;
  shopName: string;
  phone: string;
  address?: string | null;
  gstEnabled: boolean;
  gstin?: string | null;
  state?: string | null;
  stateCode?: string | null;
}

// Phase 2 next: GST billing reads `gstEnabled` (via ProfileService.isGstEnabled()).
// Future: per-shop-type default GST rates can key off `shopType`.
