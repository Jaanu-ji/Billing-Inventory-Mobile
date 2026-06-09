import React, {useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {DukaanColors, Radii, Space} from '../constants/theme';
import {SHOP_TYPES} from '../constants/shopTypes';
import {INDIAN_STATES} from '../constants/states';
import {
  BUSINESS_MODES,
  DEFAULT_BUSINESS_MODE,
  type BusinessMode,
} from '../constants/businessModes';
import {DEFAULT_UNIT, UNIT_OPTIONS} from '../constants/units';
import {validateProfileForm, type ProfileErrors} from '../utils/validation';
import {SelectField} from './SelectField';
import {AppText, Button, Chip, Field, Input, Segmented, Textarea, Toggle} from './ui';
import type {ShopProfile, ShopProfileInput} from '../models/ShopProfile';

interface Props {
  /** Existing profile when editing from Settings; undefined on first setup. */
  initial?: ShopProfile | null;
  submitLabel: string;
  saving?: boolean;
  onSubmit: (input: ShopProfileInput) => void;
  /** Optional content rendered above the form (e.g. a Settings summary card). */
  header?: React.ReactNode;
}

/** Shared shop setup / settings form (one form, two screens). DUKAAN styling. */
export function ProfileForm({
  initial,
  submitLabel,
  saving = false,
  onSubmit,
  header,
}: Props): React.JSX.Element {
  const [shopType, setShopType] = useState<string | null>(
    initial?.shopType ?? null,
  );
  const [shopName, setShopName] = useState(initial?.shopName ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [gstEnabled, setGstEnabled] = useState(initial?.gstEnabled ?? false);
  const [gstin, setGstin] = useState(initial?.gstin ?? '');
  const [stateCode, setStateCode] = useState<string | null>(
    initial?.stateCode ?? null,
  );
  const [businessMode, setBusinessMode] = useState<BusinessMode>(
    initial?.businessMode ?? DEFAULT_BUSINESS_MODE,
  );
  const [defaultUnit, setDefaultUnit] = useState<string>(
    initial?.defaultUnit ?? DEFAULT_UNIT,
  );
  const [errors, setErrors] = useState<ProfileErrors>({});

  // The default unit only applies to goods — a pure-service shop has no stock.
  const showDefaultUnit = businessMode !== 'service';

  const shopTypeOptions = SHOP_TYPES.map(t => ({label: t.label, value: t.id}));
  const businessModeOptions = BUSINESS_MODES.map(m => ({
    label: m.label,
    value: m.id,
  }));
  const stateOptions = INDIAN_STATES.map(s => ({
    label: `${s.name} (${s.code})`,
    value: s.code,
  }));

  const handleSubmit = () => {
    const result = validateProfileForm({
      shopType: shopType ?? '',
      shopName,
      phone,
      gstEnabled,
      gstin,
      stateCode: stateCode ?? '',
    });
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    const stateInfo = INDIAN_STATES.find(s => s.code === stateCode) ?? null;
    onSubmit({
      shopType: shopType!,
      shopName,
      phone,
      address,
      gstEnabled,
      gstin: gstEnabled ? gstin : null,
      state: gstEnabled ? stateInfo?.name ?? null : null,
      stateCode: gstEnabled ? stateCode : null,
      businessMode,
      defaultUnit: showDefaultUnit ? defaultUnit : null,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {header}
      <Field label="What do you sell?">
        <Segmented<BusinessMode>
          options={businessModeOptions}
          value={businessMode}
          onChange={setBusinessMode}
        />
      </Field>

      <SelectField
        label="Shop type"
        placeholder="Select your shop type"
        value={shopType}
        options={shopTypeOptions}
        onSelect={setShopType}
        error={errors.shopType}
      />

      {showDefaultUnit ? (
        <Field label="Default selling unit" style={styles.block}>
          <View style={styles.chips}>
            {UNIT_OPTIONS.map(o => (
              <Chip
                key={o.code}
                label={o.label}
                variant="primary"
                active={defaultUnit === o.code}
                onPress={() => setDefaultUnit(o.code)}
              />
            ))}
          </View>
        </Field>
      ) : null}

      <Field label="Shop name" style={styles.block}>
        <Input
          value={shopName}
          onChangeText={setShopName}
          placeholder="e.g. Sharma General Store"
        />
      </Field>
      {errors.shopName ? <ErrorText text={errors.shopName} /> : null}

      <Field label="Phone number" style={styles.block}>
        <Input
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. 98765 43210"
          keyboardType="phone-pad"
        />
      </Field>
      {errors.phone ? <ErrorText text={errors.phone} /> : null}

      <Field label="Address (optional)" style={styles.block}>
        <Textarea
          value={address ?? ''}
          onChangeText={setAddress}
          placeholder="Shop address"
        />
      </Field>

      <View style={styles.gstRow}>
        <View style={styles.gstText}>
          <AppText variant="body" weight="700">
            GST-registered shop?
          </AppText>
          <AppText variant="bodySm" color={DukaanColors.textMuted}>
            Turn on if you bill with GST. You can change this later.
          </AppText>
        </View>
        <Toggle value={gstEnabled} onValueChange={setGstEnabled} />
      </View>

      {gstEnabled ? (
        <View>
          <Field label="GSTIN" style={styles.block}>
            <Input
              value={gstin ?? ''}
              onChangeText={t => setGstin(t.toUpperCase())}
              placeholder="15-character GSTIN"
              autoCapitalize="characters"
              maxLength={15}
            />
          </Field>
          {errors.gstin ? <ErrorText text={errors.gstin} /> : null}

          <SelectField
            label="State"
            placeholder="Select your state"
            value={stateCode}
            options={stateOptions}
            onSelect={setStateCode}
            error={errors.state}
          />
        </View>
      ) : null}

      <Button
        title={submitLabel}
        size="lg"
        block
        onPress={handleSubmit}
        loading={saving}
        style={styles.submit}
      />
    </ScrollView>
  );
}

function ErrorText({text}: {text: string}): React.JSX.Element {
  return (
    <AppText variant="cap" color={DukaanColors.danger} style={styles.error}>
      {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: DukaanColors.bg},
  content: {padding: Space.lg, paddingBottom: Space.xxxl, gap: Space.sm},
  block: {marginTop: Space.sm},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm},
  error: {marginTop: -Space.xs},
  gstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: Space.lg,
    marginTop: Space.lg,
  },
  gstText: {flex: 1, marginRight: Space.md, gap: 2},
  submit: {marginTop: Space.xl},
});
