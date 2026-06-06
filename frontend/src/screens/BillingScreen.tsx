import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, FlatList, StyleSheet, View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {CameraScanner} from '../components/CameraScanner';
import {CartItemRow} from '../components/CartItemRow';
import {CheckoutModal, type CheckoutDetails} from '../components/CheckoutModal';
import {
  ProductFormModal,
  type ProductFormSubmit,
} from '../components/ProductFormModal';
import {AppText, Button} from '../components/ui';
import {scanService} from '../services/ScanService';
import {CartService} from '../services/CartService';
import {ProfileService} from '../services/ProfileService';
import {ShareService} from '../services/ShareService';
import {billRepository} from '../repositories/BillRepository';
import type {Bill} from '../models/Bill';
import {formatPrice} from '../utils/format';
import {INDIAN_STATES} from '../constants/states';
import {DukaanColors, Palette, Space} from '../constants/theme';
import type {CartItem} from '../models/Bill';

/**
 * Phase 2 main flow (home tab): scan items into a cart, watch the total grow,
 * checkout. Bills / Products / Settings are reachable from the bottom tab bar.
 *
 *   scan -> known product  -> add to cart (same code again => qty +1)
 *        -> unknown barcode -> reuse Phase 1 "add product" popup, then add to cart
 *   Done -> optional customer info -> save bill locally -> clear cart.
 */
export function BillingScreen(): React.JSX.Element {
  const isFocused = useIsFocused();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [savingBill, setSavingBill] = useState(false);
  // Shop GST context, read from the profile. Drives the GST checkout options
  // and whether new products capture a GST rate.
  const [gstEnabled, setGstEnabled] = useState(false);
  const [shopStateCode, setShopStateCode] = useState<string | null>(null);

  // Guards the scan handler against re-entrancy / scanning while a modal is up.
  const busyRef = useRef(false);

  const total = CartService.total(cart);
  const count = CartService.itemCount(cart);
  const aModalIsOpen = pendingBarcode !== null || checkoutOpen;

  // Refresh GST context on focus (the profile may have changed in Settings).
  useEffect(() => {
    if (isFocused) {
      ProfileService.getProfile().then(p => {
        setGstEnabled(p?.gstEnabled ?? false);
        setShopStateCode(p?.stateCode ?? null);
      });
    }
  }, [isFocused]);

  /** Handle one scanned barcode: add known product, or prompt for an unknown one. */
  const processScan = useCallback(async (value: string) => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    let keepBusy = false;
    try {
      const outcome = await scanService.handleScan(value);
      if (outcome.type === 'known') {
        setCart(c => CartService.addProduct(c, outcome.product));
      } else if (outcome.type === 'unknown') {
        setPendingBarcode(outcome.barcode);
        keepBusy = true; // stay busy until the add-product form closes
      }
      // 'ignored' => debounced duplicate, do nothing.
    } finally {
      if (!keepBusy) {
        busyRef.current = false;
      }
    }
  }, []);

  // New (unknown) product: save to catalog, then drop it into the cart.
  const handleSaveNewProduct = async (values: ProductFormSubmit) => {
    if (!pendingBarcode) {
      return;
    }
    setSavingProduct(true);
    try {
      const product = await scanService.saveNewProduct({
        barcode: pendingBarcode,
        name: values.name,
        price: values.price,
        gstRate: values.gstRate,
        hsnCode: values.hsnCode,
      });
      setCart(c => CartService.addProduct(c, product));
      setPendingBarcode(null);
      busyRef.current = false;
    } finally {
      setSavingProduct(false);
    }
  };

  const handleCancelNewProduct = () => {
    const code = pendingBarcode;
    setPendingBarcode(null);
    busyRef.current = false;
    if (code) {
      scanService.allowImmediateRescan(code);
    }
  };

  // Cart row controls.
  const increment = (barcode: string) =>
    setCart(c => CartService.changeQuantity(c, barcode, +1));
  const decrement = (barcode: string) =>
    setCart(c => CartService.changeQuantity(c, barcode, -1));
  const removeItem = (barcode: string) =>
    setCart(c => CartService.removeItem(c, barcode));
  // Inline price edit on a cart line (snapshot only; catalog product untouched).
  const updatePrice = (barcode: string, price: number) =>
    setCart(c => CartService.setPrice(c, barcode, price));

  // Manual (no-barcode) add — full flow with reuse-search arrives in Phase C3.
  const handleManualAdd = () => {
    Alert.alert(
      'Manual add',
      'Bina barcode wale items add karna Phase C3 mein aa raha hai.',
    );
  };

  const openCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Empty cart', 'Scan at least one item before checkout.');
      return;
    }
    setCheckoutOpen(true);
  };

  const handleConfirmCheckout = async (details: CheckoutDetails) => {
    setSavingBill(true);
    try {
      // Resolve the chosen state code to a state name for the saved record.
      const customerState =
        details.customerStateCode != null
          ? INDIAN_STATES.find(s => s.code === details.customerStateCode)?.name ??
            null
          : null;

      const bill = await billRepository.create({
        customerName: details.customerName,
        customerPhone: details.customerPhone,
        items: cart,
        billType: details.billType,
        shopStateCode,
        customerGstin: details.customerGstin,
        customerState,
        customerStateCode: details.customerStateCode,
      });
      setCheckoutOpen(false);
      setCart([]); // clean slate for the next customer
      // Saving is done & independent of sharing — offer share as an optional
      // next step (can also be done later from bill history).
      Alert.alert(
        'Bill saved',
        `${details.billType === 'gst' ? 'GST ' : ''}Bill #${
          bill.billNumber
        } • ${formatPrice(bill.total)}`,
        [
          {text: 'Done', style: 'cancel'},
          {text: 'Share now', onPress: () => shareSavedBill(bill)},
        ],
      );
    } finally {
      setSavingBill(false);
    }
  };

  /** Optional post-checkout share. The bill is already saved; this just builds
   *  and shares its PDF — failures here never affect the saved bill. */
  const shareSavedBill = async (bill: Bill) => {
    try {
      const profile = await ProfileService.getProfile();
      await ShareService.shareBill(bill, profile);
    } catch {
      Alert.alert(
        'Share failed',
        'The bill is saved. You can share it anytime from Bills.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <CameraScanner
        isActive={isFocused && !aModalIsOpen}
        onBarcode={processScan}
        style={styles.scanner}
      />

      <View style={styles.cartArea}>
        <View style={styles.cartHeader}>
          <AppText variant="overline" color={DukaanColors.textMuted}>
            CART{count > 0 ? ` · ${count} ITEM${count > 1 ? 'S' : ''}` : ''}
          </AppText>
          <Button
            title="＋ Manual"
            variant="secondary"
            size="sm"
            onPress={handleManualAdd}
          />
        </View>

        <FlatList
          data={cart}
          keyExtractor={i => i.barcode}
          contentContainerStyle={styles.cartList}
          keyboardShouldPersistTaps="handled"
          renderItem={({item}) => (
            <CartItemRow
              item={item}
              onIncrement={increment}
              onDecrement={decrement}
              onRemove={removeItem}
              onPriceChange={updatePrice}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyBadge}>
                <AppText style={styles.emptyGlyph}>⌷</AppText>
              </View>
              <AppText variant="h3" center>
                Scan to start
              </AppText>
              <AppText variant="bodySm" color={DukaanColors.textMuted} center>
                Barcode camera ke saamne laayein — item apne aap cart mein
                jud jaayega.
              </AppText>
            </View>
          }
        />
      </View>

      {/* Sticky total + checkout */}
      <View style={styles.bottomBar}>
        <View style={styles.totalRow}>
          <AppText variant="label" color={DukaanColors.textMuted}>
            TOTAL
          </AppText>
          <AppText variant="h1" numeric>
            {formatPrice(total)}
          </AppText>
        </View>
        <Button
          title="Done · Checkout"
          size="lg"
          block
          disabled={cart.length === 0}
          onPress={openCheckout}
        />
      </View>

      <ProductFormModal
        visible={pendingBarcode !== null}
        title="New product"
        barcode={pendingBarcode ?? undefined}
        showGst={gstEnabled}
        submitLabel="Add to cart"
        saving={savingProduct}
        onSubmit={handleSaveNewProduct}
        onCancel={handleCancelNewProduct}
      />

      <CheckoutModal
        visible={checkoutOpen}
        items={cart}
        gstEnabled={gstEnabled}
        shopStateCode={shopStateCode}
        saving={savingBill}
        onConfirm={handleConfirmCheckout}
        onCancel={() => setCheckoutOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: DukaanColors.bg},
  scanner: {height: '34%', width: '100%'},
  cartArea: {flex: 1, paddingHorizontal: Space.lg, paddingTop: Space.md},
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space.md,
  },
  cartList: {paddingBottom: Space.md, flexGrow: 1},
  empty: {
    alignItems: 'center',
    gap: Space.sm,
    marginTop: Space.xxxl,
    paddingHorizontal: Space.lg,
  },
  emptyBadge: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: Palette.orange[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xs,
  },
  emptyGlyph: {fontSize: 30, color: DukaanColors.primary},
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: DukaanColors.hairline,
    backgroundColor: DukaanColors.surface,
    padding: Space.lg,
    gap: Space.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
