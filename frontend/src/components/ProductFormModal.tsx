import React, {useEffect, useState} from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {Colors, FontSize, Radius, Spacing} from '../constants/theme';
import {GST_RATE_OPTIONS} from '../constants/gst';
import {validateProductForm} from '../utils/validation';
import {PrimaryButton} from './PrimaryButton';
import {SelectField} from './SelectField';

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
 * Shared form modal for creating AND editing a product.
 * Validates name (required) and price (numeric, >= 0) before submitting.
 * For a GST shop it also captures the product's GST rate and optional HSN code.
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
      onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          {barcode ? (
            <View style={styles.barcodeBox}>
              <Text style={styles.barcodeLabel}>Barcode</Text>
              <Text style={styles.barcodeValue}>{barcode}</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Product name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Parle-G Biscuit"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            autoFocus
          />
          {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}

          <Text style={styles.fieldLabel}>Price ({/* ₹ */ '₹'})</Text>
          <TextInput
            value={priceText}
            onChangeText={setPriceText}
            placeholder="e.g. 10"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          {errors.price ? (
            <Text style={styles.error}>{errors.price}</Text>
          ) : null}

          {/* GST fields only for a GST-registered shop — keeps the common
              non-GST flow to just name + price. */}
          {showGst ? (
            <>
              <SelectField
                label="GST rate"
                value={String(gstRate)}
                options={GST_RATE_OPTIONS}
                onSelect={v => setGstRate(Number(v))}
                error={errors.gstRate}
              />

              <Text style={styles.fieldLabel}>HSN code (optional)</Text>
              <TextInput
                value={hsnCode}
                onChangeText={setHsnCode}
                placeholder="e.g. 1905"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />
            </>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              label="Cancel"
              variant="ghost"
              onPress={onCancel}
              style={styles.actionBtn}
            />
            <PrimaryButton
              label={submitLabel}
              onPress={handleSave}
              loading={saving}
              style={styles.actionBtn}
            />
          </View>
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
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  barcodeBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  barcodeLabel: {color: Colors.textMuted, fontSize: FontSize.sm},
  barcodeValue: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
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
  error: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  actionBtn: {flex: 1},
});
