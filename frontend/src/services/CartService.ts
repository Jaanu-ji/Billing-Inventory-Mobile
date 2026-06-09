import type {CartItem, ItemKind} from '../models/Bill';
import type {Product} from '../models/Product';
import {DEFAULT_UNIT} from '../constants/units';

/**
 * Round a quantity to 3 decimals. Measured units (kg/litre/...) allow decimals,
 * so stepping/editing can produce binary float drift (0.1 + 0.2); rounding keeps
 * quantities clean and makes the "qty hit zero -> remove" check exact.
 */
function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Pure cart logic — no DB, no React. The billing screen holds the CartItem[]
 * in state and uses these helpers to transform it. Keeping this pure makes the
 * "scan -> qty +1 -> total" behaviour easy to test and reuse.
 *
 * Every line has a stable `key`:
 *  - scanned products use their barcode, so scanning the same product again
 *    bumps quantity instead of adding a row;
 *  - manual (no-barcode) goods and services get a generated unique key, so each
 *    add is its own row (the shopkeeper adjusts quantity with the stepper).
 */

/** Generate a unique cart key for a non-product line. */
function makeKey(prefix: ItemKind): string {
  return `${prefix}:${Date.now().toString(36)}:${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/** Fields shared by manual / service lines added by hand. */
export interface ManualLineInput {
  name: string;
  price: number;
  gstRate?: number;
  /** HSN (manual goods) or SAC (service) code. */
  hsnCode?: string | null;
  quantity?: number;
  /** Selling unit; defaults to 'pcs' when omitted. */
  unit?: string;
}

export const CartService = {
  /** Add a scanned product: +1 quantity if already present, else a new row. */
  addProduct(cart: CartItem[], product: Product): CartItem[] {
    const existing = cart.find(
      i => i.kind === 'product' && i.barcode === product.barcode,
    );
    if (existing) {
      return CartService.changeQuantity(cart, existing.key, +1);
    }
    return [
      ...cart,
      {
        // Product key === barcode keeps the scan-again-merge behaviour.
        key: product.barcode,
        kind: 'product',
        productId: product.id,
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        quantity: 1,
        // Snapshot unit + GST fields so the cart line carries everything the
        // GST calculator and the saved bill need.
        unit: product.unit || DEFAULT_UNIT,
        gstRate: product.gstRate,
        hsnCode: product.hsnCode,
        // Snapshot business-adaptive attributes so the bill can show them.
        attributes: product.attributes ?? {},
      },
    ];
  },

  /** Add a no-barcode (manual) goods line. Each add is its own row. */
  addManual(cart: CartItem[], input: ManualLineInput): CartItem[] {
    return [...cart, CartService.makeLine('manual', input)];
  },

  /** Add a service/labour line. Each add is its own row. */
  addService(cart: CartItem[], input: ManualLineInput): CartItem[] {
    return [...cart, CartService.makeLine('service', input)];
  },

  /** Build a manual/service cart line from typed-in values. */
  makeLine(kind: Exclude<ItemKind, 'product'>, input: ManualLineInput): CartItem {
    return {
      key: makeKey(kind),
      kind,
      productId: null,
      barcode: null,
      name: input.name,
      price: input.price,
      quantity: input.quantity && input.quantity > 0 ? input.quantity : 1,
      unit: input.unit || DEFAULT_UNIT,
      gstRate: input.gstRate ?? 0,
      hsnCode: input.hsnCode ?? null,
      // Manual/service lines have no catalog attributes.
      attributes: {},
    };
  },

  /**
   * Change a line's quantity by `delta` (the unit's step — 1 for counted units,
   * e.g. 0.5 for kg). Rounds to kill float drift and removes the row if it hits
   * (≈) zero.
   */
  changeQuantity(cart: CartItem[], key: string, delta: number): CartItem[] {
    return cart
      .map(i =>
        i.key === key ? {...i, quantity: roundQty(i.quantity + delta)} : i,
      )
      .filter(i => i.quantity > 1e-9);
  },

  /**
   * Set a line's quantity to an exact value (decimal entry, e.g. 1.25 kg).
   * Invalid/non-positive values remove the line, mirroring changeQuantity.
   */
  setQuantity(cart: CartItem[], key: string, quantity: number): CartItem[] {
    const safe =
      Number.isFinite(quantity) && quantity > 0 ? roundQty(quantity) : 0;
    return cart
      .map(i => (i.key === key ? {...i, quantity: safe} : i))
      .filter(i => i.quantity > 1e-9);
  },

  /** Remove a line entirely. */
  removeItem(cart: CartItem[], key: string): CartItem[] {
    return cart.filter(i => i.key !== key);
  },

  /**
   * Set a line's unit price (inline price edit in the cart). Negative/invalid
   * values are clamped to 0. The edited price is a snapshot on the cart line —
   * it does not touch the saved product/service catalog.
   */
  setPrice(cart: CartItem[], key: string, price: number): CartItem[] {
    const safe = Number.isFinite(price) && price >= 0 ? price : 0;
    return cart.map(i => (i.key === key ? {...i, price: safe} : i));
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
