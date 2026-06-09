import {getDatabase} from '../db/database';
import {Tables, CustomerColumns as CU, BillColumns as B} from '../db/schema';
import type {
  Customer,
  CustomerWithPending,
  NewCustomerInput,
} from '../models/Customer';
import type {ICustomerRepository} from './ICustomerRepository';
import {SyncQueue} from '../services/sync/SyncQueue';

/**
 * op-sqlite implementation of ICustomerRepository (Phase F). Only place that
 * knows customer SQL. Pending udhaar is derived from the bills table by joining
 * on customer_id, so there's no denormalised balance to keep in sync.
 */
class CustomerRepository implements ICustomerRepository {
  private rowTo(row: any): Customer {
    return {
      id: Number(row[CU.id]),
      name: String(row[CU.name]),
      phone: String(row[CU.phone] ?? ''),
      createdAt: Number(row[CU.createdAt]),
      updatedAt: Number(row[CU.updatedAt]),
    };
  }

  async upsertByPhone(input: NewCustomerInput): Promise<Customer> {
    const db = await getDatabase();
    const now = Date.now();
    const name = input.name.trim();
    const phone = input.phone.trim();

    const existingRes = await db.execute(
      `SELECT * FROM ${Tables.customers} WHERE ${CU.phone} = ? LIMIT 1;`,
      [phone],
    );
    const existing = (existingRes.rows ?? [])[0];

    if (existing) {
      const id = Number(existing[CU.id]);
      // Keep the most recent name the shopkeeper typed for this number.
      const finalName = name || String(existing[CU.name]);
      await db.execute(
        `UPDATE ${Tables.customers}
           SET ${CU.name} = ?, ${CU.updatedAt} = ?
         WHERE ${CU.id} = ?;`,
        [finalName, now, id],
      );
      SyncQueue.upsert('customers', id);
      return {
        id,
        name: finalName,
        phone,
        createdAt: Number(existing[CU.createdAt]),
        updatedAt: now,
      };
    }

    const res = await db.execute(
      `INSERT INTO ${Tables.customers}
         (${CU.name}, ${CU.phone}, ${CU.createdAt}, ${CU.updatedAt})
       VALUES (?, ?, ?, ?);`,
      [name, phone, now, now],
    );
    const id = Number(res.insertId);
    SyncQueue.upsert('customers', id);
    return {id, name, phone, createdAt: now, updatedAt: now};
  }

  async getById(id: number): Promise<Customer | null> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT * FROM ${Tables.customers} WHERE ${CU.id} = ? LIMIT 1;`,
      [id],
    );
    const rows = res.rows ?? [];
    return rows.length > 0 ? this.rowTo(rows[0]) : null;
  }

  async getAllWithPending(): Promise<CustomerWithPending[]> {
    const db = await getDatabase();
    // LEFT JOIN so customers with no bills still appear; only unpaid bills add to
    // the pending sum. Pending-first, then most-recently-touched.
    const res = await db.execute(
      `SELECT c.*, COALESCE(SUM(
                CASE WHEN b.${B.paymentStatus} = 'unpaid' THEN b.${B.total} ELSE 0 END
              ), 0) AS pending
         FROM ${Tables.customers} c
         LEFT JOIN ${Tables.bills} b ON b.${B.customerId} = c.${CU.id}
        GROUP BY c.${CU.id}
        ORDER BY pending DESC, c.${CU.updatedAt} DESC;`,
    );
    return (res.rows ?? []).map(row => ({
      ...this.rowTo(row),
      pending: Number(row.pending ?? 0),
    }));
  }
}

/** Shared instance used across the app. */
export const customerRepository: ICustomerRepository = new CustomerRepository();
