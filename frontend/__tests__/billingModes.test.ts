/**
 * Billing mode helpers (Phase E) — pure, no DB.
 */
import {
  BILLING_MODE_OPTIONS,
  billingModeLabel,
  deriveBillingMode,
  DEFAULT_BILLING_MODE,
} from '../src/constants/billingModes';

describe('billing mode helpers', () => {
  it('derives a sensible default from what the shop sells', () => {
    expect(deriveBillingMode('product')).toBe('scan');
    expect(deriveBillingMode('service')).toBe('service');
    expect(deriveBillingMode('mixed')).toBe('mixed');
  });

  it('offers exactly the four billing modes', () => {
    expect(BILLING_MODE_OPTIONS.map(o => o.id)).toEqual([
      'scan',
      'list',
      'service',
      'mixed',
    ]);
  });

  it('labels modes and falls back safely', () => {
    expect(DEFAULT_BILLING_MODE).toBe('scan');
    expect(billingModeLabel('list')).toBe('List / Scanner-free');
    expect(billingModeLabel(null)).toBe('Scan / Barcode');
    expect(billingModeLabel('nope')).toBe('Scan / Barcode');
  });
});
