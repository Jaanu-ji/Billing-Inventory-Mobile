# Bill App — Phase 1 + Phase 2 (billing MVP: cart, shop profile, GST bills, PDF share)

A barcode-based billing app for retail shops (kirana, medical, garment, etc.).
Fully offline, no backend, no AI. **The core billing MVP is complete**: scan → cart →
simple/GST bill → save → history → **PDF + WhatsApp / share**.

- **Phase 1 (done):** core barcode engine — scan → recognize → show the correct
  product, with a product catalog (add/edit/delete).
- **Phase 2 Part 1 (done):** billing core — scan items into a cart, live total,
  checkout and **save a simple bill locally**, plus bill history.
- **Phase 2 Part 2 (done):** **shop setup / profile** — first-launch setup (shop
  type, name, phone, address, GST toggle + GSTIN/state), a Settings screen to edit
  it, the bill header shows shop name/phone/GSTIN, and the `gstEnabled` flag is
  wired through the data layer.
- **Phase 2 — GST billing (done):** for a GST-registered shop, generate
  **GST-compliant (pakka) bills** with **CGST/SGST** (intra-state) or **IGST**
  (inter-state). Products carry a **GST rate** (0/5/12/18/28) + optional **HSN**;
  the shopkeeper chooses **GST bill or Simple bill per sale**, and the bill detail
  shows the full tax breakup. A non-GST shop is completely unchanged (simple bills
  only — no GST options shown).
- **Phase 2 — bill sharing (done):** generate a clean **A4 PDF invoice** for any saved
  bill (one template handles simple + GST) and **share it via the system share sheet
  (WhatsApp, etc.)** — from a **Share / PDF** button on the bill detail, or as an optional
  **Share now** step right after checkout. Saving a bill never depends on sharing.

---

## What it does

**First launch — Shop Setup (Phase 2 Part 2):**
0. On first run (no profile yet) the app opens **Set up your shop**: pick a shop
   type (Kirana, Medical, Garment, …), enter name + phone (+ optional address), and
   a **GST toggle** — if on, enter GSTIN + state. Saved locally; you land on Billing.
   Edit anytime from **⚙ Settings**.

A **bottom tab bar** is always visible to switch between the four everyday screens —
**🧾 Billing** (home/default), **📁 Bills**, **📦 Products**, **⚙️ Settings**. The app
always opens straight to the Billing tab.

**Billing (Phase 2 — home/default tab):**
1. **New Bill:** camera scans items into a running **cart**. Known barcode → added
   to cart; same code again → **quantity +1**. Unknown barcode → reuse the Phase 1
   "add product" popup, then it's added to the cart.
   A **🔦 Flash** toggle sits on the camera (both the billing scanner and the Products
   scan screen) so you can scan in poor light — shown only on devices that have a torch.
2. Adjust quantity (+ / −) or remove a line; a **live grand total** is always shown.
3. **Checkout:** optional customer name + phone → saves a bill (auto bill number,
   items, total, date) locally → cart clears for the next customer.
4. **Bills:** history of every saved bill; tap one to see full detail — with a
   **shop header** (name / phone / GSTIN) on top. ("khud ke paas bill rahe.")

**GST billing (Phase 2 — only when the shop's GST toggle is ON):**
- Each product gets a **GST rate** (0/5/12/18/28) + optional **HSN code**, set in the
  add/edit product form. A non-GST shop never sees these fields.
- At **checkout** the shopkeeper picks **GST bill** or **Simple bill** for that sale.
  For a GST bill they can optionally add the customer's **GSTIN** and **place of supply**
  (state). The modal shows a **live tax preview**.
- Tax is computed in a pure service function (`GstService.calculateBillTotals`):
  **intra-state** (customer in the shop's state, or no state given) → **CGST + SGST**
  (each half the rate); **inter-state** → a single **IGST**. All rounded to 2 decimals.
- The **bill detail** of a GST bill shows a **TAX INVOICE** badge, place of supply,
  customer GSTIN (if given), per-line HSN + rate, taxable value, CGST/SGST or IGST,
  and the grand total. Simple bills look exactly as before.

**Sharing a bill (Phase 2 — works for any saved bill):**
6. On a bill's detail, tap **Share / PDF** → a clean **A4 PDF invoice** is generated to
   the app's cache and the **system share sheet** opens (WhatsApp, Gmail, Drive, Bluetooth…).
   If the bill has a customer phone, a **WhatsApp** button opens **that number's chat
   directly** (Truecaller-style) with a bill-summary message ready to send. (A WhatsApp
   deep link can't pre-attach the PDF — use **Share / PDF** to send the actual file.)
   The same is offered as an optional **Share now** right after checkout. The PDF renders
   correctly for **both** a simple bill (plain invoice) and a GST bill (TAX INVOICE with HSN,
   per-line GST rate, CGST/SGST or IGST, place of supply and a declaration line).

**Catalog (Phase 1):**
7. **Products:** list of saved products with **Edit** / **Delete**; **+ Scan** opens
   the scan screen to recognise/add products. Unknown barcode → name + price form.
   **Known barcode → an "Already in catalog" card with an ✏️ Edit button** that updates
   the **same** product (price / GST / HSN) — so the same item is never entered twice.

Repeated reads of the same barcode are debounced (~2s) so one physical scan = one add.

### Not built yet (intentionally left out)
Thermal-printer printout (a later add-on — `PdfService` / bill data can be reused;
see the `// Future: thermal print …` comments), e-invoicing / IRN / QR and GSTR export
(not needed for small shops), email automation, inventory/stock (→ Phase 3),
backend/cloud/sync (→ Phase 4), AI bill-photo reading. The code is structured so these
plug in without restructuring.

---

## Tech stack & key choices

| Area | Choice | Version | Why |
|------|--------|---------|-----|
| Framework | React Native (CLI, not Expo) | 0.85.3 | Latest stable; New Architecture on by default |
| Local DB | **`@op-engineering/op-sqlite`** | 16.2.0 | Most actively maintained, fastest (JSI, no bridge) SQLite for RN; native New-Arch support |
| Camera/scan | **`react-native-vision-camera`** + `useCodeScanner` | **4.7.3** | The documented, stable code-scanner standard. (v5.x is a brand-new Nitro rewrite that removed `useCodeScanner` and is not yet the stable standard, so we pinned to v4.) |
| Navigation | `@react-navigation/native` + native-stack + **bottom-tabs** | 7.x | Bottom tab bar (Billing / Bills / Products / Settings); BillDetail + Scan push above the tabs. bottom-tabs is pure JS. |
| PDF invoice | **`react-native-html-to-pdf`** (`generatePDF`) | **1.3.0** | HTML template → PDF. 1.x is a **TurboModule** rewrite (New-Arch native), revived Sep 2025 by the original maintainer; API is the named `generatePDF(options)` (the old `RNHTMLtoPDF.convert` is gone). Renders to the scoped Documents dir (no storage permission). |
| Share / WhatsApp | **`react-native-share`** | **12.3.1** | System share sheet (`Share.open`) sends the PDF file (pick contact). Direct-to-number WhatsApp uses a `whatsapp://send?phone=` deep link (Linking, `wa.me` fallback) — opens that chat directly with a text summary; a deep link can't pre-attach a file. |
| Language | TypeScript | 5.x | Typed models/interfaces |

---

## Run instructions (Android)

> Prerequisites already verified on this machine: Node, JDK 17 (via `JAVA_HOME`),
> Android SDK + adb. You just need a device/emulator.

1. **Connect a device** (recommended — real camera for barcodes):
   enable Developer options → USB debugging, plug in, then check:
   ```powershell
   adb devices        # your device should be listed
   ```
   (Or start an Android emulator.)

2. **Start Metro** (bundler) in one terminal:
   ```powershell
   npm start
   ```

3. **Build & install** on the device in a second terminal:
   ```powershell
   npm run android
   ```

4. **First launch:** the app opens on **New Bill**. Allow the camera permission,
   then point at barcodes:
   - scan items → cart fills, total grows → **Done · Checkout** → save bill
   - new code → enter name + price → it's added to the cart
   - use the **bottom tabs** to reach Bills (history), Products (catalog) and Settings.

### Useful commands
```powershell
npm test         # run unit tests (validation, debounce, scan flow)
npm run lint     # eslint
npx tsc --noEmit # type-check
```

> Note: This Phase is offline. The `INTERNET` permission stays in the manifest
> only because Metro serves the JS bundle over the network in **debug** builds.

---

## Data model (local SQLite)

**`products`** (Phase 1, GST cols added in migration v4):

| Column       | Type    | Notes                          |
|--------------|---------|--------------------------------|
| `id`         | INTEGER | primary key, autoincrement     |
| `barcode`    | TEXT    | unique, **indexed** (instant lookup) |
| `name`       | TEXT    | product name                   |
| `price`      | REAL    | selling price (taxable value)  |
| `gst_rate`   | REAL    | GST slab 0/5/12/18/28, default 0 (**v4**) |
| `hsn_code`   | TEXT    | nullable HSN/SAC code (**v4**) |
| `created_at` | INTEGER | epoch millis                   |

**`bills`** (Phase 2 — migration v2; GST cols added in v4):

| Column                 | Type    | Notes                                   |
|------------------------|---------|-----------------------------------------|
| `id`                   | INTEGER | primary key                             |
| `bill_number`          | INTEGER | unique, sequential (human bill no.; GST requirement) |
| `customer_name`        | TEXT    | nullable                                |
| `customer_phone`       | TEXT    | nullable                                |
| `subtotal`             | REAL    | taxable value (sum of line taxable values) |
| `total`                | REAL    | = subtotal + cgst + sgst + igst         |
| `created_at`           | INTEGER | epoch millis                            |
| `bill_type`            | TEXT    | `'simple'` or `'gst'`, default `'simple'` (**v4**) |
| `customer_gstin`       | TEXT    | nullable, GST bill only (**v4**)        |
| `customer_state`       | TEXT    | nullable, place-of-supply state name (**v4**) |
| `customer_state_code`  | TEXT    | nullable, GST state code (**v4**)       |
| `is_inter_state`       | INTEGER | 0/1, default 0 (**v4**)                 |
| `cgst` / `sgst`        | REAL    | intra-state tax, default 0 (**v4**)     |
| `igst`                 | REAL    | inter-state tax, default 0 (**v4**)     |

**`bill_items`** (Phase 2 — migration v2; GST cols added in v4):

| Column       | Type    | Notes                                       |
|--------------|---------|---------------------------------------------|
| `id`         | INTEGER | primary key                                 |
| `bill_id`    | INTEGER | FK → `bills.id` (ON DELETE CASCADE), **indexed** |
| `product_id` | INTEGER | FK → `products.id`, nullable (ON DELETE SET NULL) |
| `name`       | TEXT    | **snapshot** of name at sale time           |
| `price`      | REAL    | **snapshot** of unit price (taxable value) at sale time |
| `quantity`   | REAL    | quantity sold                               |
| `line_total` | REAL    | price × quantity (taxable value)            |
| `gst_rate`   | REAL    | **snapshot** GST rate, default 0 (**v4**)   |
| `hsn_code`   | TEXT    | **snapshot** HSN code, nullable (**v4**)    |
| `gst_amount` | REAL    | GST charged on the line, default 0 (**v4**) |

> Name/price/GST-rate/HSN are snapshotted into `bill_items` so a saved bill never
> changes even if the product is later edited or deleted.

**`shop_profile`** (Phase 2 Part 2 — migration v3, single row):

| Column        | Type    | Notes                                  |
|---------------|---------|----------------------------------------|
| `id`          | INTEGER | primary key                            |
| `shop_type`   | TEXT    | category id (see `constants/shopTypes`) |
| `shop_name`   | TEXT    | required                               |
| `phone`       | TEXT    | required                               |
| `address`     | TEXT    | nullable                               |
| `gst_enabled` | INTEGER | 0/1 — the flag GST billing will read   |
| `gstin`       | TEXT    | nullable (only when GST on)            |
| `state`       | TEXT    | nullable (state name)                  |
| `state_code`  | TEXT    | nullable (GST state code)              |
| `created_at`  | INTEGER | epoch millis                           |
| `updated_at`  | INTEGER | epoch millis                           |

Schema is built through a **versioned migration system** (`src/db/migrations.ts`)
that records applied versions in a `schema_version` table. Bills were added as
migration **v2**, shop profile as **v3**, and the GST fields as **v4** (additive
`ALTER TABLE ADD COLUMN` with defaults) — existing products and bills stay valid.

---

## Folder structure

```
src/
  screens/        SetupScreen, SettingsScreen,                          (Phase 2 Part 2)
                  BillingScreen, BillHistoryScreen, BillDetailScreen,   (Phase 2)
                  ScanScreen, ProductsScreen                            (Phase 1)
  components/      PrimaryButton, ProductFormModal, MatchedCard, ProductListItem,
                   CameraScanner, CartItemRow, CheckoutModal,
                   SelectField, ProfileForm
  db/              database.ts, migrations.ts (v1 products, v2 bills, v3 profile, v4 GST), schema.ts
  repositories/    IProductRepository + ProductRepository,
                   IBillRepository + BillRepository,
                   IProfileRepository + ProfileRepository   (op-sqlite)
  services/        ScanService (scan+debounce), CartService (pure cart),
                   ProfileService (profile + isGstEnabled flag),
                   GstService (pure CGST/SGST/IGST calculator),
                   PdfService (pure buildBillHtml + generateBillPdf),
                   ShareService (system share sheet + WhatsApp)
  models/          Product, Bill / BillItem / CartItem, ShopProfile
  navigation/      AppNavigator (root stack + bottom tabs), types (RootStack + MainTab param lists)
  utils/           validation, debounce (TimeGate), format (price + date)
  constants/       config, theme, shopTypes, states, gst (slabs + bill types)
```

**Layering:** `screens → services → repositories → db`.
UI never touches SQL directly — it goes through the repository **interface**.
Cart state lives in the billing screen; cart math is pure (`CartService`) and the
save path goes through `BillRepository`. The shop profile is read via
`ProfileService` (cached); `ProfileService.isGstEnabled()` is the single clean
flag the next part (GST billing) reads.

---

## Phase 2 / later — where things plug in

The skeleton is built so later phases drop in without restructuring. Look for
`// Phase N:` comments in the code marking each extension point.

- **Phase 2 Part 1 — Billing (DONE):** `Bill`/`BillItem`/`CartItem` models,
  `BillRepository`, `CartService`, Billing/History/Detail screens, `bills`/`bill_items`
  migration (v2).
- **Phase 2 Part 2 — Shop setup / profile (DONE):** `ShopProfile` model,
  `ProfileRepository` + `ProfileService`, Setup + Settings screens, `shop_profile`
  migration (v3), shop header on bills, and the `gstEnabled` flag exposed via
  `ProfileService.isGstEnabled()`.
- **Phase 2 — GST billing (DONE):** `GstService.calculateBillTotals` (pure
  CGST/SGST/IGST), GST fields on products/bills/bill_items (migration **v4**),
  per-product GST rate + HSN in the product form, bill-type choice + customer
  GSTIN/state at checkout, and the GST breakup on `BillDetailScreen`. Reads the
  shop's GST flag via `ProfileService.isGstEnabled()` — never hardcoded.
- **Phase 2 — bill sharing (DONE):** `PdfService` (pure `buildBillHtml` + `generateBillPdf`)
  and `ShareService` (system share sheet + WhatsApp) in the service layer; a **Share / PDF**
  button on `BillDetailScreen` and an optional **Share now** after checkout. The PDF renders
  the GST fields already stored on the bill. **Thermal print** plugs in here later — reuse
  `PdfService` / the bill data (see the `// Future: thermal print …` comments in both services).
- **Phase 3 — Inventory:** add stock fields / `inventory` table + `InventoryRepository`.
- **AI bill-photo reading:** a new `services/ai` module feeds parsed items through
  the existing repositories.
- **Phase 4 — Express + cloud sync (multi-device + backup):** implement a new
  class against the **same `IProductRepository` interface** (local + remote).
  Screens stay untouched; only the repository internals and a sync hook in
  `db/database.ts` change.
