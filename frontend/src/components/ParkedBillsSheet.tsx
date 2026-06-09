/**
 * ParkedBillsSheet (Phase G) — resume or discard a held bill (screenshot 17).
 */
import React from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {AppText, BottomSheet, Button, Icon} from './ui';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';
import {formatPrice, formatQuantity} from '../utils/format';
import type {ParkedBill} from '../models/ParkedBill';

interface Props {
  visible: boolean;
  parked: ParkedBill[];
  onResume: (id: number) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export function ParkedBillsSheet({
  visible,
  parked,
  onResume,
  onDelete,
  onClose,
}: Props): React.JSX.Element {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="h2">Parked bills</AppText>
      <AppText variant="bodySm" color={DukaanColors.textMuted} style={styles.sub}>
        Resume a held bill
      </AppText>

      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {parked.length === 0 ? (
          <AppText variant="bodySm" color={DukaanColors.textMuted} center style={styles.empty}>
            Koi parked bill nahi hai.
          </AppText>
        ) : (
          parked.map(p => (
            <View key={p.id} style={styles.row}>
              <View style={styles.iconWrap}>
                <Icon name="receipt" size={18} color={DukaanColors.warning} strokeWidth={2.2} />
              </View>
              <View style={styles.info}>
                <AppText variant="body" weight="700" numberOfLines={1}>
                  {p.label}
                </AppText>
                <AppText variant="bodySm" color={DukaanColors.textMuted} numeric>
                  {formatQuantity(p.itemCount)} item
                  {p.itemCount === 1 ? '' : 's'} · {formatPrice(p.total)}
                </AppText>
              </View>
              <Button title="Resume" variant="secondary" size="sm" onPress={() => onResume(p.id)} />
              <Pressable
                onPress={() => onDelete(p.id)}
                hitSlop={8}
                style={({pressed}) => [styles.del, pressed && styles.delPressed]}>
                <Icon name="trash" size={18} color={DukaanColors.danger} strokeWidth={2.2} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sub: {marginTop: 2, marginBottom: Space.md},
  list: {maxHeight: 360},
  empty: {marginVertical: Space.xl},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: Space.md,
    marginBottom: Space.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.amber[50],
  },
  info: {flex: 1, gap: 2},
  del: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2', // --danger-50
  },
  delPressed: {opacity: 0.7},
});
