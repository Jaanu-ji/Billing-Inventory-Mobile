import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText, Badge, Button, RowThumb} from './ui';
import {DukaanColors, Space} from '../constants/theme';
import {formatPrice} from '../utils/format';
import type {Product} from '../models/Product';

interface Props {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

/** Up-to-2-char initials for the row thumbnail. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const text = parts
    .slice(0, 2)
    .map(w => w[0])
    .join('');
  return text ? text.toUpperCase() : '#';
}

/**
 * One Products-list card (DUKAAN styling): thumb · name + barcode · price,
 * an optional GST-rate badge, and Edit / Delete actions.
 */
export function ProductListItem({
  product,
  onEdit,
  onDelete,
}: Props): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <RowThumb label={initials(product.name)} />
        <View style={styles.info}>
          <AppText style={styles.name} numberOfLines={1}>
            {product.name}
          </AppText>
          <AppText variant="bodySm" color={DukaanColors.textMuted} numberOfLines={1}>
            {product.barcode}
          </AppText>
        </View>
        <View style={styles.priceCol}>
          <AppText variant="h3" numeric>
            {formatPrice(product.price)}
          </AppText>
          {product.gstRate > 0 ? (
            <Badge variant="gst">{`GST ${product.gstRate}%`}</Badge>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="Edit"
          variant="secondary"
          size="sm"
          style={styles.actionBtn}
          onPress={() => onEdit(product)}
        />
        <Button
          title="Delete"
          variant="danger"
          size="sm"
          style={styles.actionBtn}
          onPress={() => onDelete(product)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DukaanColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: 14,
    marginBottom: Space.md,
    gap: Space.md,
  },
  top: {flexDirection: 'row', alignItems: 'center', gap: Space.md},
  info: {flex: 1, gap: 2},
  name: {fontSize: 15.5, fontWeight: '700', color: DukaanColors.ink},
  priceCol: {alignItems: 'flex-end', gap: 6},
  actions: {flexDirection: 'row', gap: Space.md},
  actionBtn: {flex: 1},
});
