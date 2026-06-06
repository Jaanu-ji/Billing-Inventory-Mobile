/**
 * Overlays (spec §5.12).
 *
 * BottomSheet: slides up from the bottom; scrim `rgba(15,23,42,.45)`, sheet
 *   radius 32 top, pad 10×20×26, grab handle 40×5. Tapping the scrim closes.
 * CenterModal: centred dialog, radius 26 (xl), pad 24, `lg` shadow.
 *
 * Both use RN's <Modal> (no extra dependency). Blur on the scrim is omitted
 * (would need a native blur lib); the translucent scrim is the fallback.
 */
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {DukaanColors, Elevation, Palette, Radii, Space} from '../../constants/theme';

const SCRIM = 'rgba(15,23,42,0.45)';

interface OverlayProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  style,
}: OverlayProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.scrimEnd} onPress={onClose}>
        {/* Stop touches inside the sheet from closing it. */}
        <Pressable style={[styles.sheet, style]} onPress={() => {}}>
          <View style={styles.handle} />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function CenterModal({
  visible,
  onClose,
  children,
  style,
}: OverlayProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.scrimCenter} onPress={onClose}>
        <Pressable style={[styles.modal, style]} onPress={() => {}}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrimEnd: {flex: 1, backgroundColor: SCRIM, justifyContent: 'flex-end'},
  scrimCenter: {
    flex: 1,
    backgroundColor: SCRIM,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xxl,
  },
  sheet: {
    backgroundColor: DukaanColors.surface,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 26,
    ...Elevation.lg,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: Palette.slate[200],
    alignSelf: 'center',
    marginBottom: 14,
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.xl,
    padding: 24,
    ...Elevation.lg,
  },
});
