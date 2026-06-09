/**
 * GST calculation tests — pure logic, no DB / UI.
 * Covers: simple bills (no tax), intra-state CGST/SGST split, inter-state IGST,
 * the "no customer state => intra-state" default, mixed rates and rounding.
 */
import {calculateBillTotals, type TaxableLine} from '../src/services/GstService';
import {isValidGstRate, GST_SLABS} from '../src/constants/gst';

const line = (over: Partial<TaxableLine> = {}): TaxableLine => ({
  price: 100,
  quantity: 1,
  gstRate: 18,
  ...over,
});

describe('isValidGstRate', () => {
  it('accepts every defined slab and rejects others', () => {
    for (const r of GST_SLABS) {
      expect(isValidGstRate(r)).toBe(true);
    }
    expect(isValidGstRate(7)).toBe(false);
    expect(isValidGstRate(100)).toBe(false);
  });
});

describe('calculateBillTotals — simple bill (no tax)', () => {
  it('charges no tax and total equals the taxable value', () => {
    const t = calculateBillTotals([line({gstRate: 18, quantity: 2})], '27', '27', false);
    expect(t.subtotal).toBe(200);
    expect(t.cgst).toBe(0);
    expect(t.sgst).toBe(0);
    expect(t.igst).toBe(0);
    expect(t.taxTotal).toBe(0);
    expect(t.total).toBe(200);
    expect(t.isInterState).toBe(false);
  });
});

describe('calculateBillTotals — intra-state (CGST + SGST)', () => {
  it('splits GST into equal CGST and SGST halves', () => {
    const t = calculateBillTotals([line({price: 100, quantity: 1, gstRate: 18})], '27', '27', true);
    expect(t.subtotal).toBe(100);
    expect(t.cgst).toBe(9);
    expect(t.sgst).toBe(9);
    expect(t.igst).toBe(0);
    expect(t.taxTotal).toBe(18);
    expect(t.total).toBe(118);
    expect(t.isInterState).toBe(false);
  });

  it('treats a missing customer state as intra-state (place of supply = shop)', () => {
    const t = calculateBillTotals([line({gstRate: 12})], '27', null, true);
    expect(t.isInterState).toBe(false);
    expect(t.cgst).toBe(6);
    expect(t.sgst).toBe(6);
    expect(t.igst).toBe(0);
  });
});

describe('calculateBillTotals — inter-state (IGST)', () => {
  it('charges a single IGST equal to the full rate', () => {
    const t = calculateBillTotals([line({price: 100, quantity: 1, gstRate: 18})], '27', '07', true);
    expect(t.isInterState).toBe(true);
    expect(t.igst).toBe(18);
    expect(t.cgst).toBe(0);
    expect(t.sgst).toBe(0);
    expect(t.total).toBe(118);
  });
});

describe('calculateBillTotals — mixed rates, quantities and rounding', () => {
  it('sums per-line taxable values and taxes correctly', () => {
    const items: TaxableLine[] = [
      {price: 100, quantity: 2, gstRate: 18}, // taxable 200, gst 36
      {price: 50, quantity: 1, gstRate: 5}, //  taxable 50,  gst 2.5
      {price: 10, quantity: 3, gstRate: 0}, //  taxable 30,  gst 0
    ];
    const t = calculateBillTotals(items, '27', '27', true);
    expect(t.subtotal).toBe(280);
    // total gst = 38.5 => cgst/sgst = 19.25 each
    expect(t.cgst).toBe(19.25);
    expect(t.sgst).toBe(19.25);
    expect(t.taxTotal).toBe(38.5);
    expect(t.total).toBe(318.5);
    expect(t.lines[0].gstAmount).toBe(36);
    expect(t.lines[1].gstAmount).toBe(2.5);
    expect(t.lines[2].gstAmount).toBe(0);
  });

  it('keeps cgst + sgst exactly equal to the total GST when halving is uneven', () => {
    // 5% of 99 = 4.95 -> half is 2.475; cgst rounds to 2.48, sgst = 4.95 - 2.48 = 2.47
    const t = calculateBillTotals([{price: 99, quantity: 1, gstRate: 5}], '27', '27', true);
    expect(t.taxTotal).toBe(4.95);
    expect(t.cgst + t.sgst).toBeCloseTo(4.95, 2);
    expect(t.total).toBe(103.95);
  });

  it('rounds line taxable value to 2 decimals', () => {
    const t = calculateBillTotals([{price: 33.333, quantity: 3, gstRate: 0}], '27', '27', true);
    expect(t.lines[0].taxableValue).toBe(100);
    expect(t.subtotal).toBe(100);
  });
});

describe('calculateBillTotals — discount + round-off (Phase G)', () => {
  it('applies a percent discount on the payable', () => {
    // simple bill, 200 payable, 10% off => save 20, total 180.
    const t = calculateBillTotals([line({price: 100, quantity: 2})], '27', '27', false, {
      discountType: 'percent',
      discountValue: 10,
    });
    expect(t.subtotal).toBe(200);
    expect(t.discount).toBe(20);
    expect(t.total).toBe(180);
  });

  it('applies a flat rupee discount, clamped to the payable', () => {
    const t = calculateBillTotals([line({price: 100, quantity: 1, gstRate: 0})], '27', '27', false, {
      discountType: 'rupees',
      discountValue: 250, // more than the bill => clamp to 100
    });
    expect(t.discount).toBe(100);
    expect(t.total).toBe(0);
  });

  it('discounts the tax-inclusive payable on a GST bill', () => {
    // 100 + 18 GST = 118 payable; 18% off 118 = 21.24; total 96.76.
    const t = calculateBillTotals([line({price: 100, quantity: 1, gstRate: 18})], '27', '27', true, {
      discountType: 'percent',
      discountValue: 18,
    });
    expect(t.taxTotal).toBe(18);
    expect(t.discount).toBe(21.24);
    expect(t.total).toBe(96.76);
  });

  it('rounds the final total to the nearest rupee and reports the delta', () => {
    // 103.95 payable, round-off => 104, delta +0.05.
    const t = calculateBillTotals([{price: 99, quantity: 1, gstRate: 5}], '27', '27', true, {
      roundOff: true,
    });
    expect(t.total).toBe(104);
    expect(t.roundOff).toBeCloseTo(0.05, 2);
  });

  it('combines discount then round-off', () => {
    // 200 payable, 10% off => 180, round-off keeps 180 (already whole).
    const t = calculateBillTotals([line({price: 100, quantity: 2})], '27', '27', false, {
      discountType: 'percent',
      discountValue: 10,
      roundOff: true,
    });
    expect(t.discount).toBe(20);
    expect(t.roundOff).toBe(0);
    expect(t.total).toBe(180);
  });

  it('no adjustments => discount and roundOff are zero (unchanged)', () => {
    const t = calculateBillTotals([line({price: 100, quantity: 1, gstRate: 0})], '27', '27', false);
    expect(t.discount).toBe(0);
    expect(t.roundOff).toBe(0);
    expect(t.total).toBe(100);
  });
});
