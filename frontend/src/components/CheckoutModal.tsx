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
import {calculateBillTotals} from '../services/GstService';
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
  BottomSheet,
} from './ui';
import type {CartItem} from '../models/Bill';

export interface CheckoutDetails {
  customerName: string;
  customerPhone: string;
  /** 'simple' or 'gst'. Always 'simple' when the shop isn't GST-registered. */
  billType: BillType;
  /** Customer GSTIN for a B2B GST bill (optional). */
  customerGstin: string;
  /** Customer GST state code — decides intra vs inter-state (optional). */
  customerStateCode: string | null;
}

interface Props {
  visible: boolean;
  /** Cart lines — used for the live total and GST preview. */
  items: CartItem[];
  /** True if the shop bills GST: shows the bill-type choice + GST capture. */
  gstEnabled: boolean;
  /** Shop's own GST state code (place of supply default). */
  shopStateCode: string | null;
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
  saving = false,
  onConfirm,
  onCancel,
}: Props): React.JSX.Element {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  // Default to a GST bill for a GST shop (they can switch to Simple per sale).
  const [billType, setBillType] = useState<BillType>(
    gstEnabled ? 'gst' : 'simple',
  );
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerStateCode, setCustomerStateCode] = useState<string | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setPhone('');
      setBillType(gstEnabled ? 'gst' : 'simple');
      setCustomerGstin('');
      setCustomerStateCode(null);
      setPickerOpen(false);
    }
  }, [visible, gstEnabled]);

  // Live totals, recomputed as the bill type / customer state changes.
  const isGstBill = gstEnabled && billType === 'gst';
  const totals = useMemo(
    () =>
      calculateBillTotals(items, shopStateCode, customerStateCode, isGstBill),
    [items, shopStateCode, customerStateCode, isGstBill],
  );

  const selectedStateLabel =
    customerStateCode != null
      ? stateOptions.find(o => o.value === customerStateCode)?.label ?? null
      : null;

  const handleConfirm = () => {
    onConfirm({
      customerName: name,
      customerPhone: phone,
      billType: isGstBill ? 'gst' : 'simple',
      customerGstin: isGstBill ? customerGstin : '',
      customerStateCode: isGstBill ? customerStateCode : null,
    });
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
                        <PreviewLine
                          label="IGST"
                          value={formatPrice(totals.igst)}
                        />
                      ) : (
                        <>
                          <PreviewLine
                            label="CGST"
                            value={formatPrice(totals.cgst)}
                          />
                          <PreviewLine
                            label="SGST"
                            value={formatPrice(totals.sgst)}
                          />
                        </>
                      )}
                      <View style={styles.grandLine}>
                        <AppText variant="body" color={DukaanColors.textMuted}>
                          Total payable
                        </AppText>
                        <AppText variant="h2" numeric>
                          {formatPrice(totals.total)}
                        </AppText>
                      </View>
                    </>
                  ) : (
                    <View style={styles.previewLine}>
                      <AppText variant="body" color={DukaanColors.textMuted}>
                        Total payable
                      </AppText>
                      <AppText variant="h2" numeric>
                        {formatPrice(totals.total)}
                      </AppText>
                    </View>
                  )}
                </View>

                <Field label="Customer name (optional)" style={styles.block}>
                  <Input
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Ramesh"
                  />
                </Field>

                <Field label="Phone (optional)" style={styles.block}>
                  <Input
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. 98765 43210"
                    keyboardType="phone-pad"
                  />
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

                <View style={styles.actions}>
                  <Button
                    title="Back"
                    variant="outline"
                    onPress={onCancel}
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Save bill"
                    onPress={handleConfirm}
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
  return (
    <AppText weight="800" color={DukaanColors.primary}>
      ✓
    </AppText>
  );
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
});
