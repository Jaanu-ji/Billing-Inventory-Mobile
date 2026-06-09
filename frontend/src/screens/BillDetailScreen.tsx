import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Alert, ScrollView, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {billRepository} from '../repositories/BillRepository';
import {ProfileService} from '../services/ProfileService';
import {ShareService} from '../services/ShareService';
import {AppText, Badge, Button} from '../components/ui';
import {PaymentSheet} from '../components/PaymentSheet';
import {formatPrice, formatDateTime, formatQuantity} from '../utils/format';
import {unitLabel} from '../constants/units';
import {paymentModeLabel, type PaymentMode} from '../constants/payments';
import {labelAttributes} from '../constants/productFields';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';
import type {Bill, BillItem} from '../models/Bill';
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
  // Mark-an-udhaar-bill-paid (Phase F).
  const [payOpen, setPayOpen] = useState(false);
  const [marking, setMarking] = useState(false);

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

  // Mark this (udhaar) bill paid, recording how it was settled. Best-effort:
  // failures surface an alert; the bill stays unpaid so it can be retried.
  const handleMarkPaid = async (mode: PaymentMode) => {
    if (!bill || marking) {
      return;
    }
    setPayOpen(false);
    setMarking(true);
    try {
      await billRepository.markPaid(bill.id, mode);
      await load();
    } catch {
      Alert.alert('Could not update', 'Bill abhi unpaid hai. Dobara koshish karein.');
    } finally {
      setMarking(false);
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

  // A mixed bill (goods + services) is shown in labelled sections; a single-kind
  // bill keeps the plain "ITEMS" list. Manual goods group with products.
  const allItems = bill.items ?? [];
  const goods = allItems.filter(i => i.kind !== 'service');
  const services = allItems.filter(i => i.kind === 'service');
  const isMixed = goods.length > 0 && services.length > 0;

  const isUnpaid = bill.paymentStatus === 'unpaid';

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Udhaar banner (Phase F): pending bills can be marked paid here. */}
      {isUnpaid ? (
        <View style={styles.udhaarBanner}>
          <View style={styles.udhaarInfo}>
            <AppText variant="label" color={DukaanColors.warning}>
              Udhaar · pending
            </AppText>
            <AppText variant="bodySm" color={DukaanColors.textMuted}>
              {bill.customerName ? `${bill.customerName} owes ` : 'Pending '}
              {formatPrice(bill.total)}
            </AppText>
          </View>
          <Button
            title="Mark paid"
            variant="teal"
            size="sm"
            onPress={() => setPayOpen(true)}
            loading={marking}
          />
        </View>
      ) : null}

      {/* Invoice card — one self-contained "bill" like the design (09/31). */}
      <View style={styles.invoiceCard}>
        {/* Centered shop header */}
        {profile ? (
          <View style={styles.invShop}>
            <AppText variant="h2" center>
              {profile.shopName}
            </AppText>
            {profile.address ? (
              <AppText variant="cap" color={DukaanColors.textMuted} center>
                {profile.address}
              </AppText>
            ) : null}
            {profile.phone ? (
              <AppText variant="cap" color={DukaanColors.textMuted} center>
                {profile.phone}
                {profile.gstEnabled && profile.gstin
                  ? ` · GSTIN ${profile.gstin}`
                  : ''}
              </AppText>
            ) : null}
          </View>
        ) : null}

        <View style={styles.docBadgeRow}>
          <Badge variant={isGst ? 'gst' : 'simple'}>
            {isGst ? 'TAX INVOICE' : 'CASH MEMO'}
          </Badge>
          <Badge variant={isUnpaid ? 'unpaid' : 'paid'} dot>
            {isUnpaid
              ? 'Udhaar'
              : `Paid${
                  bill.paymentMode ? ' · ' + paymentModeLabel(bill.paymentMode) : ''
                }`}
          </Badge>
        </View>

        {/* Three-column meta row: Bill no. · Customer · Date */}
        <View style={styles.metaRow}>
          <MetaCol label="Bill no." value={`#${bill.billNumber}`} align="left" />
          <MetaCol
            label="Customer"
            value={bill.customerName || 'Walk-in'}
            align="center"
          />
          <MetaCol
            label="Date"
            value={formatDateTime(bill.createdAt)}
            align="right"
          />
        </View>
        {isGst && (bill.customerGstin || placeOfSupply) ? (
          <AppText variant="cap" color={DukaanColors.textMuted} style={styles.metaExtra}>
            {bill.customerGstin ? `Customer GSTIN: ${bill.customerGstin}` : ''}
            {bill.customerGstin && placeOfSupply ? '  ·  ' : ''}
            {placeOfSupply ? `Place of supply: ${placeOfSupply}` : ''}
          </AppText>
        ) : null}

        <View style={styles.invDivider} />

        {/* Items (sectioned for a mixed bill, else a plain list) */}
        {isMixed ? (
          <>
            <AppText variant="overline" color={DukaanColors.textMuted} style={styles.sectionTitle}>
              PRODUCTS
            </AppText>
            {goods.map(item => (
              <ItemDetailRow key={item.id} item={item} isGst={isGst} shopType={profile?.shopType ?? null} />
            ))}
            <AppText variant="overline" color={DukaanColors.textMuted} style={styles.sectionTitle}>
              SERVICES
            </AppText>
            {services.map(item => (
              <ItemDetailRow key={item.id} item={item} isGst={isGst} shopType={profile?.shopType ?? null} />
            ))}
          </>
        ) : (
          allItems.map(item => (
            <ItemDetailRow key={item.id} item={item} isGst={isGst} shopType={profile?.shopType ?? null} />
          ))
        )}

        {/* Totals */}
        <View style={styles.totalsInner}>
          <TotalLine
            label={isGst ? 'Taxable value' : 'Subtotal'}
            value={formatPrice(bill.subtotal)}
          />
          {isGst && !bill.isInterState ? (
            <>
              <TotalLine label="CGST" value={formatPrice(bill.cgst)} />
              <TotalLine label="SGST" value={formatPrice(bill.sgst)} />
            </>
          ) : null}
          {isGst && bill.isInterState ? (
            <TotalLine label="IGST" value={formatPrice(bill.igst)} />
          ) : null}
          {bill.discount > 0 ? (
            <TotalLine label="Discount" value={`− ${formatPrice(bill.discount)}`} />
          ) : null}
          {bill.roundOff !== 0 ? (
            <TotalLine
              label="Round off"
              value={`${bill.roundOff > 0 ? '+' : '−'} ${formatPrice(
                Math.abs(bill.roundOff),
              )}`}
            />
          ) : null}

          <View style={styles.grandLine}>
            <AppText variant="h3">{isGst ? 'Total (incl. GST)' : 'Total'}</AppText>
            <AppText variant="h1" numeric color={DukaanColors.teal}>
              {formatPrice(bill.total)}
            </AppText>
          </View>
        </View>

        <AppText variant="cap" color={DukaanColors.textFaint} center style={styles.thanks}>
          🙏 Dhanyavaad! Powered by DUKAAN
        </AppText>
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

    <PaymentSheet
      visible={payOpen}
      total={bill.total}
      onSelect={handleMarkPaid}
      onClose={() => setPayOpen(false)}
    />
    </>
  );
}

/** One item line in the bill detail (shows HSN for goods, SAC for services). */
function ItemDetailRow({
  item,
  isGst,
  shopType,
}: {
  item: BillItem;
  isGst: boolean;
  shopType: string | null;
}): React.JSX.Element {
  const code = item.sacCode
    ? ` · SAC ${item.sacCode}`
    : item.hsnCode
    ? ` · HSN ${item.hsnCode}`
    : '';
  const qty =
    item.kind === 'service'
      ? formatQuantity(item.quantity)
      : `${formatQuantity(item.quantity)} ${unitLabel(item.unit)}`;
  // Business-adaptive extras (Phase H): batch/expiry, size/colour, …
  const attrs = labelAttributes(shopType, item.attributes);
  const attrLine = attrs.map(a => `${a.label}: ${a.value}`).join(' · ');
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <AppText variant="body" weight="700" numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="bodySm" color={DukaanColors.textMuted}>
          {qty} × {formatPrice(item.price)}
          {item.kind !== 'service' ? `/${unitLabel(item.unit)}` : ''}
          {isGst && item.gstRate > 0 ? ` · GST ${item.gstRate}%` : ''}
          {isGst ? code : ''}
        </AppText>
        {attrLine ? (
          <AppText variant="cap" color={DukaanColors.textFaint}>
            {attrLine}
          </AppText>
        ) : null}
      </View>
      <AppText variant="body" weight="800" numeric>
        {formatPrice(item.lineTotal)}
      </AppText>
    </View>
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

/** One column of the invoice meta row (tiny label over a value). */
function MetaCol({
  label,
  value,
  align,
}: {
  label: string;
  value: string;
  align: 'left' | 'center' | 'right';
}): React.JSX.Element {
  const colStyle =
    align === 'left'
      ? styles.metaColLeft
      : align === 'right'
      ? styles.metaColRight
      : styles.metaColCenter;
  const textStyle =
    align === 'left'
      ? styles.metaTextLeft
      : align === 'right'
      ? styles.metaTextRight
      : styles.metaTextCenter;
  return (
    <View style={[styles.metaCol, colStyle]}>
      <AppText variant="cap" color={DukaanColors.textFaint}>
        {label}
      </AppText>
      <AppText variant="bodySm" weight="700" numberOfLines={1} style={textStyle}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: DukaanColors.bg},
  content: {padding: Space.lg},
  udhaarBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Palette.amber[50],
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.amber[100],
    padding: Space.md,
    marginBottom: Space.md,
  },
  udhaarInfo: {flex: 1, gap: 2},
  statusRow: {flexDirection: 'row', marginTop: Space.xs},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DukaanColors.bg,
  },
  invoiceCard: {
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: Space.lg,
    marginBottom: Space.md,
  },
  invShop: {alignItems: 'center', gap: 2},
  docBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Space.sm,
    marginTop: Space.md,
  },
  metaRow: {flexDirection: 'row', marginTop: Space.lg, gap: Space.sm},
  metaCol: {flex: 1, gap: 2},
  metaColLeft: {alignItems: 'flex-start'},
  metaColCenter: {alignItems: 'center'},
  metaColRight: {alignItems: 'flex-end'},
  metaTextLeft: {textAlign: 'left'},
  metaTextCenter: {textAlign: 'center'},
  metaTextRight: {textAlign: 'right'},
  metaExtra: {marginTop: Space.sm, textAlign: 'center'},
  invDivider: {
    height: 1,
    backgroundColor: DukaanColors.hairline,
    marginVertical: Space.md,
  },
  sectionTitle: {marginBottom: Space.xs, marginTop: Space.xs},
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: DukaanColors.hairline,
  },
  itemInfo: {flex: 1, marginRight: Space.sm, gap: 2},
  totalsInner: {marginTop: Space.md},
  thanks: {marginTop: Space.lg},
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
