import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors, FontSize, Radius, Spacing} from '../constants/theme';
import {formatPrice} from '../utils/format';

interface Props {
  name: string;
  price: number;
  /** 'matched' = found in DB, 'saved' = just created. Changes the heading/color. */
  kind: 'matched' | 'saved';
}

/**
 * The key Phase-1 proof: after a scan, this card shows the recognised product
 * (name + price) clearly and instantly. Floats over the camera.
 */
export function MatchedCard({name, price, kind}: Props): React.JSX.Element {
  const accent = kind === 'saved' ? Colors.primary : Colors.success;
  const heading = kind === 'saved' ? 'SAVED' : 'MATCHED';

  return (
    <View style={[styles.card, {borderColor: accent}]}>
      <Text style={[styles.heading, {color: accent}]}>{heading}</Text>
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      <Text style={styles.price}>{formatPrice(price)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 2,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  heading: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  name: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  price: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '900',
    marginTop: Spacing.sm,
  },
});
