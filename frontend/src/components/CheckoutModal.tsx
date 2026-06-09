import React, {useEffect, useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';
import {INDIAN_STATES} from '../constants/states';
import {type BillType} from '../constants/gst';
import type {PaymentMode, PaymentStatus} from '../constants/payments';
import {calculateBillTotals, type DiscountType} from '../services/GstService';
import {formatPrice} from '../utils/format';
import {
  AppText,
  Badge,
  Button,
  Field,
  Input,
  Row,
  Segmented,
  Select,
  Toggle,
  BottomSheet,
  Icon,
} from './ui';
import {PaymentSheet} from './PaymentSheet';
import {DiscountSheet, type DiscountValue} from './DiscountSheet';
import {
  CustomerPickSheet,
  type CustomerSelection,
} from './CustomerPickSheet';
import type {CartItem} from '../models/Bill';
import type {CustomerWithPending} from '../models/Customer';

export interface CheckoutDetails {
  customerName: string;
  customerPhone: string;
  /** Chosen saved customer id (Phase F). null = new/none — caller upserts. */
  customerId: number | null;
  /** 'simple' or 'gst'. Always 'simple' when the shop isn't GST-registered. */
  billType: BillType;
  /** Customer GSTIN for a B2B GST bill (optional). */
  customerGstin: string;
  /** Customer GST state code — decides intra vs inter-state (optional). */
  customerStateCode: string | null;
  /** Paid or unpaid/udhaar (Phase F). */
  paymentStatus: PaymentStatus;
  /** How a paid bill was settled (Phase F); null for udhaar. */
  paymentMode: PaymentMode | null;
  /** Bill-level discount (Phase G); null = none. */
  discountType?: DiscountType;
  discountValue?: number;
  /** Round the payable to the nearest rupee (Phase G). */
  roundOff: boolean;
}

interface Props {
  visible: boolean;
  /** Cart lines — used for the live total and GST preview. */
  items: CartItem[];
  /** True if the shop bills GST: shows the bill-type choice + GST capture. */
  gstEnabled: boolean;
  /** Shop's own GST state code (place of supply default). */
  shopStateCode: string | null;
  /** Saved customers (with pending) for the customer picker (Phase F). */
  customers: CustomerWithPending[];
  saving?: boolean;
  onConfirm: (details: CheckoutDetails) => void;
  onCancel: () => void;
}

const stateOptions = INDIAN_STATES.map(s => ({
  label: `${s.name} (${s.code})`,
  value: s.code,
}));

/**
 * Checkout confirmation (DUKAAN bottom-sheet styling). For a non-GST shop this
 * is the simple flow (optional customer name + phone). For a GST shop it adds:
 *   - a GST bill / Simple bill choice (per sale),
 *   - optional customer GSTIN + place of supply for a GST bill,
 *   - a live tax preview (CGST/SGST intra-state, IGST inter-state).
 *
 * Only presentation changed in B3 — the state, totals math and the
 * `CheckoutDetails` produced by `onConfirm` are unchanged.
 */
export function CheckoutModal({
  visible,
  items,
  gstEnabled,
  shopStateCode,
  customers,
  saving = false,
  onConfirm,
  onCancel,
}: Props): React.JSX.Element {
  // Chosen customer (Phase F). null = walk-in / none.
  const [customer, setCustomer] = useState<CustomerSelection | null>(null);
  // Default to a GST bill for a GST shop (they can switch to Simple per sale).
  const [billType, setBillType] = useState<BillType>(
    gstEnabled ? 'gst' : 'simple',
  );
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerStateCode, setCustomerStateCode] = useState<string | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [custPickerOpen, setCustPickerOpen] = useState(false);
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const [udhaarError, setUdhaarError] = useState<string | null>(null);
  // Bill-level adjustments (Phase G).
  const [discount, setDiscount] = useState<DiscountValue | null>(null);
  const [roundOff, setRoundOff] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setCustomer(null);
      setBillType(gstEnabled ? 'gst' : 'simple');
      setCustomerGstin('');
      setCustomerStateCode(null);
      setPickerOpen(false);
      setCustPickerOpen(false);
      setPaySheetOpen(false);
      setUdhaarError(null);
      setDiscount(null);
      setRoundOff(false);
      setDiscountOpen(false);
    }
  }, [visible, gstEnabled]);

  // Live totals, recomputed as the bill type / state / adjustments change.
  const isGstBill = gstEnabled && billType === 'gst';
  const totals = useMemo(
    () =>
      calculateBillTotals(items, shopStateCode, customerStateCode, isGstBill, {
        discountType: discount?.type,
        discountValue: discount?.value,
        roundOff,
      }),
    [items, shopStateCode, customerStateCode, isGstBill, discount, roundOff],
  );

  const selectedStateLabel =
    customerStateCode != null
      ? stateOptions.find(o => o.value === customerStateCode)?.label ?? null
      : null;

  const confirmWith = (
    paymentStatus: PaymentStatus,
    paymentMode: PaymentMode | null,
  ) => {
    onConfirm({
      customerName: customer?.name ?? '',
      customerPhone: customer?.phone ?? '',
      customerId: customer?.id ?? null,
      billType: isGstBill ? 'gst' : 'simple',
      customerGstin: isGstBill ? customerGstin : '',
      customerStateCode: isGstBill ? customerStateCode : null,
      paymentStatus,
      paymentMode,
      discountType: discount?.type,
      discountValue: discount?.value,
      roundOff,
    });
  };

  // "Received payment" → pick a mode → save as paid.
  const handleReceived = (mode: PaymentMode) => {
    setPaySheetOpen(false);
    confirmWith('paid', mode);
  };

  // "Udhaar" → save as unpaid. Needs a customer (with a phone) to owe it.
  const handleUdhaar = () => {
    if (!customer || customer.phone.trim().length < 10) {
      setUdhaarError('Udhaar ke liye customer (number ke saath) chunein.');
      setCustPickerOpen(true);
      return;
    }
    confirmWith('unpaid', null);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <Pressable style={styles.scrim} onPress={onCancel}>
            {/* Stop touches inside the sheet from closing it. */}
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.handle} />
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.titleRow}>
                  <AppText variant="h2">Checkout</AppText>
                  {gstEnabled ? (
                    <Badge variant={isGstBill ? 'gst' : 'simple'}>
                      {isGstBill ? 'GST' : 'Simple'}
                    </Badge>
                  ) : null}
                </View>

                {/* Bill type choice — only for a GST-registered shop. */}
                {gstEnabled ? (
                  <Segmented<BillType>
                    style={styles.block}
                    value={billType}
                    onChange={setBillType}
                    options={[
                      {label: 'GST bill', value: 'gst'},
                      {label: 'Simple bill', value: 'simple'},
                    ]}
                  />
                ) : null}

                {/* Adjustments (Phase G): bill-level discount + round-off. */}
                <AppText variant="overline" color={DukaanColors.textMuted} style={styles.adjLabel}>
                  ADJUSTMENTS
                </AppText>
                <Pressable
                  style={styles.adjustRow}
                  onPress={() => setDiscountOpen(true)}>
                  <Icon name="tag" size={18} color={DukaanColors.primary} />
                  <View style={styles.adjustInfo}>
                    <AppText variant="body" weight="700">
                      Discount
                    </AppText>
                    {discount ? (
                      <AppText variant="bodySm" color={DukaanColors.textMuted}>
                        {discount.type === 'percent'
                          ? `${discount.value}% off`
                          : `${formatPrice(discount.value)} off`}
                      </AppText>
                    ) : null}
                  </View>
                  <AppText variant="label" color={DukaanColors.primary} numeric>
                    {totals.discount > 0 ? `− ${formatPrice(totals.discount)}` : 'Add'}
                  </AppText>
                </Pressable>
                <View style={[styles.adjustRow, styles.block]}>
                  <Icon name="receipt" size={18} color={DukaanColors.primary} strokeWidth={2.2} />
                  <View style={styles.adjustInfo}>
                    <AppText variant="body" weight="700">
                      Round off
                    </AppText>
                    <AppText variant="bodySm" color={DukaanColors.textMuted}>
                      Nearest rupee
                    </AppText>
                  </View>
                  <Toggle value={roundOff} onValueChange={setRoundOff} />
                </View>

                {/* Totals / GST preview. */}
                <View
                  style={[
                    styles.totalBox,
                    isGstBill ? styles.totalBoxGst : styles.totalBoxSimple,
                  ]}>
                  {isGstBill ? (
                    <>
                      <PreviewLine
                        label="Taxable value"
                        value={formatPrice(totals.subtotal)}
                      />
                      {totals.isInterState ? (
                        <PreviewLine label="IGST" value={formatPrice(totals.igst)} />
                      ) : (
                        <>
                          <PreviewLine label="CGST" value={formatPrice(totals.cgst)} />
                          <PreviewLine label="SGST" value={formatPrice(totals.sgst)} />
                        </>
                      )}
                    </>
                  ) : totals.discount > 0 || totals.roundOff !== 0 ? (
                    <PreviewLine label="Subtotal" value={formatPrice(totals.subtotal)} />
                  ) : null}

                  {totals.discount > 0 ? (
                    <PreviewLine
                      label="Discount"
                      value={`− ${formatPrice(totals.discount)}`}
                    />
                  ) : null}
                  {totals.roundOff !== 0 ? (
                    <PreviewLine
                      label="Round off"
                      value={`${totals.roundOff > 0 ? '+' : '−'} ${formatPrice(
                        Math.abs(totals.roundOff),
                      )}`}
                    />
                  ) : null}

                  <View style={styles.grandLine}>
                    <AppText variant="body" color={DukaanColors.textMuted}>
                      Total payable
                    </AppText>
                    <AppText variant="h2" numeric>
                      {formatPrice(totals.total)}
                    </AppText>
                  </View>
                </View>

                {/* Customer (Phase F): optional for a cash sale, required for
                    udhaar. Saved customers remember their number. */}
                <Field label="Customer (optional)" style={styles.block}>
                  {customer ? (
                    <Pressable
                      style={styles.customerRow}
                      onPress={() => setCustPickerOpen(true)}>
                      <View style={styles.customerInfo}>
                        <AppText variant="body" weight="700" numberOfLines={1}>
                          {customer.name}
                        </AppText>
                        {customer.phone ? (
                          <AppText variant="bodySm" color={DukaanColors.textMuted}>
                            {customer.phone}
                          </AppText>
                        ) : null}
                      </View>
                      <AppText variant="cap" color={DukaanColors.primary}>
                        Change
                      </AppText>
                    </Pressable>
                  ) : (
                    <Button
                      title="Add customer"
                      variant="outline"
                      left={<Icon name="plus" size={16} color={DukaanColors.primary} strokeWidth={2.4} />}
                      block
                      onPress={() => setCustPickerOpen(true)}
                    />
                  )}
                </Field>

                {/* GST-only customer fields. Both optional: leave blank for a
                    B2C intra-state sale (place of supply = shop's state). */}
                {isGstBill ? (
                  <>
                    <Field label="Customer GSTIN (optional)" style={styles.block}>
                      <Input
                        value={customerGstin}
                        onChangeText={t => setCustomerGstin(t.toUpperCase())}
                        placeholder="15-character GSTIN"
                        autoCapitalize="characters"
                        maxLength={15}
                      />
                    </Field>

                    <Field label="Place of supply (optional)" style={styles.block}>
                      <Select
                        value={selectedStateLabel}
                        placeholder="Same as shop state"
                        onPress={() => setPickerOpen(true)}
                      />
                    </Field>
                  </>
                ) : null}

                {udhaarError ? (
                  <AppText variant="cap" color={DukaanColors.danger} style={styles.block}>
                    {udhaarError}
                  </AppText>
                ) : null}

                {/* Payment (Phase F): mark as udhaar, or receive payment now. */}
                <View style={styles.actions}>
                  <Button
                    title="Udhaar"
                    variant="outline"
                    left={<Icon name="receipt" size={16} color={DukaanColors.primary} strokeWidth={2.2} />}
                    onPress={handleUdhaar}
                    loading={saving}
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Received payment"
                    onPress={() => setPaySheetOpen(true)}
                    loading={saving}
                    style={styles.actionBtn}
                  />
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <StatePicker
        visible={pickerOpen}
        selected={customerStateCode}
        onSelect={code => {
          setCustomerStateCode(code);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />

      <CustomerPickSheet
        visible={custPickerOpen}
        customers={customers}
        onPick={sel => {
          setCustomer(sel);
          setUdhaarError(null);
          setCustPickerOpen(false);
        }}
        onClose={() => setCustPickerOpen(false)}
      />

      <PaymentSheet
        visible={paySheetOpen}
        total={totals.total}
        onSelect={handleReceived}
        onClose={() => setPaySheetOpen(false)}
      />

      <DiscountSheet
        visible={discountOpen}
        payable={totals.subtotal + totals.taxTotal}
        current={discount}
        onApply={d => {
          setDiscount(d);
          setDiscountOpen(false);
        }}
        onRemove={() => {
          setDiscount(null);
          setDiscountOpen(false);
        }}
        onClose={() => setDiscountOpen(false)}
      />
    </>
  );
}

/** One label/value line in the GST preview. */
function PreviewLine({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View style={styles.previewLine}>
      <AppText variant="bodySm" color={DukaanColors.textMuted}>
        {label}
      </AppText>
      <AppText variant="bodySm" weight="700" numeric>
        {value}
      </AppText>
    </View>
  );
}

/** Bottom-sheet list to pick the place of supply (or "same as shop state"). */
function StatePicker({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string | null;
  onSelect: (code: string | null) => void;
  onClose: () => void;
}): React.JSX.Element {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? stateOptions.filter(o => o.label.toLowerCase().includes(q))
      : stateOptions;
  }, [query]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="h3" style={styles.block}>
        Place of supply
      </AppText>
      <Input
        placeholder="Search state"
        value={query}
        onChangeText={setQuery}
        containerStyle={styles.block}
      />
      <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
        <Row
          title="Same as shop state"
          onPress={() => onSelect(null)}
          right={selected == null ? <Tick /> : undefined}
          divider
        />
        {filtered.map(o => (
          <Row
            key={o.value}
            title={o.label}
            onPress={() => onSelect(o.value)}
            right={selected === o.value ? <Tick /> : undefined}
            divider
          />
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

function Tick(): React.JSX.Element {
  return <Icon name="check" size={18} color={DukaanColors.primary} strokeWidth={2.4} />;
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: DukaanColors.surface,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 26,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: Palette.slate[200],
    alignSelf: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space.md,
  },
  block: {marginBottom: Space.md},
  totalBox: {
    borderRadius: Radii.md,
    padding: Space.lg,
    marginBottom: Space.md,
  },
  totalBoxGst: {backgroundColor: Palette.indigo[50]},
  totalBoxSimple: {backgroundColor: Palette.slate[50]},
  previewLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  actions: {flexDirection: 'row', marginTop: Space.sm, gap: Space.md},
  actionBtn: {flex: 1},
  pickerList: {maxHeight: 360},
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    borderWidth: 1.5,
    borderColor: DukaanColors.hairline,
    borderRadius: Radii.md,
    paddingVertical: Space.md,
    paddingHorizontal: Space.md,
  },
  customerInfo: {flex: 1, gap: 2},
  adjLabel: {marginBottom: Space.sm},
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: Space.sm,
  },
  adjustInfo: {flex: 1, gap: 1},
});
