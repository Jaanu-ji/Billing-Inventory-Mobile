import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
import {PrimaryButton} from '../components/PrimaryButton';
import {TorchButton} from '../components/TorchButton';
import {scanService} from '../services/ScanService';
import {ProfileService} from '../services/ProfileService';
import {productRepository} from '../repositories/ProductRepository';
import {Config} from '../constants/config';
import {Colors, FontSize, Radius, Spacing} from '../constants/theme';
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

  // Read whether the shop bills GST, to decide if the add-product form should
  // ask for GST rate + HSN.
  useEffect(() => {
    ProfileService.isGstEnabled().then(setGstEnabled);
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
        <Text style={styles.message}>Camera permission is needed to scan.</Text>
        <PrimaryButton label="Grant camera access" onPress={requestPermission} />
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>No camera found on this device.</Text>
      </View>
    );
  }

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

      {/* Aiming frame */}
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>Point the camera at a barcode</Text>
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
      <TouchableOpacity
        style={styles.productsBtn}
        onPress={() => navigation.goBack()}>
        <Text style={styles.productsBtnText}>View Products</Text>
      </TouchableOpacity>

      {/* Already-in-catalog card: this item exists — view it and Edit (price /
          GST / HSN) instead of creating a duplicate entry. */}
      {knownProduct ? (
        <View style={styles.knownBackdrop}>
          <View style={styles.knownCard}>
            <Text style={styles.knownTag}>ALREADY IN CATALOG</Text>
            <Text style={styles.knownName} numberOfLines={2}>
              {knownProduct.name}
            </Text>
            <Text style={styles.knownPrice}>
              {formatPrice(knownProduct.price)}
            </Text>
            {gstEnabled && knownProduct.gstRate > 0 ? (
              <Text style={styles.knownMeta}>
                GST {knownProduct.gstRate}%
                {knownProduct.hsnCode ? ` · HSN ${knownProduct.hsnCode}` : ''}
              </Text>
            ) : null}
            <View style={styles.knownActions}>
              <PrimaryButton
                label="Close"
                variant="ghost"
                onPress={dismissKnown}
                style={styles.knownBtn}
              />
              <PrimaryButton
                label="✏️  Edit"
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
        showGst={gstEnabled}
        submitLabel="Save changes"
        saving={savingEdit}
        onSubmit={handleEditSave}
        onCancel={handleCancelEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  message: {
    color: Colors.text,
    fontSize: FontSize.md,
    textAlign: 'center',
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
  frame: {
    width: '70%',
    aspectRatio: 1.4,
    borderWidth: 3,
    borderColor: Colors.text,
    borderRadius: 16,
    opacity: 0.85,
  },
  hint: {
    color: Colors.text,
    fontSize: FontSize.md,
    marginTop: Spacing.md,
    backgroundColor: Colors.overlay,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardWrap: {
    position: 'absolute',
    top: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  torch: {position: 'absolute', bottom: 96, right: Spacing.lg},
  knownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  knownCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.success,
    padding: Spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  knownTag: {
    color: Colors.success,
    fontSize: FontSize.sm,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  knownName: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  knownPrice: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '900',
    marginTop: Spacing.xs,
  },
  knownMeta: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
  },
  knownActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
  },
  knownBtn: {flex: 1},
  productsBtn: {
    position: 'absolute',
    bottom: Spacing.xl,
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 28,
  },
  productsBtnText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '800',
  },
});
