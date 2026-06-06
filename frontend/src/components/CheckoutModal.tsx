import React, {useEffect, useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Colors, FontSize, Radius, Spacing} from '../constants/theme';
import {INDIAN_STATES} from '../constants/states';
import {type BillType} from '../constants/gst';
import {calculateBillTotals} from '../services/GstService';
import {formatPrice} from '../utils/format';
import {PrimaryButton} from './PrimaryButton';
import {SelectField} from './SelectField';
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
 * Checkout confirmation. For a non-GST shop this is the original simple flow
 * (optional customer name + phone). For a GST shop it adds:
 *   - a GST bill / Simple bill choice (per sale),
 *   - optional customer GSTIN + state for a GST bill,
 *   - a live tax preview (CGST/SGST intra-state, IGST inter-state).
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

  useEffect(() => {
    if (visible) {
      setName('');
      setPhone('');
      setBillType(gstEnabled ? 'gst' : 'simple');
      setCustomerGstin('');
      setCustomerStateCode(null);
    }
  }, [visible, gstEnabled]);

  // Live totals, recomputed as the bill type / customer state changes.
  const isGstBill = gstEnabled && billType === 'gst';
  const totals = useMemo(
    () =>
      calculateBillTotals(items, shopStateCode, customerStateCode, isGstBill),
    [items, shopStateCode, customerStateCode, isGstBill],
  );

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Checkout</Text>

            {/* Bill type choice — only for a GST-registered shop. */}
            {gstEnabled ? (
              <View style={styles.segment}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    billType === 'gst' && styles.segmentActive,
                  ]}
                  onPress={() => setBillType('gst')}>
                  <Text
                    style={[
                      styles.segmentText,
                      billType === 'gst' && styles.segmentTextActive,
                    ]}>
                    GST bill
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    billType === 'simple' && styles.segmentActive,
                  ]}
                  onPress={() => setBillType('simple')}>
                  <Text
                    style={[
                      styles.segmentText,
                      billType === 'simple' && styles.segmentTextActive,
                    ]}>
                    Simple bill
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Totals / GST preview. */}
            <View style={styles.totalBox}>
              {isGstBill ? (
                <>
                  <View style={styles.previewLine}>
                    <Text style={styles.previewLabel}>Taxable value</Text>
                    <Text style={styles.previewVal}>
                      {formatPrice(totals.subtotal)}
                    </Text>
                  </View>
                  {totals.isInterState ? (
                    <View style={styles.previewLine}>
                      <Text style={styles.previewLabel}>IGST</Text>
                      <Text style={styles.previewVal}>
                        {formatPrice(totals.igst)}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.previewLine}>
                        <Text style={styles.previewLabel}>CGST</Text>
                        <Text style={styles.previewVal}>
                          {formatPrice(totals.cgst)}
                        </Text>
                      </View>
                      <View style={styles.previewLine}>
                        <Text style={styles.previewLabel}>SGST</Text>
                        <Text style={styles.previewVal}>
                          {formatPrice(totals.sgst)}
                        </Text>
                      </View>
                    </>
                  )}
                  <View style={[styles.previewLine, styles.grandPreview]}>
                    <Text style={styles.totalLabel}>Total payable</Text>
                    <Text style={styles.totalValue}>
                      {formatPrice(totals.total)}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.previewLine}>
                  <Text style={styles.totalLabel}>Total payable</Text>
                  <Text style={styles.totalValue}>
                    {formatPrice(totals.total)}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.fieldLabel}>Customer name (optional)</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Ramesh"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Phone (optional)</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 98765 43210"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              style={styles.input}
            />

            {/* GST-only customer fields. Both optional: leave blank for a B2C
                intra-state sale (place of supply defaults to the shop's state). */}
            {isGstBill ? (
              <>
                <Text style={styles.fieldLabel}>
                  Customer GSTIN (optional)
                </Text>
                <TextInput
                  value={customerGstin}
                  onChangeText={t => setCustomerGstin(t.toUpperCase())}
                  placeholder="15-character GSTIN"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                  maxLength={15}
                  style={styles.input}
                />

                <SelectField
                  label="Place of supply (optional)"
                  placeholder="Same as shop state"
                  value={customerStateCode}
                  options={stateOptions}
                  onSelect={setCustomerStateCode}
                />
              </>
            ) : null}

            <View style={styles.actions}>
              <PrimaryButton
                label="Back"
                variant="ghost"
                onPress={onCancel}
                style={styles.actionBtn}
              />
              <PrimaryButton
                label="Save bill"
                onPress={handleConfirm}
                loading={saving}
                style={styles.actionBtn}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    maxHeight: '88%',
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  segmentActive: {backgroundColor: Colors.primary},
  segmentText: {color: Colors.textMuted, fontSize: FontSize.md, fontWeight: '700'},
  segmentTextActive: {color: Colors.text},
  totalBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  previewLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  previewLabel: {color: Colors.textMuted, fontSize: FontSize.sm},
  previewVal: {color: Colors.text, fontSize: FontSize.sm, fontWeight: '700'},
  grandPreview: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  totalLabel: {color: Colors.textMuted, fontSize: FontSize.md},
  totalValue: {color: Colors.success, fontSize: FontSize.xl, fontWeight: '900'},
  fieldLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.md,
  },
  actions: {flexDirection: 'row', marginTop: Spacing.lg, gap: Spacing.md},
  actionBtn: {flex: 1},
});
