import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors, FontSize, Radius, Spacing} from '../constants/theme';
import {formatPrice} from '../utils/format';
import {CartService} from '../services/CartService';
import type {CartItem} from '../models/Bill';

interface Props {
  item: CartItem;
  onIncrement: (barcode: string) => void;
  onDecrement: (barcode: string) => void;
  onRemove: (barcode: string) => void;
}

/** One row in the live cart: name, unit price, qty stepper, line total, remove. */
export function CartItemRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: Props): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.unit}>
          {formatPrice(item.price)} each · {formatPrice(CartService.lineTotal(item))}
        </Text>
      </View>

      <View style={styles.stepper}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onDecrement(item.barcode)}>
          <Text style={styles.stepText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qty}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onIncrement(item.barcode)}>
          <Text style={styles.stepText}>+</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => onRemove(item.barcode)}>
        <Text style={styles.removeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  info: {flex: 1, marginRight: Spacing.sm},
  name: {color: Colors.text, fontSize: FontSize.md, fontWeight: '700'},
  unit: {color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2},
  stepper: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {color: Colors.text, fontSize: FontSize.lg, fontWeight: '800'},
  qty: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center',
  },
  removeBtn: {
    marginLeft: Spacing.sm,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {color: Colors.danger, fontSize: FontSize.md, fontWeight: '800'},
});
