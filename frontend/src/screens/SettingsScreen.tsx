import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {ProfileForm} from '../components/ProfileForm';
import {ProfileService} from '../services/ProfileService';
import {DukaanColors} from '../constants/theme';
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

  return (
    <ProfileForm
      initial={profile}
      submitLabel="Save changes"
      saving={saving}
      onSubmit={handleSubmit}
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
});
