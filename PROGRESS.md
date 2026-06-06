# Bill App — PROGRESS / Handoff

> Single source of truth to resume work in a new session without asking anything.
> Last updated: 2026-06-05.

---

## 1. What this project is

A **barcode-based billing app for retail shops** (kirana, medical, garment, footwear,
sports, hardware, electronics, restaurant, etc.). The shopkeeper scans products,
builds a cart, and saves bills — **fully offline, on-device**. Built in **phases**;
each phase has a tightly-scoped spec and we only build the current phase.

---

## 2. Tech stack

| Area | Choice | Version | Notes |
|------|--------|---------|-------|
| Framework | React Native (CLI, **not** Expo) | **0.85.3** | New Architecture ON by default |
| React | react | 19.2.3 | |
| Local DB | **`@op-engineering/op-sqlite`** | 16.2.0 | JSI-based, fastest + most maintained SQLite for RN |
| Camera / scan | **`react-native-vision-camera`** + `useCodeScanner` | **4.7.3** (pinned) | ⚠️ Do NOT bump to v5 — v5 is a Nitro rewrite that **removed `useCodeScanner`**. v4 is the stable, documented code-scanner. |
| Navigation | `@react-navigation/native` + `native-stack` + **`bottom-tabs`** | 7.x | Root stack hosts a **bottom-tab** bar (Billing / Bills / Products / Settings); BillDetail + Scan push above the tabs. bottom-tabs is pure JS. |
| PDF invoice | **`react-native-html-to-pdf`** + `generatePDF()` | **1.3.0** | 1.x is a **TurboModule rewrite** (New-Arch native), revived Sep 2025 by the original maintainer. API is the named `generatePDF(options)` (not the old `RNHTMLtoPDF.convert`). HTML template → PDF. |
| Share / WhatsApp | **`react-native-share`** | **12.3.1** | Actively maintained; system share sheet (`Share.open`) + WhatsApp (`shareSingle`, `Social.Whatsapp`). ⚠️ v12 **dropped `whatsAppNumber`** — can't both attach a PDF and pre-target a number. |
| Helpers | `react-native-screens`, `react-native-safe-area-context` | latest | |
| Language | TypeScript | 5.x | strict-ish, fully typed |

**Why op-sqlite over nitro-sqlite:** most actively maintained, JSI (no bridge),
native New-Architecture support, clean async `execute()` / `transaction()` API.

---

## 3. Repo layout

```
C:\BanaoBanao\Bill\               <- project root
├── PROGRESS.md                   <- this file
├── README.md                     <- short root overview
├── claude_code_prompt_bill_app.md <- original Phase 1 brief
├── frontend/                     <- the entire React Native app (all current code)
└── backend/                      <- EMPTY placeholder for Phase 4 (Express + cloud sync)
```

> The whole app lives in **`frontend/`**. `backend/` is intentionally empty until
> Phase 4. Always run commands from inside `frontend/`.

### `frontend/src/` (layered architecture)

```
src/
  screens/        SetupScreen, SettingsScreen,                       (Phase 2 Part 2)
                  BillingScreen, BillHistoryScreen, BillDetailScreen, (Phase 2 Part 1)
                  ScanScreen, ProductsScreen                          (Phase 1)
  components/      PrimaryButton, ProductFormModal, MatchedCard, ProductListItem,
                   CameraScanner, CartItemRow, CheckoutModal, SelectField, ProfileForm
  db/              database.ts (open + migrate), migrations.ts (v1/v2/v3/v4), schema.ts
  repositories/    IProductRepository + ProductRepository
                   IBillRepository    + BillRepository
                   IProfileRepository + ProfileRepository
  services/        ScanService (scan + debounce), CartService (pure cart math),
                   ProfileService (cached profile + isGstEnabled() flag),
                   GstService (pure CGST/SGST/IGST calculator),
                   PdfService (pure buildBillHtml() + generateBillPdf()),
                   ShareService (system share sheet + WhatsApp, composes PdfService)
  models/          Product, Bill / BillItem / CartItem, ShopProfile
  navigation/      AppNavigator, types
  utils/           validation, debounce (TimeGate), format (price + date)
  constants/       config, theme, shopTypes, states, gst (slabs + bill types)
__tests__/         logic.test.ts, cart.test.ts, profile.test.ts, gst.test.ts, pdf.test.ts
__mocks__/         op-sqlite.ts, react-native-html-to-pdf.ts, react-native-share.ts
                   (Jest stubs so pure-logic tests run off-device)
```

**Layering rule (do not break):** `screens → services → repositories → db`.
UI **never** touches SQL directly — it always goes through a repository **interface**.
This is what lets Phase 4 swap in a cloud-sync repository without touching screens.

---

## 4. How to run

Prereqs already verified on this machine: Node v24.15, **JDK 17** (via `JAVA_HOME`;
note PATH `java` is JDK 25 but Gradle uses `JAVA_HOME`), Android SDK + adb.
You only need a connected device/emulator.

```powershell
cd C:\BanaoBanao\Bill\frontend
adb devices            # confirm a device is listed
npm start              # terminal 1: Metro bundler
npx react-native run-android   # terminal 2 (same as `npm run android`)
```

Quality gates (all green as of this update):
```powershell
npx tsc --noEmit   # 0 errors
npm test           # 39/39 pass
npm run lint       # 0 errors (cosmetic warnings only)
```

> ⚠️ **Not yet verified on a physical device** — no Android device was connected
> during development. Code, types, tests, and native config are all done; the first
> `run-android` is the remaining real-device check. Native config that's already
> applied: CAMERA permission (AndroidManifest), `minSdkVersion=26`,
> `VisionCamera_enableCodeScanner=true`, iOS `NSCameraUsageDescription`.

---

## 5. What's DONE and tested

### ✅ Phase 1 — Barcode engine (offline catalog)
- Camera scan screen (`ScanScreen`) with live barcode/QR detection (vision-camera).
- Unknown barcode → popup to enter **name + price** → saved to `products`.
- Known barcode → an **"ALREADY IN CATALOG"** card showing the product (name / price /
  GST) with a **✏️ Edit** button → opens the edit form pre-filled and **updates the same
  product** (price / GST / HSN). No duplicate entry is ever created (barcode is `UNIQUE`
  in the DB; the scan flow never inserts for a known code). Edit-on-scan is also where
  **Phase 3 inventory/stock** editing will plug in.
- `ProductsScreen`: list all products, **edit / delete**; **+ Scan** header button.
- ~2s per-barcode debounce (`TimeGate`) so one physical scan = one event.
- Camera permission handling, input validation.
- **🔦 Flash / torch toggle** (`components/TorchButton`) on both camera surfaces
  (`CameraScanner` + `ScanScreen`) for low-light scanning — `<Camera torch>` prop,
  shown only when `device.hasTorch`; torch forced off whenever the camera pauses.

### ✅ Phase 2 Part 1 — Billing core
- `BillingScreen` (home): scan items into a **cart**. Known → add; **same code again
  → qty +1**; unknown → reuse Phase 1 add-product popup, then add to cart.
- Per-line qty stepper (+ / −) and remove; **live grand total** at the bottom.
- **Checkout** (`CheckoutModal`): optional customer name + phone → saves a bill →
  cart clears. Empty cart can't checkout.
- `BillHistoryScreen` (list of saved bills) → `BillDetailScreen` (full bill).
- Cart math is pure (`CartService`); save path goes through `BillRepository`
  (bill + items written in **one transaction**).

### ✅ Phase 2 Part 2 — Shop setup / profile
- First-launch **`SetupScreen`** (shown only when no profile): shop type (from
  `constants/shopTypes`), name, phone, address, **GST toggle** → GSTIN + state
  (from `constants/states`, GST state codes). Saves and resets stack to Billing.
- **`SettingsScreen`** to edit the profile later (⚙ in the Billing header).
  Setup + Settings share one `ProfileForm`.
- Single-row `shop_profile` table; `ProfileRepository.save()` is an upsert.
- `ProfileService` caches the profile and exposes **`isGstEnabled()`** — the clean
  flag GST billing reads.
- `App.tsx` decides the start route on launch: **Setup** if no profile, else **Main**
  (the tabbed app, which opens on the Billing tab; safe default Main if the lookup ever
  fails — never blank/crash).
- `BillDetailScreen` shows a **shop header** (name / type / phone / GSTIN).
- Reusable `SelectField` (dependency-free modal dropdown) for shop type + state.

### ✅ Phase 2 — GST billing
- **`GstService.calculateBillTotals(items, shopStateCode, customerStateCode, isGstBill)`**
  — a **pure, unit-tested** calculator (no UI/DB). price = taxable value, tax added
  on top. **Intra-state** (customer in shop's state, or no customer state) → CGST+SGST
  (each half the rate); **inter-state** → IGST (full rate); simple bill → no tax. All
  values `round2`. Returns `{subtotal, cgst, sgst, igst, taxTotal, total, isInterState, lines[]}`.
- **Per-product GST**: `gst_rate` (slabs 0/5/12/18/28, from `constants/gst`) + optional
  `hsn_code` on products. The product add/edit form (`ProductFormModal`) shows a GST-rate
  dropdown + HSN field **only when the shop is GST-registered** (`showGst` prop); a
  non-GST shop's form is unchanged (just name + price).
- **Checkout** (`CheckoutModal`): for a GST shop, a **GST bill / Simple bill** segmented
  choice per sale (defaults to GST); a GST bill optionally captures customer **GSTIN** +
  **place of supply** (state) and shows a **live tax preview**. Non-GST shop = old flow.
- **Bill detail**: GST bills show a **TAX INVOICE** badge, place of supply, customer
  GSTIN, per-line HSN + rate, taxable value, CGST/SGST or IGST, grand total. Simple
  bills unchanged.
- GST fields snapshotted into `bill_items` (rate/HSN/gst_amount) like name/price.
  Bill number stays sequential & unique (GST requirement). Reads gst_enabled via
  `ProfileService` — never hardcoded.

### ✅ Phase 2 — Bill sharing (PDF + WhatsApp)  ← completes the billing MVP
- **`PdfService`**: `buildBillHtml(bill, profile)` is a **pure, unit-tested** function
  that shapes Bill/BillItem/ShopProfile into a clean **A4 HTML invoice** (shop header +
  GSTIN, bill no./date, bill-to + customer GSTIN, items table, totals, footer). One
  template handles **both** bill types — `TAX INVOICE` + HSN/GST-rate columns +
  CGST/SGST-or-IGST + place of supply + declaration for **GST** bills; plain
  `INVOICE` + subtotal for **simple** bills. User fields are HTML-escaped.
  `generateBillPdf()` renders it via `generatePDF()` to the app's **internal cache dir**
  (no `directory` option → no storage permission; cache is temporary so invoices never
  clutter the device). ⚠️ **Keep it in cache:** react-native-share's bundled FileProvider
  only exposes the cache dir + external `Download/`; a PDF written to external
  files/Documents can't be turned into a shareable `content://` URI and the share
  **silently fails on Android 7+**. The recipient still sees `invoice-<billNumber>.pdf`
  (set via the share `filename`).
- **`ShareService`** (composes `PdfService`): `shareBill()` → **system share sheet**
  (`Share.open`, WhatsApp/Gmail/Drive/etc. appear — the only way to attach the PDF file
  is to pick the contact there); `whatsAppBill()` → opens the customer's WhatsApp chat
  **directly** (Truecaller-style `whatsapp://send?phone=<number>` deep link, `wa.me`
  https fallback; `toWhatsAppNumber()` = +91 default) with a **bill-summary text**
  pre-filled. ⚠️ A WhatsApp deep link **can't pre-attach a file** (platform limit) — so
  direct-to-number = text summary; the PDF file goes via `shareBill` (pick contact). The
  `whatsapp://` direct open needs a **`<queries>`** block in AndroidManifest (added) for
  Android 11+ package visibility. A user-cancelled file share is **not** an error.
- **Triggers:** a **"Share / PDF"** button (+ a green **"WhatsApp <name>"** when the
  bill has a customer phone) on **`BillDetailScreen`** — works for any past bill; and an
  optional **"Share now"** in the post-checkout "Bill saved" alert on `BillingScreen`.
  **Saving never depends on sharing** — share can always be done later from Bills.
- No PDF/share logic in the UI — screens only call the two services. Marked
  `// Future: thermal print and cloud backup can reuse PdfService / bill data here`.

### Test coverage (Jest, pure logic — no device needed)
- `logic.test.ts` — product validation, `TimeGate` debounce, price format, scan flow.
- `cart.test.ts` — add/qty+1/decrement-to-remove/totals/item count.
- `profile.test.ts` — profile validation incl. conditional GST fields.
- `gst.test.ts` — slab validation, simple/intra-state/inter-state totals, no-customer-state
  default, mixed rates + rounding (CGST+SGST == total GST).
- `pdf.test.ts` — `buildBillHtml` for simple + GST (intra/inter-state) bills (right doc
  type, HSN/rate, CGST/SGST vs IGST, GSTIN, place of supply, declaration), HTML escaping,
  no-profile fallback; `toWhatsAppNumber` normalisation.
- **39 tests total, all passing.** (Native PDF/share modules are mocked in `__mocks__`.)

---

## 6. Data model & migrations

Versioned migration system in `src/db/migrations.ts` (append-only `MIGRATIONS`
array; applied versions tracked in a `schema_version` table). **Never edit a
released migration — always append a new one.** Adding a new table later = new entry.

| Migration | Tables | Phase |
|-----------|--------|-------|
| **v1** `create_products` | `products` | Phase 1 |
| **v2** `create_bills` | `bills`, `bill_items` | Phase 2 Part 1 |
| **v3** `create_shop_profile` | `shop_profile` | Phase 2 Part 2 |
| **v4** `add_gst_fields` | ALTER `products`/`bills`/`bill_items` (ADD COLUMN) | Phase 2 GST |

**`products`**: `id`, `barcode` (unique, indexed), `name`, `price`, `created_at`,
**+v4** `gst_rate` (REAL default 0), `hsn_code` (TEXT?).

**`bills`**: `id`, `bill_number` (unique, sequential human no.), `customer_name?`,
`customer_phone?`, `subtotal` (= taxable value), `total` (= subtotal + taxes),
`created_at`, **+v4** `bill_type` ('simple'/'gst'), `customer_gstin?`, `customer_state?`,
`customer_state_code?`, `is_inter_state` (0/1), `cgst`, `sgst`, `igst`.

**`bill_items`**: `id`, `bill_id` (FK→bills, CASCADE, indexed), `product_id?`
(FK→products, SET NULL), `name`, `price`, `quantity`, `line_total`, **+v4** `gst_rate`,
`hsn_code?`, `gst_amount`.
→ name/price/gst_rate/HSN are **snapshots** at sale time, so a saved bill never changes
if the product is later edited/deleted. **v4 is additive ADD COLUMN with defaults — old
products/bills stay valid.**

**`shop_profile`** (single row): `id`, `shop_type`, `shop_name`, `phone`, `address?`,
`gst_enabled` (0/1), `gstin?`, `state?`, `state_code?`, `created_at`, `updated_at`.

---

## 7. Navigation map

Root **stack** (`AppNavigator`) hosts a **bottom-tab** navigator (`Main`) plus the
screens pushed above it. Start route chosen at runtime (`Setup` first launch, else `Main`).
The app **always opens on the Billing tab** (home/default).
```
Setup (first launch only) ──reset──▶ Main

Main = bottom tabs:  [ 🧾 Billing ] [ 📁 Bills ] [ 📦 Products ] [ ⚙️ Settings ]
   Bills    tab ──push──▶ BillDetail   (parent stack)
   Products tab ──push──▶ Scan         (parent stack; "View Products" = goBack)
   Settings tab ──save──▶ navigate to Billing tab
```
- `Billing`/`BillHistory`/`Products`/`Settings` are **tabs** (`MainTabParamList`);
  `Setup`/`Main`/`BillDetail`/`Scan` are **stack** routes (`RootStackParamList`).
- Tab screens that push a stack route (Bills→BillDetail, Products→Scan) type their
  props with **`CompositeScreenProps<BottomTabScreenProps, NativeStackScreenProps>`**.
- `@react-navigation/bottom-tabs` is **pure JS** (uses the already-installed
  `react-native-screens` + `safe-area-context`) — no extra native module / rebuild for tabs.

---

## 8. NEXT — what to build

> **The core billing MVP is COMPLETE**: scan → cart → simple/GST bill → save → history →
> **PDF + share / WhatsApp**. Everything above is done, type-checked and unit-tested
> (still pending: first run on a real Android device — see §4).

### ▶️ Immediate next: Phase 3 — Inventory
Pick this up next (see "Later phases" below for the shape). Nothing in the billing flow
is blocking it.

### Optional polish (anytime, not blocking)
- **Thermal printer** support (58/80mm) for shopkeepers who want a printout — reuse
  `PdfService` / the bill data (marked `// Future: thermal print ...` in both services).
- Per-shop-type **default GST rates** — `constants/shopTypes.ts` has a `// Future:` note
  for a `defaultGst` field; `constants/gst.ts` holds the slabs.
- Optional **shop logo** in the invoice header (PdfService template).
- Explicitly NOT wanted for this user base: e-invoicing / IRN / QR, GSTR export, email
  automation, backend/cloud (until Phase 4).

### Later phases (do NOT build until scoped)
- **Phase 3 — Inventory:** stock/quantity tracking. New `inventory` table (migration
  v5+) + `InventoryRepository`; reuse the product catalog.
- **Phase 4 — Express backend + cloud sync** (multi-device + backup): build in the
  empty `backend/` folder. On the app side, implement the existing repository
  **interfaces** (`IProductRepository`, `IBillRepository`, `IProfileRepository`)
  with a sync-aware version; a sync hook can attach in `db/database.ts`. **Screens
  stay untouched.**
- **AI bill-photo reading:** a new `services/ai` module feeds parsed items through
  the existing repositories.

---

## 9. Conventions & gotchas (read before editing)

- **Don't restructure earlier phases.** Add new migration + model + repository +
  screens following existing patterns.
- **DB access only through repositories**, behind their interfaces. No SQL in screens.
- **Migrations are append-only and versioned.** New table = new `MIGRATIONS` entry.
- **Config/tunables** live in `constants/config.ts` (DB name, debounce ms, currency).
  Theme in `constants/theme.ts`. Lists (shop types, states) in their own constants.
- **vision-camera stays on v4.** (See stack table.) `react-native-vision-camera`
  `useObjectOutput`/`ScannedObject` (v5) is NOT what this app uses.
- **Tests run off-device**; `@op-engineering/op-sqlite` is mocked in
  `__mocks__/op-sqlite.ts` via `jest.config.js` `moduleNameMapper`. Keep new
  pure-logic tests DB-free or extend that mock.
- **Extension points are commented in code**: grep for `// Phase 2 next`,
  `// Phase 2 Part 2`, `// Phase 2 later`, `// Phase 3`, `// Phase 4`, `// Future`.
