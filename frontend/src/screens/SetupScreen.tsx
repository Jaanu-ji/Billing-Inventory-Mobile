import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ProfileForm} from '../components/ProfileForm';
import {AppText} from '../components/ui';
import {ProfileService} from '../services/ProfileService';
import {DukaanColors, Space} from '../constants/theme';
import type {ShopProfileInput} from '../models/ShopProfile';
import type {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Setup'>;

/**
 * First-launch setup. Shown only when no profile exists yet. After saving we
 * reset the stack to the tabbed app (Billing tab) so back can't return here.
 */
export function SetupScreen({navigation}: Props): React.JSX.Element {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (input: ShopProfileInput) => {
    setSaving(true);
    try {
      await ProfileService.saveProfile(input);
      navigation.reset({index: 0, routes: [{name: 'Main'}]});
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <AppText variant="h1">Set up your shop</AppText>
        <AppText variant="body" color={DukaanColors.textMuted}>
          A few quick details to personalise your bills.
        </AppText>
      </View>
      <ProfileForm
        submitLabel="Save & Continue"
        saving={saving}
        onSubmit={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: DukaanColors.bg},
  intro: {paddingHorizontal: Space.lg, paddingTop: Space.lg, gap: Space.xs},
});
