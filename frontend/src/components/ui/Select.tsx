/**
 * Select field (spec §5.4 `.select`).
 *
 * Visual-only trigger that matches the Input frame with a trailing chevron.
 * It does NOT render a dropdown itself — `onPress` should open whatever picker
 * the screen uses (a bottom sheet, list modal, etc.). Shows `value`, or the
 * muted `placeholder` when empty.
 *
 * Note: the chevron is a unicode glyph for now; A4 swaps in the svg icon set.
 */
import React from 'react';
import {Pressable, StyleSheet, ViewStyle} from 'react-native';
import {AppText} from './Text';
import {DukaanColors, Palette, Radii, Space} from '../../constants/theme';

interface SelectProps {
  value?: string | null;
  placeholder?: string;
  onPress?: () => void;
  disabled?: boolean;
  size?: 'md' | 'lg';
  style?: ViewStyle;
}

export function Select({
  value,
  placeholder = 'Select',
  onPress,
  disabled,
  size = 'md',
  style,
}: SelectProps): React.JSX.Element {
  const height = size === 'lg' ? 62 : 54;
  const hasValue = value != null && value !== '';
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.wrap,
        {height},
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}>
      <AppText
        style={styles.value}
        color={hasValue ? DukaanColors.ink : Palette.slate[400]}
        numberOfLines={1}>
        {hasValue ? value : placeholder}
      </AppText>
      <AppText style={styles.chevron} color={Palette.slate[400]}>
        ⌄
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Palette.slate[200],
    backgroundColor: DukaanColors.surface,
  },
  pressed: {backgroundColor: Palette.slate[50]},
  disabled: {opacity: 0.5},
  value: {flex: 1, fontSize: 16, fontWeight: '600'},
  chevron: {fontSize: 18, marginTop: -4},
});
