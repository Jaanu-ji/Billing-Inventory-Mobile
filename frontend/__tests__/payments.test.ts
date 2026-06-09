/**
 * Payment helpers (Phase F) — pure, no DB.
 */
import {
  DEFAULT_PAYMENT_STATUS,
  PAYMENT_MODE_OPTIONS,
  paymentModeLabel,
  isUnpaid,
} from '../src/constants/payments';

describe('payment helpers', () => {
  it('defaults a new bill to paid', () => {
    expect(DEFAULT_PAYMENT_STATUS).toBe('paid');
  });

  it('offers cash / UPI / card modes', () => {
    expect(PAYMENT_MODE_OPTIONS.map(o => o.id)).toEqual(['cash', 'upi', 'card']);
  });

  it('labels a mode and falls back to empty', () => {
    expect(paymentModeLabel('upi')).toBe('UPI / QR');
    expect(paymentModeLabel(null)).toBe('');
    expect(paymentModeLabel('cheque')).toBe('');
  });

  it('detects an outstanding (udhaar) bill', () => {
    expect(isUnpaid('unpaid')).toBe(true);
    expect(isUnpaid('paid')).toBe(false);
    expect(isUnpaid(null)).toBe(false);
  });
});
