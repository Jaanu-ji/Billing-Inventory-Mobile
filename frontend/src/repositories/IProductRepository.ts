import type {
  Product,
  NewProductInput,
  ProductUpdateInput,
} from '../models/Product';

/**
 * Data-access contract for products.
 *
 * Screens and services depend on THIS interface, never on a concrete DB
 * implementation. In Phase 4, a sync-aware repository (local DB + cloud) can
 * implement the same interface and be swapped in without changing any UI.
 */
export interface IProductRepository {
  /** Fast lookup used on every scan. Returns null if the barcode is unknown. */
  findByBarcode(barcode: string): Promise<Product | null>;

  /** Create a new product for a barcode. */
  create(input: NewProductInput): Promise<Product>;

  /** All products, newest first. Used by the Products list screen. */
  getAll(): Promise<Product[]>;

  /** Update an existing product's editable fields. */
  update(id: number, changes: ProductUpdateInput): Promise<void>;

  /** Delete a product by id. */
  delete(id: number): Promise<void>;
}
