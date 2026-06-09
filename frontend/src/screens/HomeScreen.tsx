/**
 * HomeScreen — DUKAAN home / dashboard (Phase C2 + Phase I polish).
 *
 * The shopkeeper's landing tab, styled to the design (screenshots/05):
 *   - greeting top bar (shop name),
 *   - "Aaj ki sales" hero with a Bills / Cash in / Udhaar split,
 *   - quick actions (Naya bill + Udhaar) and info cards (Products + pending),
 *   - the most recent bills.
 * All data is read offline through the repositories.
 */
import React, {useCallback, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {type CompositeScreenProps, useFocusEffect} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppText, Badge, Icon, type IconName} from '../components/ui';
import {billRepository} from '../repositories/BillRepository';
import {productRepository} from '../repositories/ProductRepository';
import {ProfileService} from '../services/ProfileService';
import {formatPrice, formatDateTime} from '../utils/format';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';
import type {Bill, BillSummary} from '../models/Bill';
import type {MainTabParamList, RootStackParamList} from '../navigation/types';

// A tab screen that also pushes BillDetail / Customers onto the parent stack.
type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const RECENT_LIMIT = 5;

/** Epoch millis for local midnight today (start of "aaj"). */
function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function HomeScreen({navigation}: Props): React.JSX.Element {
  const [shopName, setShopName] = useState<string>('Aapki Dukaan');
  const [today, setToday] = useState<BillSummary>({
    count: 0,
    total: 0,
    cashIn: 0,
    udhaar: 0,
  });
  const [pending, setPending] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [recent, setRecent] = useState<Bill[]>([]);

  const load = useCallback(async () => {
    const [profile, summary, totalPending, products, recentBills] =
      await Promise.all([
        ProfileService.getProfile(),
        billRepository.getSummarySince(startOfToday()),
        billRepository.getTotalPending(),
        productRepository.getAll(),
        billRepository.getRecent(RECENT_LIMIT),
      ]);
    setShopName(profile?.shopName || 'Aapki Dukaan');
    setToday(summary);
    setPending(totalPending);
    setProductCount(products.length);
    setRecent(recentBills);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {/* Greeting bar */}
      <View style={styles.topBar}>
        <View style={styles.brandTile}>
          <Icon name="store" size={20} color={DukaanColors.onPrimary} />
        </View>
        <View style={styles.brandText}>
          <AppText variant="cap" color={DukaanColors.textMuted}>
            Namaste 🙏
          </AppText>
          <AppText variant="h3" numberOfLines={1}>
            {shopName}
          </AppText>
        </View>
      </View>

      {/* Today's sales hero with a Bills / Cash in / Udhaar split */}
      <View style={styles.hero}>
        <View style={styles.heroBlob} />
        <AppText variant="label" color={DukaanColors.onPrimary} style={styles.heroLabel}>
          Aaj ki sales
        </AppText>
        <AppText variant="display" color={DukaanColors.onPrimary} numeric>
          {formatPrice(today.total)}
        </AppText>
        <View style={styles.heroStats}>
          <HeroStat label="Bills" value={String(today.count)} />
          <View style={styles.heroDivider} />
          <HeroStat label="Cash in" value={formatPrice(today.cashIn)} />
          <View style={styles.heroDivider} />
          <HeroStat label="Udhaar" value={formatPrice(today.udhaar)} />
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.cardRow}>
        <ActionCard
          icon="scan"
          label="Naya bill"
          onPress={() => navigation.navigate('Billing')}
        />
        <ActionCard
          icon="receipt"
          label="Udhaar"
          onPress={() => navigation.navigate('Customers')}
        />
      </View>

      {/* Info cards */}
      <View style={styles.cardRow}>
        <InfoCard
          icon="box"
          tint={DukaanColors.indigo}
          value={String(productCount)}
          caption={`Product${productCount === 1 ? '' : 's'}`}
          onPress={() => navigation.navigate('Products')}
        />
        <InfoCard
          icon="tag"
          tint={DukaanColors.warning}
          value={formatPrice(pending)}
          caption="Total udhaar pending"
          onPress={() => navigation.navigate('Customers')}
        />
      </View>

      {/* Recent bills */}
      <View style={styles.sectionHead}>
        <AppText variant="overline" color={DukaanColors.textMuted}>
          RECENT BILLS
        </AppText>
        {recent.length > 0 ? (
          <Pressable hitSlop={8} onPress={() => navigation.navigate('BillHistory')}>
            <AppText variant="label" color={DukaanColors.primary}>
              See all
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {recent.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyBadge}>
            <Icon name="receipt" size={26} color={DukaanColors.primary} />
          </View>
          <AppText variant="h3" center>
            Abhi koi bill nahi
          </AppText>
          <AppText variant="bodySm" color={DukaanColors.textMuted} center>
            "Naya bill" se apna pehla bill banayein.
          </AppText>
        </View>
      ) : (
        recent.map(b => (
          <RecentBillRow
            key={b.id}
            bill={b}
            onPress={() => navigation.navigate('BillDetail', {billId: b.id})}
          />
        ))
      )}
    </ScrollView>
  );
}

/** One column inside the hero footer. */
function HeroStat({label, value}: {label: string; value: string}): React.JSX.Element {
  return (
    <View style={styles.heroStat}>
      <AppText variant="cap" color={DukaanColors.onPrimary} style={styles.heroStatLabel}>
        {label}
      </AppText>
      <AppText variant="body" weight="800" color={DukaanColors.onPrimary} numeric>
        {value}
      </AppText>
    </View>
  );
}

/** A large quick-action tile (icon + label). */
function ActionCard({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      style={({pressed}) => [styles.card, styles.actionCard, pressed && styles.cardPressed]}
      onPress={onPress}>
      <View style={styles.actionIcon}>
        <Icon name={icon} size={20} color={DukaanColors.primary} />
      </View>
      <AppText variant="body" weight="700">
        {label}
      </AppText>
    </Pressable>
  );
}

/** A compact stat tile (big value + caption). */
function InfoCard({
  icon,
  tint,
  value,
  caption,
  onPress,
}: {
  icon: IconName;
  tint: string;
  value: string;
  caption: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      style={({pressed}) => [styles.card, styles.infoCard, pressed && styles.cardPressed]}
      onPress={onPress}>
      <View style={[styles.infoIcon, {backgroundColor: tint + '1A'}]}>
        <Icon name={icon} size={18} color={tint} />
      </View>
      <AppText variant="h2" numeric>
        {value}
      </AppText>
      <AppText variant="cap" color={DukaanColors.textMuted} numberOfLines={1}>
        {caption}
      </AppText>
    </Pressable>
  );
}

/** One recent-bill row: icon · title/meta · amount + status badge. */
function RecentBillRow({
  bill,
  onPress,
}: {
  bill: Bill;
  onPress: () => void;
}): React.JSX.Element {
  const isGst = bill.billType === 'gst';
  const isUnpaid = bill.paymentStatus === 'unpaid';
  const title = bill.customerName || 'Walk-in';
  return (
    <Pressable
      style={({pressed}) => [styles.billRow, pressed && styles.cardPressed]}
      onPress={onPress}>
      <View style={styles.billIcon}>
        <Icon name="receipt" size={18} color={DukaanColors.textMuted} />
      </View>
      <View style={styles.billInfo}>
        <View style={styles.billTitleRow}>
          <AppText variant="body" weight="700" numberOfLines={1} style={styles.billTitle}>
            {title}
          </AppText>
          {isGst ? <Badge variant="gst">GST</Badge> : null}
        </View>
        <AppText variant="cap" color={DukaanColors.textMuted} numberOfLines={1}>
          #{bill.billNumber} · {formatDateTime(bill.createdAt)}
        </AppText>
      </View>
      <View style={styles.billRight}>
        <AppText variant="body" weight="800" numeric>
          {formatPrice(bill.total)}
        </AppText>
        <Badge variant={isUnpaid ? 'unpaid' : 'paid'} dot>
          {isUnpaid ? 'Udhaar' : 'Paid'}
        </Badge>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: DukaanColors.bg},
  content: {padding: Space.lg, gap: Space.md, paddingBottom: Space.xxxl},
  topBar: {flexDirection: 'row', alignItems: 'center', gap: Space.md},
  brandTile: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: DukaanColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {flex: 1, gap: 1},
  hero: {
    backgroundColor: DukaanColors.primary,
    borderRadius: Radii.xl,
    padding: Space.lg,
    overflow: 'hidden',
    shadowColor: DukaanColors.primary,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 12,
  },
  heroBlob: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroLabel: {opacity: 0.9, marginBottom: 2},
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Space.md,
    paddingTop: Space.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.22)',
  },
  heroStat: {flex: 1, gap: 1},
  heroStatLabel: {opacity: 0.85},
  heroDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginHorizontal: Space.sm,
  },
  cardRow: {flexDirection: 'row', gap: Space.md},
  card: {
    flex: 1,
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: Space.lg,
  },
  cardPressed: {backgroundColor: Palette.slate[50]},
  actionCard: {flexDirection: 'row', alignItems: 'center', gap: Space.md},
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: Palette.orange[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {gap: 4},
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Space.xs,
  },
  emptyCard: {
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: Space.xl,
    alignItems: 'center',
    gap: Space.sm,
  },
  emptyBadge: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: Palette.orange[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xs,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: Space.md,
  },
  billIcon: {
    width: 38,
    height: 38,
    borderRadius: Radii.sm,
    backgroundColor: Palette.slate[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  billInfo: {flex: 1, gap: 2},
  billTitleRow: {flexDirection: 'row', alignItems: 'center', gap: Space.sm},
  billTitle: {flexShrink: 1},
  billRight: {alignItems: 'flex-end', gap: 4},
});
