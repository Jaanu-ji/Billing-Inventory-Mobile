import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Pressable, StyleSheet, View} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import {useIsFocused} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {MatchedCard} from '../components/MatchedCard';
import {
  ProductFormModal,
  type ProductFormSubmit,
} from '../components/ProductFormModal';
import {TorchButton} from '../components/TorchButton';
import {AppText, Badge, Button} from '../components/ui';
import {scanService} from '../services/ScanService';
import {ProfileService} from '../services/ProfileService';
import {productRepository} from '../repositories/ProductRepository';
import {Config} from '../constants/config';
import {unitLabel} from '../constants/units';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';
import {formatPrice} from '../utils/format';
import type {Product} from '../models/Product';
import type {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

type CardState = {name: string; price: number; kind: 'matched' | 'saved'} | null;

/**
 * Home screen — the core Phase 1 loop:
 *   camera open -> barcode detected -> known? show card : ask name+price -> save.
 */
export function ScanScreen({navigation}: Props): React.JSX.Element {
  const isFocused = useIsFocused();
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');

  const [card, setCard] = useState<CardState>(null);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // A scanned barcode that's ALREADY in the catalog: show it + offer Edit so the
  // shopkeeper updates the existing product instead of making a duplicate entry.
  const [knownProduct, setKnownProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  // Manual flashlight for scanning in poor light.
  const [torchOn, setTorchOn] = useState(false);
  // Whether to capture GST rate + HSN when adding an unknown product.
  const [gstEnabled, setGstEnabled] = useState(false);
  // Business-adaptive product fields + default unit for new products (Phase H).
  const [shopType, setShopType] = useState<string | null>(null);
  const [defaultUnit, setDefaultUnit] = useState<string | null>(null);

  // Refs so the camera callback always reads fresh values (avoids stale closure)
  // and so we don't process new scans while a modal/save is happening.
  const busyRef = useRef(false);
  const cardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ask for camera permission on first mount.
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Read the shop profile: GST (for the GST rate + HSN fields), shop type (for
  // business-adaptive product fields) and the default selling unit.
  useEffect(() => {
    ProfileService.getProfile().then(p => {
      setGstEnabled(p?.gstEnabled ?? false);
      setShopType(p?.shopType ?? null);
      setDefaultUnit(p?.defaultUnit ?? null);
    });
  }, []);

  // Keep busyRef in sync: don't process new scans while any product UI is up
  // (the new-product form, the "already in catalog" card, or the edit form).
  useEffect(() => {
    busyRef.current =
      pendingBarcode !== null ||
      knownProduct !== null ||
      editingProduct !== null;
  }, [pendingBarcode, knownProduct, editingProduct]);

  // Clean up any pending timer on unmount.
  useEffect(() => {
    return () => {
      if (cardTimer.current) {
        clearTimeout(cardTimer.current);
      }
    };
  }, []);

  // Sweeping laser line, only while actively scanning (no product UI is up).
  const laser = useRef(new Animated.Value(0)).current;
  const laserActive =
    isFocused &&
    pendingBarcode === null &&
    knownProduct === null &&
    editingProduct === null;
  useEffect(() => {
    if (!laserActive) {
      laser.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laser, {toValue: 1, duration: 1400, useNativeDriver: true}),
        Animated.timing(laser, {toValue: 0, duration: 1400, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [laserActive, laser]);

  const showCard = useCallback((next: NonNullable<CardState>) => {
    setCard(next);
    if (cardTimer.current) {
      clearTimeout(cardTimer.current);
    }
    cardTimer.current = setTimeout(() => {
      setCard(null);
    }, Config.matchedCardTimeoutMs);
  }, []);

  /** Process a raw barcode value coming from the camera. */
  const processScan = useCallback(
    async (value: string) => {
      if (busyRef.current) {
        return;
      }
      busyRef.current = true;
      // For an unknown code we keep "busy" until the form is saved/cancelled.
      let keepBusy = false;
      try {
        const outcome = await scanService.handleScan(value);
        if (outcome.type === 'known') {
          // Already in the catalog — show it with an Edit option (no new entry).
          setKnownProduct(outcome.product);
          keepBusy = true; // stay busy until the card is closed / edited
        } else if (outcome.type === 'unknown') {
          setPendingBarcode(outcome.barcode);
          keepBusy = true;
        }
        // 'ignored' => debounced duplicate, do nothing.
      } finally {
        if (!keepBusy) {
          busyRef.current = false;
        }
      }
    },
    [],
  );

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
        processScan(value);
      }
    },
  });

  const handleSaveNew = async (values: ProductFormSubmit) => {
    if (!pendingBarcode) {
      return;
    }
    setSaving(true);
    try {
      const product = await scanService.saveNewProduct({
        barcode: pendingBarcode,
        name: values.name,
        price: values.price,
        gstRate: values.gstRate,
        hsnCode: values.hsnCode,
        unit: values.unit,
        category: values.category,
        attributes: values.attributes,
      });
      setPendingBarcode(null);
      busyRef.current = false;
      showCard({name: product.name, price: product.price, kind: 'saved'});
    } finally {
      setSaving(false);
    }
  };

  const handleCancelNew = () => {
    const code = pendingBarcode;
    setPendingBarcode(null);
    busyRef.current = false;
    if (code) {
      // Let the same code be scanned again right away.
      scanService.allowImmediateRescan(code);
    }
  };

  // ---- Known product (already in catalog): show / edit, never duplicate ------

  /** Close the "already in catalog" card and allow re-scanning that code. */
  const dismissKnown = () => {
    const code = knownProduct?.barcode;
    setKnownProduct(null);
    if (code) {
      scanService.allowImmediateRescan(code);
    }
  };

  /** Open the edit form pre-filled with the existing product. */
  const startEditKnown = () => {
    setEditingProduct(knownProduct);
    setKnownProduct(null);
  };

  /** Save edits onto the SAME product row (update, not insert). */
  const handleEditSave = async (values: ProductFormSubmit) => {
    if (!editingProduct) {
      return;
    }
    setSavingEdit(true);
    try {
      await productRepository.update(editingProduct.id, {
        name: values.name,
        price: values.price,
        gstRate: values.gstRate,
        hsnCode: values.hsnCode,
        unit: values.unit,
        category: values.category,
        attributes: values.attributes,
      });
      const code = editingProduct.barcode;
      setEditingProduct(null);
      showCard({name: values.name, price: values.price, kind: 'saved'});
      scanService.allowImmediateRescan(code);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    const code = editingProduct?.barcode;
    setEditingProduct(null);
    if (code) {
      scanService.allowImmediateRescan(code);
    }
  };

  // ---- Render states -------------------------------------------------------
  if (!hasPermission) {
    return (
      <View style={styles.center}>
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
      <View style={styles.center}>
        <AppText variant="bodySm" color={DukaanColors.textMuted} center>
          No camera found on this device.
        </AppText>
      </View>
    );
  }

  const laserY = laser.interpolate({inputRange: [0, 1], outputRange: [-72, 72]});

  // Camera scans only when focused and no product UI (new / known / edit) is up.
  const scanningActive =
    isFocused &&
    pendingBarcode === null &&
    knownProduct === null &&
    editingProduct === null;

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={scanningActive}
        // Torch only while the camera is active (vision-camera ignores it otherwise).
        torch={scanningActive && torchOn ? 'on' : 'off'}
        codeScanner={codeScanner}
      />

      {/* Corner-bracket reticle + sweeping laser. */}
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.reticle}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          {laserActive && (
            <Animated.View
              style={[styles.laser, {transform: [{translateY: laserY}]}]}
            />
          )}
        </View>
        <View style={styles.hint}>
          <AppText variant="bodySm" weight="700" color="#FFFFFF">
            Point the camera at a barcode
          </AppText>
        </View>
      </View>

      {/* Flashlight toggle for low light (only if the device has a torch). */}
      {device.hasTorch ? (
        <TorchButton
          on={torchOn}
          onPress={() => setTorchOn(v => !v)}
          style={styles.torch}
        />
      ) : null}

      {/* Result card */}
      {card ? (
        <View pointerEvents="none" style={styles.cardWrap}>
          <MatchedCard name={card.name} price={card.price} kind={card.kind} />
        </View>
      ) : null}

      {/* Back to the products list (Scan is pushed from the Products tab). */}
      <Pressable
        style={({pressed}) => [styles.productsBtn, pressed && styles.productsBtnPressed]}
        onPress={() => navigation.goBack()}>
        <AppText variant="body" weight="800" color={DukaanColors.onPrimary}>
          View Products
        </AppText>
      </Pressable>

      {/* Already-in-catalog card: this item exists — view it and Edit (price /
          GST / HSN) instead of creating a duplicate entry. */}
      {knownProduct ? (
        <View style={styles.knownBackdrop}>
          <View style={styles.knownCard}>
            <Badge variant="stock" style={styles.knownTag}>
              ALREADY IN CATALOG
            </Badge>
            <AppText variant="h2" center numberOfLines={2}>
              {knownProduct.name}
            </AppText>
            <AppText variant="h1" numeric style={styles.knownPrice}>
              {formatPrice(knownProduct.price)}
            </AppText>
            <AppText variant="bodySm" color={DukaanColors.textMuted}>
              / {unitLabel(knownProduct.unit)}
            </AppText>
            {gstEnabled && knownProduct.gstRate > 0 ? (
              <AppText variant="bodySm" color={DukaanColors.textMuted}>
                GST {knownProduct.gstRate}%
                {knownProduct.hsnCode ? ` · HSN ${knownProduct.hsnCode}` : ''}
              </AppText>
            ) : null}
            <View style={styles.knownActions}>
              <Button
                title="Close"
                variant="outline"
                onPress={dismissKnown}
                style={styles.knownBtn}
              />
              <Button
                title="Edit"
                onPress={startEditKnown}
                style={styles.knownBtn}
              />
            </View>
          </View>
        </View>
      ) : null}

      {/* New product form for an unknown barcode */}
      <ProductFormModal
        visible={pendingBarcode !== null}
        title="New product"
        barcode={pendingBarcode ?? undefined}
        initialUnit={defaultUnit ?? undefined}
        shopType={shopType}
        showGst={gstEnabled}
        submitLabel="Save product"
        saving={saving}
        onSubmit={handleSaveNew}
        onCancel={handleCancelNew}
      />

      {/* Edit form for an existing product (updates the same row — no duplicate). */}
      <ProductFormModal
        visible={editingProduct !== null}
        title="Edit product"
        barcode={editingProduct?.barcode}
        initialName={editingProduct?.name}
        initialPrice={editingProduct?.price}
        initialGstRate={editingProduct?.gstRate}
        initialHsnCode={editingProduct?.hsnCode}
        initialUnit={editingProduct?.unit}
        initialCategory={editingProduct?.category}
        initialAttributes={editingProduct?.attributes}
        shopType={shopType}
        showGst={gstEnabled}
        submitLabel="Save changes"
        saving={savingEdit}
        onSubmit={handleEditSave}
        onCancel={handleCancelEdit}
      />
    </View>
  );
}

const BRACKET = 32;
const BORDER = 3;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0B0E13'},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.lg,
    backgroundColor: DukaanColors.bg,
    gap: Space.md,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    width: '70%',
    aspectRatio: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {position: 'absolute', width: BRACKET, height: BRACKET, borderColor: '#FFFFFF'},
  tl: {top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderTopLeftRadius: 14},
  tr: {top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER, borderTopRightRadius: 14},
  bl: {bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderBottomLeftRadius: 14},
  br: {bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderBottomRightRadius: 14},
  laser: {
    width: '84%',
    height: 2.5,
    borderRadius: 2,
    backgroundColor: Palette.orange[400],
    shadowColor: Palette.orange[400],
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  hint: {
    marginTop: Space.xl,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: 999,
    overflow: 'hidden',
  },
  cardWrap: {
    position: 'absolute',
    top: Space.xxxl,
    left: Space.lg,
    right: Space.lg,
  },
  torch: {position: 'absolute', bottom: 100, right: Space.lg},
  knownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.lg,
  },
  knownCard: {
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.xl,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    gap: Space.sm,
  },
  knownTag: {marginBottom: Space.xs},
  knownPrice: {marginTop: -Space.xs},
  knownActions: {
    flexDirection: 'row',
    gap: Space.md,
    marginTop: Space.md,
    alignSelf: 'stretch',
  },
  knownBtn: {flex: 1},
  productsBtn: {
    position: 'absolute',
    bottom: Space.xxxl,
    alignSelf: 'center',
    backgroundColor: DukaanColors.primary,
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.md,
    borderRadius: 999,
    shadowColor: DukaanColors.primary,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 12,
  },
  productsBtnPressed: {backgroundColor: DukaanColors.primaryPress},
});
