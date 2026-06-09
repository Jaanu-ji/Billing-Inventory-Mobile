/**
 * Central place for table/column names so SQL strings and mappers never drift.
 * When future tables are added (bills, bill_items, inventory, customers) put
 * their names here too.
 */
export const Tables = {
  products: 'products',
  schemaVersion: 'schema_version',
  bills: 'bills',
  billItems: 'bill_items',
  shopProfile: 'shop_profile',
  // Phase C3/C4: reusable no-barcode goods + saved services.
  manualItems: 'manual_items',
  services: 'services',
  // Phase F: saved customers (udhaar ledger).
  customers: 'customers',
  // Phase G: held/parked in-progress bills.
  parkedBills: 'parked_bills',
  // Phase J: the persisted login session (single row).
  authSession: 'auth_session',
  // Phase K: cloud-sync outbox + per-table pull cursors.
  syncQueue: 'sync_queue',
  syncMeta: 'sync_meta',
  // Phase 3: inventory.
} as const;

export const ProductColumns = {
  id: 'id',
  barcode: 'barcode',
  name: 'name',
  price: 'price',
  createdAt: 'created_at',
  // GST billing (migration v4):
  gstRate: 'gst_rate',
  hsnCode: 'hsn_code',
  // Selling unit (migration v9): pcs/kg/litre/... default 'pcs'.
  unit: 'unit',
  // Business-adaptive fields (migration v15): category + JSON attributes
  // (e.g. medical batch/expiry, garment size/colour).
  category: 'category',
  attributes: 'attributes',
} as const;

export const BillColumns = {
  id: 'id',
  billNumber: 'bill_number',
  customerName: 'customer_name',
  customerPhone: 'customer_phone',
  subtotal: 'subtotal',
  total: 'total',
  createdAt: 'created_at',
  // GST billing (migration v4). subtotal stays the taxable value; the taxes sit
  // between subtotal and total, so total = subtotal + cgst + sgst + igst.
  billType: 'bill_type',
  customerGstin: 'customer_gstin',
  customerState: 'customer_state',
  customerStateCode: 'customer_state_code',
  isInterState: 'is_inter_state',
  cgst: 'cgst',
  sgst: 'sgst',
  igst: 'igst',
  // Payments + udhaar ledger (migration v12).
  paymentStatus: 'payment_status',
  paymentMode: 'payment_mode',
  customerId: 'customer_id',
  // Bill-level discount + round-off (migration v13).
  discount: 'discount',
  roundOff: 'round_off',
} as const;

export const CustomerColumns = {
  id: 'id',
  name: 'name',
  phone: 'phone',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

export const ParkedBillColumns = {
  id: 'id',
  label: 'label',
  itemCount: 'item_count',
  total: 'total',
  /** JSON-serialised CartItem[]. */
  itemsJson: 'items_json',
  createdAt: 'created_at',
} as const;

export const BillItemColumns = {
  id: 'id',
  billId: 'bill_id',
  productId: 'product_id',
  name: 'name',
  price: 'price',
  quantity: 'quantity',
  lineTotal: 'line_total',
  // GST billing (migration v4): rate + HSN snapshotted at sale time, plus the
  // computed tax amount for this line.
  gstRate: 'gst_rate',
  hsnCode: 'hsn_code',
  gstAmount: 'gst_amount',
  // Line kind (migration v6) + SAC code for services (migration v8).
  itemKind: 'item_kind',
  sacCode: 'sac_code',
  // Selling unit snapshot (migration v9).
  unit: 'unit',
  // Business-adaptive attributes snapshot (migration v16): JSON blob of the
  // product's batch/expiry, size/colour, … so the bill can show them.
  attributes: 'attributes',
} as const;

export const ManualItemColumns = {
  id: 'id',
  name: 'name',
  price: 'price',
  hsnCode: 'hsn_code',
  gstRate: 'gst_rate',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  // Selling unit (migration v9).
  unit: 'unit',
} as const;

export const ServiceColumns = {
  id: 'id',
  name: 'name',
  price: 'price',
  sacCode: 'sac_code',
  gstRate: 'gst_rate',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

export const AuthSessionColumns = {
  id: 'id',
  userId: 'user_id',
  phone: 'phone',
  displayName: 'display_name',
  signedInAt: 'signed_in_at',
} as const;

export const SyncQueueColumns = {
  id: 'id',
  /** Local table this op targets (e.g. 'products'). */
  tableName: 'table_name',
  /** The local row id the op refers to. */
  rowId: 'row_id',
  /** 'upsert' | 'delete'. */
  op: 'op',
  createdAt: 'created_at',
  /** Push attempts so far (for backoff / poison detection). */
  attempts: 'attempts',
} as const;

export const SyncMetaColumns = {
  /** Synced table name (PK). */
  tableName: 'table_name',
  /** Cloud `updated_at` (epoch millis) of the last row pulled for this table. */
  lastPulledAt: 'last_pulled_at',
} as const;

export const ShopProfileColumns = {
  id: 'id',
  shopType: 'shop_type',
  shopName: 'shop_name',
  phone: 'phone',
  address: 'address',
  gstEnabled: 'gst_enabled',
  gstin: 'gstin',
  state: 'state',
  stateCode: 'state_code',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  // Business mode (migration v5): product | service | mixed.
  businessMode: 'business_mode',
  // Billing mode (migration v10): scan | list | service | mixed (nullable; null => derive).
  billingMode: 'billing_mode',
  // Shop's default selling unit for new products (migration v15; null => pcs).
  defaultUnit: 'default_unit',
} as const;
