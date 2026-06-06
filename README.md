# Bill App

Barcode-based billing app for retail shops, built in phases. **Fully offline**, on-device.

Now with a complete **DUKAAN design system** — light, premium, Hinglish-friendly — applied
across every screen.

## Structure

```
Bill/
  frontend/                         React Native app — all current code
  backend/                          Placeholder for Phase 4 (Express API + cloud sync) — empty
  DUKAAN - Design System Spec.md    Design source of truth (colours/type/spacing/components)
  PROGRESS.md                       Full handoff / single source of truth to resume work
  claude_code_prompt_bill_app.md    Original project brief
```

Everything functional lives in `frontend/`. The `backend/` folder is reserved for Phase 4.

## Status

- ✅ **Phase 1 — Barcode engine:** scan → recognise/save products, products list (search, edit/delete).
- ✅ **Phase 2 — Billing:** scan-to-cart, simple & GST bills (CGST/SGST/IGST), shop profile,
  PDF invoice, WhatsApp/share, bill history & detail.
- ✅ **Design overhaul (Phase A + B):** shared design tokens + reusable component kit
  (`frontend/src/components/ui`), and **every screen + the invoice template restyled** to the
  DUKAAN spec. Offline billing, GST math and the local DB/migrations are unchanged.
- 🔜 **Phase C (next):** onboarding flow, home dashboard, manual (no-barcode) add, service
  billing, mixed (product + service) bills, business-type adaptivity — plus the deferred
  bundled fonts (Sora + Plus Jakarta Sans), `react-native-svg` icon set, and (optional)
  `react-native-gesture-handler`.

**Tested:** 43 Jest tests passing (pure logic — validation, cart, GST, profile, PDF/share),
`tsc --noEmit` clean.

## Run the app

```powershell
cd frontend
npm start          # Metro bundler (terminal 1)
npm run android    # build + install on a connected device (terminal 2)
```

See **`PROGRESS.md`** for the full handoff (architecture, design system, data model,
navigation, what's tested, and exactly what Phase C builds) and `frontend/README.md` for
RN-specific run details.
