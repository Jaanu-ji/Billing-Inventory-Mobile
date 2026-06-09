/**
 * Button + IconButton (spec §5.1).
 *
 * Button: full-width-capable CTA with the spec's variants (primary / teal /
 * WhatsApp / secondary / outline / ghost) and sizes (sm 42 / md 54 / lg 60).
 * Pressed state darkens the fill (RN can't do the spec's translate easily, so
 * we use a colour shift instead). Disabled => 45% opacity, no shadow.
 *
 * IconButton: 48×48 tonal icon button; pass the icon as `children` (an svg/glyph
 * node — A4 wires the real icon set). `glass` variant is for the camera HUD.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {AppText} from './Text';
import {DukaanColors, Elevation, fontFace, Palette, Radii} from '../../constants/theme';

export type ButtonVariant =
  | 'primary'
  | 'teal'
  | 'wa'
  | 'danger'
  | 'secondary'
  | 'outline'
  | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Full width. */
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
  /** Optional leading/trailing node (icon). */
  left?: React.ReactNode;
  right?: React.ReactNode;
  style?: ViewStyle;
}

interface VariantSpec {
  bg: string;
  bgPressed: string;
  text: string;
  border?: string;
  shadow?: ViewStyle;
}

const VARIANTS: Record<ButtonVariant, VariantSpec> = {
  primary: {
    bg: DukaanColors.primary,
    bgPressed: DukaanColors.primaryPress,
    text: DukaanColors.onPrimary,
    shadow: Elevation.primary,
  },
  teal: {
    bg: DukaanColors.teal,
    bgPressed: Palette.teal[600],
    text: '#FFFFFF',
    shadow: Elevation.teal,
  },
  wa: {
    bg: '#25D366',
    bgPressed: '#1DA851',
    text: '#0A3D1E',
    shadow: {
      shadowColor: '#25D366',
      shadowOffset: {width: 0, height: 10},
      shadowOpacity: 0.32,
      shadowRadius: 24,
      elevation: 12,
    },
  },
  danger: {
    bg: DukaanColors.danger,
    bgPressed: '#BE123C', // rose-700
    text: '#FFFFFF',
  },
  secondary: {
    bg: Palette.slate[100],
    bgPressed: Palette.slate[150],
    text: DukaanColors.ink,
  },
  outline: {
    bg: DukaanColors.surface,
    bgPressed: Palette.slate[50],
    text: DukaanColors.ink,
    border: Palette.slate[200],
  },
  ghost: {
    bg: 'transparent',
    bgPressed: Palette.slate[100],
    text: DukaanColors.primary,
  },
};

const SIZES: Record<ButtonSize, {height: number; radius: number; font: number}> = {
  sm: {height: 42, radius: Radii.sm, font: 14},
  md: {height: 54, radius: Radii.md, font: 16},
  lg: {height: 60, radius: Radii.lg, font: 17},
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  block,
  loading,
  disabled,
  left,
  right,
  style,
  ...rest
}: ButtonProps): React.JSX.Element {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({pressed}) => [
        styles.base,
        {
          height: s.height,
          borderRadius: s.radius,
          backgroundColor: pressed ? v.bgPressed : v.bg,
        },
        v.border ? {borderWidth: 1.5, borderColor: v.border} : null,
        // Shadow only when enabled and not pressed (spec: pressed/disabled drop it).
        !isDisabled && !pressed ? v.shadow : null,
        block && styles.block,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {left}
          <AppText
            weight="700"
            color={v.text}
            style={{fontFamily: fontFace('ui', '700'), fontSize: s.font}}>
            {title}
          </AppText>
          {right}
        </>
      )}
    </Pressable>
  );
}

export type IconButtonVariant = 'default' | 'tonalP' | 'tonalT' | 'glass';

interface IconButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode;
  variant?: IconButtonVariant;
  /** Square size; default 48 (spec). */
  size?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

const ICON_BG: Record<IconButtonVariant, string> = {
  default: Palette.slate[100],
  tonalP: Palette.orange[100],
  tonalT: Palette.teal[100],
  glass: 'rgba(255,255,255,0.16)', // camera HUD (blur added natively later)
};

export function IconButton({
  children,
  variant = 'default',
  size = 48,
  disabled,
  style,
  ...rest
}: IconButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({pressed}) => [
        styles.icon,
        {
          width: size,
          height: size,
          borderRadius: Radii.md,
          backgroundColor: ICON_BG[variant],
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
      {...rest}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 18,
  },
  block: {alignSelf: 'stretch', width: '100%'},
  disabled: {opacity: 0.45},
  icon: {alignItems: 'center', justifyContent: 'center'},
});
