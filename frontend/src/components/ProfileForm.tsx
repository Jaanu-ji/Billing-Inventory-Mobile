import React, {useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {Colors, FontSize, Radius, Spacing} from '../constants/theme';
import {SHOP_TYPES} from '../constants/shopTypes';
import {INDIAN_STATES} from '../constants/states';
import {validateProfileForm, type ProfileErrors} from '../utils/validation';
import {SelectField} from './SelectField';
import {PrimaryButton} from './PrimaryButton';
import type {ShopProfile, ShopProfileInput} from '../models/ShopProfile';

interface Props {
  /** Existing profile when editing from Settings; undefined on first setup. */
  initial?: ShopProfile | null;
  submitLabel: string;
  saving?: boolean;
  onSubmit: (input: ShopProfileInput) => void;
}

/** Shared shop setup / settings form (one form, two screens). */
export function ProfileForm({
  initial,
  submitLabel,
  saving = false,
  onSubmit,
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
  const [errors, setErrors] = useState<ProfileErrors>({});

  const shopTypeOptions = SHOP_TYPES.map(t => ({label: t.label, value: t.id}));
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
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <SelectField
        label="Shop type"
        placeholder="Select your shop type"
        value={shopType}
        options={shopTypeOptions}
        onSelect={setShopType}
        error={errors.shopType}
      />

      <Text style={styles.label}>Shop name</Text>
      <TextInput
        value={shopName}
        onChangeText={setShopName}
        placeholder="e.g. Sharma General Store"
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
      />
      {errors.shopName ? <Text style={styles.error}>{errors.shopName}</Text> : null}

      <Text style={styles.label}>Phone number</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="e.g. 98765 43210"
        placeholderTextColor={Colors.textMuted}
        keyboardType="phone-pad"
        style={styles.input}
      />
      {errors.phone ? <Text style={styles.error}>{errors.phone}</Text> : null}

      <Text style={styles.label}>Address (optional)</Text>
      <TextInput
        value={address ?? ''}
        onChangeText={setAddress}
        placeholder="Shop address"
        placeholderTextColor={Colors.textMuted}
        multiline
        style={[styles.input, styles.multiline]}
      />

      <View style={styles.gstRow}>
        <View style={styles.gstText}>
          <Text style={styles.gstTitle}>GST-registered shop?</Text>
          <Text style={styles.gstHint}>
            Turn on if you bill with GST. You can change this later.
          </Text>
        </View>
        <Switch
          value={gstEnabled}
          onValueChange={setGstEnabled}
          trackColor={{true: Colors.primary, false: Colors.border}}
          thumbColor={Colors.text}
        />
      </View>

      {gstEnabled ? (
        <View>
          <Text style={styles.label}>GSTIN</Text>
          <TextInput
            value={gstin ?? ''}
            onChangeText={t => setGstin(t.toUpperCase())}
            placeholder="15-character GSTIN"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            maxLength={15}
            style={styles.input}
          />
          {errors.gstin ? <Text style={styles.error}>{errors.gstin}</Text> : null}

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

      <PrimaryButton
        label={submitLabel}
        onPress={handleSubmit}
        loading={saving}
        style={styles.submit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  content: {padding: Spacing.lg, paddingBottom: Spacing.xl},
  label: {
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
  multiline: {minHeight: 64, textAlignVertical: 'top'},
  error: {color: Colors.danger, fontSize: FontSize.sm, marginTop: Spacing.xs},
  gstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  gstText: {flex: 1, marginRight: Spacing.md},
  gstTitle: {color: Colors.text, fontSize: FontSize.md, fontWeight: '700'},
  gstHint: {color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2},
  submit: {marginTop: Spacing.xl},
});
