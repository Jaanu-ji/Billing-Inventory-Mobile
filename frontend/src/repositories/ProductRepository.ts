import {getDatabase} from '../db/database';
import {Tables, ProductColumns as C} from '../db/schema';
import type {
  Product,
  NewProductInput,
  ProductUpdateInput,
} from '../models/Product';
import type {IProductRepository} from './IProductRepository';

/**
 * op-sqlite implementation of IProductRepository.
 *
 * This is the ONLY place that knows SQL for products. Map raw DB rows to the
 * Product model in one spot (rowToProduct) so column names never leak out.
 */
class ProductRepository implements IProductRepository {
  private rowToProduct(row: any): Product {
    return {
      id: Number(row[C.id]),
      barcode: String(row[C.barcode]),
      name: String(row[C.name]),
      price: Number(row[C.price]),
      // Older rows (pre-GST migration) read back as 0 / null via column defaults.
      gstRate: Number(row[C.gstRate] ?? 0),
      hsnCode: row[C.hsnCode] ?? null,
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
    const res = await db.execute(
      `INSERT INTO ${Tables.products}
         (${C.barcode}, ${C.name}, ${C.price}, ${C.gstRate}, ${C.hsnCode}, ${C.createdAt})
       VALUES (?, ?, ?, ?, ?, ?);`,
      [input.barcode, input.name.trim(), input.price, gstRate, hsnCode, createdAt],
    );
    return {
      id: Number(res.insertId),
      barcode: input.barcode,
      name: input.name.trim(),
      price: input.price,
      gstRate,
      hsnCode,
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
         SET ${C.name} = ?, ${C.price} = ?, ${C.gstRate} = ?, ${C.hsnCode} = ?
       WHERE ${C.id} = ?;`,
      [
        changes.name.trim(),
        changes.price,
        changes.gstRate ?? 0,
        changes.hsnCode?.trim() || null,
        id,
      ],
    );
  }

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM ${Tables.products} WHERE ${C.id} = ?;`, [id]);
  }
}

/**
 * Single shared instance used across the app. Import THIS in services/screens.
 * Typed as the interface so callers can't depend on SQL details.
 */
export const productRepository: IProductRepository = new ProductRepository();
