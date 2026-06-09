/**
 * Central theme: colors, spacing and font sizes.
 *
 * UI is for a shopkeeper — large readable text, high contrast, minimal taps.
 * Tweak the look of the whole app from here.
 */
export const Colors = {
  background: '#0E1116',
  surface: '#1A1F27',
  surfaceAlt: '#232A34',
  primary: '#2F8FFF',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  text: '#FFFFFF',
  textMuted: '#9AA4B2',
  border: '#2C333D',
  overlay: 'rgba(0,0,0,0.55)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const FontSize = {
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
  xxl: 36,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 22,
} as const;

/* ===========================================================================
 * DUKAAN DESIGN SYSTEM (v1.0) — additive token layer
 * ---------------------------------------------------------------------------
 * Phase A1: these are the SOURCE-OF-TRUTH tokens from the DUKAAN Design System
 * Spec. They are added ALONGSIDE the legacy `Colors/Spacing/FontSize/Radius`
 * above so nothing breaks — existing (dark) screens keep importing the old
 * tokens until each is migrated to the new system in Phase B.
 *
 * Mapping note: every token below maps 1:1 to a CSS custom property in the
 * spec (e.g. `Palette.orange[600]` === `--p-600` === #EA580C). Comments cite
 * the spec source. Fonts are intentionally left as system fallbacks for now
 * (Sora + Plus Jakarta Sans are bundled later in Phase A3); see `FontFamily`.
 * ======================================================================== */

/**
 * Raw colour scales (spec §1.1–§1.4). Use these only to build semantic tokens;
 * screens/components should prefer `DukaanColors` for meaning, not raw hex.
 */
export const Palette = {
  // §1.1 Primary — Orange
  orange: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C', // --primary
    700: '#C2410C', // --primary-press
    800: '#9A3412',
    900: '#7C2D12',
  },
  // §1.2 Accents — Teal (success / "Paid")
  teal: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    500: '#0D9488', // --teal
    600: '#0F766E',
  },
  // §1.2 Accents — Indigo (GST / info / services)
  indigo: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    500: '#4F46E5', // --indigo
  },
  // §1.2 Accents — Amber (warning / "Unpaid")
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B', // --amber
    700: '#B45309', // amber text on tint
  },
  gold: '#FACC15', // highlight / torch-on
  // §1.3 Semantic — Danger (rose)
  rose: {
    50: '#FFF1F2', // --danger-50
    100: '#FFE4E6', // --danger-100
    500: '#E11D48', // --danger
  },
  // §1.4 Neutrals — Slate
  slate: {
    0: '#FFFFFF',
    25: '#FCFCFD',
    50: '#F8FAFC',
    100: '#F1F5F9',
    150: '#EAEEF3',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A', // --ink
  },
} as const;

/**
 * Semantic colours (spec §1.1, §1.3, §1.5, §1.6) — what components reference.
 * This is the light DUKAAN theme.
 */
export const DukaanColors = {
  // Brand / actions
  primary: Palette.orange[600],
  primaryPress: Palette.orange[700],
  // Accents
  teal: Palette.teal[500],
  indigo: Palette.indigo[500],
  amber: Palette.amber[500],
  gold: Palette.gold,
  // Semantic states
  success: Palette.teal[500],
  warning: Palette.amber[500],
  danger: Palette.rose[500],
  // Surfaces (§1.5)
  bg: '#F4F6F9', // app background
  surface: Palette.slate[0], // cards, sheets, bars
  hairline: '#EAEEF3', // dividers, card borders
  // Text (§1.6)
  ink: Palette.slate[900], // primary text
  textMuted: Palette.slate[500], // .muted
  textFaint: Palette.slate[400], // .muted-2
  onPrimary: '#FFFFFF', // text on primary/dark surfaces
} as const;

/**
 * Badge colour pairs (spec §5.8). Each is `{ bg, text }`, ready to spread onto
 * a pill. Names mirror the spec classes (`.badge-paid`, `.badge-gst`, …).
 */
export const Badges = {
  paid: {bg: Palette.teal[100], text: Palette.teal[600]},
  unpaid: {bg: Palette.amber[50], text: Palette.amber[700]},
  gst: {bg: Palette.indigo[100], text: Palette.indigo[500]},
  simple: {bg: Palette.slate[100], text: Palette.slate[600]},
  stock: {bg: '#ECFDF5', text: Palette.teal[600]}, // --success-50 tint
  low: {bg: Palette.rose[50], text: Palette.rose[500]},
  soft: {bg: Palette.orange[100], text: Palette.orange[700]}, // "Soon" / generic
} as const;

/**
 * Font families (spec §2). Display/headings/ALL numbers use Sora; UI/body use
 * Plus Jakarta Sans — both bundled in Phase A3 (`assets/fonts`, see
 * `react-native.config.js`).
 *
 * IMPORTANT — why per-weight "face" names instead of one family + `fontWeight`:
 * these fonts ship as separate static TTFs whose internal families are split
 * (`Sora`, `Sora Medium`, `Sora SemiBold`, `Sora ExtraBold`, …). On Android RN
 * resolves a custom `fontFamily` by the **asset file name**, and `fontWeight`
 * does NOT pick a different weight file — so a single `'Sora'` family would only
 * ever render Regular/Bold. We therefore reference the exact face per weight
 * (e.g. `'Sora-SemiBold'`). That file name == the font's PostScript name, so the
 * same string also matches on iOS. Always resolve via `fontFace()` below; don't
 * hand-write face strings or set `fontFamily` to a base family name.
 *
 * `FontFamily.display/ui` keep the base family names for reference only — do not
 * use them directly as a `fontFamily` value (won't resolve on Android).
 */
export const FontFamily = {
  display: 'Sora',
  ui: 'Plus Jakarta Sans',
} as const;

export type FontFaceKind = 'display' | 'ui';

/** Sora faces by weight (bundled 400–800). */
const DISPLAY_FACES = {
  '400': 'Sora-Regular',
  '500': 'Sora-Medium',
  '600': 'Sora-SemiBold',
  '700': 'Sora-Bold',
  '800': 'Sora-ExtraBold',
} as const;

/** Plus Jakarta Sans faces by weight (bundled 400–700; 800 clamps to 700). */
const UI_FACES = {
  '400': 'PlusJakartaSans-Regular',
  '500': 'PlusJakartaSans-Medium',
  '600': 'PlusJakartaSans-SemiBold',
  '700': 'PlusJakartaSans-Bold',
} as const;

/**
 * Resolve the bundled font-file name for a kind + weight. Unknown weights fall
 * back to Regular; the UI family has no 800, so 800 clamps to Bold (700).
 */
export function fontFace(
  kind: FontFaceKind,
  weight: string | number = '400',
): string {
  const w = String(weight);
  if (kind === 'display') {
    return DISPLAY_FACES[w as keyof typeof DISPLAY_FACES] ?? DISPLAY_FACES['400'];
  }
  return (
    UI_FACES[w as keyof typeof UI_FACES] ??
    (w === '800' ? UI_FACES['700'] : UI_FACES['400'])
  );
}

/** Font weights as RN-typed string literals (spec §2 weights 400–800). */
export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

/**
 * Type scale (spec §2). Each entry is a ready-to-spread RN text style.
 * Notes for RN:
 *  - `lineHeight` is absolute px (spec multiplier × size, rounded).
 *  - `letterSpacing` is px (spec `em` × size, rounded to 0.1px).
 *  - Numbers/money: spread `Typography.numeric` for tabular figures.
 * Display, headings and money use `FontFamily.display`; everything else `ui`.
 */
export const Typography = {
  display: {
    fontFamily: fontFace('display', FontWeight.extrabold),
    fontSize: 40,
    lineHeight: 41, // 40 × 1.02
    fontWeight: FontWeight.extrabold,
    letterSpacing: -1.2, // -0.03em
  },
  h1: {
    fontFamily: fontFace('display', FontWeight.bold),
    fontSize: 26,
    lineHeight: 29, // 26 × 1.10
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5, // -0.02em
  },
  h2: {
    fontFamily: fontFace('display', FontWeight.bold),
    fontSize: 20,
    lineHeight: 23, // 20 × 1.15
    fontWeight: FontWeight.bold,
    letterSpacing: -0.4, // -0.02em
  },
  h3: {
    fontFamily: fontFace('display', FontWeight.semibold),
    fontSize: 17,
    lineHeight: 20, // 17 × 1.20
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.2, // -0.01em
  },
  body: {
    fontFamily: fontFace('ui', FontWeight.medium),
    fontSize: 16,
    lineHeight: 23, // 16 × 1.45
    fontWeight: FontWeight.medium,
    letterSpacing: -0.16, // global -0.01em
  },
  bodySm: {
    fontFamily: fontFace('ui', FontWeight.medium),
    fontSize: 14,
    lineHeight: 20, // 14 × 1.45
    fontWeight: FontWeight.medium,
    letterSpacing: -0.14,
  },
  label: {
    fontFamily: fontFace('ui', FontWeight.semibold),
    fontSize: 13,
    lineHeight: 18,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.13, // 0.01em
  },
  cap: {
    fontFamily: fontFace('ui', FontWeight.semibold),
    fontSize: 12,
    lineHeight: 16,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.24, // 0.02em
  },
  overline: {
    fontFamily: fontFace('ui', FontWeight.bold),
    fontSize: 11,
    lineHeight: 14,
    fontWeight: FontWeight.bold,
    letterSpacing: 1, // 0.09em, UPPERCASE at call site
  },
  /**
   * Spread onto any money/number text for aligned tabular figures (spec §2).
   * Numbers are Sora; defaults to SemiBold — for AppText prefer `numeric` which
   * matches the surrounding variant's weight via `fontFace`.
   */
  numeric: {
    fontFamily: fontFace('display', FontWeight.semibold),
    fontVariant: ['tabular-nums'] as const,
  },
} as const;

/** Spacing — 4pt base scale (spec §3.1). Gutters 16–20, card padding 14–18. */
export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Corner radius (spec §3.2). */
export const Radii = {
  xs: 8, // inputs inner, small chips
  sm: 12, // thumbnails, small cards
  md: 16, // buttons, inputs, list cards
  lg: 20, // primary cards, large buttons
  xl: 26, // modals
  xxl: 32, // sheets
  full: 999, // pills, badges, toggles
} as const;

/**
 * Elevation (spec §3.3). RN has no CSS box-shadow, so each token carries iOS
 * shadow props + an Android `elevation`. Spread directly onto a `View` style.
 * Neutral shadows use ink (#0F172A); coloured glows use brand colours.
 */
export const Elevation = {
  xs: {
    shadowColor: Palette.slate[900],
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: Palette.slate[900],
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: Palette.slate[900],
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 6,
  },
  lg: {
    shadowColor: Palette.slate[900],
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.14,
    shadowRadius: 40,
    elevation: 16,
  },
  primary: {
    shadowColor: Palette.orange[600],
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 12,
  },
  teal: {
    shadowColor: Palette.teal[500],
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;
