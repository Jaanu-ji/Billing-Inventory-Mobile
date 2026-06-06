import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from './ui';
import {DukaanColors, Elevation, Palette, Radii, Space} from '../constants/theme';
import {formatPrice} from '../utils/format';

interface Props {
  name: string;
  price: number;
  /** 'matched' = found in DB, 'saved' = just created. Changes the heading/color. */
  kind: 'matched' | 'saved';
}

/**
 * The key Phase-1 proof: after a scan, this card shows the recognised product
 * (name + price) clearly and instantly. Floats over the camera (DUKAAN styling:
 * teal accent when matched, orange when just saved).
 */
export function MatchedCard({name, price, kind}: Props): React.JSX.Element {
  const saved = kind === 'saved';
  const accent = saved ? DukaanColors.primary : DukaanColors.teal;
  const tagBg = saved ? Palette.orange[100] : Palette.teal[100];
  const tagText = saved ? Palette.orange[700] : Palette.teal[600];
  const heading = saved ? 'SAVED' : 'MATCHED';

  return (
    <View style={[styles.card, {borderColor: accent}]}>
      <View style={[styles.tag, {backgroundColor: tagBg}]}>
        <AppText variant="cap" weight="700" color={tagText}>
          {heading}
        </AppText>
      </View>
      <AppText variant="h2" center numberOfLines={2}>
        {name}
      </AppText>
      <AppText variant="h1" numeric style={styles.price}>
        {formatPrice(price)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.lg,
    borderWidth: 2,
    paddingVertical: Space.lg,
    paddingHorizontal: Space.lg,
    alignItems: 'center',
    gap: Space.sm,
    ...Elevation.md,
  },
  tag: {
    height: 26,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  price: {marginTop: 2},
});
