import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';
import {SetupScreen} from '../screens/SetupScreen';
import {HomeScreen} from '../screens/HomeScreen';
import {BillingScreen} from '../screens/BillingScreen';
import {BillHistoryScreen} from '../screens/BillHistoryScreen';
import {BillDetailScreen} from '../screens/BillDetailScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {ScanScreen} from '../screens/ScanScreen';
import {ProductsScreen} from '../screens/ProductsScreen';
import {DukaanColors, FontFamily} from '../constants/theme';
import type {MainTabParamList, RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/** Light navigation theme so root/scene backgrounds match the DUKAAN surface. */
const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: DukaanColors.bg,
    card: DukaanColors.surface,
    text: DukaanColors.ink,
    border: DukaanColors.hairline,
    primary: DukaanColors.primary,
  },
};

/** Light header used by every navigator (per-screen custom TopBars come later). */
const headerStyles = {
  headerStyle: {backgroundColor: DukaanColors.surface},
  headerTintColor: DukaanColors.ink,
  headerTitleStyle: {
    fontWeight: '700' as const,
    color: DukaanColors.ink,
    fontFamily: FontFamily.display,
  },
  headerShadowVisible: false,
};

/** Simple emoji tab icon — svg line-icon set replaces these in a later step. */
function tabIcon(glyph: string) {
  return ({color}: {color: string}) => (
    <Text style={[styles.tabIcon, {color}]}>{glyph}</Text>
  );
}

/**
 * The raised center "Bill" button (spec §5.11 `.nav-fab`): 60×60, radius 20,
 * orange, white scan glyph, 4px surface ring, lifted above the bar. Rendered as
 * the Billing tab's custom `tabBarButton`, so pressing it selects that tab.
 */
function ScanFab({onPress, accessibilityState}: BottomTabBarButtonProps): React.JSX.Element {
  const focused = accessibilityState?.selected;
  return (
    <View style={styles.fabSlot} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New bill"
        onPress={onPress}
        style={({pressed}) => [
          styles.fab,
          focused && styles.fabActive,
          pressed && styles.fabPressed,
        ]}>
        {/* Minimal white "scan" glyph drawn with Views (no icon dep yet). */}
        <View style={styles.scanFrame}>
          <View style={styles.scanLaser} />
        </View>
      </Pressable>
    </View>
  );
}

/**
 * Everyday app: a 5-item bottom tab bar — Home · Products · Bill(FAB) · Bills ·
 * Settings. Opens on the Billing (center FAB) tab. BillDetail and Scan are
 * pushed above the tabs from the parent stack so they cover them full-screen.
 */
function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      initialRouteName="Billing"
      screenOptions={{
        ...headerStyles,
        sceneStyle: {backgroundColor: DukaanColors.bg},
        tabBarActiveTintColor: DukaanColors.primary,
        tabBarInactiveTintColor: DukaanColors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{title: 'Dukaan', tabBarLabel: 'Home', tabBarIcon: tabIcon('⌂')}}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{title: 'Products', tabBarLabel: 'Products', tabBarIcon: tabIcon('▦')}}
      />
      <Tab.Screen
        name="Billing"
        component={BillingScreen}
        options={{
          title: 'New Bill',
          tabBarLabel: () => null,
          tabBarButton: ScanFab,
        }}
      />
      <Tab.Screen
        name="BillHistory"
        component={BillHistoryScreen}
        options={{title: 'Bills', tabBarLabel: 'Bills', tabBarIcon: tabIcon('🧾')}}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: 'Settings', tabBarLabel: 'Settings', tabBarIcon: tabIcon('⚙')}}
      />
    </Tab.Navigator>
  );
}

interface Props {
  /** 'Setup' on first launch (no profile yet), otherwise 'Main' (the tabs). */
  initialRouteName: keyof RootStackParamList;
}

/**
 * App navigation. First launch (no profile) starts on Setup; otherwise the
 * tabbed app opens straight to Billing. BillDetail and Scan are pushed above
 * the tabs.
 */
export function AppNavigator({initialRouteName}: Props): React.JSX.Element {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          ...headerStyles,
          contentStyle: {backgroundColor: DukaanColors.bg},
        }}>
        <Stack.Screen
          name="Setup"
          component={SetupScreen}
          options={{title: 'Shop Setup', headerBackVisible: false, gestureEnabled: false}}
        />
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="BillDetail"
          component={BillDetailScreen}
          options={{title: 'Bill Detail'}}
        />
        <Stack.Screen
          name="Scan"
          component={ScanScreen}
          options={{title: 'Scan Product'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIcon: {fontSize: 22},
  tabBar: {
    height: 84,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: DukaanColors.surface,
    borderTopWidth: 1,
    borderTopColor: DukaanColors.hairline,
    // Soft top shadow (spec §5.11): 0 -4px 24px rgba(15,23,42,.05).
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 8,
  },
  tabItem: {paddingTop: 4},
  tabLabel: {fontSize: 11, fontWeight: '700', marginTop: 2},
  // Center FAB
  fabSlot: {flex: 1, alignItems: 'center', justifyContent: 'flex-start'},
  fab: {
    width: 60,
    height: 60,
    borderRadius: 20,
    marginTop: -24, // lifted above the bar
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DukaanColors.primary,
    borderWidth: 4,
    borderColor: DukaanColors.surface,
    // --sh-primary glow
    shadowColor: DukaanColors.primary,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 12,
  },
  fabActive: {backgroundColor: DukaanColors.primaryPress},
  fabPressed: {transform: [{scale: 0.96}]},
  scanFrame: {
    width: 24,
    height: 22,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderRadius: 7,
    justifyContent: 'center',
  },
  scanLaser: {
    height: 2.5,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 3,
    borderRadius: 2,
  },
});
