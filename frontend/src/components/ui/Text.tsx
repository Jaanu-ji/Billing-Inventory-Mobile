/**
 * AppText — the single text primitive for the DUKAAN UI.
 *
 * Wraps RN <Text> and applies a type-scale `variant` from the design spec (§2),
 * plus convenience props for colour, alignment and tabular (money) figures.
 * Everything else (numberOfLines, onPress, accessibility…) passes straight
 * through. Display/headings use Sora; body/labels use Jakarta — both currently
 * fall back to the system font until the fonts are bundled (Phase A3).
 */
import React from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextProps,
  TextStyle,
} from 'react-native';
import {
  DukaanColors,
  fontFace,
  FontFaceKind,
  Typography,
} from '../../constants/theme';

/** All type-scale steps (everything in Typography except the `numeric` helper). */
export type TextVariant = Exclude<keyof typeof Typography, 'numeric'>;

/**
 * Which font family + weight each variant resolves to, so `numeric` and `weight`
 * overrides can pick the matching bundled face (Android selects a font by file
 * name, not by `fontWeight`). Mirrors the weights in `Typography`.
 */
const VARIANT_FACE: Record<TextVariant, {kind: FontFaceKind; weight: string}> = {
  display: {kind: 'display', weight: '800'},
  h1: {kind: 'display', weight: '700'},
  h2: {kind: 'display', weight: '700'},
  h3: {kind: 'display', weight: '600'},
  body: {kind: 'ui', weight: '500'},
  bodySm: {kind: 'ui', weight: '500'},
  label: {kind: 'ui', weight: '600'},
  cap: {kind: 'ui', weight: '600'},
  overline: {kind: 'ui', weight: '700'},
};

interface AppTextProps extends TextProps {
  /** Type-scale step (spec §2). Defaults to `body`. */
  variant?: TextVariant;
  /** Text colour. Defaults to ink (`#0F172A`). */
  color?: string;
  /** Use tabular figures (money / aligned numbers). */
  numeric?: boolean;
  /** Centre the text. */
  center?: boolean;
  /** Override the variant's weight when needed. */
  weight?: TextStyle['fontWeight'];
}

const variantStyles = StyleSheet.create({
  display: Typography.display,
  h1: Typography.h1,
  h2: Typography.h2,
  h3: Typography.h3,
  body: Typography.body,
  bodySm: Typography.bodySm,
  label: Typography.label,
  cap: Typography.cap,
  overline: Typography.overline,
});

export function AppText({
  variant = 'body',
  color,
  numeric,
  center,
  weight,
  style,
  ...rest
}: AppTextProps): React.JSX.Element {
  const base = VARIANT_FACE[variant];
  // Resolve the right bundled face: numeric forces Sora (display); a `weight`
  // override picks that weight's file. Falls back to the variant's own weight.
  const w = weight != null ? String(weight) : base.weight;
  const faceOverride: TextStyle | null =
    numeric || weight != null
      ? {
          fontFamily: fontFace(numeric ? 'display' : base.kind, w),
          ...(numeric ? {fontVariant: ['tabular-nums']} : null),
          ...(weight != null ? {fontWeight: weight} : null),
        }
      : null;

  return (
    <RNText
      {...rest}
      style={[
        variantStyles[variant],
        {color: color ?? DukaanColors.ink},
        faceOverride,
        center && styles.center,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  center: {textAlign: 'center'},
});
