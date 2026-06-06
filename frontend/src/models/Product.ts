/**
 * Domain model: Product.
 *
 * A product is uniquely identified by its scanned `barcode`. Phase 1 stores
 * only the minimum needed to recognise a product on scan (name + price).
 *
 * Future phases extend the data model with NEW models (Bill, CartItem,
 * InventoryItem, Customer) — this type stays stable so existing code keeps
 * working.
 */
export interface Product {
  /** Auto-increment primary key. */
  id: number;
  /** The scanned barcode/QR value. Unique. */
  barcode: string;
  /** Human-readable product name. */
  name: string;
  /** Selling price (taxable value — GST is added on top on a GST bill). */
  price: number;
  /** GST rate slab (0/5/12/18/28). 0 = no GST. Used only on GST bills. */
  gstRate: number;
  /** HSN/SAC code for GST compliance. Optional — may be null/blank. */
  hsnCode: string | null;
  /** Unix epoch millis when the row was created. */
  createdAt: number;
}

/**
 * Shape used when creating a product (no id/createdAt yet — DB assigns those).
 * gstRate/hsnCode are optional; they default to 0 / null for non-GST shops.
 */
export interface NewProductInput {
  barcode: string;
  name: string;
  price: number;
  gstRate?: number;
  hsnCode?: string | null;
}

/** Fields that the user can edit after creation. */
export interface ProductUpdateInput {
  name: string;
  price: number;
  gstRate?: number;
  hsnCode?: string | null;
}

// Phase 3: add stock quantity, costPrice, category here.
// Phase 4: add syncedAt / remoteId for cloud sync without breaking Phase 1 code.
