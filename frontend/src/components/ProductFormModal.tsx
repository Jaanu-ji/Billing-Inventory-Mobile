import React, {useEffect, useState} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';
import {GST_RATE_OPTIONS} from '../constants/gst';
import {validateProductForm} from '../utils/validation';
import {AppText, Button, Chip, Field, Input} from './ui';

export interface ProductFormSubmit {
  name: string;
  price: number;
  gstRate: number;
  hsnCode: string | null;
}

interface Props {
  visible: boolean;
  title: string;
  /** Shown read-only when creating from a scanned barcode. */
  barcode?: string;
  initialName?: string;
  initialPrice?: number;
  initialGstRate?: number;
  initialHsnCode?: string | null;
  /** Show the GST rate + HSN fields. Only true for a GST-registered shop. */
  showGst?: boolean;
  submitLabel?: string;
  saving?: boolean;
  onSubmit: (values: ProductFormSubmit) => void;
  onCancel: () => void;
}

/**
 * Shared form modal for creating AND editing a product (DUKAAN styling).
 * Validates name (required) and price (numeric, >= 0) before submitting.
 * For a GST shop it also captures the product's GST rate (chips) and optional
 * HSN code. B4 changed presentation only — validation + the `ProductFormSubmit`
 * payload are unchanged.
 */
export function ProductFormModal({
  visible,
  title,
  barcode,
  initialName = '',
  initialPrice,
  initialGstRate = 0,
  initialHsnCode = null,
  showGst = false,
  submitLabel = 'Save',
  saving = false,
  onSubmit,
  onCancel,
}: Props): React.JSX.Element {
  const [name, setName] = useState(initialName);
  const [priceText, setPriceText] = useState(
    initialPrice !== undefined ? String(initialPrice) : '',
  );
  const [gstRate, setGstRate] = useState(initialGstRate);
  const [hsnCode, setHsnCode] = useState(initialHsnCode ?? '');
  const [errors, setErrors] = useState<{
    name?: string;
    price?: string;
    gstRate?: string;
  }>({});

  // Reset fields whenever the modal is (re)opened with new data.
  useEffect(() => {
    if (visible) {
      setName(initialName);
      setPriceText(initialPrice !== undefined ? String(initialPrice) : '');
      setGstRate(initialGstRate);
      setHsnCode(initialHsnCode ?? '');
      setErrors({});
    }
  }, [visible, initialName, initialPrice, initialGstRate, initialHsnCode]);

  const handleSave = () => {
    const result = validateProductForm({
      name,
      priceText,
      gstRate: showGst ? gstRate : undefined,
    });
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    onSubmit({
      name: name.trim(),
      price: result.price,
      // A non-GST shop never sees these fields; store harmless defaults.
      gstRate: showGst ? gstRate : 0,
      hsnCode: showGst ? hsnCode.trim() || null : null,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <AppText variant="h2" style={styles.title}>
              {title}
            </AppText>

            {barcode ? (
              <View style={styles.barcodeBox}>
                <AppText variant="cap" color={DukaanColors.textMuted}>
                  BARCODE
                </AppText>
                <AppText variant="body" weight="700" numeric>
                  {barcode}
                </AppText>
              </View>
            ) : null}

            <Field label="Product name" style={styles.block}>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="e.g. Parle-G Biscuit"
                autoFocus
              />
            </Field>
            {errors.name ? (
              <AppText variant="cap" color={DukaanColors.danger} style={styles.error}>
                {errors.name}
              </AppText>
            ) : null}

            <Field label="Price" style={styles.block}>
              <Input
                value={priceText}
                onChangeText={setPriceText}
                placeholder="e.g. 10"
                keyboardType="decimal-pad"
                prefix="₹"
              />
            </Field>
            {errors.price ? (
              <AppText variant="cap" color={DukaanColors.danger} style={styles.error}>
                {errors.price}
              </AppText>
            ) : null}

            {/* GST fields only for a GST-registered shop — keeps the common
                non-GST flow to just name + price. */}
            {showGst ? (
              <>
                <Field label="GST rate" style={styles.block}>
                  <View style={styles.chips}>
                    {GST_RATE_OPTIONS.map(o => (
                      <Chip
                        key={o.value}
                        label={o.label}
                        variant="primary"
                        active={String(gstRate) === o.value}
                        onPress={() => setGstRate(Number(o.value))}
                      />
                    ))}
                  </View>
                </Field>
                {errors.gstRate ? (
                  <AppText
                    variant="cap"
                    color={DukaanColors.danger}
                    style={styles.error}>
                    {errors.gstRate}
                  </AppText>
                ) : null}

                <Field label="HSN code (optional)" style={styles.block}>
                  <Input
                    value={hsnCode}
                    onChangeText={setHsnCode}
                    placeholder="e.g. 1905"
                  />
                </Field>
              </>
            ) : null}

            <View style={styles.actions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={onCancel}
                style={styles.actionBtn}
              />
              <Button
                title={submitLabel}
                onPress={handleSave}
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
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: Space.lg,
  },
  card: {
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.xl,
    padding: 24,
    maxHeight: '88%',
  },
  title: {marginBottom: Space.md},
  barcodeBox: {
    backgroundColor: Palette.slate[50],
    borderRadius: Radii.xs,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    marginBottom: Space.md,
    gap: 2,
  },
  block: {marginBottom: Space.md},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm},
  error: {marginTop: -Space.sm, marginBottom: Space.md},
  actions: {flexDirection: 'row', marginTop: Space.sm, gap: Space.md},
  actionBtn: {flex: 1},
});
