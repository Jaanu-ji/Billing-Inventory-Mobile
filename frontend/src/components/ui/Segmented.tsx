/**
 * Segmented control (spec §5.6). Track bg slate-100 (pad 4, radius md); each
 * button h42 radius 12, 14/700; the active one gets a white surface + xs shadow
 * + ink text. Generic over a string value (e.g. 'simple' | 'gst').
 */
import React from 'react';
import {Pressable, StyleSheet, View, ViewStyle} from 'react-native';
import {AppText} from './Text';
import {DukaanColors, Elevation, Palette, Radii} from '../../constants/theme';

export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedProps<T>): React.JSX.Element {
  return (
    <View style={[styles.track, style]}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.btn, active && styles.btnActive]}>
            <AppText
              variant="bodySm"
              weight="700"
              color={active ? DukaanColors.ink : Palette.slate[500]}>
              {opt.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: Palette.slate[100],
    borderRadius: Radii.md,
    padding: 4,
    gap: 4,
  },
  btn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: DukaanColors.surface,
    ...Elevation.xs,
  },
});
