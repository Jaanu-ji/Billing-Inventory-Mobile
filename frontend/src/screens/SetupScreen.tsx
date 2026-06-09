/**
 * Onboarding (Phase C1) — first-launch, multi-step shop setup.
 *
 * Replaces the old single-form setup with a guided flow:
 *   0 Welcome → 1 Business mode → 2 Shop details → 3 GST setup → save.
 *
 * Shown only when no profile exists. On finish we reset the stack to the tabbed
 * app (Billing tab) so back can't return here. The richer field UI (selects,
 * toggle, validation) is reused from the same kit/validation as the Settings
 * form, but laid out step-by-step. Captures `businessMode` (migration v5).
 */
import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SelectField} from '../components/SelectField';
import {
  AppText,
  Button,
  Chip,
  Field,
  Icon,
  Input,
  Segmented,
  Textarea,
  Toggle,
  type IconName,
} from '../components/ui';
import {ProfileService} from '../services/ProfileService';
import {SHOP_TYPES} from '../constants/shopTypes';
import {INDIAN_STATES} from '../constants/states';
import {
  BUSINESS_MODES,
  DEFAULT_BUSINESS_MODE,
  type BusinessMode,
} from '../constants/businessModes';
import {DEFAULT_UNIT, UNIT_OPTIONS} from '../constants/units';
import type {BillingMode} from '../constants/billingModes';
import {validateProfileForm, type ProfileErrors} from '../utils/validation';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';
import type {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Setup'>;

const STEPS = 4; // welcome, business mode, shop details, GST
const MODE_ICON: Record<BusinessMode, IconName> = {
  product: 'box',
  service: 'wrench',
  mixed: 'layers',
};
/** Icon per shop type for the selection grid (design 02). */
const SHOP_TYPE_ICON: Record<string, IconName> = {
  kirana: 'store',
  medical: 'medical',
  garment: 'shirt',
  footwear: 'shoe',
  sports: 'ball',
  hardware: 'tools',
  electronics: 'monitor',
  restaurant: 'utensils',
  other: 'layers',
};

export function SetupScreen({navigation}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [businessMode, setBusinessMode] = useState<BusinessMode>(DEFAULT_BUSINESS_MODE);
  const [shopType, setShopType] = useState<string | null>(null);
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState<string | null>(null);
  // "Other" custom setup (Phase H): default unit + scan-vs-list billing choice.
  const [defaultUnit, setDefaultUnit] = useState<string>(DEFAULT_UNIT);
  const [billMode, setBillMode] = useState<'scan' | 'list'>('scan');
  const [errors, setErrors] = useState<ProfileErrors>({});

  // An "Other" shop that sells goods gets a small custom setup so the
  // dukaandaar can shape unit + how they bill, instead of a fixed default.
  const sellsGoods = businessMode !== 'service';
  const showCustom = shopType === 'other' && sellsGoods;

  const stateOptions = INDIAN_STATES.map(s => ({
    label: `${s.name} (${s.code})`,
    value: s.code,
  }));

  /** Validate the current step; returns true when OK to advance/finish. */
  const validateStep = (): boolean => {
    if (step === 2) {
      const e: ProfileErrors = {};
      if (!shopType) {
        e.shopType = 'Select a shop type';
      }
      if (shopName.trim().length === 0) {
        e.shopName = 'Shop name is required';
      }
      if (phone.trim().length === 0) {
        e.phone = 'Phone number is required';
      }
      setErrors(e);
      return Object.keys(e).length === 0;
    }
    if (step === 3) {
      const r = validateProfileForm({
        shopType: shopType ?? '',
        shopName,
        phone,
        gstEnabled,
        gstin,
        stateCode: stateCode ?? '',
      });
      setErrors(r.errors);
      return r.valid;
    }
    return true;
  };

  const finish = async () => {
    setSaving(true);
    try {
      const stateInfo = INDIAN_STATES.find(s => s.code === stateCode) ?? null;
      await ProfileService.saveProfile({
        shopType: shopType!,
        shopName,
        phone,
        address,
        gstEnabled,
        gstin: gstEnabled ? gstin : null,
        state: gstEnabled ? stateInfo?.name ?? null : null,
        stateCode: gstEnabled ? stateCode : null,
        businessMode,
        // Default unit only matters for goods; seed it for an "Other" shop.
        defaultUnit: showCustom ? defaultUnit : null,
      });
      // Remember the "Other" shop's billing-mode choice (scan vs list). For
      // other shop types the billing mode is derived from businessMode (Phase E).
      if (showCustom) {
        const mode: BillingMode = billMode;
        await ProfileService.setBillingMode(mode);
      }
      navigation.reset({index: 0, routes: [{name: 'Main'}]});
    } finally {
      setSaving(false);
    }
  };

  const onNext = () => {
    if (!validateStep()) {
      return;
    }
    if (step === STEPS - 1) {
      finish();
    } else {
      setStep(s => s + 1);
    }
  };
  const onBack = () => setStep(s => Math.max(0, s - 1));

  const isLast = step === STEPS - 1;
  const nextLabel = step === 0 ? 'Shuru karein' : isLast ? 'Finish setup' : 'Aage';

  return (
    <View style={[styles.container, {paddingTop: insets.top + Space.sm}]}>
      {/* Header: back (after step 0) + progress dots */}
      <View style={styles.header}>
        {step > 0 ? (
          <Pressable
            onPress={onBack}
            accessibilityLabel="Back"
            style={({pressed}) => [styles.back, pressed && styles.backPressed]}>
            <Icon name="chevron-left" size={24} color={DukaanColors.ink} strokeWidth={2.2} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <View style={styles.dots}>
          {Array.from({length: STEPS}).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
            />
          ))}
        </View>
        <View style={styles.back} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View style={styles.welcome}>
            <View style={styles.logo}>
              <Icon name="store" size={40} color={DukaanColors.primary} strokeWidth={2} />
            </View>
            <AppText variant="display">Dukaan</AppText>
            <AppText variant="body" color={DukaanColors.textMuted} center>
              Aapki billing, bilkul offline. Chaliye 1 minute mein shop set
              karein.
            </AppText>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepBody}>
            <AppText variant="h1">Aap kya bechte hain?</AppText>
            <AppText variant="bodySm" color={DukaanColors.textMuted}>
              Isse aapka default billing flow set hoga. Baad mein Settings se
              badal sakte hain.
            </AppText>
            <View style={styles.modeList}>
              {BUSINESS_MODES.map(m => {
                const active = businessMode === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setBusinessMode(m.id)}
                    style={[styles.modeCard, active && styles.modeCardActive]}>
                    <View style={[styles.modeIcon, active && styles.modeIconActive]}>
                      <Icon
                        name={MODE_ICON[m.id]}
                        size={24}
                        color={active ? DukaanColors.onPrimary : DukaanColors.primary}
                      />
                    </View>
                    <View style={styles.modeText}>
                      <AppText variant="h3">{m.label}</AppText>
                      <AppText variant="bodySm" color={DukaanColors.textMuted}>
                        {m.subtitle}
                      </AppText>
                    </View>
                    {active ? (
                      <Icon name="check" size={20} color={DukaanColors.primary} strokeWidth={2.4} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepBody}>
            <AppText variant="h1">Shop ki detail</AppText>
            <Field label="Aapki dukaan kaisi hai?">
              <View style={styles.typeGrid}>
                {SHOP_TYPES.map(t => {
                  const active = shopType === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setShopType(t.id)}
                      style={[styles.typeCard, active && styles.typeCardActive]}>
                      <View style={[styles.typeIcon, active && styles.typeIconActive]}>
                        <Icon
                          name={SHOP_TYPE_ICON[t.id] ?? 'store'}
                          size={20}
                          color={active ? DukaanColors.onPrimary : DukaanColors.primary}
                        />
                      </View>
                      <AppText variant="bodySm" weight="700" numberOfLines={1}>
                        {t.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </Field>
            {errors.shopType ? <ErrorText text={errors.shopType} /> : null}
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
                value={address}
                onChangeText={setAddress}
                placeholder="Shop address"
              />
            </Field>

            {/* "Other" custom setup (Phase H): the dukaandaar shapes the app to
                their own business — default unit + how they want to bill. */}
            {showCustom ? (
              <View style={styles.customBox}>
                <AppText variant="overline" color={DukaanColors.textMuted}>
                  Apne hisaab se
                </AppText>
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
                <Field label="How will you bill?" style={styles.block}>
                  <Segmented<'scan' | 'list'>
                    options={[
                      {label: 'Scan barcode', value: 'scan'},
                      {label: 'Pick from list', value: 'list'},
                    ]}
                    value={billMode}
                    onChange={setBillMode}
                  />
                </Field>
              </View>
            ) : null}
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepBody}>
            <AppText variant="h1">GST setup</AppText>
            <AppText variant="bodySm" color={DukaanColors.textMuted}>
              GST-registered ho to on karein — pakka (GST) bill ban payega.
            </AppText>
            <View style={styles.gstRow}>
              <View style={styles.gstText}>
                <AppText variant="body" weight="700">
                  GST-registered shop?
                </AppText>
                <AppText variant="bodySm" color={DukaanColors.textMuted}>
                  Aap baad mein bhi badal sakte hain.
                </AppText>
              </View>
              <Toggle value={gstEnabled} onValueChange={setGstEnabled} />
            </View>

            {gstEnabled ? (
              <View>
                <Field label="GSTIN" style={styles.block}>
                  <Input
                    value={gstin}
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
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, {paddingBottom: insets.bottom + Space.lg}]}>
        <Button
          title={nextLabel}
          size="lg"
          block
          loading={saving}
          onPress={onNext}
        />
      </View>
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.lg,
    paddingBottom: Space.sm,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: {backgroundColor: DukaanColors.hairline},
  dots: {flexDirection: 'row', gap: 6, alignItems: 'center'},
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: Palette.slate[200],
  },
  dotActive: {width: 22, backgroundColor: DukaanColors.primary},
  dotDone: {backgroundColor: Palette.orange[300]},
  content: {padding: Space.lg, flexGrow: 1},
  welcome: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: Space.md},
  logo: {
    width: 88,
    height: 88,
    borderRadius: Radii.xl,
    backgroundColor: Palette.orange[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.sm,
  },
  stepBody: {gap: Space.sm},
  block: {marginTop: Space.sm},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm},
  typeGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm},
  typeCard: {
    width: '31%',
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: DukaanColors.hairline,
    paddingVertical: Space.md,
    paddingHorizontal: Space.sm,
    alignItems: 'center',
    gap: Space.xs,
  },
  typeCardActive: {borderColor: DukaanColors.primary, backgroundColor: Palette.orange[50]},
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.sm,
    backgroundColor: Palette.orange[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconActive: {backgroundColor: DukaanColors.primary},
  customBox: {
    marginTop: Space.md,
    padding: Space.lg,
    backgroundColor: Palette.orange[50],
    borderRadius: Radii.lg,
    gap: Space.xs,
  },
  error: {marginTop: -Space.xs},
  modeList: {gap: Space.md, marginTop: Space.md},
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderColor: DukaanColors.hairline,
    padding: Space.lg,
  },
  modeCardActive: {borderColor: DukaanColors.primary, backgroundColor: Palette.orange[50]},
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: Palette.orange[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconActive: {backgroundColor: DukaanColors.primary},
  modeText: {flex: 1, gap: 2},
  gstRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: Space.lg,
    marginTop: Space.md,
  },
  gstText: {flex: 1, marginRight: Space.md, gap: 2},
  footer: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
    borderTopWidth: 1,
    borderTopColor: DukaanColors.hairline,
    backgroundColor: DukaanColors.surface,
  },
});
