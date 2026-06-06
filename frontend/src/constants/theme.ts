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
