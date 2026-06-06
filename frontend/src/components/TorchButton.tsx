import React from 'react';
import {StyleSheet, Text, TouchableOpacity, ViewStyle} from 'react-native';
import {Colors, FontSize, Radius, Spacing} from '../constants/theme';

interface Props {
  /** Whether the torch is currently on. */
  on: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

/**
 * Small flash / torch toggle overlaid on a camera surface, so scanning still
 * works in poor light. Shown only when the device actually has a torch.
 * Amber-highlighted while on, dark translucent while off.
 */
export function TorchButton({on, onPress, style}: Props): React.JSX.Element {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={on ? 'Turn flash off' : 'Turn flash on'}
      style={[styles.btn, on && styles.btnOn, style]}>
      <Text style={styles.icon}>🔦</Text>
      <Text style={[styles.label, on && styles.labelOn]}>
        {on ? 'Flash on' : 'Flash'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  btnOn: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  icon: {fontSize: 16},
  label: {color: Colors.text, fontSize: FontSize.sm, fontWeight: '700'},
  labelOn: {color: '#000'},
});
