import {
  Tables,
  ProductColumns as C,
  BillColumns as B,
  BillItemColumns as BI,
  ShopProfileColumns as SP,
  ManualItemColumns as MI,
  ServiceColumns as SV,
  CustomerColumns as CU,
  ParkedBillColumns as PB,
  AuthSessionColumns as AS,
  SyncQueueColumns as SQ,
  SyncMetaColumns as SM,
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

  {
    version: 5,
    name: 'add_business_mode',
    up: async tx => {
      // Phase C1: what the shop sells, driving the default billing flow later
      // (Phase C6). Additive ADD COLUMN with a safe default so every existing
      // profile reads back as a 'product' business — unchanged behaviour.
      await tx.execute(
        `ALTER TABLE ${Tables.shopProfile}
           ADD COLUMN ${SP.businessMode} TEXT NOT NULL DEFAULT 'product';`,
      );
    },
  },

  {
    version: 6,
    name: 'create_manual_items_and_item_kind',
    up: async tx => {
      // Phase C3: a small catalog of reusable no-barcode goods, so the manual
      // add modal can offer "reuse" of items typed before. Independent of
      // `products` (no barcode).
      await tx.execute(
        `CREATE TABLE IF NOT EXISTS ${Tables.manualItems} (
           ${MI.id}        INTEGER PRIMARY KEY AUTOINCREMENT,
           ${MI.name}      TEXT NOT NULL,
           ${MI.price}     REAL NOT NULL,
           ${MI.hsnCode}   TEXT,
           ${MI.gstRate}   REAL NOT NULL DEFAULT 0,
           ${MI.createdAt} INTEGER NOT NULL,
           ${MI.updatedAt} INTEGER NOT NULL
         );`,
      );
      // Reuse-lookup is by (case-insensitive) name — index it.
      await tx.execute(
        `CREATE INDEX IF NOT EXISTS idx_${Tables.manualItems}_${MI.name}
           ON ${Tables.manualItems} (${MI.name});`,
      );

      // Tag each saved bill line with what it is. Existing rows are products.
      await tx.execute(
        `ALTER TABLE ${Tables.billItems}
           ADD COLUMN ${BI.itemKind} TEXT NOT NULL DEFAULT 'product';`,
      );
    },
  },

  {
    version: 7,
    name: 'create_services',
    up: async tx => {
      // Phase C4: saved services for the quick-pick on a service line. Like a
      // product but with a SAC code instead of a barcode/HSN.
      await tx.execute(
        `CREATE TABLE IF NOT EXISTS ${Tables.services} (
           ${SV.id}        INTEGER PRIMARY KEY AUTOINCREMENT,
           ${SV.name}      TEXT NOT NULL,
           ${SV.price}     REAL NOT NULL,
           ${SV.sacCode}   TEXT,
           ${SV.gstRate}   REAL NOT NULL DEFAULT 0,
           ${SV.createdAt} INTEGER NOT NULL,
           ${SV.updatedAt} INTEGER NOT NULL
         );`,
      );
      await tx.execute(
        `CREATE INDEX IF NOT EXISTS idx_${Tables.services}_${SV.name}
           ON ${Tables.services} (${SV.name});`,
      );
    },
  },

  {
    version: 8,
    name: 'add_bill_item_sac_code',
    up: async tx => {
      // Phase C4: SAC code snapshot for service lines (HSN is for goods).
      await tx.execute(
        `ALTER TABLE ${Tables.billItems} ADD COLUMN ${BI.sacCode} TEXT;`,
      );
    },
  },

  {
    version: 9,
    name: 'add_units',
    up: async tx => {
      // Phase D: a selling unit on goods. Additive ADD COLUMN with a safe
      // default so every product/manual item/bill line saved before this
      // migration reads back as 'pcs' — unchanged behaviour. `quantity` is
      // already REAL (migration v2), so decimal quantities need no schema change.
      // Services carry no unit (per-job), so `services` is intentionally left out.
      await tx.execute(
        `ALTER TABLE ${Tables.products} ADD COLUMN ${C.unit} TEXT NOT NULL DEFAULT 'pcs';`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.billItems} ADD COLUMN ${BI.unit} TEXT NOT NULL DEFAULT 'pcs';`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.manualItems} ADD COLUMN ${MI.unit} TEXT NOT NULL DEFAULT 'pcs';`,
      );
    },
  },

  {
    version: 10,
    name: 'add_billing_mode',
    up: async tx => {
      // Phase E: the shop's remembered billing mode (scan/list/service/mixed).
      // Nullable — a NULL means "not chosen yet", so the app derives a default
      // from `business_mode`. Switching modes on the billing screen writes here,
      // so the next bill opens the same way. Existing profiles read back NULL =>
      // unchanged behaviour (derive from business_mode).
      await tx.execute(
        `ALTER TABLE ${Tables.shopProfile} ADD COLUMN ${SP.billingMode} TEXT;`,
      );
    },
  },

  {
    version: 11,
    name: 'create_customers',
    up: async tx => {
      // Phase F: saved customers for the udhaar (pending) ledger. Identified by
      // phone so a returning customer reuses the same row and their unpaid bills
      // accumulate against them.
      await tx.execute(
        `CREATE TABLE IF NOT EXISTS ${Tables.customers} (
           ${CU.id}        INTEGER PRIMARY KEY AUTOINCREMENT,
           ${CU.name}      TEXT NOT NULL,
           ${CU.phone}     TEXT NOT NULL,
           ${CU.createdAt} INTEGER NOT NULL,
           ${CU.updatedAt} INTEGER NOT NULL
         );`,
      );
      // Reuse-lookup + dedupe is by phone — index it.
      await tx.execute(
        `CREATE INDEX IF NOT EXISTS idx_${Tables.customers}_${CU.phone}
           ON ${Tables.customers} (${CU.phone});`,
      );
    },
  },

  {
    version: 12,
    name: 'add_bill_payment',
    up: async tx => {
      // Phase F: payment status + mode + customer link on each bill. Existing
      // bills were all completed sales, so they default to 'paid' (no udhaar)
      // with no mode and no linked customer — unchanged history.
      await tx.execute(
        `ALTER TABLE ${Tables.bills}
           ADD COLUMN ${B.paymentStatus} TEXT NOT NULL DEFAULT 'paid';`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.bills} ADD COLUMN ${B.paymentMode} TEXT;`,
      );
      // Nullable link to a saved customer (a walk-in cash sale has none).
      await tx.execute(
        `ALTER TABLE ${Tables.bills} ADD COLUMN ${B.customerId} INTEGER;`,
      );
      // Ledger queries fetch a customer's bills by customer_id — index it.
      await tx.execute(
        `CREATE INDEX IF NOT EXISTS idx_${Tables.bills}_${B.customerId}
           ON ${Tables.bills} (${B.customerId});`,
      );
    },
  },

  {
    version: 13,
    name: 'add_bill_discount_roundoff',
    up: async tx => {
      // Phase G: bill-level discount + round-off, stored as amounts on the bill.
      // Existing bills had neither, so both default to 0 — totals unchanged.
      await tx.execute(
        `ALTER TABLE ${Tables.bills} ADD COLUMN ${B.discount} REAL NOT NULL DEFAULT 0;`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.bills} ADD COLUMN ${B.roundOff} REAL NOT NULL DEFAULT 0;`,
      );
    },
  },

  {
    version: 14,
    name: 'create_parked_bills',
    up: async tx => {
      // Phase G: held/parked in-progress bills so the counter can serve another
      // customer and resume later. The cart is stored as JSON (CartItem[]); a
      // resume parses it back and deletes the row.
      await tx.execute(
        `CREATE TABLE IF NOT EXISTS ${Tables.parkedBills} (
           ${PB.id}        INTEGER PRIMARY KEY AUTOINCREMENT,
           ${PB.label}     TEXT NOT NULL,
           ${PB.itemCount} REAL NOT NULL,
           ${PB.total}     REAL NOT NULL,
           ${PB.itemsJson} TEXT NOT NULL,
           ${PB.createdAt} INTEGER NOT NULL
         );`,
      );
    },
  },

  {
    version: 15,
    name: 'add_product_adaptive_fields',
    up: async tx => {
      // Phase H: business-adaptive product fields. `category` + a free-form JSON
      // `attributes` blob (medical batch/expiry, garment size/colour, …) so the
      // product form can adapt per shop type without a column per business.
      // `default_unit` on the profile seeds the unit for new products.
      // All additive + nullable, so existing rows are unaffected.
      await tx.execute(
        `ALTER TABLE ${Tables.products} ADD COLUMN ${C.category} TEXT;`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.products} ADD COLUMN ${C.attributes} TEXT;`,
      );
      await tx.execute(
        `ALTER TABLE ${Tables.shopProfile} ADD COLUMN ${SP.defaultUnit} TEXT;`,
      );
    },
  },

  {
    version: 16,
    name: 'add_bill_item_attributes',
    up: async tx => {
      // Phase H: snapshot the product's business-adaptive attributes (medical
      // batch/expiry, garment size/colour, …) onto the bill line as a JSON blob,
      // so the saved bill / invoice can show them and a later product edit never
      // changes a past bill. Additive + nullable — existing lines read back null
      // (=> no attributes), unchanged behaviour.
      await tx.execute(
        `ALTER TABLE ${Tables.billItems} ADD COLUMN ${BI.attributes} TEXT;`,
      );
    },
  },

  {
    version: 17,
    name: 'create_auth_session',
    up: async tx => {
      // Phase J: the persisted login session (single row, like shop_profile).
      // Lets the shopkeeper stay signed in across launches so billing keeps
      // working fully offline after the one-time phone-OTP login. `user_id` is
      // also the owner key that Phase K sync will tag every cloud row with.
      await tx.execute(
        `CREATE TABLE IF NOT EXISTS ${Tables.authSession} (
           ${AS.id}          INTEGER PRIMARY KEY AUTOINCREMENT,
           ${AS.userId}      TEXT NOT NULL,
           ${AS.phone}       TEXT NOT NULL,
           ${AS.displayName} TEXT,
           ${AS.signedInAt}  INTEGER NOT NULL
         );`,
      );
    },
  },

  {
    version: 18,
    name: 'create_sync_outbox',
    up: async tx => {
      // Phase K: the cloud-sync OUTBOX. Every local write to a synced table
      // appends (table, row_id, op) here; the SyncEngine drains it to Supabase
      // when online + configured. Local DB stays the source of truth, so billing
      // never waits on the network. The op's payload is fetched live from the
      // table at push time (so repeated edits coalesce to the latest state).
      await tx.execute(
        `CREATE TABLE IF NOT EXISTS ${Tables.syncQueue} (
           ${SQ.id}        INTEGER PRIMARY KEY AUTOINCREMENT,
           ${SQ.tableName} TEXT NOT NULL,
           ${SQ.rowId}     INTEGER NOT NULL,
           ${SQ.op}        TEXT NOT NULL,
           ${SQ.createdAt} INTEGER NOT NULL,
           ${SQ.attempts}  INTEGER NOT NULL DEFAULT 0
         );`,
      );
      // Fast lookup of pending ops per table/row (used by push + pull-skip).
      await tx.execute(
        `CREATE INDEX IF NOT EXISTS idx_${Tables.syncQueue}_target
           ON ${Tables.syncQueue} (${SQ.tableName}, ${SQ.rowId});`,
      );
      // Per-table pull cursor: the cloud updated_at of the newest row we've
      // already pulled, so each pull only fetches what changed since.
      await tx.execute(
        `CREATE TABLE IF NOT EXISTS ${Tables.syncMeta} (
           ${SM.tableName}    TEXT PRIMARY KEY,
           ${SM.lastPulledAt} INTEGER NOT NULL DEFAULT 0
         );`,
      );
    },
  },

  // Phase 3 stock: { version: N, name: 'add_product_stock', up: ... }
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
