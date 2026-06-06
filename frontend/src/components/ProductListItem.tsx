import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors, FontSize, Radius, Spacing} from '../constants/theme';
import {formatPrice} from '../utils/format';
import type {Product} from '../models/Product';

interface Props {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

/** One row in the Products list: name, barcode, price + edit/delete. */
export function ProductListItem({
  product,
  onEdit,
  onDelete,
}: Props): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.barcode} numberOfLines={1}>
          {product.barcode}
        </Text>
      </View>

      <Text style={styles.price}>{formatPrice(product.price)}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => onEdit(product)}
          style={[styles.actionBtn, {backgroundColor: Colors.surfaceAlt}]}>
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(product)}
          style={[styles.actionBtn, {backgroundColor: Colors.danger}]}>
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  info: {marginBottom: Spacing.xs},
  name: {color: Colors.text, fontSize: FontSize.md, fontWeight: '700'},
  barcode: {color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2},
  price: {
    color: Colors.success,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  actions: {flexDirection: 'row', gap: Spacing.sm},
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  actionText: {color: Colors.text, fontWeight: '700', fontSize: FontSize.sm},
});
