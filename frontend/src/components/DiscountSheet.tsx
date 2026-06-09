/**
 * DiscountSheet (Phase G) — a bill-level discount, % or ₹ (screenshot 16).
 *
 * Pure UI: the caller passes the pre-discount payable (to preview "You save")
 * and the current discount, and gets back an apply/remove. The actual amount is
 * recomputed by GstService at save time, so this only captures type + value.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText, BottomSheet, Button, Chip, Input, Segmented} from './ui';
import {discountAmount, type DiscountType} from '../services/GstService';
import {DukaanColors, Space} from '../constants/theme';
import {formatPrice} from '../utils/format';

export interface DiscountValue {
  type: DiscountType;
  value: number;
}

interface Props {
  visible: boolean;
  /** Pre-discount payable — basis for the "You save" preview. */
  payable: number;
  current: DiscountValue | null;
  onApply: (d: DiscountValue) => void;
  onRemove: () => void;
  onClose: () => void;
}

const PERCENT_CHIPS = ['5', '10', '15', '20'];

export function DiscountSheet({
  visible,
  payable,
  current,
  onApply,
  onRemove,
  onClose,
}: Props): React.JSX.Element {
  const [type, setType] = useState<DiscountType>('percent');
  const [text, setText] = useState('');

  // Seed from the current discount each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setType(current?.type ?? 'percent');
      setText(current && current.value > 0 ? String(current.value) : '');
    }
  }, [visible, current]);

  const value = parseFloat(text.replace(/[^\d.]/g, ''));
  const saved = useMemo(() => {
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }
    return discountAmount(payable, type, value);
  }, [payable, type, value]);

  const apply = () => {
    if (Number.isFinite(value) && value > 0) {
      onApply({type, value});
    } else {
      onRemove();
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="h2">Discount</AppText>
      <AppText variant="bodySm" color={DukaanColors.textMuted} style={styles.sub}>
        On the whole bill
      </AppText>

      <Segmented<DiscountType>
        style={styles.block}
        value={type}
        onChange={setType}
        options={[
          {label: 'Percent %', value: 'percent'},
          {label: 'Rupees ₹', value: 'rupees'},
        ]}
      />

      <Input
        value={text}
        onChangeText={setText}
        placeholder={type === 'percent' ? 'e.g. 10 (%)' : 'e.g. 50'}
        keyboardType="decimal-pad"
        prefix={type === 'rupees' ? '₹' : '%'}
        containerStyle={styles.block}
      />

      {type === 'percent' ? (
        <View style={styles.chips}>
          {PERCENT_CHIPS.map(p => (
            <Chip
              key={p}
              label={`${p} %`}
              variant="primary"
              active={text === p}
              onPress={() => setText(p)}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.saveRow}>
        <AppText variant="label" color={DukaanColors.textMuted}>
          You save
        </AppText>
        <AppText variant="h3" color={DukaanColors.primary} numeric>
          {formatPrice(saved)}
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button title="Remove" variant="secondary" onPress={onRemove} style={styles.actionBtn} />
        <Button title="Apply discount" onPress={apply} style={styles.actionBtn} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sub: {marginTop: 2, marginBottom: Space.md},
  block: {marginBottom: Space.md},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, marginBottom: Space.md},
  saveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Space.md,
  },
  actions: {flexDirection: 'row', gap: Space.md},
  actionBtn: {flex: 1},
});
