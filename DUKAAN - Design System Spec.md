# DUKAAN — Design System Specification
**Billing + Inventory app for Indian retail · v1.0**
Light theme · modern, bold, colourful, clean. Big readable text, large tap targets.

This is the exact, build-ready spec. All tokens map 1:1 to `styles.css` (CSS custom properties on `:root`).

---

## 1. COLOUR

### 1.1 Primary — Orange (brand, primary actions)
| Token | Hex | Use |
|---|---|---|
| `--p-50`  | `#FFF7ED` | tint backgrounds, selected rows |
| `--p-100` | `#FFEDD5` | chips, tonal icon buttons |
| `--p-200` | `#FED7AA` | borders on tinted surfaces |
| `--p-300` | `#FDBA74` | — |
| `--p-400` | `#FB923C` | scan laser, gradients |
| `--p-500` | `#F97316` | gradient partner |
| **`--primary` / `--p-600`** | **`#EA580C`** | **primary buttons, brand, active nav** |
| `--primary-press` / `--p-700` | `#C2410C` | pressed/active state |
| `--p-800` | `#9A3412` | — |
| `--p-900` | `#7C2D12` | deep accents |

### 1.2 Accents
| Token | Hex | Role |
|---|---|---|
| `--teal` | `#0D9488` | Success / "Paid" / WhatsApp-saved |
| `--teal-600` | `#0F766E` | teal text on tint |
| `--teal-100` | `#CCFBF1` | "Paid" badge bg |
| `--teal-50` | `#F0FDFA` | teal tint surface |
| `--indigo` | `#4F46E5` | GST / info / services |
| `--indigo-100` | `#E0E7FF` | "GST" badge bg |
| `--indigo-50` | `#EEF2FF` | indigo tint surface |
| `--amber` | `#F59E0B` | Warning / "Unpaid" |
| `--amber-100` | `#FEF3C7` | — |
| `--amber-50` | `#FFFBEB` | "Unpaid" badge bg |
| `--gold` | `#FACC15` | highlight, torch-on |

### 1.3 Semantic
| Token | Hex |
|---|---|
| `--success` | `#0D9488` (teal) |
| `--warning` | `#F59E0B` (amber) · text on tint `#B45309` |
| `--danger` | `#E11D48` · bg `--danger-50 #FFF1F2`, `--danger-100 #FFE4E6` |

### 1.4 Neutrals — Slate
| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| `--n-0` | `#FFFFFF` | | `--n-400` | `#94A3B8` |
| `--n-25` | `#FCFCFD` | | `--n-500` | `#64748B` |
| `--n-50` | `#F8FAFC` | | `--n-600` | `#475569` |
| `--n-100` | `#F1F5F9` | | `--n-700` | `#334155` |
| `--n-150` | `#EAEEF3` | | `--n-800` | `#1E293B` |
| `--n-200` | `#E2E8F0` | | `--n-900` / `--ink` | `#0F172A` |
| `--n-300` | `#CBD5E1` | | | |

### 1.5 Surfaces
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F4F6F9` | app background |
| `--surface` | `#FFFFFF` | cards, sheets, bars |
| `--hairline` | `#EAEEF3` | dividers, card borders |

### 1.6 Text colours
- Primary text: `--ink` `#0F172A`
- Muted: `--n-500` `#64748B` (`.muted`)
- Faint: `--n-400` `#94A3B8` (`.muted-2`)
- On primary/dark surfaces: `#FFFFFF`

---

## 2. TYPOGRAPHY

**Families** (Google Fonts):
- Display / headings / **all numbers** → **Sora** (`--font-display`), weights 400–800
- UI / body / labels → **Plus Jakarta Sans** (`--font-ui`), weights 400–800
- Numbers always use `.num` → `font-variant-numeric: tabular-nums; font-feature-settings:"tnum"` (aligned digits for money)

**Scale** (class · font · size / line-height / weight / tracking):
| Class | Font | Size | Line | Weight | Tracking |
|---|---|---|---|---|---|
| `.t-display` | Sora | 40px | 1.02 | 800 | -0.03em |
| `.t-h1` | Sora | 26px | 1.10 | 700 | -0.02em |
| `.t-h2` | Sora | 20px | 1.15 | 700 | -0.02em |
| `.t-h3` | Sora | 17px | 1.20 | 600 | -0.01em |
| `.t-body` | Jakarta | 16px | 1.45 | 500 | — |
| `.t-bodysm` | Jakarta | 14px | 1.45 | 500 | — |
| `.t-label` | Jakarta | 13px | — | 600 | 0.01em |
| `.t-cap` | Jakarta | 12px | — | 600 | 0.02em |
| `.t-overline` | Jakarta | 11px | — | 700 | 0.09em · UPPERCASE |

Global: body letter-spacing `-0.01em`. Minimum on-screen text size: 12px (captions); body 14–16px.
Money display: Sora 700–800 + `.num`, Indian grouping (e.g. `₹12,480`, `₹1,23,456`).

---

## 3. SPACING, RADIUS, ELEVATION

### 3.1 Spacing — 4pt base
Scale used: **4, 8, 12, 16, 20, 24, 32**px. Screen gutters: 16–20px. Card padding: 14–18px. Section gaps: 12–16px.

### 3.2 Corner radius
| Token | px | Use |
|---|---|---|
| `--r-xs` | 8 | inputs inner, small chips |
| `--r-sm` | 12 | thumbnails, small cards |
| `--r-md` | 16 | buttons, inputs, list cards |
| `--r-lg` | 20 | primary cards, large buttons |
| `--r-xl` | 26 | modals |
| `--r-2xl` | 32 | sheets |
| `--r-full` | 999 | pills, badges, toggles, FAB ring |

### 3.3 Elevation (shadows)
| Token | Value |
|---|---|
| `--sh-xs` | `0 1px 2px rgba(15,23,42,.06)` |
| `--sh-sm` | `0 2px 6px rgba(15,23,42,.07)` |
| `--sh-md` | `0 6px 18px rgba(15,23,42,.09)` |
| `--sh-lg` | `0 16px 40px rgba(15,23,42,.14)` |
| `--sh-primary` | `0 10px 24px rgba(234,88,12,.32)` (orange glow under primary CTAs) |
| `--sh-teal` | `0 10px 24px rgba(13,148,136,.28)` |

---

## 4. ICONOGRAPHY
- Style: **line icons, 2px stroke, round caps & joins, 24×24 grid.**
- Default size 24px (20–22 in dense rows, 28+ for hero/FAB).
- Colour: inherits text colour or accent. Brand glyphs (WhatsApp) use filled fill.
- Custom set incl. business-type glyphs (kirana, medical, garment, footwear, sports, hardware, electronics, restaurant, service).

---

## 5. COMPONENTS

### 5.1 Buttons (`.btn`)
- Base: Jakarta 700, 16px, radius `--r-md`, height **54px**, gap 9px, transition transform .12s. Active: `translateY(1px) scale(.99)`.
- Variants:
  - `.btn-primary` — bg `#EA580C`, text #fff, shadow `--sh-primary`; pressed `#C2410C`
  - `.btn-teal` — bg `#0D9488`, #fff, shadow `--sh-teal`
  - `.btn-wa` (WhatsApp) — bg `#25D366`, text `#0a3d1e`, shadow `0 10px 24px rgba(37,211,102,.32)`
  - `.btn-secondary` — bg `--n-100`, text ink; active `--n-150`
  - `.btn-outline` — bg surface, inset ring `1.5px --n-200`
  - `.btn-ghost` — transparent, primary text
- Sizes: `.btn-lg` h60 / 17px / radius `--r-lg`; `.btn-sm` h42 / 14px / radius `--r-sm`. `.btn-block` full width.
- Disabled: opacity .45, no shadow.
- **Icon button** `.iconbtn`: 48×48, radius `--r-md`, bg `--n-100`. Tonal: `.tonal-p` (p-100/p-700), `.tonal-t` (teal). `.glass` (on camera): `rgba(255,255,255,.16)` + blur.

### 5.2 Cards
- `.card` — surface, radius `--r-lg` (20), `--sh-sm`, 1px `--hairline` border.
- `.card-flat` — surface, radius 20, 1px `--n-150`, no shadow.
- `.card-pad` — padding 18px.

### 5.3 List rows (`.row`)
- Flex, gap 14, padding 14×16. Divider between rows: 1px `--hairline`.
- `.row-thumb` 46×46 radius 12, tinted bg + accent initials (Sora 700).
- `.row-title` 15.5px/700; `.row-sub` 13px/500 `--n-500`.

### 5.4 Inputs
- `.input` — height **54px**, radius `--r-md`, 1.5px `--n-200` border, surface, 16px/600 text. Placeholder `--n-400`/500.
- Focus: border `--primary` + ring `0 0 0 4px rgba(234,88,12,.12)`.
- `.input-lg` h62/18px. `.textarea` min-height 96, top-aligned.
- `.input-prefix` (e.g. ₹) `--n-400`/700.
- `.select` — same frame, chevron-down `--n-400`; placeholder `.ph` `--n-400`.
- `.field` — column, gap 8; `.field-label` 13px/700 `--n-600`.

### 5.5 Toggle (`.toggle`)
- 52×31, radius full, off `--n-300` / on `--teal`. Knob 25px white, `--sh-sm`, slides 3→24px, cubic-bezier(.3,1.3,.5,1).

### 5.6 Segmented control (`.seg`)
- bg `--n-100`, pad 4, radius `--r-md`. Buttons h42 radius 12, 14px/700 `--n-500`; active = surface + `--sh-xs` + ink.

### 5.7 Stepper (`.stepper`)
- Inline pill, bg `--n-100`, pad 3. Buttons 34×34 round, surface, `--sh-xs`. Qty Sora 700/16 `.num`.

### 5.8 Badges (`.badge`) — height 26, radius full, 12px/700
| Class | bg | text | Use |
|---|---|---|---|
| `.badge-paid` | `--teal-100` | `--teal-600` | Paid (with `.dot`) |
| `.badge-unpaid` | `--amber-50` | `#B45309` | Unpaid (with `.dot`) |
| `.badge-gst` | `--indigo-100` | `--indigo` | GST bill |
| `.badge-simple` | `--n-100` | `--n-600` | Simple bill |
| `.badge-stock` | `--success-50` | `--teal-600` | In stock |
| `.badge-low` | `--danger-50` | `--danger` | Low stock |
| `.badge-soft` | `--p-100` | `--p-700` | "Soon" / generic |

### 5.9 Chips (`.chip`)
- h38, radius full, surface, 1.5px `--n-200`, 14px/600 `--n-600`.
- `.active` — ink fill, white text. `.active-p` — p-50 bg, p-700 text, p-200 border (selected category/GST).

### 5.10 Top bars (`.topbar`)
- Pad 6×18×14. Title Sora 700/22, tracking -0.02em. `.tb-back` 44×44 radius 16 surface + hairline.

### 5.11 Bottom nav (`.bottomnav`)
- Height **84px**, surface, top 1px hairline, shadow `0 -4px 24px rgba(15,23,42,.05)`.
- 5 items: Home · Products · **Bill (center FAB)** · Bills · Settings. Item icon 24 + 11px/700 label; active = `--primary`.
- `.nav-fab` — 60×60 radius 20, `--primary`, white scan icon, shadow `--sh-primary`, 4px surface border, lifted -26px.

### 5.12 Modals & sheets
- `.scrim` — `rgba(15,23,42,.45)` + blur 2px; `.center` variant centers content.
- `.sheet` — bottom sheet, radius 28 top, pad 10×20×26, `--sh-lg`; grab handle 40×5 `--n-200`.
- `.modal` — radius `--r-xl` (26), pad 24, `--sh-lg`.

### 5.13 Status bar / home indicator
- Status bar 50px: time (Sora 600/15) + signal/wifi/battery glyphs. `.on-dark` → white.
- Home indicator: 134×5 pill, `--n-300` (or white .5 on dark), 28px tray.

---

## 6. SCREEN PATTERNS
- **Screen root** `.scr`: column flex, Jakarta, `--bg`, letter-spacing -0.01em. Design size **390 × 844** (iPhone 13/14 class).
- **Scroll body**: middle region `overflow:hidden` between fixed top bar and bottom bar/CTA.
- **Sticky CTA**: total + primary action pinned above the home indicator, surface bg + top hairline.
- **Camera (billing hero)**: dark viewfinder, green reticle on detect / orange laser on scan, glass HUD buttons, torch toggle (gold when on).

---

## 7. CONTENT / LOCALE RULES
- Currency: **₹**, Indian digit grouping (`₹1,23,456`). Tabular numbers everywhere.
- Voice: mostly English with light, natural Hinglish (Naya Bill, Dukaan, Aaj ki sales, Udhaar, Dhanyavaad).
- GST: per-line **HSN** (goods) / **SAC** (services); intra-state **CGST+SGST**, inter-state **IGST**; place of supply; declaration line. Simple bill = cash memo, no tax.
- Tap targets ≥ 44px. Numbers/money are first-class — never smaller than body.

---

## 8. ADAPTIVE BEHAVIOUR (one app, many businesses)
Business type chosen at onboarding sets the default billing mode:
- **Kirana / product shop** → opens to **scan billing** (+ manual add for loose goods).
- **Service business** → opens to **service billing** (manual line items + saved-services quick-pick).
- **Mixed shop** (mobile, salon, garage) → **one bill with both** products (scanned) and services (manual), shown in labelled sections on the invoice.
