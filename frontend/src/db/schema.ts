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
  // Phase 3: inventory. Phase 4: syncQueue.
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
} as const;
