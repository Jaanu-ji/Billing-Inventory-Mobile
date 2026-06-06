import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, View, ViewStyle} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import {AppText, Button} from './ui';
import {TorchButton} from './TorchButton';
import {DukaanColors, Palette, Space} from '../constants/theme';

interface Props {
  /** Camera runs only when true (pause while a modal/other screen is up). */
  isActive: boolean;
  /** Called with the raw barcode value on each detection. */
  onBarcode: (value: string) => void;
  style?: ViewStyle;
}

/**
 * Reusable scanning surface: camera + permission handling + code scanner.
 *
 * Extracted so the Phase 2 billing screen can scan without duplicating camera
 * setup. (Phase 1 ScanScreen is left as-is to avoid restructuring tested code.)
 *
 * B2: DUKAAN viewfinder — corner-bracket reticle + an orange "laser" line that
 * sweeps while the camera is active. Camera/scan logic is unchanged.
 */
export function CameraScanner({
  isActive,
  onBarcode,
  style,
}: Props): React.JSX.Element {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  // Manual flashlight for low-light scanning. Off whenever the camera pauses.
  const [torchOn, setTorchOn] = useState(false);

  // Keep the latest callback in a ref so the scanner closure never goes stale.
  const onBarcodeRef = useRef(onBarcode);
  useEffect(() => {
    onBarcodeRef.current = onBarcode;
  }, [onBarcode]);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Sweeping laser animation, only while the camera is active.
  const laser = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isActive) {
      laser.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laser, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(laser, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isActive, laser]);

  const codeScanner = useCodeScanner({
    codeTypes: [
      'qr',
      'ean-13',
      'ean-8',
      'code-128',
      'code-39',
      'upc-a',
      'upc-e',
      'codabar',
      'itf',
    ],
    onCodeScanned: codes => {
      const value = codes[0]?.value;
      if (value) {
        onBarcodeRef.current(value);
      }
    },
  });

  if (!hasPermission) {
    return (
      <View style={[styles.placeholder, style]}>
        <AppText variant="h3" center>
          Camera access needed
        </AppText>
        <AppText variant="bodySm" color={DukaanColors.textMuted} center>
          Barcode scan karne ke liye camera permission chahiye.
        </AppText>
        <Button title="Grant camera access" onPress={requestPermission} />
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={[styles.placeholder, style]}>
        <AppText variant="bodySm" color={DukaanColors.textMuted} center>
          No camera found on this device.
        </AppText>
      </View>
    );
  }

  const laserY = laser.interpolate({
    inputRange: [0, 1],
    outputRange: [-58, 58], // within the reticle height
  });

  return (
    <View style={[styles.container, style]}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        // Torch only when the camera is active (vision-camera ignores it otherwise).
        torch={isActive && torchOn ? 'on' : 'off'}
        codeScanner={codeScanner}
      />

      {/* Corner-bracket reticle + sweeping laser. */}
      <View pointerEvents="none" style={styles.reticle}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
        {isActive && (
          <Animated.View
            style={[styles.laser, {transform: [{translateY: laserY}]}]}
          />
        )}
      </View>

      {device.hasTorch ? (
        <TorchButton
          on={torchOn}
          onPress={() => setTorchOn(v => !v)}
          style={styles.torch}
        />
      ) : null}
    </View>
  );
}

const BRACKET = 28;
const BORDER = 3;
const RETICLE_W = '64%';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B0E13',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    backgroundColor: DukaanColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.lg,
    gap: Space.md,
  },
  reticle: {
    width: RETICLE_W,
    aspectRatio: 1.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: BRACKET,
    height: BRACKET,
    borderColor: '#FFFFFF',
  },
  tl: {top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderTopLeftRadius: 12},
  tr: {top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER, borderTopRightRadius: 12},
  bl: {bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderBottomLeftRadius: 12},
  br: {bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderBottomRightRadius: 12},
  laser: {
    width: '82%',
    height: 2.5,
    borderRadius: 2,
    backgroundColor: Palette.orange[400],
    shadowColor: Palette.orange[400],
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  torch: {position: 'absolute', top: Space.sm, right: Space.sm},
});
