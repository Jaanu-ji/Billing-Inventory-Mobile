import {getDatabase} from '../db/database';
import {Tables, ProductColumns as C} from '../db/schema';
import type {
  Product,
  NewProductInput,
  ProductUpdateInput,
} from '../models/Product';
import type {IProductRepository} from './IProductRepository';
import {SyncQueue} from '../services/sync/SyncQueue';

/**
 * op-sqlite implementation of IProductRepository.
 *
 * This is the ONLY place that knows SQL for products. Map raw DB rows to the
 * Product model in one spot (rowToProduct) so column names never leak out.
 */
class ProductRepository implements IProductRepository {
  /** Parse the JSON attributes blob; any bad/old value degrades to {}. */
  private parseAttributes(raw: unknown): Record<string, string> {
    if (typeof raw !== 'string' || raw.length === 0) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, string>)
        : {};
    } catch {
      return {};
    }
  }

  /** Serialise attributes for storage; empty => null (no blob). */
  private serialiseAttributes(attrs?: Record<string, string>): string | null {
    if (!attrs) {
      return null;
    }
    // Drop blank values so an all-empty map stores as null.
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(attrs)) {
      const t = typeof v === 'string' ? v.trim() : '';
      if (t) {
        cleaned[k] = t;
      }
    }
    return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null;
  }

  private rowToProduct(row: any): Product {
    return {
      id: Number(row[C.id]),
      barcode: String(row[C.barcode]),
      name: String(row[C.name]),
      price: Number(row[C.price]),
      // Older rows (pre-GST migration) read back as 0 / null via column defaults.
      gstRate: Number(row[C.gstRate] ?? 0),
      hsnCode: row[C.hsnCode] ?? null,
      // Pre-units rows (pre-v9) read back as 'pcs' via the column default.
      unit: row[C.unit] ?? 'pcs',
      // Adaptive fields (pre-v15 rows read back as null/{}).
      category: row[C.category] ?? null,
      attributes: this.parseAttributes(row[C.attributes]),
      createdAt: Number(row[C.createdAt]),
    };
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT * FROM ${Tables.products} WHERE ${C.barcode} = ? LIMIT 1;`,
      [barcode],
    );
    const rows = res.rows ?? [];
    return rows.length > 0 ? this.rowToProduct(rows[0]) : null;
  }

  async create(input: NewProductInput): Promise<Product> {
    const db = await getDatabase();
    const createdAt = Date.now();
    const gstRate = input.gstRate ?? 0;
    const hsnCode = input.hsnCode?.trim() || null;
    const unit = input.unit || 'pcs';
    const category = input.category?.trim() || null;
    const attributesJson = this.serialiseAttributes(input.attributes);
    const res = await db.execute(
      `INSERT INTO ${Tables.products}
         (${C.barcode}, ${C.name}, ${C.price}, ${C.gstRate}, ${C.hsnCode}, ${C.unit},
          ${C.category}, ${C.attributes}, ${C.createdAt})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        input.barcode,
        input.name.trim(),
        input.price,
        gstRate,
        hsnCode,
        unit,
        category,
        attributesJson,
        createdAt,
      ],
    );
    const id = Number(res.insertId);
    SyncQueue.upsert('products', id);
    return {
      id,
      barcode: input.barcode,
      name: input.name.trim(),
      price: input.price,
      gstRate,
      hsnCode,
      unit,
      category,
      attributes: this.parseAttributes(attributesJson),
      createdAt,
    };
  }

  async getAll(): Promise<Product[]> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT * FROM ${Tables.products} ORDER BY ${C.createdAt} DESC;`,
    );
    return (res.rows ?? []).map(r => this.rowToProduct(r));
  }

  async update(id: number, changes: ProductUpdateInput): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `UPDATE ${Tables.products}
         SET ${C.name} = ?, ${C.price} = ?, ${C.gstRate} = ?, ${C.hsnCode} = ?, ${C.unit} = ?,
             ${C.category} = ?, ${C.attributes} = ?
       WHERE ${C.id} = ?;`,
      [
        changes.name.trim(),
        changes.price,
        changes.gstRate ?? 0,
        changes.hsnCode?.trim() || null,
        changes.unit || 'pcs',
        changes.category?.trim() || null,
        this.serialiseAttributes(changes.attributes),
        id,
      ],
    );
    SyncQueue.upsert('products', id);
  }

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM ${Tables.products} WHERE ${C.id} = ?;`, [id]);
    SyncQueue.remove('products', id);
  }
}

/**
 * Single shared instance used across the app. Import THIS in services/screens.
 * Typed as the interface so callers can't depend on SQL details.
 */
export const productRepository: IProductRepository = new ProductRepository();
