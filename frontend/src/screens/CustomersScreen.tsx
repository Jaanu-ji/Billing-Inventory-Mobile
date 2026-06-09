/**
 * CustomersScreen (Phase F) — the udhaar ledger (screenshot 14).
 *
 * Lists saved customers with their outstanding udhaar, a "total pending" hero,
 * and search. Tap a customer to see their bills and clear their udhaar.
 */
import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, Pressable, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {customerRepository} from '../repositories/CustomerRepository';
import {AppText, Badge, Icon, Input, RowThumb} from '../components/ui';
import {formatPrice} from '../utils/format';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';
import type {CustomerWithPending} from '../models/Customer';
import type {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Customers'>;

/** Up-to-2-char initials for the row thumbnail. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const text = parts
    .slice(0, 2)
    .map(w => w[0])
    .join('');
  return text ? text.toUpperCase() : '#';
}

export function CustomersScreen({navigation}: Props): React.JSX.Element {
  const [customers, setCustomers] = useState<CustomerWithPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCustomers(await customerRepository.getAllWithPending());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totalPending = useMemo(
    () => customers.reduce((sum, c) => sum + c.pending, 0),
    [customers],
  );
  const pendingCount = useMemo(
    () => customers.filter(c => c.pending > 0).length,
    [customers],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? customers.filter(
          c => c.name.toLowerCase().includes(q) || c.phone.includes(q),
        )
      : customers;
  }, [customers, query]);

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={c => String(c.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <AppText variant="overline" color={DukaanColors.onPrimary}>
                TOTAL UDHAAR PENDING
              </AppText>
              <AppText variant="display" color={DukaanColors.onPrimary} numeric>
                {formatPrice(totalPending)}
              </AppText>
              <AppText variant="bodySm" color={DukaanColors.onPrimary} style={styles.heroSub}>
                {pendingCount} customer{pendingCount === 1 ? '' : 's'} · baaki hai
              </AppText>
            </View>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search customers…"
              prefix={<Icon name="search" size={18} color={DukaanColors.textFaint} />}
              containerStyle={styles.search}
            />
          </View>
        }
        renderItem={({item}) => (
          <Pressable
            style={({pressed}) => [styles.row, pressed && styles.rowPressed]}
            onPress={() =>
              navigation.navigate('CustomerDetail', {customerId: item.id})
            }>
            <RowThumb label={initials(item.name)} />
            <View style={styles.info}>
              <AppText variant="body" weight="700" numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText variant="bodySm" color={DukaanColors.textMuted} numberOfLines={1}>
                {item.phone}
              </AppText>
            </View>
            {item.pending > 0 ? (
              <Badge variant="unpaid" dot>{`${formatPrice(item.pending)} baaki`}</Badge>
            ) : (
              <Badge variant="paid" dot>
                Clear
              </Badge>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyBadge}>
                <Icon name="store" size={30} color={DukaanColors.primary} />
              </View>
              <AppText variant="h3" center>
                {query ? 'No matches' : 'No customers yet'}
              </AppText>
              <AppText variant="bodySm" color={DukaanColors.textMuted} center>
                {query
                  ? 'Is search se koi customer match nahi hua.'
                  : 'Checkout pe customer add karein — yahan unka udhaar dikhega.'}
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
  hero: {
    backgroundColor: DukaanColors.primary,
    borderRadius: Radii.lg,
    padding: Space.lg,
    gap: 2,
    marginBottom: Space.md,
  },
  heroSub: {opacity: 0.92, marginTop: 2},
  search: {marginBottom: Space.md},
  row: {
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
  rowPressed: {backgroundColor: Palette.orange[50]},
  info: {flex: 1, gap: 2},
  empty: {
    alignItems: 'center',
    gap: Space.sm,
    padding: Space.xl,
    marginTop: Space.xl,
  },
  emptyBadge: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: Palette.orange[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xs,
  },
});
