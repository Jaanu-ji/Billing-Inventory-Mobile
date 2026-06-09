/**
 * CustomerDetailScreen (Phase F) — one customer's ledger (screenshot 15).
 *
 * Shows the customer, their pending udhaar, and the list of their bills (tap to
 * open a bill). A sticky "Clear udhaar" button marks all their unpaid bills paid
 * at once, recording how it was settled.
 */
import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {billRepository} from '../repositories/BillRepository';
import {customerRepository} from '../repositories/CustomerRepository';
import {AppText, Badge, Button, Icon, RowThumb} from '../components/ui';
import {PaymentSheet} from '../components/PaymentSheet';
import {formatPrice, formatDateTime} from '../utils/format';
import type {PaymentMode} from '../constants/payments';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';
import type {Bill} from '../models/Bill';
import type {Customer} from '../models/Customer';
import type {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerDetail'>;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const text = parts
    .slice(0, 2)
    .map(w => w[0])
    .join('');
  return text ? text.toUpperCase() : '#';
}

export function CustomerDetailScreen({
  route,
  navigation,
}: Props): React.JSX.Element {
  const {customerId} = route.params;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, bs] = await Promise.all([
        customerRepository.getById(customerId),
        billRepository.getByCustomer(customerId),
      ]);
      setCustomer(c);
      setBills(bs);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const pending = useMemo(
    () =>
      bills
        .filter(b => b.paymentStatus === 'unpaid')
        .reduce((sum, b) => sum + b.total, 0),
    [bills],
  );

  const handleClear = async (mode: PaymentMode) => {
    if (clearing) {
      return;
    }
    setPayOpen(false);
    setClearing(true);
    try {
      await billRepository.clearUdhaar(customerId, mode);
      await load();
    } catch {
      Alert.alert('Could not update', 'Udhaar clear nahi hua. Dobara koshish karein.');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={DukaanColors.primary} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.center}>
        <AppText variant="body" color={DukaanColors.textMuted}>
          Customer not found.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bills}
        keyExtractor={b => String(b.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <RowThumb label={initials(customer.name)} />
            <AppText variant="h2" style={styles.name}>
              {customer.name}
            </AppText>
            {customer.phone ? (
              <AppText variant="bodySm" color={DukaanColors.textMuted}>
                {customer.phone}
              </AppText>
            ) : null}
            <AppText variant="overline" color={DukaanColors.textMuted} style={styles.pendingLabel}>
              PENDING BAAKI
            </AppText>
            <AppText
              variant="display"
              numeric
              color={pending > 0 ? DukaanColors.primary : DukaanColors.teal}>
              {formatPrice(pending)}
            </AppText>
          </View>
        }
        renderItem={({item}) => {
          const isUnpaid = item.paymentStatus === 'unpaid';
          return (
            <Pressable
              style={({pressed}) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => navigation.navigate('BillDetail', {billId: item.id})}>
              <View style={styles.info}>
                <AppText variant="body" weight="700">
                  Bill #{item.billNumber}
                </AppText>
                <AppText variant="bodySm" color={DukaanColors.textMuted}>
                  {formatDateTime(item.createdAt)}
                </AppText>
              </View>
              <View style={styles.amountCol}>
                <AppText variant="h3" numeric>
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
          <AppText variant="bodySm" color={DukaanColors.textMuted} center style={styles.noBills}>
            Is customer ka koi bill nahi hai.
          </AppText>
        }
      />

      {pending > 0 ? (
        <View style={styles.bottomBar}>
          <Button
            title={`Clear udhaar · ${formatPrice(pending)}`}
            variant="teal"
            size="lg"
            block
            loading={clearing}
            left={<Icon name="check" size={18} color={DukaanColors.onPrimary} strokeWidth={2.4} />}
            onPress={() => setPayOpen(true)}
          />
        </View>
      ) : null}

      <PaymentSheet
        visible={payOpen}
        total={pending}
        title="Clear udhaar"
        onSelect={handleClear}
        onClose={() => setPayOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: DukaanColors.bg},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DukaanColors.bg,
  },
  list: {padding: Space.lg, flexGrow: 1},
  headerWrap: {alignItems: 'center', gap: 2, marginBottom: Space.lg},
  name: {marginTop: Space.sm},
  pendingLabel: {marginTop: Space.md},
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
  amountCol: {alignItems: 'flex-end', gap: 6},
  noBills: {marginTop: Space.xl},
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: DukaanColors.hairline,
    backgroundColor: DukaanColors.surface,
    padding: Space.lg,
  },
});
