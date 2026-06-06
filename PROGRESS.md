# Bill App — PROGRESS / Handoff

> Single source of truth to resume work in a new session without asking anything.
> Last updated: 2026-06-06.

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
| Helpers | `react-native-screens`, `react-native-safe-area-context` | latest | |
| Language | TypeScript | 5.x | strict-ish, fully typed |

**No new native dependencies were added during the design overhaul (Phase A+B).**
Swipe-to-remove, animated toggles, the camera laser, and all overlays use **core RN**
(`PanResponder`, `Animated`, `Modal`) — so the restyle needs **no rebuild beyond the
normal one**. Deferred deps that Phase C will likely want: **bundled fonts**
(Sora + Plus Jakarta Sans), **`react-native-svg`** (line-icon set), and optionally
**`react-native-gesture-handler`** (richer gestures). See §8.

---

## 3. Repo layout

```
C:\BanaoBanao\Bill\                 <- project root
├── PROGRESS.md                     <- this file
├── README.md                       <- short root overview
├── DUKAAN - Design System Spec.md  <- DESIGN SOURCE OF TRUTH (colours/type/spacing/components)
├── Billing and inventory.html      <- exported visual design reference (web; do NOT copy its code)
├── Billing and inventory_files/    <- assets for that reference
├── claude_code_prompt_bill_app.md  <- original Phase 1 brief
├── frontend/                       <- the entire React Native app (all current code)
└── backend/                        <- EMPTY placeholder for Phase 4 (Express + cloud sync)
```

> The whole app lives in **`frontend/`**. Always run commands from inside `frontend/`.
> **Do not edit** `DUKAAN - Design System Spec.md` or the prompt files — they're inputs.

### `frontend/src/` (layered architecture)

```
src/
  screens/        HomeScreen (Phase B1 placeholder; real dashboard = Phase C2),
                  SetupScreen, SettingsScreen,                       (Phase 2 Part 2)
                  BillingScreen, BillHistoryScreen, BillDetailScreen, (Phase 2 Part 1)
                  ScanScreen, ProductsScreen                          (Phase 1)
  components/
    ui/           DUKAAN component kit (Phase A2) — see §5C:
                  Text(AppText), Button + IconButton, Card, Row + RowThumb,
                  Field/Input/Textarea, Select, Toggle, Segmented, Stepper,
                  Badge, Chip, TopBar, BottomSheet/CenterModal, index.ts (barrel)
                  PrimaryButton, ProductFormModal, MatchedCard, ProductListItem,
                  CameraScanner, CartItemRow, CheckoutModal, SelectField, ProfileForm,
                  TorchButton   (all restyled to the kit in Phase B)
  db/              database.ts (open + migrate), migrations.ts (v1–v4), schema.ts
  repositories/    IProductRepository + ProductRepository
                   IBillRepository    + BillRepository
                   IProfileRepository + ProfileRepository
  services/        ScanService (scan + debounce), CartService (pure cart math incl. setPrice),
                   ProfileService (cached profile + isGstEnabled()),
                   GstService (pure CGST/SGST/IGST calculator),
                   PdfService (pure buildBillHtml() + generateBillPdf()),
                   ShareService (share sheet + WhatsApp + toSimpleBill()/shareBillAsSimple())
  models/          Product, Bill / BillItem / CartItem, ShopProfile
  navigation/      AppNavigator (5-tab + center FAB), types
  utils/           validation, debounce (TimeGate), format (price + date)
  constants/       config, theme (legacy + DUKAAN tokens), shopTypes, states, gst
__tests__/         logic, cart, profile, gst, pdf  (43 tests, all passing)
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

### Test coverage (Jest, pure logic — no device)
- `logic` (validation/debounce/format/scan), `cart` (add/qty/remove/totals/**setPrice**),
  `profile` (incl. conditional GST), `gst` (simple/intra/inter, rounding),
  `pdf` (`buildBillHtml` simple + GST intra/inter, escaping, no-profile; **`toSimpleBill`**
  no-mutation + total-preserved + renders-plain-INVOICE + non-GST passthrough;
  `toWhatsAppNumber`).
- **43 tests total, all passing.** Native PDF/share/sqlite mocked in `__mocks__`.

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
- **`FontFamily`** — `display`/`ui` are **`undefined` (system fallback) for now**; set them
  to `'Sora'`/`'PlusJakartaSans'` once fonts are bundled (A3) and the whole app inherits.
- **`FontWeight`**, **`Space`** (4→32), **`Radii`** (xs8…full999), **`Elevation`**
  (xs/sm/md/lg + primary/teal glows; each has iOS shadow props **and** Android `elevation`).

### A2 — Component kit (`src/components/ui/*`, import via barrel `'../components/ui'`)
`AppText` (variant/color/numeric/weight) · `Button` (primary/teal/wa/**danger**/secondary/
outline/ghost · sm/md/lg · block/loading) + `IconButton` (default/tonalP/tonalT/glass) ·
`Card` (raised/flat/pad) · `Row` + `RowThumb` · `Field`/`Input`/`Textarea` · `Select`
(trigger; caller opens the picker) · `Toggle` (animated) · `Segmented<T>` · `Stepper` ·
`Badge` · `Chip` (default/ink/primary-active) · `TopBar` · `BottomSheet`/`CenterModal`.

### A3 / A4 — DEFERRED (do in Phase C)
- **A3 Fonts:** bundle Sora + Plus Jakarta Sans via `react-native.config.js` +
  `npx react-native-asset` (touches `android/app/src/main/assets/fonts` + iOS Info.plist),
  then set `FontFamily.display/ui`. Until then everything resolves to the system font.
- **A4 Icons:** add **`react-native-svg`** + a 2px line-icon set (incl. business-type
  glyphs). Until then: emoji tab icons + a few **unicode/drawn-View** glyphs (chevron `⌄`,
  back `‹`, stepper `−/＋`, the FAB scan reticle, the camera corner brackets/laser).

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
NO migrations** — DB is unchanged at **v4**.

| Migration | Tables | Phase |
|-----------|--------|-------|
| **v1** `create_products` | `products` | Phase 1 |
| **v2** `create_bills` | `bills`, `bill_items` | Phase 2 Part 1 |
| **v3** `create_shop_profile` | `shop_profile` | Phase 2 Part 2 |
| **v4** `add_gst_fields` | ALTER `products`/`bills`/`bill_items` (ADD COLUMN) | Phase 2 GST |

- **`products`**: `id`, `barcode` (unique, indexed), `name`, `price`, `created_at`, **+v4**
  `gst_rate`, `hsn_code?`.
- **`bills`**: `id`, `bill_number` (unique seq), `customer_name?`, `customer_phone?`,
  `subtotal`, `total`, `created_at`, **+v4** `bill_type`, `customer_gstin?`, `customer_state?`,
  `customer_state_code?`, `is_inter_state`, `cgst`, `sgst`, `igst`.
- **`bill_items`**: `id`, `bill_id` (FK CASCADE), `product_id?` (FK SET NULL), `name`,
  `price`, `quantity`, `line_total`, **+v4** `gst_rate`, `hsn_code?`, `gst_amount`
  (name/price/rate/HSN are **snapshots**).
- **`shop_profile`** (single row): `id`, `shop_type`, `shop_name`, `phone`, `address?`,
  `gst_enabled`, `gstin?`, `state?`, `state_code?`, `created_at`, `updated_at`.

**Phase C migrations (planned, v5+):** `shop_profile.business_mode` (product/service/mixed),
a `services` table, `bill_items.item_kind` (+ `sac_code`), and a `manual_items` table — all
additive with safe defaults, exactly like v4.

---

## 7. Navigation map

Root **stack** (`AppNavigator`) hosts the **5-item bottom-tab** navigator (`Main`) plus
pushed screens. Start route at runtime (`Setup` first launch, else `Main`); app opens on the
**Billing (center FAB)** tab.
```
Setup (first launch only) ──reset──▶ Main

Main = bottom tabs:  [ ⌂ Home ] [ ▦ Products ] [ ●FAB Bill ] [ 🧾 Bills ] [ ⚙ Settings ]
   Products tab ──push──▶ Scan        (parent stack; "View Products" = goBack)
   Bills    tab ──push──▶ BillDetail  (parent stack)
   Home is a Phase-B placeholder (real dashboard = Phase C2); FAB selects the Billing tab
```
- `Home`/`Products`/`Billing`/`BillHistory`/`Settings` are **tabs** (`MainTabParamList`);
  `Setup`/`Main`/`BillDetail`/`Scan` are **stack** routes (`RootStackParamList`).
- Tabs that push a stack route use `CompositeScreenProps<BottomTabScreenProps, NativeStackScreenProps>`.
- The center **Bill** tab uses a custom `tabBarButton` (`ScanFab` in `AppNavigator`).

---

## 8. NEXT — Phase C (new screens + adaptivity)

> Billing MVP + full design overhaul are **COMPLETE**. Phase C adds the screens the design
> shows that aren't built yet, plus the deferred fonts/icons. Build **one sub-step at a time**,
> keep existing logic intact, add migrations append-only.

**Recommended order (smallest safe steps):**
- **A3 fonts + A4 icons first** (several Phase-C screens want them): bundle Sora+Jakarta and
  set `FontFamily`; add `react-native-svg` + the line-icon set (replace emoji/unicode/drawn
  glyphs). *(native autolink → rebuild.)*
- **C1 Onboarding** — multi-step welcome → business-type → shop details → GST setup (replaces
  the single-step `SetupScreen`). Migration **v5** `shop_profile.business_mode`.
- **C2 Home dashboard** — today's sales, bills count, big "Naya Bill", recent bills (replace
  the `HomeScreen` placeholder). Add an aggregate query to `BillRepository`.
- **C3 Manual add** — no-barcode items with **reuse-search**; migration **v8** `manual_items`
  table + repository + modal; wire into the Billing cart's ＋ Manual button.
- **C4 Service billing** — manual line items + saved-services quick-pick + notes; migrations
  **v6** `services` + **v7** `bill_items.item_kind`/`sac_code`; same invoice output.
- **C5 Mixed bill** — one bill with **both** scanned products and service/manual lines;
  invoice lists them in labelled sections (builds on C3/C4).
- **C6 Business-type adaptivity** — `business_mode` sets the default billing mode (product →
  scan, service → service, mixed → both); route Home/FAB accordingly.

**Deferred deps Phase C needs:** bundled fonts (A3), `react-native-svg` (A4), optionally
`react-native-gesture-handler` for richer gestures (current swipe uses core `PanResponder`).

### Later phases (do NOT build until scoped)
- **Phase 3 — Inventory:** stock/quantity tracking; new table + `InventoryRepository`. Hooks
  in via the product catalog (edit-on-scan is where stock editing plugs in).
- **Phase 4 — Express backend + cloud sync:** build in `backend/`; implement the existing
  repository **interfaces** with a sync-aware version; sync hook attaches in `db/database.ts`.
  **Screens stay untouched.**
- **AI bill-photo reading:** a `services/ai` module feeding parsed items through repositories.

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
- **Fonts/icons are placeholders** until A3/A4 — `FontFamily.display/ui` are `undefined`;
  glyphs are emoji/unicode/drawn Views. Bundling fonts + adding svg icons is a single
  central change each.
- **Extension points are commented in code**: grep for `// Phase C`, `// Phase 3`,
  `// Phase 4`, `// Future`.
```
