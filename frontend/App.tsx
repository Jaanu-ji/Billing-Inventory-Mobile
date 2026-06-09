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
import {ActivityIndicator, AppState, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from './src/navigation/AppNavigator';
import {initDatabase} from './src/db/database';
import {ProfileService} from './src/services/ProfileService';
import {authService} from './src/services/AuthService';
import {SyncController} from './src/services/sync/SyncController';
import {Config} from './src/constants/config';
import {DukaanColors, Space, Typography} from './src/constants/theme';
import type {RootStackParamList} from './src/navigation/types';

function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList>('Main');

  useEffect(() => {
    (async () => {
      await initDatabase();
      // Decide the start route. With auth enabled (Phase J), an un-signed-in
      // user lands on Login; once signed in (or when auth is disabled — the
      // default during scaffolding, so behaviour is unchanged) we fall through
      // to the usual first-launch routing: Setup (no profile) else Main.
      // Any lookup failure defaults to Main so the app never gets stuck.
      try {
        if (Config.auth.enabled && !(await authService.getSession())) {
          setInitialRoute('Login');
        } else {
          const hasProfile = await ProfileService.hasProfile();
          setInitialRoute(hasProfile ? 'Main' : 'Setup');
        }
      } catch {
        setInitialRoute('Main');
      }
      setReady(true);
      // Kick a best-effort sync on launch (no-op unless sync is enabled +
      // configured + signed in — never blocks the app).
      SyncController.maybeSync();
    })().catch(e => setError(String(e?.message ?? e)));
  }, []);

  // Sync again whenever the app returns to the foreground (best-effort).
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        SyncController.maybeSync();
      }
    });
    return () => sub.remove();
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
        <ActivityIndicator size="large" color={DukaanColors.primary} />
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
    backgroundColor: DukaanColors.bg,
    padding: Space.lg,
  },
  errorText: {
    ...Typography.h2,
    color: DukaanColors.danger,
  },
  errorSub: {
    ...Typography.bodySm,
    color: DukaanColors.textMuted,
    marginTop: Space.sm,
    textAlign: 'center',
  },
});

export default App;
