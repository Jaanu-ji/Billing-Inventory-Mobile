# Bill App

Barcode-based billing app for retail shops, built in phases.

## Structure

```
Bill/
  frontend/   React Native app — billing MVP (Phase 1 barcode engine + Phase 2 cart, shop profile, GST bills & PDF/WhatsApp share; offline)
  backend/    Placeholder for Phase 4 (Express API + cloud sync) — empty for now
  claude_code_prompt_bill_app.md   Original project brief
```

Right now **everything functional lives in `frontend/`** — Phase 1 is offline and
needs no backend. The `backend/` folder is reserved for Phase 4.

## Run the app

```powershell
cd frontend
npm start          # Metro bundler (terminal 1)
npm run android    # build + install on a connected device (terminal 2)
```

See `frontend/README.md` for full run instructions, data model, folder layout,
and where future phases plug in.
