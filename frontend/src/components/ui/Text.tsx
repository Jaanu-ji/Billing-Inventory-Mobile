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
import {DukaanColors, FontFamily, Typography} from '../../constants/theme';

/** All type-scale steps (everything in Typography except the `numeric` helper). */
export type TextVariant = Exclude<keyof typeof Typography, 'numeric'>;

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

// Spread separately so the readonly `fontVariant` tuple from the token doesn't
// fight RN's mutable-array typing.
const numericStyle: TextStyle = {
  fontFamily: FontFamily.display,
  fontVariant: ['tabular-nums'],
};

export function AppText({
  variant = 'body',
  color,
  numeric,
  center,
  weight,
  style,
  ...rest
}: AppTextProps): React.JSX.Element {
  return (
    <RNText
      {...rest}
      style={[
        variantStyles[variant],
        {color: color ?? DukaanColors.ink},
        numeric && numericStyle,
        center && styles.center,
        weight ? {fontWeight: weight} : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  center: {textAlign: 'center'},
});
