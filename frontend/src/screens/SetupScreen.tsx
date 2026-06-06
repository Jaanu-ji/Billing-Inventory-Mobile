import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ProfileForm} from '../components/ProfileForm';
import {ProfileService} from '../services/ProfileService';
import {Colors, FontSize, Spacing} from '../constants/theme';
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
        <Text style={styles.title}>Set up your shop</Text>
        <Text style={styles.subtitle}>
          A few quick details to personalise your bills.
        </Text>
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
  container: {flex: 1, backgroundColor: Colors.background},
  intro: {paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg},
  title: {color: Colors.text, fontSize: FontSize.xl, fontWeight: '900'},
  subtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
  },
});
