import {
  Tables,
  ProductColumns as C,
  BillColumns as B,
  BillItemColumns as BI,
  ShopProfileColumns as SP,
} from './schema';

/**
 * Versioned migration system.
 *
 * Why this exists: instead of a one-off "CREATE TABLE" we keep an ordered list
 * of migrations and a `schema_version` table that records what has already been
 * applied. Adding a new table later (bills, inventory, customers) = append a new
 * migration with the next version number. Existing installs only run the NEW
 * migrations, so no data is lost and nothing needs rewriting.
 *
 *   To add a table in a future phase:
 *     1. Append a new { version: N+1, name, up } entry below.
 *     2. Ship. On next launch runMigrations() runs only the pending ones.
 *   Never edit an already-released migration — always add a new one.
 */

/** Anything we can run SQL on: the DB itself or a transaction handle. */
export interface SqlRunner {
  execute(sql: string, params?: unknown[]): Promise<{ rows?: any[] }>;
}

export interface Migration {
  version: number;
  name: string;
  up: (tx: SqlRunner) => Promise<void>;
}

/** Ordered list of all migrations. Append-only. */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'create_products',
    up: async tx => {
      await tx.execute(
        `CREATE TABLE IF NOT EXISTS ${Tables.products} (
           ${C.id}         INTEGER PRIMARY KEY AUTOINCREMENT,
           ${C.barcode}    TEXT NOT NULL UNIQUE,
           ${C.name}       TEXT NOT NULL,
           ${C.price}      REAL NOT NULL,
           ${C.createdAt}  INTEGER NOT NULL
         );`,
      );
      // Index the barcode so scan lookups are instant even with many products.
      await tx.execute(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_${Tables.products}_${C.barcode}
           ON ${Tables.products} (${C.barcode});`,
      );
    },
  },

  {
    version: 2,
    name: 'create_bills',
    up: async tx => {
      // A saved bill (one per checkout). subtotal == total in Part 1 (no tax);
      // they are kept as separate columns so Phase 2 Part 2 can add GST between
      // them without another schema change.
      await tx.execute(
        `CREATE TABLE IF NOT EXISTS ${Tables.bills} (
           ${B.id}            INTEGER PRIMARY KEY AUTOINCREMENT,
           ${B.billNumber}    INTEGER NOT NULL UNIQUE,
           ${B.customerName}  TEXT,
           ${B.customerPhone} TEXT,
           ${B.subtotal}      REAL NOT NULL,
           ${B.total}         REAL NOT NULL,
           ${B.createdAt}     INTEGER NOT NULL
           -- Phase 2 Part 2: cgst REAL, sgst REAL, tax_total REAL go here.
         );`,
      );

      // Line items for a bill. name/price are SNAPSHOTS taken at sale time so a
      // saved bill never changes if the product is later edited/deleted.
      await tx.execute(
        `CREATE TABLE IF NOT EXISTS ${Tables.billItems} (
           ${BI.id}        INTEGER PRIMARY KEY AUTOINCREMENT,
           ${BI.billId}    INTEGER NOT NULL,
           ${BI.productId} INTEGER,
           ${BI.name}      TEXT NOT NULL,
           ${BI.price}     REAL NOT NULL,
           ${BI.quantity}  REAL NOT NULL,
           ${BI.lineTotal} REAL NOT NULL,
           FOREIGN KEY (${BI.billId}) REFERENCES ${Tables.bills}(${B.id})
             ON DELETE CASCADE,
           FOREIGN KEY (${BI.productId}) REFERENCES ${Tables.products}(${C.id})
             ON DELETE SET NULL
         );`,
      );

      // Fetching a bill's items is by bill_id — index it.
      await tx.execute(
        `CREATE INDEX IF NOT EXISTS idx_${Tables.billItems}_${BI.billId}
           ON ${Tables.billItems} (${BI.billId});`,
      );
    },
  },

  {
    version: 3,
    name: 'create_shop_profile',
    up: async tx => {
      // Single-row table holding the shop's setup/profile. gst_enabled is the
      // key flag the next part (GST billing) reads to decide bill type.
      await tx.execute(
        `CREATE TABLE IF NOT EXISTS ${Tables.shopProfile} (
           ${SP.id}          INTEGER PRIMARY KEY AUTOINCREMENT,
           ${SP.shopType}    TEXT NOT NULL,
           ${SP.shopName}    TEXT NOT NULL,
           ${SP.phone}       TEXT NOT NULL,
           ${SP.address}     TEXT,
           ${SP.gstEnabled}  INTEGER NOT NULL DEFAULT 0,
           ${SP.gstin}       TEXT,
           ${SP.state}       TEXT,
           ${SP.stateCode}   TEXT,
           ${SP.createdAt}   INTEGER NOT NULL,
           ${SP.updatedAt}   INTEGER NOT NULL
         );`,
      );
    },
  },

  {
    version: 4,
    name: 'add_gst_fields',
    up: async tx => {
      // GST billing. We EXTEND existing tables (ADD COLUMN) instead of
      // recreating them, so every product/bill saved before this migration
      // stays valid — the column defaults below describe those old rows
      // correctly (no GST rate, simple bill, zero tax).
      //
      // products: per-product GST rate + optional HSN code.
      await tx.execute(
        `ALTER TABLE ${Tables.products} ADD COLUMN ${C.gstRate} REAL NOT NULL DEFAULT 0;`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.products} ADD COLUMN ${C.hsnCode} TEXT;`,
      );

      // bills: bill type + customer GST identity + the tax breakup.
      // Existing rows default to a simple, intra-state, zero-tax bill.
      await tx.execute(
        `ALTER TABLE ${Tables.bills} ADD COLUMN ${B.billType} TEXT NOT NULL DEFAULT 'simple';`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.bills} ADD COLUMN ${B.customerGstin} TEXT;`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.bills} ADD COLUMN ${B.customerState} TEXT;`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.bills} ADD COLUMN ${B.customerStateCode} TEXT;`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.bills} ADD COLUMN ${B.isInterState} INTEGER NOT NULL DEFAULT 0;`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.bills} ADD COLUMN ${B.cgst} REAL NOT NULL DEFAULT 0;`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.bills} ADD COLUMN ${B.sgst} REAL NOT NULL DEFAULT 0;`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.bills} ADD COLUMN ${B.igst} REAL NOT NULL DEFAULT 0;`,
      );

      // bill_items: rate + HSN snapshot + computed tax for the line.
      await tx.execute(
        `ALTER TABLE ${Tables.billItems} ADD COLUMN ${BI.gstRate} REAL NOT NULL DEFAULT 0;`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.billItems} ADD COLUMN ${BI.hsnCode} TEXT;`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.billItems} ADD COLUMN ${BI.gstAmount} REAL NOT NULL DEFAULT 0;`,
      );
    },
  },

  // Phase 3: { version: 5, name: 'create_inventory', up: ... }
];

/**
 * Apply any migrations newer than what the DB has already seen.
 * Each migration runs inside its own transaction together with the
 * schema_version bump, so a partial/failed migration rolls back cleanly.
 */
export async function runMigrations(db: SqlRunner & {
  transaction: (fn: (tx: SqlRunner) => Promise<void>) => Promise<void>;
}): Promise<number> {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS ${Tables.schemaVersion} (
       version    INTEGER NOT NULL,
       name       TEXT NOT NULL,
       applied_at INTEGER NOT NULL
     );`,
  );

  const res = await db.execute(
    `SELECT MAX(version) AS v FROM ${Tables.schemaVersion};`,
  );
  const current: number = res.rows?.[0]?.v ?? 0;

  const pending = MIGRATIONS.filter(m => m.version > current).sort(
    (a, b) => a.version - b.version,
  );

  for (const m of pending) {
    await db.transaction(async tx => {
      await m.up(tx);
      await tx.execute(
        `INSERT INTO ${Tables.schemaVersion} (version, name, applied_at)
         VALUES (?, ?, ?);`,
        [m.version, m.name, Date.now()],
      );
    });
  }

  return pending.length > 0 ? pending[pending.length - 1].version : current;
}
