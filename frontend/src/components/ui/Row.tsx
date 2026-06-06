/**
 * List row + thumbnail (spec §5.3).
 *
 * Row: a flex list row (gap 14, padding 14×16) with convenience `title` /
 * `subtitle` / `left` / `right` slots, an optional bottom `divider` hairline,
 * and optional `onPress`. Pass `children` instead for full custom content.
 *
 * RowThumb: 46×46 rounded tile with tinted bg + accent initials — the standard
 * leading element for product/bill rows.
 */
import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {AppText} from './Text';
import {DukaanColors, Palette, Radii, Space} from '../../constants/theme';

interface RowProps {
  title?: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  divider?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function Row({
  title,
  subtitle,
  left,
  right,
  divider,
  onPress,
  style,
  children,
}: RowProps): React.JSX.Element {
  const content = children ?? (
    <>
      {left}
      <View style={styles.body}>
        {title != null && (
          <AppText style={styles.title} numberOfLines={1}>
            {title}
          </AppText>
        )}
        {subtitle != null && (
          <AppText variant="bodySm" color={DukaanColors.textMuted} numberOfLines={1}>
            {subtitle}
          </AppText>
        )}
      </View>
      {right}
    </>
  );

  const rowStyle = [styles.row, divider && styles.divider, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({pressed}) => [...rowStyle, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }
  return <View style={rowStyle}>{content}</View>;
}

interface RowThumbProps {
  /** Short initials/label (1–2 chars look best). */
  label: string;
  /** Tile background tint. Defaults to orange-50. */
  tint?: string;
  /** Initials colour. Defaults to orange-600. */
  color?: string;
}

export function RowThumb({
  label,
  tint = Palette.orange[50],
  color = Palette.orange[600],
}: RowThumbProps): React.JSX.Element {
  return (
    <View style={[styles.thumb, {backgroundColor: tint}]}>
      <AppText variant="h3" color={color} numeric>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: DukaanColors.hairline,
  },
  pressed: {backgroundColor: Palette.orange[50]},
  body: {flex: 1, gap: Space.xs / 2},
  title: {fontSize: 15.5, fontWeight: '700', color: DukaanColors.ink},
  thumb: {
    width: 46,
    height: 46,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
