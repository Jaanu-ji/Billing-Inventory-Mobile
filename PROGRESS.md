# Bill App — PROGRESS / Handoff

> Single source of truth to resume work in a new session without asking anything.
> Last updated: 2026-06-09.

> **CURRENT POSITION: ALL DEV PHASES (1–2, A–K) COMPLETE — awaiting cloud creds to go live.**
> Phases 1–2 + A/B/C + **D + E + F + G + H** done; **I (visual polish)** applied (needs device
> eyeball); **J (auth) + K (sync) scaffolded** behind interfaces + **inert by default**
> (`Config.auth.enabled` / `Config.sync.enabled` = false → app + offline billing 100% unchanged).
> DB at **v18**. All gates green: `tsc` 0 errors, `eslint` 0 errors (3 cosmetic warnings),
> **101/101 tests**. See §8 for per-step detail (**§8.7 I**, **§8.8 J**, **§8.9 K**). **Nothing
> left to build without the user's Firebase/Supabase creds** — go-live checklist is in §8.8/§8.9.
> Deferred: Phase I structural rework (Settings hub, bills search/filter, PDF redesign) + stock
> ("Later"). Working tree; **user handles git**.

---

## 1. What this project is

A **barcode-based billing app for retail shops** (kirana, medical, garment, footwear,
sports, hardware, electronics, restaurant, etc.). The shopkeeper scans products,
builds a cart, and saves bills — **fully offline, on-device**. Built in **phases**;
each phase has a tightly-scoped spec and we only build the current phase.

The app now also has a complete **DUKAAN design system** (light, premium, bold,
Hinglish-friendly) applied across every screen — see §5C.

---

## 2. Tech stack

| Area | Choice | Version | Notes |
|------|--------|---------|-------|
| Framework | React Native (CLI, **not** Expo) | **0.85.3** | New Architecture ON by default |
| React | react | 19.2.3 | |
| Local DB | **`@op-engineering/op-sqlite`** | 16.2.0 | JSI-based, fastest + most maintained SQLite for RN |
| Camera / scan | **`react-native-vision-camera`** + `useCodeScanner` | **4.7.3** (pinned) | ⚠️ Do NOT bump to v5 — v5 is a Nitro rewrite that **removed `useCodeScanner`**. v4 is the stable, documented code-scanner. |
| Navigation | `@react-navigation/native` + `native-stack` + **`bottom-tabs`** | 7.x | Root stack hosts a **5-item bottom-tab** bar (Home · Products · **Bill = center scan FAB** · Bills · Settings); BillDetail + Scan push above the tabs. bottom-tabs is pure JS. |
| PDF invoice | **`react-native-html-to-pdf`** + `generatePDF()` | **1.3.0** | 1.x is a **TurboModule rewrite** (New-Arch native). API is the named `generatePDF(options)`. HTML template → PDF. |
| Share / WhatsApp | **`react-native-share`** | **12.3.1** | system share sheet (`Share.open`) + WhatsApp deep link. ⚠️ v12 **dropped `whatsAppNumber`**. |
| Icons | **`react-native-svg`** | **15.15.5** | **Phase A4** — native dep, autolinks (needs a rebuild). Powers the `Icon` line-icon set (`components/ui/Icon.tsx`). |
| Fonts | **Sora + Plus Jakarta Sans** (bundled TTFs) | — | **Phase A3** — static per-weight TTFs in `frontend/assets/fonts` + `android/app/src/main/assets/fonts` (declared in `react-native.config.js`). Needs a rebuild. |
| Helpers | `react-native-screens`, `react-native-safe-area-context` | latest | |
| Language | TypeScript | 5.x | strict-ish, fully typed |

**Native deps added in Phase C Step 0:** `react-native-svg` (A4) + the bundled
fonts (A3) — both need a **rebuild** (`npm run android`), not just a Metro reload.
Everything else (swipe-to-remove, toggles, camera laser, overlays, multi-step
onboarding) uses **core RN** (`PanResponder`, `Animated`, `Modal`). Still optional
/ not yet added: **`react-native-gesture-handler`** (richer gestures) — only if C5/C6
need it (current swipe uses core `PanResponder`).

---

## 3. Repo layout

```
C:\BanaoBanao\Bill\                 <- project root
├── PROGRESS.md                     <- this file
├── README.md                       <- short root overview
├── DUKAAN - Design System Spec.md  <- DESIGN SOURCE OF TRUTH (colours/type/spacing/components)
├── DUKAAN_Complete_Requirements.md <- feature/edge-case spec driving the D→K roadmap
├── screenshots/                    <- 40 design PNGs (visual ref; re-implement natively, do NOT copy)
├── DUKAAN - App Design-print.html  <- exported app design (web ref; do NOT copy its code)
├── Pdf design.html + Pdf design_files/  <- new invoice design ref (for Phase I)
├── claude_code_prompt_bill_app.md  <- original Phase 1 brief
├── frontend/                       <- the entire React Native app (all current code)
└── backend/                        <- schema.sql = Supabase cloud mirror (Phase J); sync = Phase K
```

> The whole app lives in **`frontend/`**. Always run commands from inside `frontend/`.
> **Do not edit** `DUKAAN - Design System Spec.md` or the prompt files — they're inputs.

### `frontend/src/` (layered architecture)

```
src/
  screens/        HomeScreen (Phase C2 dashboard — DONE),
                  SetupScreen (Phase C1 multi-step onboarding — DONE), SettingsScreen,
                  BillingScreen, BillHistoryScreen, BillDetailScreen, (Phase 2 Part 1)
                  ScanScreen, ProductsScreen                          (Phase 1)
                  CustomersScreen + CustomerDetailScreen              (Phase F udhaar ledger)
  components/
    ui/           DUKAAN component kit (Phase A2) — see §5C:
                  Text(AppText), Button + IconButton, Card, Row + RowThumb,
                  Field/Input/Textarea, Select, Toggle, Segmented, Stepper,
                  Badge, Chip, TopBar, BottomSheet/CenterModal,
                  Icon (A4 svg line-icon set), index.ts (barrel)
                  PrimaryButton, ProductFormModal, MatchedCard, ProductListItem,
                  CameraScanner, CartItemRow, CheckoutModal, SelectField, ProfileForm,
                  TorchButton, LineItemModal (C3/C4 manual+service add),
                  BillingModeSheet + QuickAddGrid (E billing modes / list mode),
                  PaymentSheet + CustomerPickSheet (F payments / udhaar),
                  DiscountSheet + ParkedBillsSheet (G discount / hold-park)
  db/              database.ts (open + migrate), migrations.ts (v1–v14), schema.ts
  repositories/    IProductRepository + ProductRepository
                   IBillRepository    + BillRepository (+ getSummarySince C2; +F payments/ledger)
                   IProfileRepository + ProfileRepository (+ business_mode, + billing_mode E)
                   IManualItemRepository + ManualItemRepository (C3)
                   IServiceRepository    + ServiceRepository (C4)
                   ICustomerRepository   + CustomerRepository (F)
                   IParkedBillRepository + ParkedBillRepository (G)
  services/        ScanService (scan + debounce),
                   CartService (pure cart math; key+kind lines; addManual/addService),
                   ProfileService (cached profile + isGstEnabled() + getBusinessMode()
                     + getBillingMode()/setBillingMode() [E]),
                   GstService (pure CGST/SGST/IGST calculator; +G discount/round-off + discountAmount()),
                   PdfService (pure buildBillHtml() + generateBillPdf()),
                   ShareService (share sheet + WhatsApp + toSimpleBill()/shareBillAsSimple())
  models/          Product, Bill / BillItem / CartItem (+ ItemKind, BillSummary; +F payment, +G discount/roundOff),
                   ShopProfile (+ businessMode + billingMode), ManualItem, Service (SavedService),
                   Customer / CustomerWithPending (F), ParkedBill (G)
  navigation/      AppNavigator (5-tab + center FAB; Setup = headerShown:false), types
  utils/           validation, debounce (TimeGate), format (price + date + formatQuantity [D])
  constants/       config, theme (DUKAAN tokens + fontFace() resolver), shopTypes,
                   states, gst, businessModes (product/service/mixed), units (D),
                   billingModes (scan/list/service/mixed — E), payments (paid/unpaid + modes — F)
  assets/fonts/    Sora + Plus Jakarta Sans static TTFs (A3; also copied to android assets)
__tests__/         logic, cart, units, billingModes, payments, profile, gst (+G discount/round-off),
                   pdf  (68 tests, all passing)
__mocks__/         op-sqlite, react-native-html-to-pdf, react-native-share (Jest stubs)
```

**Layering rule (do not break):** `screens → services → repositories → db`.
UI **never** touches SQL directly — always through a repository **interface**.
**Presentation rule (new):** screens/components build UI from **`components/ui`** + the
**DUKAAN tokens** in `constants/theme.ts` — don't hand-roll colours/spacing.

---

## 4. How to run

Prereqs verified: Node, **JDK 17** (via `JAVA_HOME`), Android SDK + adb. Need a device/emulator.

```powershell
cd C:\BanaoBanao\Bill\frontend
adb devices
npm start                      # terminal 1: Metro
npx react-native run-android   # terminal 2 (= npm run android)
```

Quality gates (all green as of this update):
```powershell
npx tsc --noEmit   # 0 errors
npm test           # 43/43 pass
npm run lint       # 0 errors (1 cosmetic nav warning on headerRight — pre-existing pattern)
```

> ⚠️ **Device note:** development is type-checked + unit-tested off-device. The design
> overhaul (Phase A+B) is presentation-only and adds **no native deps**, so a normal
> `run-android` shows it. A couple of on-device things to eyeball (noted in code/commits):
> the **center FAB** lifts `-24px` above the tab bar (clip on some Android skins → switch
> to an absolute overlay if cut off); cart **horizontal swipe** vs vertical scroll; the
> stacked **state-picker sheet** over the checkout sheet.

---

## 5. What's DONE and tested

### ✅ Phase 1 — Barcode engine (offline catalog)
- `ScanScreen` live barcode/QR detection (vision-camera); unknown → name+price popup →
  saved to `products`; known → **"ALREADY IN CATALOG"** card with **Edit** (updates the
  same row, never duplicates — barcode is `UNIQUE`). `ProductsScreen` list + edit/delete +
  **＋ Scan** header + **search**. ~2s debounce (`TimeGate`). Camera permission + validation.
  **Torch toggle** (`TorchButton`) on both camera surfaces.

### ✅ Phase 2 Part 1 — Billing core
- `BillingScreen` (center FAB): scan → **cart**; same code again → **qty +1**; unknown →
  add-product popup → cart. Per-line **qty stepper**, **inline price edit**, **swipe-to-
  remove** (and − at qty 1 removes). Live grand total. **Checkout** (`CheckoutModal`) →
  saves a bill → cart clears. `BillHistoryScreen` → `BillDetailScreen`. Cart math is pure
  (`CartService`); save = one transaction (`BillRepository`).

### ✅ Phase 2 Part 2 — Shop setup / profile
- First-launch **`SetupScreen`** (single-step; multi-step onboarding is Phase C1) → shop
  type/name/phone/address/**GST toggle** → GSTIN + state. **`SettingsScreen`** edits it
  later; both share **`ProfileForm`**. Single-row `shop_profile`; `ProfileRepository.save()`
  upsert. `ProfileService.isGstEnabled()`. `App.tsx` start route = **Setup** if no profile
  else **Main** (gate is intact, untouched by the restyle).

### ✅ Phase 2 — GST billing
- **`GstService.calculateBillTotals(...)`** — pure, unit-tested. Intra-state → CGST+SGST,
  inter-state → IGST, simple → no tax; all `round2`. Per-product `gst_rate` (slabs
  0/5/12/18/28) + `hsn_code`; the product form shows GST-rate **chips** + HSN **only when
  GST-registered**. Checkout has a **GST / Simple** segmented choice (GST bill optionally
  captures customer GSTIN + place of supply, with a **live tax preview**). Bill detail shows
  the full GST breakup. GST fields snapshotted into `bill_items`.

### ✅ Phase 2 — Bill sharing (PDF + WhatsApp)
- **`PdfService.buildBillHtml(bill, profile)`** — pure, unit-tested A4 HTML invoice; one
  template for **both** types (`TAX INVOICE` + HSN/rate + CGST/SGST-or-IGST + place of
  supply + declaration for GST; plain `INVOICE` + subtotal for simple). `generateBillPdf()`
  renders to the **internal cache dir** (no storage permission; ⚠️ **must stay in cache** —
  react-native-share's FileProvider only exposes cache + external `Download/`, else share
  silently fails on Android 7+).
- **`ShareService`**: `shareBill()` → system share sheet; `whatsAppBill()` → direct
  WhatsApp deep link (`toWhatsAppNumber()` = +91 default) with a text summary (deep links
  can't pre-attach a file). **`toSimpleBill()` / `shareBillAsSimple()`** (Phase B8) — send a
  GST bill as a **plain non-GST copy** (read-only; saved record stays GST). **Saving never
  depends on sharing.**

### ✅ Phase A — Design system foundation (see §5C)
### ✅ Phase B — Full restyle of every screen + invoice (see §5D)

### ✅ Phase C Step 0 — Fonts (A3) + Icons (A4)
- **A3 Fonts:** Sora + Plus Jakarta Sans bundled as **static per-weight TTFs**
  (`assets/fonts` + `android/app/src/main/assets/fonts`, declared in
  `react-native.config.js`). `theme.ts` now has a **`fontFace(kind, weight)`**
  resolver returning the exact face (e.g. `'Sora-SemiBold'`) — **per-weight family
  names**, not one family + `fontWeight`, because Android resolves a custom font by
  **file name** and won't pick a weight file via `fontWeight` (PostScript name ==
  file name, so iOS matches too). `Typography`/`AppText` (numeric + weight override)
  + `TopBar`/`Button`/`Input`/`AppNavigator`/`CartItemRow` all use it. iOS needs
  `npx react-native-asset` once.
- **A4 Icons:** `react-native-svg` + **`components/ui/Icon.tsx`** (`Icon` +
  `IconName`, exported from the barrel) — 2px line icons on a 24-grid. Replaced
  every emoji/unicode/drawn glyph: tab bar + FAB scan, chevrons, stepper ±, checks,
  search, torch, all empty-state glyphs. Includes **business-type-ish glyphs**
  (store/box/wrench/layers/shirt/shoe/ball/monitor/utensils/medical/tag/tools) used
  by onboarding & business-mode UI.

### ✅ Phase C1 — Multi-step onboarding
- `SetupScreen` rewritten as a guided flow: **Welcome → Business mode → Shop details
  → GST setup**, with progress dots + per-step validation; **Setup route now
  `headerShown:false`**. Saves the full profile incl. **`businessMode`** then
  `reset`s to Main. The **Setup→Main gate** in `App.tsx` is intact.

### ✅ Phase C2 — Home dashboard
- `HomeScreen` rebuilt: **today's sales hero** (total) + **bill count**
  (`BillRepository.getSummarySince(startOfToday)`), big **"Naya Bill"**, **recent
  bills** (5, tap → BillDetail; "See all" → Bills). Empty state when no bills.

### ✅ Phase C3 — Manual (no-barcode) add
- `manual_items` catalog (model + `IManualItemRepository`/`ManualItemRepository`,
  **upsert-by-name** reuse). `LineItemModal` (kind `'manual'`) with **reuse-search**.
  **＋ Manual** on Billing → modal → cart line `kind:'manual'` (HSN code).

### ✅ Phase C4 — Service billing
- `services` catalog (model `SavedService` + `IServiceRepository`/`ServiceRepository`,
  upsert-by-name). Same `LineItemModal` (kind `'service'`) with **saved-services
  quick-pick** (SAC code). **＋ Service** on Billing → cart line `kind:'service'`.
- **Cart refactor (C3/C4):** `CartItem` is now keyed by **`key`** + tagged with
  **`kind: 'product'|'manual'|'service'`** (`barcode`/`productId` nullable). Products
  still merge-on-rescan (key = barcode); manual/service each add their own row.
  `CartService.addManual`/`addService`/`makeLine`; all ops (`changeQuantity`/
  `removeItem`/`setPrice`) are **key-based**. `BillRepository` persists `item_kind`
  and routes the one cart code field to **HSN (goods) / SAC (service)**.

### ✅ Phase C5 — Mixed bill (products + services)
- A bill can carry **both** goods and service lines. `PdfService` (`buildBillHtml`) and
  `BillDetailScreen` render a mixed bill in **labelled sections** (`Products` =
  product+manual, `Services` = service); single-kind bills keep the plain list. Invoice
  code column is **HSN/SAC** (`item.sacCode ?? item.hsnCode`). GST math untouched.
  `BillDetailScreen` factors rows into a module-level `ItemDetailRow`.

### ✅ Phase C6 — Business-type adaptivity
- `BillingScreen` reads `businessMode` (focus effect) and adapts: **product** = camera +
  ＋ Manual; **service** = no camera ("Service bill" header) + ＋ Service only; **mixed**
  = camera + both. Empty-state copy/icon vary by mode. No DB change (reads v5
  `business_mode`); FAB still selects Billing.

### Test coverage (Jest, pure logic — no device)
- `logic` (validation/debounce/format/scan), `cart` (add/qty/remove/totals/**setPrice**
  + **manual/service add, key-based qty/price** [C3/C4]),
  `profile` (incl. conditional GST), `gst` (simple/intra/inter, rounding),
  `pdf` (`buildBillHtml` simple + GST intra/inter, escaping, no-profile; **`toSimpleBill`**
  no-mutation + total-preserved + renders-plain-INVOICE + non-GST passthrough;
  `toWhatsAppNumber`).
- **C5 mixed invoice:** `pdf` also covers a **mixed bill** — Products/Services section
  labels, **HSN/SAC** column with per-line code, and no section headers on single-kind.
- **D units:** `units` (label fallback / decimal-capable / steps), `cart` (addProduct copies
  unit, decimal `changeQuantity` step + drift-round + near-zero removal, `setQuantity`), `pdf`
  (qty shows `{qty} {unit}` for goods, unit-less for services).
- **E billing modes:** `billingModes` (derive default from business mode, 4-mode list,
  label fallback).
- **F payments:** `payments` (default status paid, cash/upi/card modes, label fallback,
  isUnpaid).
- **G bill extras:** `gst` adds percent/rupee discount (clamped), discount on the tax-inclusive
  payable, round-off-to-rupee + delta, discount+round-off combined, and no-adjustments-unchanged.
- **68 tests total, all passing.** Native PDF/share/sqlite mocked in `__mocks__`.
  (Fixtures updated for new required fields: `ShopProfile.businessMode`/`billingMode`,
  `BillItem.kind`/`sacCode`/`unit`, `CartItem.key`/`kind`/`unit`, `Product.unit`,
  `Bill.paymentStatus`/`paymentMode`/`customerId`/**`discount`/`roundOff`**.)

---

## 5C. DUKAAN design system — Phase A (foundation)

**Source of truth:** `DUKAAN - Design System Spec.md` (root). Light theme, orange primary,
Sora (display/numbers) + Plus Jakarta Sans (UI), 4pt spacing, defined radii/elevation.
The design `.jsx`/HTML files are **web React** — used only as a visual reference, **never
copied**; everything is re-implemented natively.

### A1 — Tokens (`src/constants/theme.ts`, additive)
Legacy `Colors/Spacing/FontSize/Radius` (the old dark theme) are still in the file but the
restyled app no longer uses them. The DUKAAN tokens are:
- **`Palette`** — raw scales (orange 50–900, teal, indigo, amber, gold, rose, slate 0–900).
- **`DukaanColors`** — semantic: `primary #EA580C`, primaryPress, teal/indigo/amber/gold,
  success/warning/danger, `bg #F4F6F9`, surface, hairline, ink, textMuted/Faint, onPrimary.
- **`Badges`** — `{bg,text}` pairs: paid/unpaid/gst/simple/stock/low/soft.
- **`Typography`** — display/h1/h2/h3/body/bodySm/label/cap/overline + `numeric`
  (tabular figures). RN-ready (px line-heights/letter-spacing computed from the spec).
- **`FontFamily`** — base names `'Sora'` / `'Plus Jakarta Sans'` (reference only).
  **Use `fontFace(kind, weight)`** (A3) to get the real per-weight face string — do
  NOT set `fontFamily` to a base family name (won't resolve on Android). See §5E.
- **`FontWeight`**, **`Space`** (4→32), **`Radii`** (xs8…full999), **`Elevation`**
  (xs/sm/md/lg + primary/teal glows; each has iOS shadow props **and** Android `elevation`).

### A2 — Component kit (`src/components/ui/*`, import via barrel `'../components/ui'`)
`AppText` (variant/color/numeric/weight) · `Button` (primary/teal/wa/**danger**/secondary/
outline/ghost · sm/md/lg · block/loading) + `IconButton` (default/tonalP/tonalT/glass) ·
`Card` (raised/flat/pad) · `Row` + `RowThumb` · `Field`/`Input`/`Textarea` · `Select`
(trigger; caller opens the picker) · `Toggle` (animated) · `Segmented<T>` · `Stepper` ·
`Badge` · `Chip` (default/ink/primary-active) · `TopBar` · `BottomSheet`/`CenterModal`.

### A3 / A4 — ✅ DONE (Phase C Step 0) — see §5E
Fonts bundled + `fontFace()` resolver, and `react-native-svg` + the `Icon` set are
in. The only glyphs intentionally left as drawn Views are the **camera HUD corner
brackets + laser** (decorative overlay, not an icon) and **content `×`** in
"qty × price" text. Emoji remaining only in **share message text** (🙏 / → in
`ShareService.billMessage`) — message copy, not UI chrome.

---

## 5E. Phase C Step 0 — fonts + icons (how it works)

- **`fontFace(kind: 'display'|'ui', weight)`** (`theme.ts`) → exact face string:
  display → `Sora-Regular/Medium/SemiBold/Bold/ExtraBold` (400–800); ui →
  `PlusJakartaSans-Regular/Medium/SemiBold/Bold` (400–700, 800 clamps to 700).
  **Why per-face, not one family + `fontWeight`:** these ship as split static TTFs
  (`Sora`, `Sora Medium`, `Sora SemiBold`, …); Android resolves a custom font by the
  **asset file name** and `fontWeight` won't switch weight files, so a single `'Sora'`
  would only render Regular/Bold. File name == PostScript name → same string works on
  iOS. `Typography` entries call it; `AppText` recomputes the face for `numeric`
  (always Sora) + `weight` overrides; `TopBar`/`Button`/`Input`/`AppNavigator` header/
  `CartItemRow` price input use it directly.
- **Fonts:** static TTFs in `frontend/assets/fonts` (source) **and committed to**
  `frontend/android/app/src/main/assets/fonts` so a plain `run-android` bundles them.
  iOS: run `npx react-native-asset` once (reads `react-native.config.js`).
- **Icons:** `components/ui/Icon.tsx` — `<Icon name={IconName} size color strokeWidth/>`
  over a shared `<G>` (stroke, round caps, fill none). Add an icon = add to `IconName`
  + a `d` entry in `ICON_PATHS`. `react-native-svg` is a **native dep → rebuild**.

---

## 5D. Phase B — screens restyled (what each step touched)

- **B1 shell:** light `NavigationContainer` theme + light headers; **5-tab** bar
  (Home·Products·**Bill FAB**·Bills·Settings); Billing rendered as the raised center
  **scan FAB** (`tabBarButton`); default tab = Billing; `HomeScreen` placeholder added;
  `App.tsx` boot screens recoloured (**Setup→Main gate untouched**).
- **B2 billing+cart:** `BillingScreen` (scan strip, ＋ Manual button [placeholder→C3],
  "Scan to start" empty state, sticky total); `CartItemRow` (thumb, inline price edit, kit
  `Stepper`, **swipe-to-remove via `PanResponder`**); `CameraScanner` HUD (corner reticle +
  orange laser); `TorchButton` glass/gold. **+ `CartService.setPrice()`**. Scan re-entrancy
  (`busyRef`) + modal gating preserved exactly.
- **B3 checkout:** `CheckoutModal` → light **bottom sheet**, kit `Segmented` (GST/Simple) +
  badge, tinted GST preview, kit `Field`/`Input`, self-contained searchable **`StatePicker`**
  sheet (replaces the shared dark dropdown here). `CheckoutDetails` contract unchanged.
- **B4 products:** `ProductListItem` (light card + GST badge + danger Delete), `ProductFormModal`
  (GST rate as **chips**, ₹ prefix), `ProductsScreen` (**search** + empty states). **+ kit
  Button `danger` variant.** `ProductFormSubmit`/validation unchanged.
- **B5 scan:** `ScanScreen` HUD (corner reticle + laser, glass hint, light permission/known
  cards, orange "View Products") + `MatchedCard` light. Full Phase-1 scan logic preserved.
- **B6 bills:** `BillHistoryScreen` (light cards + **GST/Simple badges**), `BillDetailScreen`
  (invoice layout, TAX INVOICE/CASH MEMO badge, WhatsApp-green button). Share logic unchanged.
- **B7 settings:** `ProfileForm` (kit fields, **`Toggle`** replaces `Switch`), `SelectField`
  (light searchable dropdown — only consumer is `ProfileForm`), `SettingsScreen`/`SetupScreen`
  light. Validation/`onSubmit` contract unchanged.
- **B8 invoice + share-as-simple:** `PdfService` **template restyle only** (DUKAAN look;
  every test token preserved — GST math untouched); `ShareService` **+`toSimpleBill()`/
  `shareBillAsSimple()`** (pure, read-only); `BillDetailScreen` **+ "Share as simple bill"**
  button (GST bills only). **Decision:** the simple copy lists items at **tax-inclusive**
  prices so its **total = what the customer paid** (subtotal == total, no tax lines).

---

## 6. Data model & migrations

Versioned, append-only `MIGRATIONS` in `src/db/migrations.ts` (applied versions tracked in
`schema_version`). **Never edit a released migration — always append.** **Phase A+B added
NO migrations; Phase C Step 0/C1/C2 + C3/C4 took DB to v8; Phase D added v9; Phase E added
v10; Phase F added v11+v12; Phase G added v13+v14.** Current DB version: **v14**.

| Migration | Tables | Phase |
|-----------|--------|-------|
| **v1** `create_products` | `products` | Phase 1 |
| **v2** `create_bills` | `bills`, `bill_items` | Phase 2 Part 1 |
| **v3** `create_shop_profile` | `shop_profile` | Phase 2 Part 2 |
| **v4** `add_gst_fields` | ALTER `products`/`bills`/`bill_items` (ADD COLUMN) | Phase 2 GST |
| **v5** `add_business_mode` | ALTER `shop_profile` ADD `business_mode` (DEFAULT `'product'`) | C1 |
| **v6** `create_manual_items_and_item_kind` | CREATE `manual_items` + ALTER `bill_items` ADD `item_kind` (DEFAULT `'product'`) | C3 |
| **v7** `create_services` | CREATE `services` | C4 |
| **v8** `add_bill_item_sac_code` | ALTER `bill_items` ADD `sac_code` (nullable) | C4 |
| **v9** `add_units` | ALTER `products`/`bill_items`/`manual_items` ADD `unit` (DEFAULT `'pcs'`) | D |
| **v10** `add_billing_mode` | ALTER `shop_profile` ADD `billing_mode` (nullable; null ⇒ derive) | E |
| **v11** `create_customers` | CREATE `customers` (phone-keyed; phone indexed) | F |
| **v12** `add_bill_payment` | ALTER `bills` ADD `payment_status` (DEFAULT `'paid'`), `payment_mode`, `customer_id` (FK, indexed) | F |
| **v13** `add_bill_discount_roundoff` | ALTER `bills` ADD `discount`, `round_off` (DEFAULT 0) | G |
| **v14** `create_parked_bills` | CREATE `parked_bills` (held carts as JSON) | G |
| **v15** `add_product_adaptive_fields` | ALTER `products` ADD `category`, `attributes` (JSON); ALTER `shop_profile` ADD `default_unit` | H |
| **v16** `add_bill_item_attributes` | ALTER `bill_items` ADD `attributes` (JSON snapshot) | H |
| **v17** `create_auth_session` | CREATE `auth_session` (single-row local login session) | J |
| **v18** `create_sync_outbox` | CREATE `sync_queue` (outbox) + `sync_meta` (per-table pull cursors) | K |

- **`products`**: `id`, `barcode` (unique, indexed), `name`, `price`, `created_at`, **+v4**
  `gst_rate`, `hsn_code?`, **+v9** `unit` (default `'pcs'`).
- **`bills`**: `id`, `bill_number` (unique seq), `customer_name?`, `customer_phone?`,
  `subtotal`, `total`, `created_at`, **+v4** `bill_type`, `customer_gstin?`, `customer_state?`,
  `customer_state_code?`, `is_inter_state`, `cgst`, `sgst`, `igst`.
- **`bill_items`**: `id`, `bill_id` (FK CASCADE), `product_id?` (FK SET NULL), `name`,
  `price`, `quantity` (**REAL** — decimal qty), `line_total`, **+v4** `gst_rate`, `hsn_code?`,
  `gst_amount`, **+v6** `item_kind` (`product`|`manual`|`service`), **+v8** `sac_code?`,
  **+v9** `unit` (snapshot, default `'pcs'`) (name/price/rate/HSN/SAC/kind/unit are
  **snapshots**; repo routes the cart's single code field to `hsn_code` for goods or
  `sac_code` for services).
- **`bills` +v12 (Phase F):** `payment_status` (`paid`|`unpaid`, default `paid`),
  `payment_mode?` (`cash`|`upi`|`card`), `customer_id?` (FK → `customers`, indexed).
  **+v13 (Phase G):** `discount`, `round_off` (REAL, default 0 — bill-level amounts applied to
  the payable; per-line/GST figures stay clean).
- **`customers`** (F): `id`, `name`, `phone` (dedupe key, indexed), `created_at`, `updated_at`
  (upsert-by-phone; pending udhaar is derived by joining `bills` on `customer_id`, not stored).
- **`parked_bills`** (G): `id`, `label`, `item_count`, `total`, `items_json` (CartItem[] as JSON),
  `created_at` — held in-progress carts; resume parses the JSON and deletes the row.
- **`shop_profile`** (single row): `id`, `shop_type`, `shop_name`, `phone`, `address?`,
  `gst_enabled`, `gstin?`, `state?`, `state_code?`, `created_at`, `updated_at`,
  **+v5** `business_mode` (`product`|`service`|`mixed`, default `product`),
  **+v10** `billing_mode` (`scan`|`list`|`service`|`mixed`, **nullable** — null ⇒ derive from
  `business_mode`; owned by the billing screen via `ProfileService.setBillingMode`, not the form).
- **`manual_items`** (C3): `id`, `name`, `price`, `hsn_code?`, `gst_rate`, `created_at`,
  `updated_at`, **+v9** `unit` (reusable no-barcode goods; upsert-by-name; name indexed).
- **`services`** (C4): `id`, `name`, `price`, `sac_code?`, `gst_rate`, `created_at`,
  `updated_at` (saved services; upsert-by-name; name indexed; **no unit** — services are per-job).

**Phase C remaining migrations:** **none needed for C5/C6** — C5 (mixed sectioned
invoice) and C6 (business-type adaptivity) build on the existing v5–v8 columns
(`bill_items.item_kind`, `shop_profile.business_mode`).

---

## 7. Navigation map

Root **stack** (`AppNavigator`) hosts the **5-item bottom-tab** navigator (`Main`) plus
pushed screens. Start route at runtime (`Setup` first launch, else `Main`); app opens on the
**Billing (center FAB)** tab.
```
Setup (first launch only; multi-step onboarding, headerShown:false) ──reset──▶ Main

Main = bottom tabs:  [ Home ] [ Products ] [ ●FAB Bill ] [ Bills ] [ Settings ]   (svg Icon tabs)
   Home   tab ──push──▶ BillDetail  (parent stack; from "recent bills")  [C2]
   Products tab ──push──▶ Scan        (parent stack; "View Products" = goBack)
   Bills    tab ──push──▶ BillDetail  (parent stack)
   Bills    tab ──push──▶ Customers ──push──▶ CustomerDetail ──push──▶ BillDetail  [F udhaar]
   Home is the real dashboard (C2); FAB selects the Billing tab
```
- `Home`/`Products`/`Billing`/`BillHistory`/`Settings` are **tabs** (`MainTabParamList`);
  `Setup`/`Main`/`BillDetail`/`Scan`/**`Customers`/`CustomerDetail`** are **stack** routes
  (`RootStackParamList`).
- Tabs that push a stack route use `CompositeScreenProps<BottomTabScreenProps, NativeStackScreenProps>`
  (now Home, Products, BillHistory).
- The center **Bill** tab uses a custom `tabBarButton` (`ScanFab` in `AppNavigator`); tab
  icons are the svg `Icon` set (A4).

---

## 8. Phase C — status (new screens + adaptivity)

> Billing MVP + full design overhaul + **all of Phase C are COMPLETE** (Step 0 +
> C1–C6; DB took **v8** here, now **v9** after Phase D). Below is the per-step
> record. Phase D is in §8.2; remaining work follows the **D→K roadmap** (below §8.2).

- ✅ **Step 0 — A3 fonts + A4 icons** — fonts bundled + `fontFace()`; `react-native-svg`
  + `Icon` set. *(native deps → rebuild.)* See §5E.
- ✅ **C1 Onboarding** — multi-step Welcome → Business mode → Shop details → GST setup
  (`SetupScreen`). Migration **v5** `shop_profile.business_mode`.
- ✅ **C2 Home dashboard** — today's sales/count, "Naya Bill", recent bills
  (`HomeScreen` + `BillRepository.getSummarySince`).
- ✅ **C3 Manual add** — `manual_items` (**v6**) + `bill_items.item_kind` (**v6**),
  `ManualItemRepository`, `LineItemModal` (kind manual), wired to **＋ Manual**.
- ✅ **C4 Service billing** — `services` (**v7**) + `bill_items.sac_code` (**v8**),
  `ServiceRepository`, `LineItemModal` (kind service) with saved-services quick-pick,
  wired to **＋ Service**. (No bill-level "notes" field — folded into the line name to
  avoid an unplanned column; revisit if a real notes field is wanted.)
- ✅ **C5 Mixed bill** — one bill with **both** products and manual/service lines.
  `PdfService.buildBillHtml` + `BillDetailScreen` group a mixed bill into **labelled
  sections** (Products = product+manual, Services = service); single-kind bills keep
  the plain list (look unchanged). Code column is now **HSN/SAC** showing
  `item.sacCode ?? item.hsnCode` per row. GST math untouched; pdf tests extended.
- ✅ **C6 Business-type adaptivity** — `BillingScreen` reads `businessMode` (focus
  effect) and adapts: **product** → scanner + ＋ Manual (no Service); **service** →
  no camera (orange "Service bill" header) + ＋ Service only; **mixed** → scanner +
  both. Empty-state copy/icon also vary by mode. Reads existing v5 `business_mode`
  (no migration). FAB still selects Billing; the screen adapts.

**Deferred deps:** fonts (A3) + `react-native-svg` (A4) are **DONE**. Still optional:
`react-native-gesture-handler` (richer gestures) — not needed by C5/C6.

---

## 8.1 Phase C — DONE. Combined device-test checklist

Phase C (Step 0 + C1–C6) is complete in the working tree (**not yet committed**).
Off-device gates: `npx tsc --noEmit` 0, `npm run lint` 0 errors (2 pre-existing
warnings: `PrimaryButton` inline-style, `ProductsScreen` nested-component — ignore),
`npm test` **49/49**. **Rebuild required** (native deps: `react-native-svg` + fonts):
`npm start --reset-cache` then `npm run android`. iOS needs `npx react-native-asset`.

Device checklist:
- **Upgrade path:** install over existing data → launches clean (migrations v5–v8 run);
  old Bills/Products/Settings still load.
- **Fonts (A3):** headings = Sora, body = Jakarta, weights distinct.
- **Icons (A4):** tab bar, FAB scan, chevrons, stepper ±, checks, search, torch, empty
  states all render as line icons (no tofu/emoji).
- **Onboarding (C1):** fresh install → 4 steps (Welcome → Business mode → Shop details →
  GST) → finish → Billing; chosen mode saved.
- **Home (C2):** today's total + bill count, Naya Bill, recent bills (tap → detail).
- **Manual/Service (C3/C4):** ＋ Manual / ＋ Service add lines (tags shown); reuse lists
  populate; saved bill shows them with totals/GST.
- **Mixed invoice (C5):** a bill with both → BillDetail + shared PDF show **Products /
  Services** sections + HSN/SAC codes.
- **Adaptivity (C6):** set mode in Settings → Billing changes (service hides camera,
  product hides ＋ Service, mixed shows both).

**Known intentional choices:** C4 has no separate notes column (folded into line name);
camera HUD brackets/laser stay drawn Views; both add buttons gate by `business_mode` (C6).

---

## 8.2 Phase D — Units (v9) COMPLETE

Phase D is complete in the working tree (**not yet committed**). It adds selling-unit
support without changing the offline billing architecture:
- `products`, `manual_items`, and `bill_items` now carry a `unit` column via migration
  **v9** (`DEFAULT 'pcs'`), so existing rows remain valid and behave as before.
- `constants/units.ts` defines the common unit catalog (`pcs`, `kg`, `g`, `litre`,
  `ml`, `meter`, `dozen`, `box`, `packet`, `bora`, `strip`, `tablet`) plus
  decimal/step helpers.
- Product add/edit and manual-item add now show **Selling unit** chips. Service lines
  remain unit-less in the UI.
- Cart rows show unit price + quantity, use unit-aware step sizes, and measured units
  can be edited exactly (e.g. `1.25 kg`).
- Saved bill detail + PDF invoice show quantities with units for goods, while services
  suppress `pcs`.
- Tests extended for unit helpers, decimal quantity cart behavior, and PDF unit output.

Off-device gates after Phase D: `npx.cmd tsc --noEmit` 0, `npm.cmd test -- --runInBand`
**55/55**, `npm.cmd run lint` 0 errors (same 2 pre-existing warnings:
`PrimaryButton` inline-style and `ProductsScreen` nested-component).

Device checklist:
- Upgrade over existing data -> migrations v5-v9 run and old products/bills still load
  as `pcs`.
- Add/edit product with `kg`, scan it into cart -> stepper moves by `0.5`, exact qty edit
  accepts `1.25`, total math is correct.
- Add manual item with `kg` -> reuse row shows price/unit, cart/detail/PDF show unit.
- Add service line -> cart/detail/PDF do **not** show `pcs`.
- Product list and existing scan/edit product flow preserve unit.

---

## 8.3 Phase E — Billing modes (v10) COMPLETE

Adds an explicit, switchable **billing mode** for the current bill, distinct from the stored
`business_mode` (what the shop sells). Offline architecture unchanged.
- **`constants/billingModes.ts`** — `BillingMode = scan|list|service|mixed`,
  `BILLING_MODE_OPTIONS`, `deriveBillingMode(businessMode)` (product→scan, service→service,
  mixed→mixed), `billingModeLabel`. (`icon` is a type-only `IconName` import — no runtime cycle,
  stays test-safe.)
- **Migration v10** `add_billing_mode` — `shop_profile.billing_mode TEXT` **nullable**; null ⇒
  derive from `business_mode`. `ProfileRepository.setBillingMode()` is a targeted single-column
  update (the profile **form** preserves it, never owns it); `ProfileService.getBillingMode()`
  (stored ?? derived) + `setBillingMode()` (persist + cache update, **best-effort — never blocks
  billing**).
- **`BillingModeSheet`** — the 4-way chooser (screenshot 19); **`QuickAddGrid`** — ⭐ QUICK ADD
  tiles for list mode = recent catalog products + saved manual items (favourites **derived**, no
  pinning/storage yet), tap a tile → cart line.
- **`BillingScreen`** now drives off `billingMode` (was `business_mode`): a top **mode pill** opens
  the sheet; **scan/mixed** = camera; **list** = no camera (search box + QuickAddGrid + "Add item"
  → existing manual `LineItemModal`); **service** = service-only header. Switching persists so the
  next bill opens the same way. Cart-header Manual/Service add buttons gate by mode; empty-state
  copy/icon vary by mode.

Off-device gates after Phase E: `tsc` 0, **jest 58/58**, `eslint` 0 errors (same 2 pre-existing
warnings). **No native deps — a plain `run-android` shows it.**

Device checklist:
- Upgrade over existing data → migration v10 runs; existing shops behave as before (billing_mode
  null ⇒ derived: product→scan, service→service, mixed→mixed).
- Tap the **mode pill** → sheet → pick **List**: camera disappears, QUICK ADD tiles + search appear;
  tap a tile or "Add item" → cart. Re-open billing later → still opens in List (remembered).
- Switch to **Scan** → camera returns; **Service** → service-only header + ＋ Service.
- List-mode search filters tiles across products + manual items; billing works fully offline.

**Known intentional scope cuts (deferred):** explicit favourite **pinning** (derived recents for
now), an onboarding scan-vs-list choice, and the full "Naya bill" top-bar redesign → Phase I/H.

---

## 8.4 Phase F — Payments & ledger (v11/v12) COMPLETE

Adds payment status + udhaar (pending) ledger. Offline architecture unchanged.
- **`constants/payments.ts`** — `PaymentStatus = paid|unpaid`, `PaymentMode = cash|upi|card`,
  `PAYMENT_MODE_OPTIONS`, `paymentModeLabel`, `isUnpaid`. **Migrations v11** `customers`
  (phone-keyed) + **v12** `bills` ADD `payment_status` (DEFAULT `'paid'` — old bills stay paid),
  `payment_mode?`, `customer_id?` (FK, indexed).
- **Models/repos:** `Customer`/`CustomerWithPending`; `CustomerRepository` (upsert-by-phone,
  `getById`, `getAllWithPending` — **pending udhaar derived by LEFT JOIN on bills, not stored**).
  `BillRepository` += persist payment fields/customerId on create, `markPaid(id, mode)`,
  `getByCustomer(id)`, `clearUdhaar(customerId, mode)`. `Bill` + `paymentStatus`/`paymentMode`/
  `customerId`; `NewBillInput` carries them.
- **Components:** `PaymentSheet` ("Received payment" → cash/upi/card, screenshot 22 — reused at
  checkout, bill-detail mark-paid, and clear-udhaar); `CustomerPickSheet` (search saved / add new,
  shows baaki — screenshot 21).
- **CheckoutModal** — the two free name/phone inputs become a **customer selector** row
  (CustomerPickSheet); bottom actions are **Udhaar** (outline; requires a customer with a phone)
  + **Received payment** (→ PaymentSheet → paid+mode). `CheckoutDetails` += payment + customer.
  `BillingScreen` upserts the customer by phone at save (so the ledger has someone to attach to),
  then creates the bill with payment fields; reloads customers after each bill.
- **Ledger:** `CustomersScreen` (total-pending hero + per-customer baaki/clear — screenshot 14)
  and `CustomerDetailScreen` (their bills + sticky **Clear udhaar** → PaymentSheet — screenshot 15);
  both pushed on the root stack, entry = a **"Udhaar"** header button on the Bills tab.
- **Bill detail:** udhaar banner + **Mark paid** (→ PaymentSheet) + Paid/Udhaar status badge
  (screenshot 31). **Bill history:** Udhaar badge per row.

Off-device gates after Phase F: `tsc` 0, **jest 62/62**, `eslint` 0 errors (**3** cosmetic
warnings — added the Bills `headerRight` nested-component, same idiomatic React-Navigation
pattern as `ProductsScreen`). **No native deps — plain `run-android` shows it.**

Device checklist:
- Upgrade over existing data → migrations v11+v12 run; existing bills show as **Paid**.
- Checkout → **Add customer** (pick saved or add new w/ phone) → **Received payment** (cash/upi/card)
  saves a paid bill; **Udhaar** saves it unpaid (blocks if no customer/phone).
- Bills tab → **Udhaar** header → Customers ledger (total pending + baaki/clear); tap a customer →
  their bills + **Clear udhaar** → pick mode → all their unpaid bills go paid.
- Open an udhaar bill → banner + **Mark paid** → pick mode → badge flips to Paid. Works offline.

**Known intentional scope cuts (deferred):** partial payments (just paid/unpaid in F),
WhatsApp udhaar reminders, the round-off seen in screenshot 31 (that's Phase G).

---

## 8.5 Phase G — Bill extras (v13/v14) COMPLETE

Adds bill-level discount + round-off and hold/park. Offline architecture unchanged.
- **Discount + round-off** — applied to the **grand total AFTER tax** (discount-after-tax keeps
  per-line/GST figures clean and is exactly right for the common simple-bill case).
  `GstService.calculateBillTotals(...)` gains an optional `adjustments` arg
  (`{discountType, discountValue, roundOff}`) and returns `discount`/`roundOff`; percent is taken
  on the pre-discount payable, rupees is flat, both clamped to `[0, payable]`; round-off snaps to
  the nearest rupee and reports the delta. Exported `discountAmount()` for previews. **Migration
  v13** `bills` ADD `discount`/`round_off` (DEFAULT 0). `Bill` + `discount`/`roundOff`;
  `NewBillInput` carries the inputs (repo computes amounts via GstService).
- **DiscountSheet** (%/₹ segmented + quick chips + "You save" — screenshot 16); **CheckoutModal**
  ADJUSTMENTS section (Discount row → sheet, Round-off `Toggle`) with a live preview that now shows
  Subtotal / Discount − / Round off / Total. Invoice (`PdfService`) + `BillDetailScreen` render the
  Discount + Round-off lines when present. **`CheckoutDetails`** + discount/roundOff;
  `BillingScreen` passes them to `create`.
- **Hold / park (Phase G)** — **migration v14** `parked_bills` (cart as JSON). `ParkedBill` model +
  `ParkedBillRepository` (`park`, `getAll`, `resume` = fetch+delete, `delete`; corrupt JSON → empty
  cart). **ParkedBillsSheet** (Resume / discard — screenshot 17). `BillingScreen`: a **Hold** button
  in the cart header (parks the current cart, label "Walk-in", then clears) + a **Parked · N** pill by
  the mode switcher that opens the sheet; **Resume** restores the cart and removes the parked row.
- **Light checkout** — the single-screen optional-sections flow (customer / bill type / adjustments)
  matches the design (08); no multi-step wizard.

Off-device gates after Phase G: `tsc` 0, **jest 68/68**, `eslint` 0 errors (3 cosmetic warnings).
**No native deps — plain `run-android` shows it.**

Device checklist:
- Upgrade over existing data → migrations v13+v14 run; existing bills show discount/round-off 0.
- Checkout → **Discount** (10% or ₹) shows "You save" + a Discount line; **Round off** toggle snaps
  the total to a rupee. Saved bill detail + shared PDF show the Discount + Round-off lines.
- Build a cart → **Hold** → cart clears + a **Parked · N** pill appears → open it → **Resume**
  restores the exact cart; **delete** discards. Survives app restart (persisted). Works offline.

**Known intentional scope cuts (deferred):** **tax-inclusive vs exclusive** pricing (reworks core
GST math + discount-ordering decisions — isolate as a small follow-up "G2"); bill **edit / return /
cancel** (screenshot 32 — requirements priority "Later"); **per-item** discount (bill-level only).

## 8.6 Phase H — Inventory / business-adaptive (v15) IN PROGRESS

**Step H1 — Business-adaptive product fields + default unit (DONE).** Different shops describe
stock differently; rather than a column per business, extra fields live in a free-form JSON
`attributes` map and a config decides which to show per shop type.
- **Migration v15** `add_product_adaptive_fields` — `products` ADD `category` (TEXT, nullable) +
  `attributes` (TEXT, JSON blob, nullable); `shop_profile` ADD `default_unit` (TEXT, nullable —
  null ⇒ 'pcs'). All additive + nullable, existing rows unaffected.
- **`constants/productFields.ts`** — `attributeFieldsFor(shopType)` + `attributeSectionLabel()`
  (medical → Batch no./Expiry; garment & footwear → Size(s)/Colour; everything else → none) +
  `summariseAttributes()` (one-line list-row summary). Add a business's fields here = the form
  adapts automatically. Degrades safely for unknown/null shop types.
- **Model/repo:** `Product` += `category: string|null` + `attributes: Record<string,string>`
  (required on the model, optional on `NewProductInput`/`ProductUpdateInput`). `ProductRepository`
  parses/serialises the JSON blob (corrupt/old → `{}`, all-blank → null), persists both on
  create + update. `ShopProfile` += `defaultUnit: string|null`; `ProfileRepository` reads/writes
  `default_unit` (preserved across edits, like `billingMode`).
- **UI:** `ProductFormModal` gained a **Category** input + a **business-adaptive attributes**
  block (driven by `shopType`) + `category`/`attributes` on `ProductFormSubmit`. All three
  product-create/edit entry points wired (`ProductsScreen` edit, `ScanScreen` new+edit,
  `BillingScreen` new) — they pass the shop's `shopType`, seed new products with the shop's
  `defaultUnit`, and persist category/attributes. `ProductListItem` shows
  `category · attribute-summary`. `ProfileForm` gained a **Default selling unit** chip picker
  (goods businesses only; a pure-service shop has none).
- Gates: `tsc` 0, **jest 77/77** (+`productFields.test.ts`; fixtures updated for the new required
  `Product.category`/`attributes` + `ShopProfile.defaultUnit`), `eslint` 0 errors (3 cosmetic
  warnings). **No native deps — plain `run-android` shows it.**

**Step H2 — Category filtering on the products list (DONE).** `ProductsScreen` derives the distinct
categories from the loaded catalog and shows a horizontal **filter chip row** (All + each category,
hidden when no product has a category); the list filters by the selected category **and** the
existing name/barcode search. A selected category that disappears (last product deleted) falls back
to All. UI-only, no migration.

**Step H3 — "Other" custom business setup (DONE).** When the shop type is **Other** and the shop
sells goods, onboarding (`SetupScreen`, shop-details step) shows a small custom block so the
dukaandaar shapes the app: a **Default selling unit** chip picker + a **Scan barcode / Pick from
list** segmented choice. On finish the default unit is saved on the profile and the billing-mode
choice is persisted via `ProfileService.setBillingMode` (scan/list). Known shop types stay fast
(no extra block). `ProfileForm` (Settings) already exposes the default-unit picker for all goods
businesses (Step H1). businessMode + GST were already captured by the existing flow.

**Step H4 — Business-adaptive bill format (DONE).** The bill/invoice now shows the relevant
business-adaptive attributes per line (medical batch/expiry, garment size/colour). Required
snapshotting attributes onto the bill line: **migration v16** `add_bill_item_attributes`
(`bill_items` ADD `attributes` JSON, nullable). `BillItem` + `CartItem` += `attributes`;
`CartService.addProduct` copies `product.attributes` (manual/service lines carry `{}`);
`BillRepository` parses/serialises the JSON (same helpers as `ProductRepository`) on read + create.
New `labelAttributes(shopType, attributes)` in `productFields.ts` pairs stored values with the
shop type's field labels (config order first, leftover keys labelled by raw key). `PdfService`
renders a small grey sub-line under each item name; `BillDetailScreen.ItemDetailRow` shows the same
as a caption. Core layout (header/items/total/GST) unchanged. Gates: `tsc` 0, **jest 85/85**
(+`labelAttributes` tests, +cart attribute-snapshot tests, +pdf medical-attributes test; `BillItem`
+ `CartItem` fixtures updated), `eslint` 0 errors (3 cosmetic warnings). No native deps.

**Phase H COMPLETE.** Only deferred item: **stock tracking ("Later")** — billing must never depend
on it.

## 8.7 Phase I — Visual polish (no migrations) IN PROGRESS

Bring screens up to the `./screenshots` design. (`Pdf design.html` referenced in §3 is **not in the
working tree** — use `09-invoice.png` / `38-service-invoice.png` as the invoice reference.) No DB
or native changes; verify each screen on device since this is visual work.

- ✅ **I1 — Dashboard (HomeScreen, design 05).** Rebuilt: greeting top bar (store-icon tile +
  "Namaste 🙏" + shop name); **"Aaj ki sales" hero** with a **Bills / Cash in / Udhaar** 3-column
  split + decorative blob; two **quick-action** tiles (Naya bill → Billing, Udhaar → Customers);
  two **info cards** (product count → Products, total udhaar pending → Customers); richer
  **recent-bill rows** (leading icon, customer/"Walk-in" title, #num·time, amount + Paid/Udhaar +
  GST badge). Data: `BillSummary` gained `cashIn`/`udhaar` (computed in `getSummarySince` via a
  paid/unpaid SUM split) + new **`IBillRepository.getTotalPending()`** (SUM of unpaid bill totals,
  any date) + product count from `productRepository.getAll().length`. No tests touched (BillRepo is
  device-only; `BillSummary` is used only by the dashboard).
- ✅ **I2 — Billing + cart (design 06/07).** Cart header label → **"IN THIS BILL"** with a
  **"Clear all"** link (confirm → empties cart); sticky bar → **"Grand total · N qty"** + a
  **Checkout →** (chevron) button. Scan/list/service/mixed + Hold/Manual/Service layout preserved
  (functional Phase E/G UI left intact — not restructured).
- ✅ **I3 — BillDetail invoice card (design 09/31).** `BillDetailScreen` rebuilt as one invoice
  card: centered shop header, centered doc-type pill (TAX INVOICE/CASH MEMO) + Paid/Udhaar badge,
  3-column meta row (Bill no. · Customer · Date), plain hairline item rows (business-adaptive
  attributes preserved), totals (Total / "Total incl. GST"), "🙏 Dhanyavaad" footer. Udhaar banner +
  mark-paid + share logic untouched. **PdfService (actual PDF) left as-is** — already DUKAAN-styled
  + test-locked; the screenshots are the in-app view.
- ✅ **I4 — Product form (design 23/24).** `ProductFormModal`: subtitle "<shop type> · fields adapt
  to your shop", name input with a tag icon, **Price + Category** two-column row, **GST rate + HSN**
  two-column row, and the business-adaptive block in a **tinted box** with 2-column fields. (Products
  list + rows already polished in H1/H2; stock banner/low-stock chip skipped — stock is "Later".)
- ✅ **I5 — Settings + onboarding (design 28/02).** `SettingsScreen` gained a **profile-summary card**
  (store tile + shop name + location + GST/billing-mode chips) above the form (via a new optional
  `header` slot on `ProfileForm`). `SetupScreen` shop-type picker is now an **icon-card grid**
  (store/medical/shirt/shoe/ball/tools/monitor/utensils/layers) instead of a dropdown.
- ✅ **I6 — Bills history rows (design 37).** `BillHistoryScreen` rows match the dashboard look:
  leading icon, customer/"Walk-in" title + GST badge, "#num · date", amount + Paid/Udhaar badge.

**Phase I deferred (functional rework, best done with on-device verification — NOT blind):** Settings
as a full **menu hub** + sub-sheets (28/29/30); bills-history **search + Udhaar/GST filter chips +
date-group totals** (37); onboarding **step reorder** (dedicated biz-type step); per-sheet
micro-polish (16-22). The actual **PDF** redesign (`Pdf design.html` is missing from the tree —
use 09/38 as ref). Stock view/intake (26/27) stays "Later".

## 8.8 Phase J — Auth + cloud wiring (v17) SCAFFOLDED

Firebase phone-OTP auth + Supabase DB, **scaffolded behind interfaces with placeholders** so the
running app + offline billing are untouched; real creds + native config get wired later. **No sync
(that is Phase K).**

- **J1 — Auth architecture.** `IAuthService` (the seam: `requestOtp`/`verifyOtp`/`getSession`/
  `signOut`) with a **`MockAuthService`** (no native deps — accepts any correctly-sized OTP, persists
  a local session) so the gate/UI build + test today. `FirebaseAuthService` is a documented template
  in `services/AuthService.ts` (swap the export + install `@react-native-firebase/auth` + add
  `google-services.json` + rebuild). `AuthUser`/`AuthSession`/`OtpRequest` models. **Migration v17**
  `create_auth_session` (single-row local session) + `IAuthRepository`/`AuthRepository`. Phone→E.164
  + OTP validators in `utils/validation` (`toE164India`, `isValidOtp`). `user_id` is also the owner
  key Phase K tags cloud rows with.
- **J2 — Login screen + gate.** DUKAAN `LoginScreen` (phone → OTP, two steps, wired to `authService`;
  on success routes to Setup/Main like App does). `App.tsx` start-route logic: when
  `Config.auth.enabled` and no session → **Login**, else the usual Setup/Main. **`enabled` is `false`
  by default**, so today the app is unchanged; flip it on after wiring Firebase. `Login` added to the
  root stack (headerless).
- **J3 — Supabase client + cloud schema.** `services/SupabaseClient.ts` — `isSupabaseConfigured()`
  (reads `Config.supabase.url`/`anonKey`) + a documented `getSupabase()` template (no
  `@supabase/supabase-js` import until installed). `constants/config.ts` gained `auth` + `supabase`
  placeholders. **`backend/schema.sql`** — full Postgres mirror of every local table
  (shop_profile/products/manual_items/services/customers/bills/bill_items/parked_bills) keyed by
  `(user_id, id)` with `updated_at` (last-write-wins for K) + **RLS** policies (owner = Firebase JWT
  `sub`). Reference only — the app never runs it.

Gates: `tsc` 0, **jest 94/94** (+`auth.test.ts`: E.164/OTP validators + MockAuthService flow with an
in-memory repo), `eslint` 0 errors (3 cosmetic warnings). **No native deps added yet** — plain
`run-android` is unchanged. **To activate auth:** install `@react-native-firebase/app`+`auth`, add
`google-services.json`, swap `authService` to `FirebaseAuthService`, set `Config.auth.enabled=true`.

## 8.9 Phase K — Background sync (v18) IN PROGRESS

Local SQLite ↔ Supabase, **offline-first**: local DB is the source of truth, billing never waits on
the network. Built behind interfaces + **inert by default** (`Config.sync.enabled=false`,
`NoopSyncTransport`) so it runs nothing until creds + the Supabase transport are wired.

- ✅ **K1 — Outbox + meta (migration v18).** `sync_queue` outbox (table/row_id/op/attempts) +
  `sync_meta` (per-table pull cursor). `models/Sync.ts` (`SyncOp`, `SyncQueueItem`,
  `SYNCABLE_TABLES` in parent→child order so a pull never orphans a bill line).
  `ISyncQueueRepository`/`SyncQueueRepository` (enqueue **coalesces** a row's pending op, nextBatch
  FIFO, remove, bumpAttempts, dropExhausted poison-guard, pendingRowIds for pull-skip, count) +
  `ISyncMetaRepository`/`SyncMetaRepository` (get/setCursor, UPSERT). `Config.sync` added
  (enabled/pushBatchSize/maxAttempts). The op stores only (table,row id) — payload is read live at
  push time so repeated edits coalesce to latest.
- ✅ **K2 — Transport seam + local store.** `ISyncTransport` (`upsert`/`remove`/`pullSince`) with
  **`NoopSyncTransport`** default (billing-safe) + a documented `SupabaseSyncTransport` template (no
  `@supabase/supabase-js` import yet). `ILocalSyncStore`/`SqlLocalSyncStore`: sync works at the RAW
  snake_case ROW level (matches `backend/schema.sql` exactly — no domain mapping). `fetchRows`
  (push) + `applyRemote` (pull, `INSERT OR REPLACE` by id; keeps only real local columns, coerces
  cloud jsonb→TEXT + booleans→0/1). Per-table column list derived from `db/schema.ts` so it can't
  drift.
- ✅ **K3 — SyncEngine (push/pull/LWW).** Injected collaborators (queue/meta/store/transport) so it's
  fully unit-testable. `push()` drains a batch, groups by table, fetches live rows for upserts +
  `transport.upsert`, `transport.remove` for deletes, clears ops on success / `bumpAttempts` on
  failure (**per-table isolated, never throws**), `dropExhausted` poison guard. `pull()` per table:
  `pullSince(cursor)`, **skip rows with a pending outbox op (local-wins LWW)**, `applyRemote`,
  advance cursor. `sync()` = push then pull, re-entrancy-guarded. Default `syncEngine` wired to real
  repos/store but **NoopTransport** (inert). `__tests__/sync.test.ts` (7 tests: drain, delete,
  retry+attempts, poison-drop, pull-apply+cursor, pull-skip-pending, sync push+pull).
- ✅ **K4 — Enqueue wiring + trigger.** `SyncQueue` facade (`upsert`/`remove`) — **fire-and-forget,
  guarded** (no-op + ~zero cost when `Config.sync.enabled=false`, swallows errors; the local write
  already succeeded). Wired into every synced repo write: Product (create/update/delete), ManualItem,
  Service, Customer (upsertByPhone), ParkedBill (park/resume/delete), ShopProfile (save +
  setBillingMode), Bill (create → bills + each bill_item; markPaid; clearUdhaar → all the customer's
  bills). `SyncController.maybeSync()` — single guarded entry (enabled + `isSupabaseConfigured()` +
  signed-in), re-entrancy-locked, never throws; called from `App.tsx` on launch + on AppState
  `active`. Inert by default (and the default engine uses NoopTransport), so **billing is 100%
  unaffected** until activation.

**Phase K COMPLETE (scaffolded).** Gates: `tsc` 0, **jest 101/101** (+`sync.test.ts` 7), `eslint` 0
errors (3 cosmetic warnings). No native deps. **To go live:** `npm i @supabase/supabase-js`, fill
`Config.supabase`, apply `backend/schema.sql`, build a `SupabaseSyncTransport` (template in
SyncTransport.ts) + construct the engine with it in `SyncController`, wire Firebase auth (Phase J),
set `Config.auth.enabled` + `Config.sync.enabled = true`. **Known follow-ups for go-live (need real
Supabase):** image/PDF → Supabase storage; verify the local-wins LWW against real concurrent edits;
pull pagination loop for >pageSize backlogs.

### D→K roadmap (build one phase at a time; D–H done, I polished, J scaffolded, K scaffolded — ALL DEV PHASES DONE)
Governs all remaining work. Full spec: `DUKAAN_Complete_Requirements.md`; visual ref:
`./screenshots/` (40 PNGs — re-implement natively, never copy). Each phase ends with
report + device-test + tsc/eslint/jest, then wait for go-ahead. Offline billing stays
sacred; migrations append-only (now at v14 → continue v15…); user handles git.
- ✅ **D — Units (v9):** selling unit + decimal qty (DONE — §8.2).
- ✅ **E — Billing modes (v10):** scanner-free list mode (search + derived favourites) + mode
  switch + default-mode persistence (DONE — §8.3).
- ✅ **F — Payments & ledger (v11/v12):** Paid/Unpaid/Udhaar, payment mode, customer-wise pending
  ledger, mark-paid-later, save-customer (DONE — §8.4).
- ✅ **G — Bill extras (v13/v14):** discount (%/₹), round-off, hold/park bill, light checkout
  (DONE — §8.5). **Deferred:** tax-inclusive/exclusive (→ "G2"), bill edit/return/cancel (Later).
- ✅ **H — Full inventory / business-adaptive (v15/v16):** H1 adaptive product fields + default
  unit, H2 category filtering, H3 "Other" custom setup, H4 adaptive bill format (DONE — §8.6).
  **Deferred:** optional stock view + intake ("Later" — billing must NOT depend on stock).
- 🟦 **I — Visual polish (no migrations, substantially done — §8.7):** I1 dashboard, I2 billing/cart,
  I3 bill-detail invoice card, I4 product form, I5 settings+onboarding, I6 bills-history rows.
  **Done blind from `./screenshots` — needs device eyeball.** Deferred (functional rework): Settings
  menu-hub, bills search/filter/grouping, onboarding step reorder, PDF redesign.
- 🟦 **J — Backend foundation (v17, SCAFFOLDED — §8.8):** phone-OTP auth behind `IAuthService`
  (mock now / Firebase swap-in), login gate (off by default), Supabase client + `backend/schema.sql`
  cloud mirror. **No sync yet**; billing still fully offline. Activate later with Firebase creds.
- 🟦 **K — Background sync (v18, SCAFFOLDED — §8.9):** outbox + SyncEngine (push/pull, local-wins
  LWW) behind `ISyncTransport` (Noop now / Supabase template), enqueue wired into every synced repo,
  guarded trigger on launch+foreground. Inert by default; **never blocks billing**. Go-live needs
  Supabase creds + the transport swap. Image/PDF→storage = go-live follow-up.

**Repository interfaces are the seam** for J/K: a sync-aware impl of the existing
`I*Repository` interfaces swaps in at `db/database.ts`; screens stay untouched.
**Not now (skip entirely):** AI bill-photo reading.

### Optional polish (anytime)
- Thermal printer (reuse `PdfService`), per-shop-type default GST rates
  (`constants/shopTypes.ts` `// Future: defaultGst`), shop logo in the invoice header.
- Not wanted for this user base: e-invoicing/IRN/QR, GSTR export, email automation.

---

## 9. Conventions & gotchas (read before editing)

- **Design:** `DUKAAN - Design System Spec.md` is the styling source of truth. Build UI from
  **`components/ui`** + **DUKAAN tokens** in `constants/theme.ts`. Don't copy the web design
  `.jsx`/HTML — re-implement natively. Don't edit the spec or prompt files.
- **Don't restructure earlier phases.** Add new migration + model + repository + screens
  following existing patterns. **DB access only through repositories** (no SQL in screens).
- **Migrations are append-only and versioned.** New table/column = new `MIGRATIONS` entry with
  safe defaults (like v4) so old rows stay valid.
- **vision-camera stays on v4.** `react-native-share` v12 (no `whatsAppNumber`). Keep PDFs in
  the **cache dir** (FileProvider limit). The **Setup→Main gate** in `App.tsx` must stay.
- **Tests run off-device** (`__mocks__` via `jest.config.js`). Keep new pure-logic tests
  DB-free or extend the mocks. Run `tsc --noEmit`, `npm test`, `npm run lint` before handing off.
  When you add a required field to a model, **update the test fixtures** (`pdf.test.ts`
  builders, `cart.test.ts` literals) or tsc fails.
- **Fonts/icons are DONE (A3/A4).** Text: use **`fontFace(kind, weight)`** — never set
  `fontFamily` to a base family name (Android resolves custom fonts by file name; see §5E).
  Glyphs: use **`<Icon name=… />`** from `components/ui`. `react-native-svg` + fonts are
  **native → rebuild** after pulling.
- **Cart lines are keyed + kinded (C3/C4).** `CartItem.key` is the identity for all cart
  ops (products: barcode; manual/service: generated). `kind` ∈ `product|manual|service`;
  `productId`/`barcode` are null for non-products. The cart's single `hsnCode` field is the
  "tax code"; `BillRepository` routes it to `hsn_code` (goods) or `sac_code` (service) by
  kind. Use `CartService.addManual`/`addService`.
- **Both ＋ Manual and ＋ Service are always shown** in `BillingScreen` for now — **C6**
  gates them by `business_mode` (see §8 / §8.1).
- **Extension points are commented in code**: grep for `// Phase C`, `// Phase 3`,
  `// Phase 4`, `// Future`.
```
