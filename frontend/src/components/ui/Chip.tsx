/**
 * Chip (spec §5.9). h38, radius full, 14/600. States:
 *  - default:  surface + 1.5px slate-200 border, slate-600 text.
 *  - active:   ink fill, white text (`variant="ink"`).
 *  - active-p: p-50 bg, p-200 border, p-700 text — selected category/GST
 *              (`variant="primary"`).
 */
import React from 'react';
import {Pressable, StyleSheet, ViewStyle} from 'react-native';
import {AppText} from './Text';
import {DukaanColors, Palette} from '../../constants/theme';

interface ChipProps {
  label: string;
  active?: boolean;
  /** Which active style to use when `active` is true. */
  variant?: 'ink' | 'primary';
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({
  label,
  active,
  variant = 'ink',
  onPress,
  style,
}: ChipProps): React.JSX.Element {
  const activeStyle =
    active && variant === 'primary'
      ? styles.activeP
      : active
      ? styles.activeInk
      : null;
  const textColor =
    active && variant === 'primary'
      ? Palette.orange[700]
      : active
      ? '#FFFFFF'
      : Palette.slate[600];

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.chip,
        activeStyle,
        pressed && !active ? styles.pressed : null,
        style,
      ]}>
      <AppText variant="bodySm" weight="600" color={textColor}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DukaanColors.surface,
    borderWidth: 1.5,
    borderColor: Palette.slate[200],
  },
  pressed: {backgroundColor: Palette.slate[50]},
  activeInk: {
    backgroundColor: Palette.slate[900],
    borderColor: Palette.slate[900],
  },
  activeP: {
    backgroundColor: Palette.orange[50],
    borderColor: Palette.orange[200],
  },
});
