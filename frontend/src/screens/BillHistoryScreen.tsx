import React, {useCallback, useLayoutEffect, useState} from 'react';
import {FlatList, Pressable, StyleSheet, View} from 'react-native';
import {type CompositeScreenProps, useFocusEffect} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {billRepository} from '../repositories/BillRepository';
import {AppText, Badge, Icon} from '../components/ui';
import {formatPrice, formatDateTime} from '../utils/format';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';
import type {Bill} from '../models/Bill';
import type {MainTabParamList, RootStackParamList} from '../navigation/types';

// A tab screen that also pushes BillDetail onto the parent stack.
type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'BillHistory'>,
  NativeStackScreenProps<RootStackParamList>
>;

/** The shopkeeper's record of every saved bill. Tap a bill to see its detail. */
export function BillHistoryScreen({navigation}: Props): React.JSX.Element {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  // Header shortcut to the udhaar ledger (Phase F).
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('Customers')}
          hitSlop={8}
          style={styles.headerBtn}>
          <Icon name="store" size={16} color={DukaanColors.primary} strokeWidth={2.2} />
          <AppText variant="label" color={DukaanColors.primary}>
            Udhaar
          </AppText>
        </Pressable>
      ),
    });
  }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBills(await billRepository.getAll());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={bills}
        keyExtractor={b => String(b.id)}
        contentContainerStyle={styles.list}
        renderItem={({item}) => {
          const isGst = item.billType === 'gst';
          const isUnpaid = item.paymentStatus === 'unpaid';
          return (
            <Pressable
              style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
              onPress={() =>
                navigation.navigate('BillDetail', {billId: item.id})
              }>
              <View style={styles.billIcon}>
                <Icon name="receipt" size={18} color={DukaanColors.textMuted} />
              </View>
              <View style={styles.info}>
                <View style={styles.titleRow}>
                  <AppText variant="body" weight="700" numberOfLines={1} style={styles.title}>
                    {item.customerName || 'Walk-in'}
                  </AppText>
                  {isGst ? <Badge variant="gst">GST</Badge> : null}
                </View>
                <AppText variant="cap" color={DukaanColors.textMuted} numberOfLines={1}>
                  #{item.billNumber} · {formatDateTime(item.createdAt)}
                </AppText>
              </View>
              <View style={styles.right}>
                <AppText variant="body" weight="800" numeric>
                  {formatPrice(item.total)}
                </AppText>
                <Badge variant={isUnpaid ? 'unpaid' : 'paid'} dot>
                  {isUnpaid ? 'Udhaar' : 'Paid'}
                </Badge>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyBadge}>
                <Icon name="receipt" size={30} color={DukaanColors.primary} />
              </View>
              <AppText variant="h3" center>
                No bills yet
              </AppText>
              <AppText variant="bodySm" color={DukaanColors.textMuted} center>
                Save kiya hua har bill yahan dikhega.
              </AppText>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: DukaanColors.bg},
  list: {padding: Space.lg, flexGrow: 1},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: Space.md,
    marginBottom: Space.sm,
  },
  cardPressed: {backgroundColor: Palette.orange[50]},
  billIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.sm,
    backgroundColor: Palette.slate[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {flex: 1, gap: 2},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: Space.sm},
  title: {flexShrink: 1},
  right: {alignItems: 'flex-end', gap: 4},
  headerBtn: {flexDirection: 'row', alignItems: 'center', gap: 4},
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    padding: Space.xl,
  },
  emptyBadge: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: Palette.indigo[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xs,
  },
});
