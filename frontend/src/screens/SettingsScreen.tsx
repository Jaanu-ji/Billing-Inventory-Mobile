import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {ProfileForm} from '../components/ProfileForm';
import {AppText, Badge, Icon} from '../components/ui';
import {ProfileService} from '../services/ProfileService';
import {shopTypeLabel} from '../constants/shopTypes';
import {billingModeLabel, deriveBillingMode} from '../constants/billingModes';
import {DukaanColors, Radii, Space} from '../constants/theme';
import type {ShopProfile, ShopProfileInput} from '../models/ShopProfile';
import type {MainTabParamList} from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Settings'>;

/** View / edit the shop profile later. Reuses the same form as setup. */
export function SettingsScreen({navigation}: Props): React.JSX.Element {
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      ProfileService.getProfile().then(p => {
        if (active) {
          setProfile(p);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const handleSubmit = async (input: ShopProfileInput) => {
    setSaving(true);
    try {
      await ProfileService.saveProfile(input);
      navigation.navigate('Billing'); // back to the home tab
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={DukaanColors.primary} />
      </View>
    );
  }

  const billingMode = profile
    ? profile.billingMode ?? deriveBillingMode(profile.businessMode)
    : null;
  const location =
    profile?.address?.trim() ||
    (profile?.state ? profile.state : shopTypeLabel(profile?.shopType));

  const summary =
    profile != null ? (
      <View style={styles.summaryCard}>
        <View style={styles.summaryTile}>
          <Icon name="store" size={22} color={DukaanColors.onPrimary} />
        </View>
        <View style={styles.summaryInfo}>
          <AppText variant="h3" numberOfLines={1}>
            {profile.shopName}
          </AppText>
          <AppText variant="cap" color={DukaanColors.textMuted} numberOfLines={1}>
            {location}
          </AppText>
          <View style={styles.summaryChips}>
            {profile.gstEnabled ? <Badge variant="gst">GST</Badge> : null}
            {billingMode ? (
              <Badge variant="soft">{billingModeLabel(billingMode)}</Badge>
            ) : null}
          </View>
        </View>
      </View>
    ) : null;

  return (
    <ProfileForm
      initial={profile}
      submitLabel="Save changes"
      saving={saving}
      onSubmit={handleSubmit}
      header={summary}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DukaanColors.bg,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: Space.lg,
    marginBottom: Space.sm,
  },
  summaryTile: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: DukaanColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: {flex: 1, gap: 3},
  summaryChips: {flexDirection: 'row', gap: Space.sm, marginTop: 2},
});
