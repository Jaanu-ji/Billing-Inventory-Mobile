/**
 * Badge / pill (spec §5.8). Height 26, radius full, 12/700. Colour pairs come
 * from the `Badges` token map (paid, unpaid, gst, simple, stock, low, soft).
 * Paid/Unpaid can show a leading status `dot` in the text colour.
 */
import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {AppText} from './Text';
import {Badges} from '../../constants/theme';

export type BadgeVariant = keyof typeof Badges;

interface BadgeProps {
  variant: BadgeVariant;
  /** Text; falls back to `children`. */
  label?: string;
  children?: React.ReactNode;
  /** Leading status dot (spec uses it on paid/unpaid). */
  dot?: boolean;
  style?: ViewStyle;
}

export function Badge({
  variant,
  label,
  children,
  dot,
  style,
}: BadgeProps): React.JSX.Element {
  const pair = Badges[variant];
  return (
    <View style={[styles.badge, {backgroundColor: pair.bg}, style]}>
      {dot && <View style={[styles.dot, {backgroundColor: pair.text}]} />}
      <AppText variant="cap" weight="700" color={pair.text}>
        {label ?? children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 26,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  dot: {width: 6, height: 6, borderRadius: 999},
});
