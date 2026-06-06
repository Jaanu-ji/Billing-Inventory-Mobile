/**
 * Top bar (spec §5.10). Padding 6×18×14, title in Sora 700/22 (tracking
 * -0.02em). Optional 44×44 back button (surface + hairline) and a trailing
 * `right` slot for actions.
 *
 * Back glyph is unicode for now; A4 swaps in the svg icon set.
 */
import React from 'react';
import {Pressable, StyleSheet, View, ViewStyle} from 'react-native';
import {AppText} from './Text';
import {DukaanColors, FontFamily} from '../../constants/theme';

interface TopBarProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
}

export function TopBar({title, onBack, right, style}: TopBarProps): React.JSX.Element {
  return (
    <View style={[styles.bar, style]}>
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={({pressed}) => [styles.back, pressed && styles.backPressed]}>
          <AppText style={styles.backGlyph} color={DukaanColors.ink}>
            ‹
          </AppText>
        </Pressable>
      )}
      {title != null && (
        <AppText style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
      )}
      <View style={styles.spacer} />
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 6,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DukaanColors.surface,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
  },
  backPressed: {backgroundColor: DukaanColors.hairline},
  backGlyph: {fontSize: 28, lineHeight: 30, marginTop: -2},
  title: {
    fontFamily: FontFamily.display,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.44,
    color: DukaanColors.ink,
  },
  spacer: {flex: 1},
});
