import React, {useRef, useState} from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {AppText, RowThumb, Stepper} from './ui';
import {DukaanColors, fontFace, Palette, Radii, Space} from '../constants/theme';
import {formatPrice, formatQuantity} from '../utils/format';
import {unitAllowsDecimal, unitLabel, unitStep} from '../constants/units';
import {CartService} from '../services/CartService';
import type {CartItem} from '../models/Bill';

interface Props {
  item: CartItem;
  /** Increment/decrement by the line's unit step (1 for counted, e.g. 0.5 kg). */
  onIncrement: (key: string, step: number) => void;
  onDecrement: (key: string, step: number) => void;
  onRemove: (key: string) => void;
  /** Inline unit-price edit (commits the new price for this cart line). */
  onPriceChange?: (key: string, price: number) => void;
  /** Exact decimal quantity entry (commits the new qty for this cart line). */
  onQuantityChange?: (key: string, quantity: number) => void;
}

const REVEAL = 92; // px of red "remove" action revealed behind the card
const THRESHOLD = 80; // drag past this (leftwards) to delete

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
 * One live-cart row (DUKAAN styling):
 *   thumb · name + tappable unit price · line total · qty stepper.
 * Swipe the card left to remove (core PanResponder + Animated — no gesture-
 * handler dependency). Pressing − at qty 1 also deletes the line: the stepper
 * floor is 0, and the parent's decrement removes a line that hits 0.
 */
export function CartItemRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
  onPriceChange,
  onQuantityChange,
}: Props): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [priceText, setPriceText] = useState('');
  const [editingQty, setEditingQty] = useState(false);
  const [qtyText, setQtyText] = useState('');

  // Unit context for this line. Services are per-job — hide the unit there.
  const step = unitStep(item.unit);
  const showUnit = item.kind !== 'service';
  const unitLbl = unitLabel(item.unit);
  // Only measured units (kg/litre/...) need exact decimal entry; counted units
  // are fine with the stepper alone.
  const canEditQty = showUnit && unitAllowsDecimal(item.unit) && !!onQuantityChange;

  const translateX = useRef(new Animated.Value(0)).current;
  // Latest callback/identity, so the PanResponder (created once) never goes
  // stale and a price edit can suspend swiping.
  const live = useRef({onRemove, key: item.key, editing: editing || editingQty});
  live.current = {onRemove, key: item.key, editing: editing || editingQty};

  const pan = useRef(
    PanResponder.create({
      // Claim the gesture only for a clear horizontal drag, so vertical list
      // scrolling and taps on the stepper/price still work.
      onMoveShouldSetPanResponder: (_e, g) =>
        !live.current.editing &&
        Math.abs(g.dx) > 12 &&
        Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_e, g) => {
        const x = Math.max(-REVEAL - 48, Math.min(0, g.dx)); // left only
        translateX.setValue(x);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -THRESHOLD) {
          Animated.timing(translateX, {
            toValue: -600,
            duration: 160,
            useNativeDriver: true,
          }).start(() => live.current.onRemove(live.current.key));
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
    }),
  ).current;

  const startEdit = () => {
    setPriceText(String(item.price));
    setEditing(true);
  };
  const commitEdit = () => {
    const v = parseFloat(priceText.replace(/[^\d.]/g, ''));
    if (!Number.isNaN(v) && v >= 0) {
      onPriceChange?.(item.key, v);
    }
    setEditing(false);
  };

  const startQtyEdit = () => {
    setQtyText(formatQuantity(item.quantity));
    setEditingQty(true);
  };
  const commitQtyEdit = () => {
    const v = parseFloat(qtyText.replace(/[^\d.]/g, ''));
    if (!Number.isNaN(v) && v > 0) {
      onQuantityChange?.(item.key, v);
    }
    setEditingQty(false);
  };

  const kindPrefix =
    item.kind === 'manual' ? 'Manual · ' : item.kind === 'service' ? 'Service · ' : '';
  const qtyTextLabel = showUnit
    ? `${formatQuantity(item.quantity)} ${unitLbl}`
    : formatQuantity(item.quantity);
  const rateTextLabel = showUnit
    ? `${formatPrice(item.price)} / ${unitLbl}`
    : formatPrice(item.price);

  return (
    <View style={styles.wrap}>
      {/* Revealed behind the card when swiping left. */}
      <View style={styles.deleteBg} pointerEvents="none">
        <AppText variant="cap" weight="700" color="#FFFFFF">
          REMOVE
        </AppText>
      </View>

      <Animated.View
        style={[styles.card, {transform: [{translateX}]}]}
        {...pan.panHandlers}>
        <RowThumb label={initials(item.name)} />

        <View style={styles.info}>
          <AppText style={styles.name} numberOfLines={1}>
            {item.name}
          </AppText>
          {editing ? (
            <View style={styles.priceEdit}>
              <AppText color={Palette.slate[400]} weight="700">
                ₹
              </AppText>
              <TextInput
                value={priceText}
                onChangeText={setPriceText}
                onBlur={commitEdit}
                onSubmitEditing={commitEdit}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
                style={styles.priceInput}
              />
              <AppText variant="cap" color={DukaanColors.textMuted}>
                {showUnit ? `/ ${unitLbl}` : 'each'}
              </AppText>
            </View>
          ) : (
            <Pressable onPress={startEdit} hitSlop={6}>
              <AppText variant="bodySm" color={DukaanColors.textMuted}>
                {kindPrefix}
                {rateTextLabel} ·{' '}
                <AppText variant="cap" color={DukaanColors.primary}>
                  edit price
                </AppText>
              </AppText>
            </Pressable>
          )}
          {editingQty ? (
            <View style={styles.qtyEdit}>
              <TextInput
                value={qtyText}
                onChangeText={setQtyText}
                onBlur={commitQtyEdit}
                onSubmitEditing={commitQtyEdit}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
                style={styles.qtyInput}
              />
              <AppText variant="cap" color={DukaanColors.textMuted}>
                {unitLbl}
              </AppText>
            </View>
          ) : (
            <Pressable
              onPress={canEditQty ? startQtyEdit : undefined}
              disabled={!canEditQty}
              hitSlop={6}>
              <AppText variant="bodySm" color={DukaanColors.textMuted}>
                Qty {qtyTextLabel}
                {canEditQty ? (
                  <AppText variant="cap" color={DukaanColors.primary}>
                    {' '}· edit qty
                  </AppText>
                ) : null}
              </AppText>
            </Pressable>
          )}
        </View>

        <View style={styles.right}>
          <AppText variant="h3" numeric>
            {formatPrice(CartService.lineTotal(item))}
          </AppText>
          <Stepper
            value={item.quantity}
            min={0}
            onDecrement={() => onDecrement(item.key, step)}
            onIncrement={() => onIncrement(item.key, step)}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Space.sm,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  deleteBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DukaanColors.danger,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: 12,
  },
  info: {flex: 1, gap: 2},
  name: {fontSize: 15.5, fontWeight: '700', color: DukaanColors.ink},
  right: {alignItems: 'flex-end', gap: 8},
  priceEdit: {flexDirection: 'row', alignItems: 'center', gap: 4},
  qtyEdit: {flexDirection: 'row', alignItems: 'center', gap: 4},
  priceInput: {
    minWidth: 56,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: Radii.xs,
    borderWidth: 1.5,
    borderColor: DukaanColors.primary,
    backgroundColor: Palette.orange[50],
    color: DukaanColors.ink,
    fontFamily: fontFace('display', '700'),
    fontWeight: '700',
    fontSize: 14,
  },
  qtyInput: {
    minWidth: 56,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: Radii.xs,
    borderWidth: 1.5,
    borderColor: DukaanColors.primary,
    backgroundColor: Palette.orange[50],
    color: DukaanColors.ink,
    fontFamily: fontFace('display', '700'),
    fontWeight: '700',
    fontSize: 14,
  },
});
