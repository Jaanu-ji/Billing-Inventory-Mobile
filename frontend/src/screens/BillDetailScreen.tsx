import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Alert, ScrollView, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {billRepository} from '../repositories/BillRepository';
import {ProfileService} from '../services/ProfileService';
import {ShareService} from '../services/ShareService';
import {AppText, Badge, Button} from '../components/ui';
import {formatPrice, formatDateTime} from '../utils/format';
import {shopTypeLabel} from '../constants/shopTypes';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';
import type {Bill} from '../models/Bill';
import type {ShopProfile} from '../models/ShopProfile';
import type {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BillDetail'>;

/** Full view of one saved bill: shop header, items, quantities, totals, customer. */
export function BillDetailScreen({route}: Props): React.JSX.Element {
  const {billId} = route.params;
  const [bill, setBill] = useState<Bill | null>(null);
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([
        billRepository.getById(billId),
        ProfileService.getProfile(),
      ]);
      setBill(b);
      setProfile(p);
    } finally {
      setLoading(false);
    }
  }, [billId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Share is optional and layered on top — it never affects the saved bill.
  // PDF generation + share-sheet detail live in the service layer, not here.
  const handleShare = async () => {
    if (!bill || sharing) {
      return;
    }
    setSharing(true);
    try {
      await ShareService.shareBill(bill, profile);
    } catch {
      Alert.alert('Share failed', 'Could not create or share the PDF. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  // Send a GST bill to the customer as a plain (non-GST) cash memo. Read-only:
  // it shares a derived simple copy; the saved bill stays GST (see ShareService).
  const handleShareSimple = async () => {
    if (!bill || sharing) {
      return;
    }
    setSharing(true);
    try {
      await ShareService.shareBillAsSimple(bill, profile);
    } catch {
      Alert.alert('Share failed', 'Could not create or share the PDF. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!bill || sharing) {
      return;
    }
    setSharing(true);
    try {
      await ShareService.whatsAppBill(bill, profile, bill.customerPhone);
    } catch {
      Alert.alert('WhatsApp unavailable', 'Could not open WhatsApp. Try the Share button instead.');
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={DukaanColors.primary} />
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.center}>
        <AppText variant="body" color={DukaanColors.textMuted}>
          Bill not found.
        </AppText>
      </View>
    );
  }

  const isGst = bill.billType === 'gst';
  // Place of supply: the customer's state if captured, else the shop's own state.
  const placeOfSupply = bill.customerState ?? profile?.state ?? null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Shop header from the saved profile (Phase 2 Part 2). */}
      {profile ? (
        <View style={styles.shopCard}>
          <AppText variant="h2">{profile.shopName}</AppText>
          <AppText variant="bodySm" color={DukaanColors.textMuted}>
            {shopTypeLabel(profile.shopType)}
          </AppText>
          {profile.phone ? (
            <AppText variant="bodySm" color={DukaanColors.textMuted}>
              Ph: {profile.phone}
            </AppText>
          ) : null}
          {profile.address ? (
            <AppText variant="bodySm" color={DukaanColors.textMuted}>
              {profile.address}
            </AppText>
          ) : null}
          {profile.gstEnabled && profile.gstin ? (
            <AppText variant="bodySm" color={DukaanColors.textMuted} numeric>
              GSTIN: {profile.gstin}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View style={styles.headerCard}>
        <View style={styles.billNoRow}>
          <AppText variant="h1">Bill #{bill.billNumber}</AppText>
          <Badge variant={isGst ? 'gst' : 'simple'}>
            {isGst ? 'TAX INVOICE' : 'CASH MEMO'}
          </Badge>
        </View>
        <AppText variant="bodySm" color={DukaanColors.textMuted}>
          {formatDateTime(bill.createdAt)}
        </AppText>
        {bill.customerName ? (
          <AppText variant="bodySm" color={DukaanColors.textMuted}>
            Customer: {bill.customerName}
          </AppText>
        ) : null}
        {bill.customerPhone ? (
          <AppText variant="bodySm" color={DukaanColors.textMuted}>
            Phone: {bill.customerPhone}
          </AppText>
        ) : null}
        {isGst && bill.customerGstin ? (
          <AppText variant="bodySm" color={DukaanColors.textMuted} numeric>
            Customer GSTIN: {bill.customerGstin}
          </AppText>
        ) : null}
        {isGst && placeOfSupply ? (
          <AppText variant="bodySm" color={DukaanColors.textMuted}>
            Place of supply: {placeOfSupply}
          </AppText>
        ) : null}
      </View>

      <AppText variant="overline" color={DukaanColors.textMuted} style={styles.sectionTitle}>
        ITEMS
      </AppText>
      {(bill.items ?? []).map(item => (
        <View key={item.id} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <AppText variant="body" weight="700" numberOfLines={1}>
              {item.name}
            </AppText>
            <AppText variant="bodySm" color={DukaanColors.textMuted}>
              {item.quantity} × {formatPrice(item.price)}
              {isGst && item.gstRate > 0 ? ` · GST ${item.gstRate}%` : ''}
              {isGst && item.hsnCode ? ` · HSN ${item.hsnCode}` : ''}
            </AppText>
          </View>
          <AppText variant="body" weight="800" numeric>
            {formatPrice(item.lineTotal)}
          </AppText>
        </View>
      ))}

      <View style={styles.totalsCard}>
        <TotalLine
          label={isGst ? 'Taxable value' : 'Subtotal'}
          value={formatPrice(bill.subtotal)}
        />

        {/* GST breakup: CGST + SGST (intra-state) or IGST (inter-state). */}
        {isGst && !bill.isInterState ? (
          <>
            <TotalLine label="CGST" value={formatPrice(bill.cgst)} />
            <TotalLine label="SGST" value={formatPrice(bill.sgst)} />
          </>
        ) : null}
        {isGst && bill.isInterState ? (
          <TotalLine label="IGST" value={formatPrice(bill.igst)} />
        ) : null}

        <View style={styles.grandLine}>
          <AppText variant="h3">Total</AppText>
          <AppText variant="h1" numeric color={DukaanColors.teal}>
            {formatPrice(bill.total)}
          </AppText>
        </View>
      </View>

      {/* Share / PDF — works for any past bill. The PDF renders the same GST
          fields shown above. Sharing is optional; the saved bill is untouched. */}
      <View style={styles.shareActions}>
        <Button
          title={sharing ? 'Preparing…' : 'Share / PDF'}
          onPress={handleShare}
          loading={sharing}
          block
        />
        {/* GST bill only: send the customer a plain non-GST copy. */}
        {isGst ? (
          <Button
            title="Share as simple bill"
            variant="outline"
            onPress={handleShareSimple}
            disabled={sharing}
            block
          />
        ) : null}
        {bill.customerPhone ? (
          <Button
            title={`WhatsApp${bill.customerName ? ' ' + bill.customerName : ''}`}
            variant="wa"
            onPress={handleWhatsApp}
            disabled={sharing}
            block
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

/** One label/value line in the totals card. */
function TotalLine({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View style={styles.totalLine}>
      <AppText variant="body" color={DukaanColors.textMuted}>
        {label}
      </AppText>
      <AppText variant="body" weight="700" numeric>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: DukaanColors.bg},
  content: {padding: Space.lg},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DukaanColors.bg,
  },
  shopCard: {
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.lg,
    padding: Space.lg,
    marginBottom: Space.md,
    borderBottomWidth: 3,
    borderBottomColor: DukaanColors.primary,
    gap: 2,
  },
  headerCard: {
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: Space.lg,
    marginBottom: Space.md,
    gap: 4,
  },
  billNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionTitle: {marginBottom: Space.sm},
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: Space.lg,
    marginBottom: Space.sm,
  },
  itemInfo: {flex: 1, marginRight: Space.sm, gap: 2},
  totalsCard: {
    backgroundColor: Palette.slate[50],
    borderRadius: Radii.lg,
    padding: Space.lg,
    marginTop: Space.sm,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Space.xs,
  },
  grandLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: DukaanColors.hairline,
    marginTop: Space.xs,
    paddingTop: Space.sm,
  },
  shareActions: {marginTop: Space.lg, gap: Space.md},
});
