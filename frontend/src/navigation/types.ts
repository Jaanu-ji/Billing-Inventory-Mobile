/**
 * Navigation param lists. Two navigators:
 *  - a bottom **tab** bar (the everyday screens the shopkeeper switches between), and
 *  - a root **stack** that hosts the tabs plus the screens you push on top of them
 *    (Setup on first launch, a bill's detail, the camera scan screen).
 * Keeps navigation type-safe as the app grows.
 */
import type {NavigatorScreenParams} from '@react-navigation/native';

/**
 * Bottom tabs, laid out to match the DUKAAN design (spec §5.11):
 *   Home · Products · [Bill = center scan FAB] · Bills · Settings
 * Billing is the raised center FAB and the default tab. Home is a dashboard
 * (placeholder until Phase C2).
 */
export type MainTabParamList = {
  Home: undefined; // Phase C2: dashboard (placeholder for now)
  Products: undefined; // Phase 1: product catalog
  Billing: undefined; // Phase 2: scan-to-cart billing flow (center FAB)
  BillHistory: undefined; // Phase 2: list of saved bills
  Settings: undefined; // Phase 2 Part 2: view/edit shop profile
  // Phase 3: Inventory: undefined;
};

/** Root stack: the tabs (`Main`) plus screens pushed above them. */
export type RootStackParamList = {
  Login: undefined; // Phase J: phone-OTP login gate (only when Config.auth.enabled)
  Setup: undefined; // Phase 2 Part 2: first-launch shop setup
  Main: NavigatorScreenParams<MainTabParamList> | undefined; // the bottom-tab app
  BillDetail: {billId: number}; // Phase 2: full view of one bill (pushed from Bills)
  Scan: undefined; // Phase 1: add/recognise products (pushed from Products)
  Customers: undefined; // Phase F: udhaar ledger (pushed from Bills)
  CustomerDetail: {customerId: number}; // Phase F: one customer's bills + clear udhaar
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
