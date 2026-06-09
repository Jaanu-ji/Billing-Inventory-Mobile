/**
 * Pure-logic tests (no native modules) covering the Phase 1 data flow:
 * validation, scan debounce, price formatting and the scan service.
 */
import {validateProductForm} from '../src/utils/validation';
import {TimeGate} from '../src/utils/debounce';
import {formatPrice} from '../src/utils/format';
import {ScanService} from '../src/services/ScanService';
import type {IProductRepository} from '../src/repositories/IProductRepository';
import type {Product, NewProductInput} from '../src/models/Product';

describe('validateProductForm', () => {
  it('rejects empty name and non-numeric price', () => {
    const r = validateProductForm({name: '  ', priceText: 'abc'});
    expect(r.valid).toBe(false);
    expect(r.errors.name).toBeDefined();
    expect(r.errors.price).toBeDefined();
  });

  it('rejects negative price', () => {
    const r = validateProductForm({name: 'X', priceText: '-5'});
    expect(r.valid).toBe(false);
    expect(r.errors.price).toBeDefined();
  });

  it('accepts a valid name and price', () => {
    const r = validateProductForm({name: 'Parle-G', priceText: '10.5'});
    expect(r.valid).toBe(true);
    expect(r.price).toBe(10.5);
  });
});

describe('TimeGate (scan debounce)', () => {
  it('blocks the same key within the gap and allows after it', () => {
    const gate = new TimeGate(2000);
    expect(gate.shouldPass('A', 0)).toBe(true);
    expect(gate.shouldPass('A', 500)).toBe(false);
    expect(gate.shouldPass('A', 2500)).toBe(true);
  });

  it('treats different keys independently', () => {
    const gate = new TimeGate(2000);
    expect(gate.shouldPass('A', 0)).toBe(true);
    expect(gate.shouldPass('B', 100)).toBe(true);
  });
});

describe('formatPrice', () => {
  it('drops trailing zeros and adds the currency symbol', () => {
    expect(formatPrice(10)).toBe('₹10');
    expect(formatPrice(10.5)).toBe('₹10.50');
  });
});

// In-memory fake repository so we can test the scan flow without SQLite.
class FakeRepo implements IProductRepository {
  private items: Product[] = [];
  private seq = 1;
  async findByBarcode(barcode: string) {
    return this.items.find(p => p.barcode === barcode) ?? null;
  }
  async create(input: NewProductInput) {
    const p: Product = {
      id: this.seq++,
      ...input,
      gstRate: input.gstRate ?? 0,
      hsnCode: input.hsnCode ?? null,
      unit: input.unit ?? 'pcs',
      category: input.category ?? null,
      attributes: input.attributes ?? {},
      createdAt: Date.now(),
    };
    this.items.push(p);
    return p;
  }
  async getAll() {
    return [...this.items];
  }
  async update() {}
  async delete() {}
}

describe('ScanService flow', () => {
  it('unknown -> save -> known', async () => {
    const repo = new FakeRepo();
    const svc = new ScanService(repo, 2000);

    const first = await svc.handleScan('8901234567890');
    expect(first.type).toBe('unknown');

    await svc.saveNewProduct({
      barcode: '8901234567890',
      name: 'Test',
      price: 42,
    });

    // Same code is debounced immediately after the first scan...
    const dup = await svc.handleScan('8901234567890');
    expect(dup.type).toBe('ignored');

    // ...but a fresh service (or after the window) recognises it.
    const svc2 = new ScanService(repo, 2000);
    const known = await svc2.handleScan('8901234567890');
    expect(known.type).toBe('known');
    if (known.type === 'known') {
      expect(known.product.name).toBe('Test');
      expect(known.product.price).toBe(42);
    }
  });
});
