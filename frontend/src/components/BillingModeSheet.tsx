/**
 * BillingModeSheet (Phase E) — choose how to build the current bill.
 *
 * Bottom sheet listing the four billing modes (scan / list / service / mixed).
 * The active mode shows a teal check. Picking one calls `onSelect`; the billing
 * screen switches immediately and remembers the choice (ProfileService).
 */
import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText, BottomSheet, Icon} from './ui';
import {BILLING_MODE_OPTIONS, type BillingMode} from '../constants/billingModes';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';

interface Props {
  visible: boolean;
  current: BillingMode;
  onSelect: (mode: BillingMode) => void;
  onClose: () => void;
}

export function BillingModeSheet({
  visible,
  current,
  onSelect,
  onClose,
}: Props): React.JSX.Element {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="h2">Billing mode</AppText>
      <AppText variant="bodySm" color={DukaanColors.textMuted} style={styles.sub}>
        Switch how you build this bill
      </AppText>

      <View style={styles.list}>
        {BILLING_MODE_OPTIONS.map(opt => {
          const active = opt.id === current;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onSelect(opt.id)}
              style={({pressed}) => [
                styles.row,
                active && styles.rowActive,
                pressed && styles.rowPressed,
              ]}>
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Icon
                  name={opt.icon}
                  size={22}
                  color={active ? DukaanColors.teal : DukaanColors.primary}
                />
              </View>
              <View style={styles.text}>
                <AppText variant="h3">{opt.label}</AppText>
                <AppText variant="bodySm" color={DukaanColors.textMuted}>
                  {opt.subtitle}
                </AppText>
              </View>
              {active ? (
                <View style={styles.check}>
                  <Icon name="check" size={16} color={DukaanColors.onPrimary} strokeWidth={2.6} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
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
  rowActive: {borderColor: DukaanColors.teal, backgroundColor: Palette.teal[50]},
  rowPressed: {backgroundColor: Palette.slate[50]},
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.orange[50],
  },
  iconWrapActive: {backgroundColor: Palette.teal[100]},
  text: {flex: 1, gap: 2},
  check: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: DukaanColors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
