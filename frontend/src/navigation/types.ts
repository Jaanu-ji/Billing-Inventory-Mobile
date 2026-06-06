/**
 * Navigation param lists. Two navigators:
 *  - a bottom **tab** bar (the everyday screens the shopkeeper switches between), and
 *  - a root **stack** that hosts the tabs plus the screens you push on top of them
 *    (Setup on first launch, a bill's detail, the camera scan screen).
 * Keeps navigation type-safe as the app grows.
 */
import type {NavigatorScreenParams} from '@react-navigation/native';

/** The four bottom tabs. Billing is home/default. */
export type MainTabParamList = {
  Billing: undefined; // Phase 2: scan-to-cart billing flow (home)
  BillHistory: undefined; // Phase 2: list of saved bills
  Products: undefined; // Phase 1: product catalog
  Settings: undefined; // Phase 2 Part 2: view/edit shop profile
  // Phase 3: Inventory: undefined;
};

/** Root stack: the tabs (`Main`) plus screens pushed above them. */
export type RootStackParamList = {
  Setup: undefined; // Phase 2 Part 2: first-launch shop setup
  Main: NavigatorScreenParams<MainTabParamList> | undefined; // the bottom-tab app
  BillDetail: {billId: number}; // Phase 2: full view of one bill (pushed from Bills)
  Scan: undefined; // Phase 1: add/recognise products (pushed from Products)
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
