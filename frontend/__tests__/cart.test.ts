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

  it('decrementing to zero removes the row', () => {
    const cart = CartService.addProduct([], product());
    const after = CartService.changeQuantity(cart, '8901234567890', -1);
    expect(after).toHaveLength(0);
  });

  it('removeItem drops the line', () => {
    const cart = CartService.addProduct([], product());
    expect(CartService.removeItem(cart, '8901234567890')).toHaveLength(0);
  });

  it('computes line total, grand total and item count', () => {
    const cart: CartItem[] = [
      {productId: 1, barcode: 'A', name: 'A', price: 10, quantity: 2, gstRate: 0, hsnCode: null},
      {productId: 2, barcode: 'B', name: 'B', price: 25, quantity: 1, gstRate: 0, hsnCode: null},
    ];
    expect(CartService.lineTotal(cart[0])).toBe(20);
    expect(CartService.total(cart)).toBe(45);
    expect(CartService.itemCount(cart)).toBe(3);
  });
});
