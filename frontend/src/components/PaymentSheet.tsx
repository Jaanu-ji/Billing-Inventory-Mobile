/**
 * PaymentSheet (Phase F) — "Received payment" chooser (screenshot 22).
 *
 * A bottom sheet that asks HOW a bill was paid (Cash / UPI / Card) and reports
 * the chosen mode. Reused at checkout (mark paid now), on a bill's detail
 * (mark an udhaar bill paid later) and when clearing a customer's whole udhaar.
 */
import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText, BottomSheet, Icon} from './ui';
import {PAYMENT_MODE_OPTIONS, type PaymentMode} from '../constants/payments';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';
import {formatPrice} from '../utils/format';

interface Props {
  visible: boolean;
  /** Amount being received — shown as context ("₹38 total"). */
  total: number;
  onSelect: (mode: PaymentMode) => void;
  onClose: () => void;
  /** Heading override (e.g. "Clear udhaar"). Defaults to "Received payment". */
  title?: string;
}

export function PaymentSheet({
  visible,
  total,
  onSelect,
  onClose,
  title = 'Received payment',
}: Props): React.JSX.Element {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="h2">{title}</AppText>
      <AppText variant="bodySm" color={DukaanColors.textMuted} style={styles.sub}>
        {formatPrice(total)} total
      </AppText>

      <View style={styles.list}>
        {PAYMENT_MODE_OPTIONS.map(opt => (
          <Pressable
            key={opt.id}
            onPress={() => onSelect(opt.id)}
            style={({pressed}) => [styles.row, pressed && styles.rowPressed]}>
            <View style={styles.iconWrap}>
              <Icon name={opt.icon} size={20} color={DukaanColors.teal} />
            </View>
            <AppText variant="h3" style={styles.label}>
              {opt.label}
            </AppText>
            <Icon name="chevron-right" size={18} color={DukaanColors.textFaint} />
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sub: {marginTop: 2, marginBottom: Space.md},
  list: {gap: Space.sm},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    padding: Space.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: DukaanColors.hairline,
    backgroundColor: DukaanColors.surface,
  },
  rowPressed: {backgroundColor: Palette.slate[50]},
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.teal[50],
  },
  label: {flex: 1},
});
