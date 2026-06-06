/**
 * Bill App — Phase 1 (barcode engine) + Phase 2 (billing & shop profile).
 *
 * Boots the local SQLite DB (runs migrations), checks whether shop setup has
 * been done, then renders navigation starting on Setup (first launch) or Billing.
 * Architecture is layered: screens -> services -> repositories -> db, so later
 * phases (GST billing, inventory, AI bill-reading, Express + cloud sync) plug in
 * without restructuring.
 */
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from './src/navigation/AppNavigator';
import {initDatabase} from './src/db/database';
import {ProfileService} from './src/services/ProfileService';
import {Colors, FontSize, Spacing} from './src/constants/theme';
import type {RootStackParamList} from './src/navigation/types';

function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList>('Main');

  useEffect(() => {
    (async () => {
      await initDatabase();
      // First launch (no profile) -> Setup; otherwise straight to the tabbed app
      // (which opens on the Billing tab). If this lookup ever fails we still
      // default to Main so the app never gets stuck on a blank screen.
      try {
        const hasProfile = await ProfileService.hasProfile();
        setInitialRoute(hasProfile ? 'Main' : 'Setup');
      } catch {
        setInitialRoute('Main');
      }
      setReady(true);
    })().catch(e => setError(String(e?.message ?? e)));
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to open database</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppNavigator initialRouteName={initialRoute} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },
  errorText: {color: Colors.danger, fontSize: FontSize.lg, fontWeight: '800'},
  errorSub: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});

export default App;
