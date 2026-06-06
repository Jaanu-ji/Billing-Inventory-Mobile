/**
 * Card (spec §5.2). Surface with radius `lg` (20).
 *  - default: soft `sm` shadow + 1px hairline border.
 *  - `flat`:  no shadow, slightly stronger slate-150 border.
 *  - `pad`:   true => 18px padding (spec card-pad), or pass a number.
 */
import React from 'react';
import {StyleSheet, View, ViewProps, ViewStyle} from 'react-native';
import {DukaanColors, Elevation, Palette, Radii} from '../../constants/theme';

interface CardProps extends ViewProps {
  flat?: boolean;
  pad?: boolean | number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function Card({
  flat,
  pad,
  style,
  children,
  ...rest
}: CardProps): React.JSX.Element {
  const padding = pad === true ? 18 : typeof pad === 'number' ? pad : undefined;
  return (
    <View
      {...rest}
      style={[
        styles.base,
        flat ? styles.flat : styles.raised,
        padding != null ? {padding} : null,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.lg,
  },
  raised: {
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    ...Elevation.sm,
  },
  flat: {
    borderWidth: 1,
    borderColor: Palette.slate[150],
  },
});
