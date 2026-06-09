# Bill App

Barcode-based billing app for retail shops, built in phases. **Fully offline**, on-device.

Now with a complete **DUKAAN design system** — light, premium, Hinglish-friendly — applied
across every screen.

## Structure

```
Bill/
  frontend/                         React Native app — all current code
  backend/                          Placeholder for cloud (Auth + Supabase sync, phases J/K) — empty
  DUKAAN - Design System Spec.md    Design source of truth (colours/type/spacing/components)
  DUKAAN_Complete_Requirements.md   Full feature/edge-case spec for the D→K roadmap
  screenshots/                      40 design PNGs (visual reference — re-implement natively, don't copy)
  PROGRESS.md                       Full handoff / single source of truth to resume work
  claude_code_prompt_bill_app.md    Original project brief
```

Everything functional lives in `frontend/`. The `backend/` folder is reserved for the cloud phases (J/K).

## Status

- ✅ **Phase 1 — Barcode engine:** scan → recognise/save products, products list (search, edit/delete).
- ✅ **Phase 2 — Billing:** scan-to-cart, simple & GST bills (CGST/SGST/IGST), shop profile,
  PDF invoice, WhatsApp/share, bill history & detail.
- ✅ **Design overhaul (Phase A + B):** shared design tokens + reusable component kit
  (`frontend/src/components/ui`), and **every screen + the invoice template restyled** to the
  DUKAAN spec.
- ✅ **Phase C:** multi-step onboarding, home dashboard, manual (no-barcode) add, service
  billing, mixed (product + service) bills, business-type adaptivity — plus bundled fonts
  (Sora + Plus Jakarta Sans) and the `react-native-svg` icon set.
- ✅ **Phase D — Units (DB v9):** per-item **selling unit** (pcs/kg/g/litre/ml/meter/box…) with
  **decimal quantities** (1.5 kg, 0.25 litre); unit shows in cart, bill detail and the PDF invoice.
- ✅ **Phase E — Billing modes (DB v10):** switchable **scan / list / service / mixed** billing;
  scanner-free **list mode** (search + quick-add tiles, no camera); the mode is remembered per shop.
- ✅ **Phase F — Payments & ledger (DB v11/v12):** **Paid / Udhaar** on every bill + payment mode
  (cash/UPI/card), saved customers, a **customer-wise udhaar ledger**, mark-paid-later & clear-udhaar.
- ✅ **Phase G — Bill extras (DB v13/v14):** bill **discount** (% or ₹) + **round-off**, and
  **hold / park** an in-progress bill to resume later. (Tax-inclusive pricing deferred to "G2".)
- ✅ **Phase H — Inventory / business-adaptive (DB v15/v16):** business-adaptive **product fields**
  (medical batch/expiry, garment size/colour…), a per-shop **default selling unit**, **category
  filtering** on the products list, an **"Other" custom setup** in onboarding, and a
  **business-adaptive bill/invoice** that shows the relevant fields per line. (Stock tracking = "Later".)

- 🟦 **Phase I — Visual polish (no DB change):** dashboard, billing/cart, bill-detail invoice card,
  product form, settings + onboarding, and bills-history rows brought closer to the `./screenshots`
  design. (Done from the design images — **eyeball on device**; a few structural reworks — Settings
  menu-hub, bills search/filter, PDF redesign — are deferred.)

- 🟦 **Phase J — Auth + cloud wiring (DB v17, scaffolded):** a **phone-OTP login** behind an
  interface (local mock now; Firebase swap-in documented), a login **gate that's off by default**
  (app + offline billing unchanged), a Supabase client + **`backend/schema.sql`** cloud mirror of
  every local table (with RLS). **No sync yet** — that's Phase K. Activate by wiring Firebase creds.

- 🟦 **Phase K — Background sync (DB v18, scaffolded):** an **outbox + sync engine** (push local
  changes / pull remote, last-write-wins) behind an `ISyncTransport` seam (no-op now; Supabase
  template ready), enqueue wired into every synced write, with a guarded trigger on launch +
  foreground. **Inert by default — never blocks billing.** Go-live = wire Supabase creds + the
  transport.

**All development phases (1–2, A–K) are complete.** Auth (J) and cloud sync (K) are scaffolded
behind interfaces and **off by default**, so the app runs fully offline exactly as before; flip
them on after wiring Firebase + Supabase credentials (see `PROGRESS.md` §8.8/§8.9 go-live
checklists). See `DUKAAN_Complete_Requirements.md`.

**Tested:** 85 Jest tests passing (pure logic — validation, cart, units, billing modes, payments,
GST + discount/round-off, profile, product fields, PDF/share), `tsc --noEmit` clean, `eslint` 0 errors.

## Run the app

```powershell
cd frontend
npm start          # Metro bundler (terminal 1)
npm run android    # build + install on a connected device (terminal 2)
```

See **`PROGRESS.md`** for the full handoff (architecture, design system, data model,
navigation, what's tested, and the D→K roadmap) and `frontend/README.md` for
RN-specific run details.
