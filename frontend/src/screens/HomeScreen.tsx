/**
 * HomeScreen — DUKAAN home/dashboard.
 *
 * ⚠️ PLACEHOLDER (Phase B1). This only establishes the 5th nav slot so the
 * bottom bar matches the design (Home · Products · Bill · Bills · Settings).
 * The real dashboard — today's sales, bill count, recent bills — is built in
 * Phase C2. For now it shows a light greeting and a primary "Naya Bill" action
 * that jumps to the billing (center FAB) tab, so the shell is usable.
 */
import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {AppText, Button, Card} from '../components/ui';
import {DukaanColors, Space} from '../constants/theme';
import type {MainTabParamList} from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>;

export function HomeScreen({navigation}: Props): React.JSX.Element {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.greeting}>
        <AppText variant="overline" color={DukaanColors.textMuted}>
          AAJ KA DIN
        </AppText>
        <AppText variant="h1">Aapki Dukaan</AppText>
      </View>

      {/* Dashboard cards (sales / bills / recent) arrive in Phase C2. */}
      <Card flat pad style={styles.placeholder}>
        <AppText variant="h3">Dashboard coming soon</AppText>
        <AppText variant="bodySm" color={DukaanColors.textMuted}>
          Aaj ki sales, bills count aur recent bills yahan dikhenge.
        </AppText>
      </Card>

      <Button
        title="＋  Naya Bill"
        size="lg"
        block
        onPress={() => navigation.navigate('Billing')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: DukaanColors.bg},
  content: {padding: Space.lg, gap: Space.lg},
  greeting: {gap: Space.xs},
  placeholder: {gap: Space.sm},
});
