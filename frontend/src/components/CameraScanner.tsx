import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View, ViewStyle} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import {PrimaryButton} from './PrimaryButton';
import {TorchButton} from './TorchButton';
import {Colors, FontSize, Spacing} from '../constants/theme';

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
        <Text style={styles.message}>Camera permission is needed to scan.</Text>
        <PrimaryButton label="Grant camera access" onPress={requestPermission} />
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={[styles.placeholder, style]}>
        <Text style={styles.message}>No camera found on this device.</Text>
      </View>
    );
  }

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
      <View pointerEvents="none" style={styles.frame} />
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  message: {color: Colors.text, fontSize: FontSize.md, textAlign: 'center'},
  frame: {
    width: '60%',
    aspectRatio: 2.2,
    borderWidth: 3,
    borderColor: Colors.text,
    borderRadius: 14,
    opacity: 0.8,
  },
  torch: {position: 'absolute', top: Spacing.sm, right: Spacing.sm},
});
