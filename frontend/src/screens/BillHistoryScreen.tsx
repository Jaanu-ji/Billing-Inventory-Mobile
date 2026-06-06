import React, {useCallback, useState} from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {type CompositeScreenProps, useFocusEffect} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {billRepository} from '../repositories/BillRepository';
import {formatPrice, formatDateTime} from '../utils/format';
import {Colors, FontSize, Radius, Spacing} from '../constants/theme';
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
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('BillDetail', {billId: item.id})}>
            <View style={styles.rowTop}>
              <Text style={styles.billNo}>Bill #{item.billNumber}</Text>
              <Text style={styles.total}>{formatPrice(item.total)}</Text>
            </View>
            <Text style={styles.meta}>
              {formatDateTime(item.createdAt)}
              {item.customerName ? ` · ${item.customerName}` : ''}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No bills yet.</Text>
              <Text style={styles.emptySub}>
                Saved bills will appear here.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  list: {padding: Spacing.md, flexGrow: 1},
  row: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billNo: {color: Colors.text, fontSize: FontSize.md, fontWeight: '800'},
  total: {color: Colors.success, fontSize: FontSize.lg, fontWeight: '800'},
  meta: {color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.xs},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl},
  emptyText: {color: Colors.text, fontSize: FontSize.lg, fontWeight: '700'},
  emptySub: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
