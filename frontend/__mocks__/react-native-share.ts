/**
 * Jest mock for react-native-share.
 *
 * Sharing opens a native sheet that doesn't exist off-device. Tests don't drive
 * a real share; this stub resolves successfully so service code that composes
 * the share path can be imported and exercised under Jest.
 */
export const Social = {
  Whatsapp: 'whatsapp',
} as const;

const Share = {
  open: async () => ({success: true, message: ''}),
  shareSingle: async () => ({success: true, message: ''}),
};

export default Share;
