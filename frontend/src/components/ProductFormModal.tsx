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
import {DEFAULT_UNIT, UNIT_OPTIONS} from '../constants/units';
import {
  attributeFieldsFor,
  attributeSectionLabel,
} from '../constants/productFields';
import {shopTypeLabel} from '../constants/shopTypes';
import {validateProductForm} from '../utils/validation';
import {AppText, Button, Chip, Field, Icon, Input} from './ui';

export interface ProductFormSubmit {
  name: string;
  price: number;
  gstRate: number;
  hsnCode: string | null;
  unit: string;
  /** Free-text category/group (Phase H). */
  category: string | null;
  /** Business-adaptive extras (Phase H): batch/expiry, size/colour, … */
  attributes: Record<string, string>;
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
  initialUnit?: string;
  initialCategory?: string | null;
  initialAttributes?: Record<string, string>;
  /**
   * Shop type (Phase H) — drives which business-adaptive attribute fields show
   * (medical batch/expiry, garment size/colour). null/unknown => none.
   */
  shopType?: string | null;
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
  initialUnit = DEFAULT_UNIT,
  initialCategory = null,
  initialAttributes,
  shopType = null,
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
  const [unit, setUnit] = useState(initialUnit || DEFAULT_UNIT);
  const [category, setCategory] = useState(initialCategory ?? '');
  const [attrs, setAttrs] = useState<Record<string, string>>(
    initialAttributes ?? {},
  );
  const [errors, setErrors] = useState<{
    name?: string;
    price?: string;
    gstRate?: string;
  }>({});

  // Which business-adaptive fields this shop type wants (Phase H).
  const attrFields = attributeFieldsFor(shopType);
  const attrSection = attributeSectionLabel(shopType);

  // Reset fields whenever the modal is (re)opened with new data.
  useEffect(() => {
    if (visible) {
      setName(initialName);
      setPriceText(initialPrice !== undefined ? String(initialPrice) : '');
      setGstRate(initialGstRate);
      setHsnCode(initialHsnCode ?? '');
      setUnit(initialUnit || DEFAULT_UNIT);
      setCategory(initialCategory ?? '');
      setAttrs(initialAttributes ?? {});
      setErrors({});
    }
  }, [
    visible,
    initialName,
    initialPrice,
    initialGstRate,
    initialHsnCode,
    initialUnit,
    initialCategory,
    initialAttributes,
  ]);

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
      unit,
      category: category.trim() || null,
      // Only persist attributes relevant to this shop type (blanks dropped by
      // the repository's serialiser).
      attributes: attrFields.reduce<Record<string, string>>((acc, f) => {
        const v = attrs[f.key]?.trim();
        if (v) {
          acc[f.key] = v;
        }
        return acc;
      }, {}),
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
            <AppText variant="h2">{title}</AppText>
            {attrFields.length > 0 ? (
              <AppText variant="bodySm" color={DukaanColors.textMuted} style={styles.subtitle}>
                {shopTypeLabel(shopType)} · fields adapt to your shop
              </AppText>
            ) : (
              <View style={styles.title} />
            )}

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
                prefix={<Icon name="tag" size={18} color={DukaanColors.textFaint} />}
              />
            </Field>
            {errors.name ? (
              <AppText variant="cap" color={DukaanColors.danger} style={styles.error}>
                {errors.name}
              </AppText>
            ) : null}

            {/* Price + Category side by side (design 23). */}
            <View style={styles.row}>
              <Field label="Price" style={styles.col}>
                <Input
                  value={priceText}
                  onChangeText={setPriceText}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  prefix="₹"
                />
              </Field>
              <Field label="Category" style={styles.col}>
                <Input
                  value={category}
                  onChangeText={setCategory}
                  placeholder="e.g. Snacks"
                />
              </Field>
            </View>
            {errors.price ? (
              <AppText variant="cap" color={DukaanColors.danger} style={styles.error}>
                {errors.price}
              </AppText>
            ) : null}

            <Field label="Selling unit" style={styles.block}>
              <View style={styles.chips}>
                {UNIT_OPTIONS.map(o => (
                  <Chip
                    key={o.code}
                    label={o.label}
                    variant="primary"
                    active={unit === o.code}
                    onPress={() => setUnit(o.code)}
                  />
                ))}
              </View>
            </Field>

            {/* GST fields only for a GST-registered shop — keeps the common
                non-GST flow to just name + price. */}
            {showGst ? (
              <>
                <View style={styles.row}>
                  <Field label="GST rate" style={styles.colWide}>
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
                  <Field label="HSN" style={styles.colNarrow}>
                    <Input
                      value={hsnCode}
                      onChangeText={setHsnCode}
                      placeholder="0000"
                    />
                  </Field>
                </View>
                {errors.gstRate ? (
                  <AppText
                    variant="cap"
                    color={DukaanColors.danger}
                    style={styles.error}>
                    {errors.gstRate}
                  </AppText>
                ) : null}
              </>
            ) : null}

            {/* Business-adaptive fields (Phase H) in a tinted block — a medical
                shop captures batch/expiry, a garment shop size/colour. */}
            {attrFields.length > 0 ? (
              <View style={styles.tintBox}>
                {attrSection ? (
                  <AppText variant="overline" color={DukaanColors.teal} style={styles.section}>
                    {attrSection}
                  </AppText>
                ) : null}
                <View style={styles.row}>
                  {attrFields.map(f => (
                    <Field key={f.key} label={f.label} style={styles.col}>
                      <Input
                        value={attrs[f.key] ?? ''}
                        onChangeText={t => setAttrs(a => ({...a, [f.key]: t}))}
                        placeholder={f.placeholder}
                      />
                    </Field>
                  ))}
                </View>
              </View>
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
  subtitle: {marginTop: 2, marginBottom: Space.md},
  barcodeBox: {
    backgroundColor: Palette.slate[50],
    borderRadius: Radii.xs,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    marginBottom: Space.md,
    gap: 2,
  },
  block: {marginBottom: Space.md},
  row: {flexDirection: 'row', gap: Space.md, marginBottom: Space.md},
  col: {flex: 1},
  colWide: {flex: 1.6},
  colNarrow: {flex: 1},
  section: {marginBottom: Space.sm},
  tintBox: {
    backgroundColor: '#F0FDFA',
    borderRadius: Radii.md,
    padding: Space.md,
    marginBottom: Space.md,
  },
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm},
  error: {marginTop: -Space.sm, marginBottom: Space.md},
  actions: {flexDirection: 'row', marginTop: Space.sm, gap: Space.md},
  actionBtn: {flex: 1},
});
