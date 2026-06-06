import React, {useCallback, useState} from 'react';
import {FlatList, Pressable, StyleSheet, View} from 'react-native';
import {type CompositeScreenProps, useFocusEffect} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {billRepository} from '../repositories/BillRepository';
import {AppText, Badge} from '../components/ui';
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
          return (
            <Pressable
              style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
              onPress={() =>
                navigation.navigate('BillDetail', {billId: item.id})
              }>
              <View style={styles.rowTop}>
                <AppText variant="h3">Bill #{item.billNumber}</AppText>
                <AppText variant="h2" numeric>
                  {formatPrice(item.total)}
                </AppText>
              </View>
              <View style={styles.rowBottom}>
                <AppText
                  variant="bodySm"
                  color={DukaanColors.textMuted}
                  numberOfLines={1}
                  style={styles.meta}>
                  {formatDateTime(item.createdAt)}
                  {item.customerName ? ` · ${item.customerName}` : ''}
                </AppText>
                <Badge variant={isGst ? 'gst' : 'simple'}>
                  {isGst ? 'GST' : 'Simple'}
                </Badge>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyBadge}>
                <AppText style={styles.emptyGlyph}>🧾</AppText>
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
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: Space.lg,
    marginBottom: Space.md,
    gap: Space.sm,
  },
  cardPressed: {backgroundColor: Palette.orange[50]},
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Space.sm,
  },
  meta: {flex: 1},
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
  emptyGlyph: {fontSize: 28},
});
