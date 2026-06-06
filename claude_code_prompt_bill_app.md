# Claude Code Prompt — Bill App (Phase 1)

> Yeh poora text copy karke Claude Code me paste karna, `bill` folder ke andar.

---

## CONTEXT

I am building a barcode-based billing app for retail shops (kirana, medical, garment, etc.). This is **Phase 1** — the core barcode engine only. AI features and inventory-from-bill-photo will come later, so do NOT build them now. Keep the architecture clean so they can be added later.

**Tech stack for Phase 1:**
- React Native (CLI, NOT Expo)
- Local storage only — use a local on-device database (SQLite via `react-native-nitro-sqlite` or `op-sqlite`; pick the most stable, currently-maintained option and tell me which you chose and why)
- Barcode/QR scanning via the device camera (use `react-native-vision-camera` with its code-scanner, the current standard — verify the latest stable version before installing)
- NO backend, NO Express, NO cloud, NO internet dependency in this phase. Everything runs offline on the phone.

> Note: Express backend + cloud sync will be added in a LATER phase (for multi-device + backup). Do not add it now. Just keep the data layer modular so a sync layer can plug in later.

## ENVIRONMENT CHECK FIRST (do this before writing any app code)

Before building, check my laptop has everything needed for React Native CLI development, and report what's present/missing. Check and tell me:
1. Node.js version (and npm/yarn)
2. Java JDK version (for Android)
3. Android Studio + Android SDK + an emulator or connected device
4. React Native CLI availability
5. Watchman (if applicable)
6. ADB working + any device detected via `adb devices`
7. (If on Mac) Xcode + CocoaPods for iOS — otherwise note iOS is skipped

If anything required is missing, STOP and give me the exact commands/steps to install it for my OS before continuing. Do not proceed to build until the environment is ready. Ask me to confirm once I've installed missing pieces.

## WHAT TO BUILD (Phase 1 scope — ONLY this)

A working app that does exactly this core loop:

1. **Scan screen (home):** Camera open, live barcode/QR detection.
2. **First time a barcode is seen (unknown):** Show a small form/popup — "New product. Enter name and price." Save it to the local DB linked to that barcode.
3. **Next time the same barcode is scanned (known):** Instantly show the matched product — name + price — on screen (a confirmation card / toast). This is the key thing to prove: **scan → recognize → show correct product.**
4. **Products list screen:** A simple list of all saved products (barcode, name, price) with the ability to edit or delete an entry.

That's the entire Phase 1. The goal is: **data goes in correctly and comes out correctly, reliably, offline.**

### Explicitly NOT in Phase 1 (do not build):
- No AI / bill-photo reading
- No inventory quantity/stock tracking
- No bill/invoice generation or PDF
- No GST calculation
- No WhatsApp share
- No backend / Express / cloud / login
- No multi-device sync

Keep these out, but structure the code (folders, data layer) so they can be added cleanly later.

## DATA MODEL (local DB)

A single `products` table is enough for Phase 1:
```
products
  id           (primary key, auto)
  barcode      (text, unique, indexed)   -- the scanned code
  name         (text)
  price        (real)
  created_at   (timestamp)
```
Index `barcode` so lookup on scan is instant.

> Set this up via a **versioned migration system** (not a one-off CREATE TABLE), so future tables — `bills`, `bill_items`, `inventory`, `customers` — can be added as clean migrations later without touching existing data.

## ARCHITECTURE — build the FULL structure now (very important)

Even though Phase 1 only ships the barcode-recognize feature, I want the **project structure, folders, and data layer to be built correctly and future-ready from day one**, so that later phases (billing, inventory, AI bill-reading, and Express + cloud sync) can be added WITHOUT restructuring or rewriting. Do this properly now so there's no mess later.

Specifically:
- **Layered/clean folder structure**, e.g.:
  ```
  src/
    screens/          (UI screens — ScanScreen, ProductsScreen now; BillScreen, InventoryScreen later)
    components/        (reusable UI)
    db/                (database init, migrations, schema)
    repositories/      (data access — ProductRepository now; BillRepository, InventoryRepository later)
    services/          (business logic — scan handling now; pdf, share, ai, sync later)
    models/            (data types — Product now; Bill, CartItem, etc. later)
    navigation/        (navigation setup, ready for more screens)
    utils/             (helpers, validation, debounce)
    constants/         (config, theme)
  ```
- **Repository pattern for data:** All DB access goes through a repository layer, NOT directly from UI. This means when the Express+cloud sync layer is added in Phase 4, only the repository internals change — screens stay untouched. Define a clean interface for the data layer.
- **DB migrations system:** Set up the SQLite schema with a versioned migration approach (a `schema_version` mechanism), so adding tables later (bills, inventory, customers) is a clean migration, not a rebuild.
- **Navigation ready to grow:** Use a proper navigation setup (react-navigation) even though there are only 2 screens now, so new screens slot in easily.
- **Typed:** Use TypeScript. Define models/interfaces cleanly so future entities extend naturally.
- **Config-driven:** Keep things like DB name, debounce time, etc. in a constants/config file, not hardcoded across files.
- **Comment where future phases plug in:** In the relevant files, add short comments like `// Phase 4: cloud sync hook goes here` so I know exactly where extensions attach.

> The point: I should be able to open this project in 2 months, add billing/inventory/AI/sync, and everything fits the existing structure cleanly. Build the skeleton complete and correct now, even if only Phase 1 features are functional.

## FLOW (this is the agreed flow — keep it)

```
Camera open (scan screen)
   │
   ├─ barcode detected
   │     ├─ found in DB  → show "Matched: <name> — ₹<price>" card
   │     └─ not found     → popup "New product: enter name + price" → save → confirm
   │
   └─ (debounce: same barcode shouldn't fire repeatedly within ~2 seconds)

Products screen
   └─ list all products, edit / delete
```

## REQUIREMENTS / QUALITY

- Handle camera permission properly (request on first launch; show a clear message if denied). Add camera permission entries to AndroidManifest.xml (and Info.plist if iOS).
- Debounce repeated scans of the same code (~2s) so one scan = one event.
- Clean, simple, fast UI — this is for a shopkeeper, minimal taps, large readable text.
- Validate inputs (price must be a number, name not empty).
- Comment the code clearly, especially the data layer, since I'll extend it later.
- After building, give me exact run instructions: how to start metro, build to a connected Android device, and what to expect.

## DELIVERABLES

1. Environment check report (step 1 above) — and stop if anything is missing.
2. Once env is ready: full working React Native CLI app in this folder implementing the Phase 1 scope.
3. A short README in the folder: how to run, the data model, the folder structure, and a "Phase 2 / later" section noting where AI, inventory, billing, and the Express+cloud sync layer will plug in.

Start with the environment check now. Do not build the app until I confirm the environment is ready.
