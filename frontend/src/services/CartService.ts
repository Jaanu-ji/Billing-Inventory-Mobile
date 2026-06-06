import type {CartItem} from '../models/Bill';
import type {Product} from '../models/Product';

/**
 * Pure cart logic — no DB, no React. The billing screen holds the CartItem[]
 * in state and uses these helpers to transform it. Keeping this pure makes the
 * "scan -> qty +1 -> total" behaviour easy to test and reuse.
 *
 * Items are merged by `barcode` (every cart item comes from a scanned product),
 * so scanning the same product again bumps quantity instead of adding a row.
 */
export const CartService = {
  /** Add a scanned product: +1 quantity if already present, else a new row. */
  addProduct(cart: CartItem[], product: Product): CartItem[] {
    const idx = cart.findIndex(i => i.barcode === product.barcode);
    if (idx >= 0) {
      return CartService.changeQuantity(cart, product.barcode, +1);
    }
    return [
      ...cart,
      {
        productId: product.id,
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        quantity: 1,
        // Snapshot GST fields so the cart line carries everything the GST
        // calculator and the saved bill need.
        gstRate: product.gstRate,
        hsnCode: product.hsnCode,
      },
    ];
  },

  /** Change a line's quantity by `delta`; removes the row if it hits 0. */
  changeQuantity(cart: CartItem[], barcode: string, delta: number): CartItem[] {
    return cart
      .map(i =>
        i.barcode === barcode
          ? {...i, quantity: i.quantity + delta}
          : i,
      )
      .filter(i => i.quantity > 0);
  },

  /** Remove a line entirely. */
  removeItem(cart: CartItem[], barcode: string): CartItem[] {
    return cart.filter(i => i.barcode !== barcode);
  },

  /**
   * Set a line's unit price (inline price edit in the cart). Negative/invalid
   * values are clamped to 0. The edited price is a snapshot on the cart line —
   * it does not touch the saved product in the catalog.
   */
  setPrice(cart: CartItem[], barcode: string, price: number): CartItem[] {
    const safe = Number.isFinite(price) && price >= 0 ? price : 0;
    return cart.map(i => (i.barcode === barcode ? {...i, price: safe} : i));
  },

  /** Line total for a single item. */
  lineTotal(item: CartItem): number {
    return item.price * item.quantity;
  },

  /** Grand total of the whole cart (no tax in Part 1). */
  total(cart: CartItem[]): number {
    return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  /** Total number of physical units in the cart (for a count badge). */
  itemCount(cart: CartItem[]): number {
    return cart.reduce((sum, i) => sum + i.quantity, 0);
  },
};
