/**
 * Quantity stepper (spec §5.7). Inline pill (bg slate-100), 34×34 round − / +
 * buttons on a white surface, qty shown in Sora 700/16 with tabular figures.
 * Decrement is disabled at `min`.
 */
import React from 'react';
import {Pressable, StyleSheet, View, ViewStyle} from 'react-native';
import {AppText} from './Text';
import {Icon} from './Icon';
import {DukaanColors, Elevation, Palette} from '../../constants/theme';
import {formatQuantity} from '../../utils/format';

interface StepperProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Stepper({
  value,
  onDecrement,
  onIncrement,
  min = 1,
  disabled,
  style,
}: StepperProps): React.JSX.Element {
  const canDec = !disabled && value > min;
  return (
    <View style={[styles.pill, style]}>
      <Pressable
        onPress={onDecrement}
        disabled={!canDec}
        style={({pressed}) => [
          styles.btn,
          !canDec && styles.btnDisabled,
          pressed && canDec && styles.btnPressed,
        ]}>
        <Icon name="minus" size={18} color={DukaanColors.ink} strokeWidth={2.4} />
      </Pressable>

      <AppText style={styles.qty} numeric>
        {formatQuantity(value)}
      </AppText>

      <Pressable
        onPress={onIncrement}
        disabled={disabled}
        style={({pressed}) => [
          styles.btn,
          pressed && !disabled && styles.btnPressed,
        ]}>
        <Icon name="plus" size={18} color={DukaanColors.ink} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.slate[100],
    borderRadius: 999,
    padding: 3,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DukaanColors.surface,
    ...Elevation.xs,
  },
  btnPressed: {backgroundColor: Palette.slate[50]},
  btnDisabled: {opacity: 0.4},
  qty: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 6,
  },
});
