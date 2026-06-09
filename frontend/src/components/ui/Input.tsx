/**
 * Inputs (spec §5.4).
 *
 * Field:    label + control column (gap 8), label 13/700 slate-600.
 * Input:    h54 (lg 62), radius md, 1.5px slate-200 border, surface; focus =>
 *           primary border + faint tint (RN can't do the 4px ring, so we tint).
 *           Optional `prefix` (e.g. ₹) and `size`.
 * Textarea: multiline, min-height 96, top-aligned.
 *
 * Forwards refs to the underlying RN TextInput.
 */
import React, {forwardRef, useState} from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import {AppText} from './Text';
import {DukaanColors, fontFace, Palette, Radii, Space} from '../../constants/theme';

interface FieldProps {
  label?: string;
  /** Helper/hint under the control. */
  hint?: string;
  style?: ViewStyle;
  children: React.ReactNode;
}

export function Field({label, hint, style, children}: FieldProps): React.JSX.Element {
  return (
    <View style={[styles.field, style]}>
      {label != null && (
        <AppText variant="label" color={Palette.slate[600]}>
          {label}
        </AppText>
      )}
      {children}
      {hint != null && (
        <AppText variant="cap" color={DukaanColors.textMuted}>
          {hint}
        </AppText>
      )}
    </View>
  );
}

interface InputProps extends TextInputProps {
  size?: 'md' | 'lg';
  /** Leading prefix glyph/text (e.g. ₹). */
  prefix?: React.ReactNode | string;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(function InputBase(
  {size = 'md', prefix, containerStyle, style, onFocus, onBlur, ...rest},
  ref,
): React.JSX.Element {
  const [focused, setFocused] = useState(false);
  const height = size === 'lg' ? 62 : 54;
  const fontSize = size === 'lg' ? 18 : 16;

  return (
    <View
      style={[
        styles.inputWrap,
        {height},
        focused ? styles.focused : null,
        containerStyle,
      ]}>
      {typeof prefix === 'string' ? (
        <AppText style={styles.prefix}>{prefix}</AppText>
      ) : (
        prefix
      )}
      <TextInput
        ref={ref}
        placeholderTextColor={Palette.slate[400]}
        style={[styles.input, {fontSize}, style]}
        onFocus={e => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
    </View>
  );
});

export const Textarea = forwardRef<TextInput, InputProps>(function TextareaBase(
  {style, containerStyle, ...rest},
  ref,
): React.JSX.Element {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        styles.textareaWrap,
        focused ? styles.focused : null,
        containerStyle,
      ]}>
      <TextInput
        ref={ref}
        multiline
        textAlignVertical="top"
        placeholderTextColor={Palette.slate[400]}
        style={[styles.input, styles.textarea, style]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  field: {gap: Space.sm},
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Palette.slate[200],
    backgroundColor: DukaanColors.surface,
  },
  textareaWrap: {
    minHeight: 96,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Palette.slate[200],
    backgroundColor: DukaanColors.surface,
  },
  focused: {
    borderColor: DukaanColors.primary,
    backgroundColor: Palette.orange[50],
  },
  input: {
    flex: 1,
    color: DukaanColors.ink,
    fontFamily: fontFace('ui', '600'),
    fontWeight: '600',
    padding: 0,
  },
  textarea: {minHeight: 72},
  prefix: {
    color: Palette.slate[400],
    fontFamily: fontFace('ui', '700'),
    fontWeight: '700',
  },
});
