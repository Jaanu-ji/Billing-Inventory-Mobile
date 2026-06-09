/**
 * Invoice PDF template tests — pure HTML builder, no native renderer.
 * Covers a simple (kacha) bill and both GST cases (intra-state CGST/SGST and
 * inter-state IGST), plus phone-number normalisation for WhatsApp.
 */
import {buildBillHtml} from '../src/services/PdfService';
import {toWhatsAppNumber, toSimpleBill} from '../src/services/ShareService';
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
  businessMode: 'product',
  billingMode: null,
  defaultUnit: null,
  createdAt: 1,
  updatedAt: 1,
};

const item = (over: Partial<BillItem> = {}): BillItem => ({
  id: 1,
  billId: 1,
  productId: 10,
  kind: 'product',
  name: 'Parle-G Biscuit',
  price: 10,
  quantity: 2,
  unit: 'pcs',
  lineTotal: 20,
  gstRate: 0,
  hsnCode: null,
  sacCode: null,
  gstAmount: 0,
  attributes: {},
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
  discount: 0,
  roundOff: 0,
  paymentStatus: 'paid',
  paymentMode: null,
  customerId: null,
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

describe('toSimpleBill — read-only GST→simple transform', () => {
  const gstBill = baseBill({
    billType: 'gst',
    isInterState: false,
    subtotal: 100,
    cgst: 9,
    sgst: 9,
    total: 118,
    items: [
      item({name: 'Cooking Oil', price: 100, quantity: 1, lineTotal: 100, gstRate: 18, hsnCode: '1507', gstAmount: 18}),
    ],
  });

  it('does not mutate the original GST bill', () => {
    const before = JSON.stringify(gstBill);
    toSimpleBill(gstBill);
    expect(JSON.stringify(gstBill)).toBe(before);
  });

  it('produces a simple bill whose total still equals what the customer paid', () => {
    const simple = toSimpleBill(gstBill);
    expect(simple.billType).toBe('simple');
    expect(simple.total).toBe(118);
    expect(simple.subtotal).toBe(118); // no tax shown: subtotal == total
    expect(simple.cgst).toBe(0);
    expect(simple.sgst).toBe(0);
    expect(simple.igst).toBe(0);
    // Line price is now tax-inclusive (118 paid for the single unit).
    expect(simple.items?.[0].lineTotal).toBe(118);
    expect(simple.items?.[0].gstRate).toBe(0);
  });

  it('renders as a plain INVOICE (no TAX INVOICE / GST sections)', () => {
    const html = buildBillHtml(toSimpleBill(gstBill), profile);
    expect(html).not.toContain('TAX INVOICE');
    expect(html).not.toContain('CGST');
    expect(html).toContain('Subtotal');
  });

  it('returns a non-GST bill unchanged', () => {
    const simple = baseBill();
    expect(toSimpleBill(simple)).toBe(simple);
  });
});

describe('buildBillHtml — mixed bill (products + services) [C5]', () => {
  const mixed = baseBill({
    billType: 'gst',
    subtotal: 300,
    cgst: 18,
    sgst: 18,
    total: 336,
    items: [
      item({name: 'Cooking Oil', kind: 'product', price: 100, quantity: 1, lineTotal: 100, gstRate: 18, hsnCode: '1507', gstAmount: 18}),
      item({name: 'Screen Repair', kind: 'service', price: 200, quantity: 1, lineTotal: 200, gstRate: 18, sacCode: '998713', gstAmount: 36}),
    ],
  });
  const html = buildBillHtml(mixed, profile);

  it('labels Products and Services sections', () => {
    expect(html).toContain('Products');
    expect(html).toContain('Services');
  });

  it('uses an HSN/SAC column and shows each line its own code', () => {
    expect(html).toContain('HSN/SAC');
    expect(html).toContain('1507'); // product HSN
    expect(html).toContain('998713'); // service SAC
  });

  it('does NOT add section headers for a single-kind bill', () => {
    const productsOnly = buildBillHtml(baseBill(), profile);
    expect(productsOnly).not.toContain('Services');
  });
});

describe('buildBillHtml — units [D]', () => {
  it('shows quantity with unit for goods', () => {
    const bill = baseBill({
      items: [
        item({
          name: 'Loose rice',
          price: 60,
          quantity: 1.5,
          unit: 'kg',
          lineTotal: 90,
        }),
      ],
    });
    const html = buildBillHtml(bill, profile);
    expect(html).toContain('1.5 kg');
  });

  it('keeps service quantity unit-less', () => {
    const bill = baseBill({
      items: [
        item({
          name: 'Screen Repair',
          kind: 'service',
          price: 200,
          quantity: 1,
          unit: 'pcs',
          lineTotal: 200,
          sacCode: '998713',
        }),
      ],
    });
    const html = buildBillHtml(bill, profile);
    expect(html).toContain('Screen Repair');
    expect(html).not.toContain('1 pcs');
  });
});

describe('buildBillHtml — business-adaptive attributes [H]', () => {
  const medical: ShopProfile = {...profile, shopType: 'medical'};

  it('shows labelled batch/expiry under a medical bill line', () => {
    const bill = baseBill({
      items: [
        item({
          name: 'Crocin 500',
          price: 30,
          quantity: 1,
          unit: 'strip',
          lineTotal: 30,
          attributes: {batch: 'DL2207', expiry: '12/26'},
        }),
      ],
    });
    const html = buildBillHtml(bill, medical);
    expect(html).toContain('Batch no.: DL2207');
    expect(html).toContain('Expiry: 12/26');
  });

  it('adds no attribute sub-line when the line carries none', () => {
    const html = buildBillHtml(baseBill(), medical);
    expect(html).not.toContain('class="attrs"');
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
