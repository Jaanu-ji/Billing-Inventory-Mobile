import React from 'react';
import {StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import {AppText} from './ui';
import {DukaanColors, Palette} from '../constants/theme';

interface Props {
  /** Whether the torch is currently on. */
  on: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

/**
 * Small flash / torch toggle overlaid on the camera (spec: glass HUD button,
 * gold when on). Shown only when the device actually has a torch.
 */
export function TorchButton({on, onPress, style}: Props): React.JSX.Element {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={on ? 'Turn flash off' : 'Turn flash on'}
      style={[styles.btn, on && styles.btnOn, style]}>
      <AppText style={styles.icon}>🔦</AppText>
      <AppText
        variant="cap"
        weight="700"
        color={on ? Palette.slate[900] : '#FFFFFF'}>
        {on ? 'Flash on' : 'Flash'}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    // Glass HUD (real blur added with a native lib later).
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  btnOn: {
    backgroundColor: DukaanColors.gold,
    borderColor: DukaanColors.gold,
  },
  icon: {fontSize: 15},
});
