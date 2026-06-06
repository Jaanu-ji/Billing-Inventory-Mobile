# Backend (Phase 4 — not built yet)

This folder is a **placeholder** for the future backend.

Phase 1 is **fully offline** (everything runs on-device in the React Native app
under `../frontend`). There is **no backend code yet**.

## What will live here (Phase 4)
- **Express API** server (Node + TypeScript)
- **Cloud sync** for multi-device support + backup
- It will sync against the same data the app already stores locally. On the app
  side, only the repository internals change (a sync-aware implementation of
  `IProductRepository`) — the screens stay untouched.

Until Phase 4 begins, this folder stays empty.
