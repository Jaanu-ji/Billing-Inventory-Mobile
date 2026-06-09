/**
 * Cart logic tests (Phase 2 Part 1) — pure, no DB.
 */
import {CartService} from '../src/services/CartService';
import type {Product} from '../src/models/Product';
import type {CartItem} from '../src/models/Bill';

const product = (over: Partial<Product> = {}): Product => ({
  id: 1,
  barcode: '8901234567890',
  name: 'Parle-G',
  price: 10,
  gstRate: 0,
  hsnCode: null,
  unit: 'pcs',
  category: null,
  attributes: {},
  createdAt: 0,
  ...over,
});

describe('CartService', () => {
  it('adds a new product as a row with quantity 1', () => {
    const cart = CartService.addProduct([], product());
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(1);
    expect(cart[0].productId).toBe(1);
  });

  it('scanning the same product again bumps quantity, no duplicate row', () => {
    let cart = CartService.addProduct([], product());
    cart = CartService.addProduct(cart, product());
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it('keeps different products as separate rows', () => {
    let cart = CartService.addProduct([], product());
    cart = CartService.addProduct(cart, product({id: 2, barcode: 'X', name: 'Milk', price: 25}));
    expect(cart).toHaveLength(2);
  });

  it('snapshots the product business-adaptive attributes onto the cart line (Phase H)', () => {
    const cart = CartService.addProduct(
      [],
      product({attributes: {batch: 'DL2207', expiry: '12/26'}}),
    );
    expect(cart[0].attributes).toEqual({batch: 'DL2207', expiry: '12/26'});
  });

  it('manual lines carry no catalog attributes', () => {
    const cart = CartService.addManual([], {name: 'Loose dal', price: 60});
    expect(cart[0].attributes).toEqual({});
  });

  it('decrementing to zero removes the row', () => {
    const cart = CartService.addProduct([], product());
    // Product cart key is the barcode.
    const after = CartService.changeQuantity(cart, '8901234567890', -1);
    expect(after).toHaveLength(0);
  });

  it('removeItem drops the line', () => {
    const cart = CartService.addProduct([], product());
    expect(CartService.removeItem(cart, '8901234567890')).toHaveLength(0);
  });

  it('computes line total, grand total and item count', () => {
    const cart: CartItem[] = [
      {key: 'A', kind: 'product', productId: 1, barcode: 'A', name: 'A', price: 10, quantity: 2, unit: 'pcs', gstRate: 0, hsnCode: null, attributes: {}},
      {key: 'B', kind: 'product', productId: 2, barcode: 'B', name: 'B', price: 25, quantity: 1, unit: 'pcs', gstRate: 0, hsnCode: null, attributes: {}},
    ];
    expect(CartService.lineTotal(cart[0])).toBe(20);
    expect(CartService.total(cart)).toBe(45);
    expect(CartService.itemCount(cart)).toBe(3);
  });

  it('adds a manual (no-barcode) line: kind manual, no productId, own key', () => {
    const cart = CartService.addManual([], {name: 'Loose rice', price: 60});
    expect(cart).toHaveLength(1);
    expect(cart[0].kind).toBe('manual');
    expect(cart[0].productId).toBeNull();
    expect(cart[0].barcode).toBeNull();
    expect(cart[0].quantity).toBe(1);
    expect(cart[0].key).toBeTruthy();
  });

  it('adds a service line and keeps manual/service as separate rows', () => {
    let cart = CartService.addManual([], {name: 'Loose rice', price: 60});
    cart = CartService.addService(cart, {name: 'Repair', price: 200, gstRate: 18, hsnCode: '998713'});
    expect(cart).toHaveLength(2);
    expect(cart[1].kind).toBe('service');
    expect(cart[1].gstRate).toBe(18);
    // Each manual/service add is its own row (no merge).
    cart = CartService.addManual(cart, {name: 'Loose rice', price: 60});
    expect(cart).toHaveLength(3);
  });

  it('changes quantity and price of a manual line by its key', () => {
    const cart = CartService.addManual([], {name: 'Loose rice', price: 60});
    const key = cart[0].key;
    const bumped = CartService.changeQuantity(cart, key, +2);
    expect(bumped[0].quantity).toBe(3);
    const repriced = CartService.setPrice(bumped, key, 75);
    expect(repriced[0].price).toBe(75);
  });

  it('copies product units and supports decimal quantity steps', () => {
    const cart = CartService.addProduct([], product({unit: 'kg'}));
    expect(cart[0].unit).toBe('kg');

    const bumped = CartService.changeQuantity(cart, cart[0].key, 0.5);
    expect(bumped[0].quantity).toBe(1.5);

    const exact = CartService.setQuantity(bumped, cart[0].key, 1.25);
    expect(exact[0].quantity).toBe(1.25);
  });

  it('rounds decimal quantity drift and removes near zero', () => {
    const cart = CartService.addManual([], {
      name: 'Loose rice',
      price: 60,
      unit: 'kg',
      quantity: 0.3,
    });
    const stepped = CartService.changeQuantity(cart, cart[0].key, 0.1);
    expect(stepped[0].quantity).toBe(0.4);

    const removed = CartService.changeQuantity(stepped, cart[0].key, -0.4);
    expect(removed).toHaveLength(0);
  });
});
