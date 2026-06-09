/**
 * LineItemModal (Phase C3/C4) — add a no-barcode line to the cart.
 *
 * One modal for two kinds:
 *  - 'manual'  : no-barcode goods (HSN code, reuse from `manual_items`).
 *  - 'service' : a service/labour line (SAC code, quick-pick from `services`).
 *
 * Shows a "reuse" list of previously-saved entries (tap to prefill), plus the
 * name / price / GST fields. Submitting returns the typed values; the caller
 * adds the line to the cart AND saves it for reuse. Validation matches the
 * product form (name required, price numeric ≥ 0).
 */
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
import {GST_RATE_OPTIONS} from '../constants/gst';
import {DEFAULT_UNIT, UNIT_OPTIONS, unitLabel} from '../constants/units';
import {validateProductForm} from '../utils/validation';
import {formatPrice} from '../utils/format';
import {AppText, Button, Chip, Field, Icon, Input} from './ui';

export interface LineItemSubmit {
  name: string;
  price: number;
  gstRate: number;
  /** HSN (manual) or SAC (service) code. */
  code: string | null;
  /** Selling unit for manual goods; services ignore it. */
  unit?: string;
}

/** A previously-saved entry offered for reuse. */
export interface ReuseEntry {
  id: number;
  name: string;
  price: number;
  gstRate: number;
  code: string | null;
  unit?: string;
}

interface Props {
  visible: boolean;
  kind: 'manual' | 'service';
  /** Show GST rate + code fields (GST-registered shop). */
  showGst?: boolean;
  /** Saved entries to reuse (manual items or services). */
  reuse: ReuseEntry[];
  onSubmit: (values: LineItemSubmit) => void;
  onCancel: () => void;
}

const COPY = {
  manual: {
    title: 'Add manual item',
    nameLabel: 'Item name',
    namePlaceholder: 'e.g. Loose rice (1kg)',
    codeLabel: 'HSN code (optional)',
    codePlaceholder: 'e.g. 1006',
    reuseLabel: 'RECENT ITEMS',
  },
  service: {
    title: 'Add service',
    nameLabel: 'Service / description',
    namePlaceholder: 'e.g. Mobile screen repair',
    codeLabel: 'SAC code (optional)',
    codePlaceholder: 'e.g. 998713',
    reuseLabel: 'SAVED SERVICES',
  },
} as const;

export function LineItemModal({
  visible,
  kind,
  showGst = false,
  reuse,
  onSubmit,
  onCancel,
}: Props): React.JSX.Element {
  const copy = COPY[kind];
  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [gstRate, setGstRate] = useState(0);
  const [code, setCode] = useState('');
  const [unit, setUnit] = useState<string>(DEFAULT_UNIT);
  const [query, setQuery] = useState('');
  const [errors, setErrors] = useState<{name?: string; price?: string}>({});

  // Fresh fields each time the modal opens.
  useEffect(() => {
    if (visible) {
      setName('');
      setPriceText('');
      setGstRate(0);
      setCode('');
      setUnit(DEFAULT_UNIT);
      setQuery('');
      setErrors({});
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? reuse.filter(r => r.name.toLowerCase().includes(q)) : reuse;
    return list.slice(0, 8);
  }, [reuse, query]);

  const prefill = (r: ReuseEntry) => {
    setName(r.name);
    setPriceText(String(r.price));
    setGstRate(r.gstRate);
    setCode(r.code ?? '');
    setUnit(r.unit || DEFAULT_UNIT);
    setErrors({});
  };

  const handleSave = () => {
    const result = validateProductForm({
      name,
      priceText,
      gstRate: showGst ? gstRate : undefined,
    });
    if (!result.valid) {
      setErrors({name: result.errors.name, price: result.errors.price});
      return;
    }
    onSubmit({
      name: name.trim(),
      price: result.price,
      gstRate: showGst ? gstRate : 0,
      code: showGst ? code.trim() || null : null,
      unit: kind === 'manual' ? unit : undefined,
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
              {copy.title}
            </AppText>

            {/* Reuse list */}
            {reuse.length > 0 ? (
              <View style={styles.reuseBox}>
                <AppText variant="overline" color={DukaanColors.textMuted}>
                  {copy.reuseLabel}
                </AppText>
                {reuse.length > 6 ? (
                  <Input
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search"
                    prefix={<Icon name="search" size={18} color={DukaanColors.textFaint} />}
                    containerStyle={styles.reuseSearch}
                  />
                ) : null}
                <View style={styles.reuseList}>
                  {filtered.map(r => (
                    <Pressable
                      key={r.id}
                      onPress={() => prefill(r)}
                      style={({pressed}) => [
                        styles.reuseRow,
                        pressed && styles.reuseRowPressed,
                      ]}>
                      <AppText variant="bodySm" numberOfLines={1} style={styles.reuseName}>
                        {r.name}
                      </AppText>
                      <AppText variant="bodySm" color={DukaanColors.textMuted} numeric>
                        {kind === 'manual'
                          ? `${formatPrice(r.price)}/${unitLabel(r.unit)}`
                          : formatPrice(r.price)}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <Field label={copy.nameLabel} style={styles.block}>
              <Input
                value={name}
                onChangeText={setName}
                placeholder={copy.namePlaceholder}
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
                placeholder="e.g. 250"
                keyboardType="decimal-pad"
                prefix="₹"
              />
            </Field>
            {errors.price ? (
              <AppText variant="cap" color={DukaanColors.danger} style={styles.error}>
                {errors.price}
              </AppText>
            ) : null}

            {kind === 'manual' ? (
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
            ) : null}

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

                <Field label={copy.codeLabel} style={styles.block}>
                  <Input
                    value={code}
                    onChangeText={setCode}
                    placeholder={copy.codePlaceholder}
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
                title="Add to cart"
                onPress={handleSave}
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
  reuseBox: {
    backgroundColor: Palette.slate[50],
    borderRadius: Radii.md,
    padding: Space.md,
    marginBottom: Space.md,
    gap: Space.sm,
  },
  reuseSearch: {backgroundColor: DukaanColors.surface},
  reuseList: {gap: Space.xs},
  reuseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.sm,
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
  },
  reuseRowPressed: {backgroundColor: Palette.orange[50]},
  reuseName: {flex: 1},
  block: {marginBottom: Space.md},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm},
  error: {marginTop: -Space.sm, marginBottom: Space.md},
  actions: {flexDirection: 'row', marginTop: Space.sm, gap: Space.md},
  actionBtn: {flex: 1},
});
