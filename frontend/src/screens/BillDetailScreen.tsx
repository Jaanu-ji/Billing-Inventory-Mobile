import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {billRepository} from '../repositories/BillRepository';
import {ProfileService} from '../services/ProfileService';
import {ShareService} from '../services/ShareService';
import {PrimaryButton} from '../components/PrimaryButton';
import {formatPrice, formatDateTime} from '../utils/format';
import {shopTypeLabel} from '../constants/shopTypes';
import {Colors, FontSize, Radius, Spacing} from '../constants/theme';
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
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Bill not found.</Text>
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
          <Text style={styles.shopName}>{profile.shopName}</Text>
          <Text style={styles.shopMeta}>{shopTypeLabel(profile.shopType)}</Text>
          {profile.phone ? (
            <Text style={styles.shopMeta}>Ph: {profile.phone}</Text>
          ) : null}
          {profile.address ? (
            <Text style={styles.shopMeta}>{profile.address}</Text>
          ) : null}
          {profile.gstEnabled && profile.gstin ? (
            <Text style={styles.shopMeta}>GSTIN: {profile.gstin}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.headerCard}>
        <View style={styles.billNoRow}>
          <Text style={styles.billNo}>Bill #{bill.billNumber}</Text>
          {isGst ? (
            <View style={styles.gstBadge}>
              <Text style={styles.gstBadgeText}>TAX INVOICE</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.meta}>{formatDateTime(bill.createdAt)}</Text>
        {bill.customerName ? (
          <Text style={styles.meta}>Customer: {bill.customerName}</Text>
        ) : null}
        {bill.customerPhone ? (
          <Text style={styles.meta}>Phone: {bill.customerPhone}</Text>
        ) : null}
        {isGst && bill.customerGstin ? (
          <Text style={styles.meta}>Customer GSTIN: {bill.customerGstin}</Text>
        ) : null}
        {isGst && placeOfSupply ? (
          <Text style={styles.meta}>Place of supply: {placeOfSupply}</Text>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Items</Text>
      {(bill.items ?? []).map(item => (
        <View key={item.id} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.itemUnit}>
              {item.quantity} × {formatPrice(item.price)}
              {isGst && item.gstRate > 0 ? ` · GST ${item.gstRate}%` : ''}
              {isGst && item.hsnCode ? ` · HSN ${item.hsnCode}` : ''}
            </Text>
          </View>
          <Text style={styles.itemTotal}>{formatPrice(item.lineTotal)}</Text>
        </View>
      ))}

      <View style={styles.totalsCard}>
        <View style={styles.totalLine}>
          <Text style={styles.totalLabel}>
            {isGst ? 'Taxable value' : 'Subtotal'}
          </Text>
          <Text style={styles.totalVal}>{formatPrice(bill.subtotal)}</Text>
        </View>

        {/* GST breakup: CGST + SGST (intra-state) or IGST (inter-state). */}
        {isGst && !bill.isInterState ? (
          <>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>CGST</Text>
              <Text style={styles.totalVal}>{formatPrice(bill.cgst)}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>SGST</Text>
              <Text style={styles.totalVal}>{formatPrice(bill.sgst)}</Text>
            </View>
          </>
        ) : null}
        {isGst && bill.isInterState ? (
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>IGST</Text>
            <Text style={styles.totalVal}>{formatPrice(bill.igst)}</Text>
          </View>
        ) : null}

        <View style={[styles.totalLine, styles.grandLine]}>
          <Text style={styles.grandLabel}>Total</Text>
          <Text style={styles.grandVal}>{formatPrice(bill.total)}</Text>
        </View>
      </View>

      {/* Share / PDF — works for any past bill. The PDF renders the same GST
          fields shown above. Sharing is optional; the saved bill is untouched. */}
      <View style={styles.shareActions}>
        <PrimaryButton
          label={sharing ? 'Preparing…' : 'Share / PDF'}
          onPress={handleShare}
          loading={sharing}
        />
        {bill.customerPhone ? (
          <PrimaryButton
            label={`WhatsApp${bill.customerName ? ' ' + bill.customerName : ''}`}
            variant="ghost"
            onPress={handleWhatsApp}
            disabled={sharing}
            style={styles.whatsAppBtn}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  content: {padding: Spacing.md},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  muted: {color: Colors.textMuted, fontSize: FontSize.md},
  shopCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  shopName: {color: Colors.text, fontSize: FontSize.lg, fontWeight: '900'},
  shopMeta: {color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2},
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  billNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  billNo: {color: Colors.text, fontSize: FontSize.xl, fontWeight: '900'},
  gstBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  gstBadgeText: {color: Colors.text, fontSize: FontSize.sm, fontWeight: '800'},
  meta: {color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.xs},
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemInfo: {flex: 1, marginRight: Spacing.sm},
  itemName: {color: Colors.text, fontSize: FontSize.md, fontWeight: '700'},
  itemUnit: {color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2},
  itemTotal: {color: Colors.text, fontSize: FontSize.md, fontWeight: '800'},
  totalsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  totalLabel: {color: Colors.textMuted, fontSize: FontSize.md},
  totalVal: {color: Colors.text, fontSize: FontSize.md, fontWeight: '700'},
  grandLine: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  grandLabel: {color: Colors.text, fontSize: FontSize.lg, fontWeight: '800'},
  grandVal: {color: Colors.success, fontSize: FontSize.xl, fontWeight: '900'},
  shareActions: {marginTop: Spacing.lg, gap: Spacing.sm},
  whatsAppBtn: {borderColor: Colors.success},
});
