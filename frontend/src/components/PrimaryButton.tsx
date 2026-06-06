import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import {Colors, FontSize, Radius, Spacing} from '../constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/** Big, readable, shopkeeper-friendly button. Reused across the app. */
export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: Props): React.JSX.Element {
  const bg =
    variant === 'danger'
      ? Colors.danger
      : variant === 'ghost'
      ? 'transparent'
      : Colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {backgroundColor: bg, opacity: disabled ? 0.5 : 1},
        variant === 'ghost' && styles.ghost,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={Colors.text} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'ghost' && {color: Colors.textMuted},
          ]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  ghost: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
