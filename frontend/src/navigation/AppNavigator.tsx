import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SetupScreen} from '../screens/SetupScreen';
import {BillingScreen} from '../screens/BillingScreen';
import {BillHistoryScreen} from '../screens/BillHistoryScreen';
import {BillDetailScreen} from '../screens/BillDetailScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {ScanScreen} from '../screens/ScanScreen';
import {ProductsScreen} from '../screens/ProductsScreen';
import {Colors, FontSize} from '../constants/theme';
import type {MainTabParamList, RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/** Simple emoji tab icon — no icon-font dependency, readable for a shopkeeper. */
function tabIcon(glyph: string) {
  return ({color}: {color: string}) => (
    <Text style={[styles.tabIcon, {color}]}>{glyph}</Text>
  );
}

const styles = StyleSheet.create({
  tabIcon: {fontSize: 20},
});

const headerStyles = {
  headerStyle: {backgroundColor: Colors.surface},
  headerTintColor: Colors.text,
  headerTitleStyle: {fontWeight: '700' as const},
};

/**
 * The everyday app: a bottom tab bar to switch between Billing (home), Bills,
 * Products and Settings. Pushed-on-top screens (a bill's detail, the scan
 * camera) live in the parent stack so they can cover the tabs full-screen.
 */
function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        ...headerStyles,
        sceneStyle: {backgroundColor: Colors.background},
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
        tabBarLabelStyle: {fontSize: FontSize.sm - 2, fontWeight: '600'},
      }}>
      <Tab.Screen
        name="Billing"
        component={BillingScreen}
        options={{title: 'New Bill', tabBarLabel: 'Billing', tabBarIcon: tabIcon('🧾')}}
      />
      <Tab.Screen
        name="BillHistory"
        component={BillHistoryScreen}
        options={{title: 'Bills', tabBarLabel: 'Bills', tabBarIcon: tabIcon('📁')}}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{title: 'Products', tabBarLabel: 'Products', tabBarIcon: tabIcon('📦')}}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: 'Settings', tabBarLabel: 'Settings', tabBarIcon: tabIcon('⚙️')}}
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
 * tabbed app opens straight to Billing (the default tab). BillDetail and Scan
 * are pushed above the tabs from the Bills and Products tabs respectively.
 */
export function AppNavigator({initialRouteName}: Props): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          ...headerStyles,
          contentStyle: {backgroundColor: Colors.background},
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
