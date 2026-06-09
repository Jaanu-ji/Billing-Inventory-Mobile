/**
 * React Native CLI config.
 *
 * Phase A3 — bundle the DUKAAN fonts (Sora + Plus Jakarta Sans) from
 * `assets/fonts`. Run `npx react-native-asset` to copy them into the native
 * projects (Android `app/src/main/assets/fonts`, iOS Info.plist + Resources).
 *
 * Note: the Android copies are also committed under
 * `android/app/src/main/assets/fonts` so a plain `run-android` bundles them
 * without needing the asset step. iOS still requires `npx react-native-asset`.
 */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts/'],
};
