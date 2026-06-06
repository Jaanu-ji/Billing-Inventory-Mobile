/**
 * Invoice PDF template tests — pure HTML builder, no native renderer.
 * Covers a simple (kacha) bill and both GST cases (intra-state CGST/SGST and
 * inter-state IGST), plus phone-number normalisation for WhatsApp.
 */
import {buildBillHtml} from '../src/services/PdfService';
import {toWhatsAppNumber} from '../src/services/ShareService';
import type {Bill, BillItem} from '../src/models/Bill';
import type {ShopProfile} from '../src/models/ShopProfile';

const profile: ShopProfile = {
  id: 1,
  shopType: 'kirana',
  shopName: 'Sharma Kirana',
  phone: '9876543210',
  address: 'Main Bazaar, Indore',
  gstEnabled: true,
  gstin: '23ABCDE1234F1Z5',
  state: 'Madhya Pradesh',
  stateCode: '23',
  createdAt: 1,
  updatedAt: 1,
};

const item = (over: Partial<BillItem> = {}): BillItem => ({
  id: 1,
  billId: 1,
  productId: 10,
  name: 'Parle-G Biscuit',
  price: 10,
  quantity: 2,
  lineTotal: 20,
  gstRate: 0,
  hsnCode: null,
  gstAmount: 0,
  ...over,
});

const baseBill = (over: Partial<Bill> = {}): Bill => ({
  id: 1,
  billNumber: 42,
  customerName: null,
  customerPhone: null,
  subtotal: 20,
  total: 20,
  createdAt: Date.now(),
  billType: 'simple',
  customerGstin: null,
  customerState: null,
  customerStateCode: null,
  isInterState: false,
  cgst: 0,
  sgst: 0,
  igst: 0,
  items: [item()],
  ...over,
});

describe('buildBillHtml — simple bill', () => {
  const html = buildBillHtml(baseBill(), profile);

  it('renders an INVOICE (not a TAX INVOICE) with shop + bill meta', () => {
    expect(html).toContain('INVOICE');
    expect(html).not.toContain('TAX INVOICE');
    expect(html).toContain('Sharma Kirana');
    expect(html).toContain('#42');
    expect(html).toContain('Parle-G Biscuit');
  });

  it('shows a Subtotal and no GST sections', () => {
    expect(html).toContain('Subtotal');
    expect(html).not.toContain('CGST');
    expect(html).not.toContain('SGST');
    expect(html).not.toContain('IGST');
    expect(html).not.toContain('Taxable value');
  });

  it('always thanks the customer', () => {
    expect(html).toContain('Thank you');
  });
});

describe('buildBillHtml — GST bill (intra-state)', () => {
  const bill = baseBill({
    billType: 'gst',
    customerName: 'Ramesh',
    customerGstin: '23PQRSX9876G1Z2',
    customerState: 'Madhya Pradesh',
    customerStateCode: '23',
    isInterState: false,
    subtotal: 100,
    cgst: 9,
    sgst: 9,
    total: 118,
    items: [
      item({name: 'Cooking Oil', price: 100, quantity: 1, lineTotal: 100, gstRate: 18, hsnCode: '1507', gstAmount: 18}),
    ],
  });
  const html = buildBillHtml(bill, profile);

  it('renders a TAX INVOICE with CGST + SGST and no IGST', () => {
    expect(html).toContain('TAX INVOICE');
    expect(html).toContain('CGST');
    expect(html).toContain('SGST');
    expect(html).not.toContain('IGST');
  });

  it('shows HSN, per-line GST rate, customer GSTIN and place of supply', () => {
    expect(html).toContain('1507');
    expect(html).toContain('18%');
    expect(html).toContain('23PQRSX9876G1Z2');
    expect(html).toContain('Place of supply');
    expect(html).toContain('Madhya Pradesh');
  });

  it('includes the GST declaration line', () => {
    expect(html).toContain('Declaration');
  });
});

describe('buildBillHtml — GST bill (inter-state)', () => {
  const bill = baseBill({
    billType: 'gst',
    customerState: 'Maharashtra',
    customerStateCode: '27',
    isInterState: true,
    subtotal: 100,
    igst: 18,
    total: 118,
    items: [item({price: 100, quantity: 1, lineTotal: 100, gstRate: 18, gstAmount: 18})],
  });
  const html = buildBillHtml(bill, profile);

  it('renders IGST and not CGST/SGST', () => {
    expect(html).toContain('IGST');
    expect(html).not.toContain('CGST');
    expect(html).not.toContain('SGST');
  });
});

describe('buildBillHtml — escaping & no-profile', () => {
  it('escapes HTML in user fields', () => {
    const html = buildBillHtml(
      baseBill({customerName: 'A & <b>Co</b>', items: [item({name: 'Pen <x>'})]}),
      profile,
    );
    expect(html).toContain('A &amp; &lt;b&gt;Co&lt;/b&gt;');
    expect(html).toContain('Pen &lt;x&gt;');
  });

  it('renders without a profile (falls back gracefully)', () => {
    const html = buildBillHtml(baseBill(), null);
    expect(html).toContain('#42');
    expect(html).toContain('Invoice'); // generic header
  });
});

describe('toWhatsAppNumber', () => {
  it('prefixes 91 to a bare 10-digit mobile', () => {
    expect(toWhatsAppNumber('9876543210')).toBe('919876543210');
    expect(toWhatsAppNumber('98765 43210')).toBe('919876543210');
  });
  it('strips a leading 0 trunk prefix', () => {
    expect(toWhatsAppNumber('09876543210')).toBe('919876543210');
  });
  it('keeps a number that already has a country code', () => {
    expect(toWhatsAppNumber('919876543210')).toBe('919876543210');
    expect(toWhatsAppNumber('+91 98765 43210')).toBe('919876543210');
  });
  it('returns null for unusable input', () => {
    expect(toWhatsAppNumber('')).toBeNull();
    expect(toWhatsAppNumber(null)).toBeNull();
    expect(toWhatsAppNumber('123')).toBeNull();
  });
});
