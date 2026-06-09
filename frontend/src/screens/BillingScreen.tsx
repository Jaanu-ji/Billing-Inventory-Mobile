import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, FlatList, Pressable, StyleSheet, View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {CameraScanner} from '../components/CameraScanner';
import {CartItemRow} from '../components/CartItemRow';
import {CheckoutModal, type CheckoutDetails} from '../components/CheckoutModal';
import {
  ProductFormModal,
  type ProductFormSubmit,
} from '../components/ProductFormModal';
import {
  LineItemModal,
  type LineItemSubmit,
  type ReuseEntry,
} from '../components/LineItemModal';
import {BillingModeSheet} from '../components/BillingModeSheet';
import {QuickAddGrid, type QuickAddItem} from '../components/QuickAddGrid';
import {ParkedBillsSheet} from '../components/ParkedBillsSheet';
import {AppText, Button, Icon, Input} from '../components/ui';
import {scanService} from '../services/ScanService';
import {CartService} from '../services/CartService';
import {ProfileService} from '../services/ProfileService';
import {ShareService} from '../services/ShareService';
import {billRepository} from '../repositories/BillRepository';
import {productRepository} from '../repositories/ProductRepository';
import {manualItemRepository} from '../repositories/ManualItemRepository';
import {serviceRepository} from '../repositories/ServiceRepository';
import {customerRepository} from '../repositories/CustomerRepository';
import {parkedBillRepository} from '../repositories/ParkedBillRepository';
import type {Bill, CartItem} from '../models/Bill';
import type {Product} from '../models/Product';
import type {CustomerWithPending} from '../models/Customer';
import type {ParkedBill} from '../models/ParkedBill';
import {formatPrice, formatQuantity} from '../utils/format';
import {INDIAN_STATES} from '../constants/states';
import {DEFAULT_BUSINESS_MODE} from '../constants/businessModes';
import {
  billingModeLabel,
  deriveBillingMode,
  type BillingMode,
} from '../constants/billingModes';
import {DukaanColors, Palette, Space} from '../constants/theme';

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
  // Manual (no-barcode) goods + service line modals (Phase C3/C4).
  const [manualOpen, setManualOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [manualReuse, setManualReuse] = useState<ReuseEntry[]>([]);
  const [serviceReuse, setServiceReuse] = useState<ReuseEntry[]>([]);
  // Shop GST context, read from the profile. Drives the GST checkout options
  // and whether new products capture a GST rate.
  const [gstEnabled, setGstEnabled] = useState(false);
  const [shopStateCode, setShopStateCode] = useState<string | null>(null);
  // Business-adaptive product fields + default unit for new products (Phase H).
  const [shopType, setShopType] = useState<string | null>(null);
  const [defaultUnit, setDefaultUnit] = useState<string | null>(null);
  // How this bill is being built (Phase E). Starts from the shop's remembered /
  // derived default, switchable on the fly via the mode sheet.
  const [billingMode, setBillingMode] = useState<BillingMode>(
    deriveBillingMode(DEFAULT_BUSINESS_MODE),
  );
  const [modeSheetOpen, setModeSheetOpen] = useState(false);
  // Catalog products for list-mode quick-add + search (loaded on focus).
  const [listProducts, setListProducts] = useState<Product[]>([]);
  const [listQuery, setListQuery] = useState('');
  // Saved customers (+ pending) for the checkout customer picker (Phase F).
  const [customers, setCustomers] = useState<CustomerWithPending[]>([]);
  // Held/parked bills (Phase G).
  const [parked, setParked] = useState<ParkedBill[]>([]);
  const [parkedSheetOpen, setParkedSheetOpen] = useState(false);

  // Guards the scan handler against re-entrancy / scanning while a modal is up.
  const busyRef = useRef(false);

  const total = CartService.total(cart);
  const count = CartService.itemCount(cart);
  const countLabel = formatQuantity(count);
  const aModalIsOpen =
    pendingBarcode !== null ||
    checkoutOpen ||
    manualOpen ||
    serviceOpen ||
    modeSheetOpen ||
    parkedSheetOpen;

  // Phase E — adapt the flow to the active billing mode:
  //  scan    : camera + manual goods button
  //  list    : no camera; quick-add tiles + search + "Add item"
  //  service : services only (no camera/goods)
  //  mixed   : camera + manual + service
  const showScanner = billingMode === 'scan' || billingMode === 'mixed';
  const showList = billingMode === 'list';
  // (service mode is the remaining branch — no flag needed.)
  // Cart-header add buttons (list mode adds via its own panel instead).
  const headerManual = billingMode === 'scan' || billingMode === 'mixed';
  const headerService = billingMode === 'service' || billingMode === 'mixed';

  // Map saved manual items / services into the modal's reuse shape; also keep
  // the product catalog for list-mode quick-add + search.
  const loadReuse = useCallback(async () => {
    const [manual, services, products, custs, parkedList] = await Promise.all([
      manualItemRepository.getAll(),
      serviceRepository.getAll(),
      productRepository.getAll(),
      customerRepository.getAllWithPending(),
      parkedBillRepository.getAll(),
    ]);
    setListProducts(products);
    setCustomers(custs);
    setParked(parkedList);
    setManualReuse(
      manual.map(m => ({
        id: m.id,
        name: m.name,
        price: m.price,
        gstRate: m.gstRate,
        code: m.hsnCode,
        unit: m.unit,
      })),
    );
    setServiceReuse(
      services.map(s => ({
        id: s.id,
        name: s.name,
        price: s.price,
        gstRate: s.gstRate,
        code: s.sacCode,
      })),
    );
  }, []);

  // Refresh GST context + reuse lists on focus (profile/catalog may have changed).
  useEffect(() => {
    if (isFocused) {
      ProfileService.getProfile().then(p => {
        setGstEnabled(p?.gstEnabled ?? false);
        setShopStateCode(p?.stateCode ?? null);
        setShopType(p?.shopType ?? null);
        setDefaultUnit(p?.defaultUnit ?? null);
        // Active billing mode = remembered choice, else derived from what the
        // shop sells (Phase E).
        setBillingMode(
          p?.billingMode ??
            deriveBillingMode(p?.businessMode ?? DEFAULT_BUSINESS_MODE),
        );
      });
      loadReuse();
    }
  }, [isFocused, loadReuse]);

  /** Switch billing mode for this bill and remember it (best-effort persist). */
  const switchMode = (mode: BillingMode) => {
    setBillingMode(mode);
    setModeSheetOpen(false);
    ProfileService.setBillingMode(mode).catch(err => {
      if (__DEV__) {
        console.warn('Billing mode persist failed', err);
      }
    });
  };

  // Quick-add candidates for list mode: recent catalog products + saved manual
  // items, filtered by the search box. Tapping a tile drops the line in the cart.
  const quickAddItems = useMemo<QuickAddItem[]>(() => {
    const q = listQuery.trim().toLowerCase();
    const fromProducts: QuickAddItem[] = listProducts.map(p => ({
      key: `product:${p.id}`,
      kind: 'product',
      id: p.id,
      name: p.name,
      price: p.price,
      unit: p.unit,
    }));
    const fromManual: QuickAddItem[] = manualReuse.map(m => ({
      key: `manual:${m.id}`,
      kind: 'manual',
      id: m.id,
      name: m.name,
      price: m.price,
      unit: m.unit ?? 'pcs',
    }));
    const all = [...fromProducts, ...fromManual];
    const matched = q ? all.filter(i => i.name.toLowerCase().includes(q)) : all;
    // A few favourites when idle; a wider set while actively searching.
    return matched.slice(0, q ? 8 : 6);
  }, [listProducts, manualReuse, listQuery]);

  /** Add a quick-add tile to the cart (product line or manual goods line). */
  const handleQuickAdd = (item: QuickAddItem) => {
    if (item.kind === 'product') {
      const product = listProducts.find(p => p.id === item.id);
      if (product) {
        setCart(c => CartService.addProduct(c, product));
      }
      return;
    }
    const manual = manualReuse.find(m => m.id === item.id);
    if (manual) {
      setCart(c =>
        CartService.addManual(c, {
          name: manual.name,
          price: manual.price,
          gstRate: manual.gstRate,
          hsnCode: manual.code,
          unit: manual.unit,
        }),
      );
    }
  };

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
        unit: values.unit,
        category: values.category,
        attributes: values.attributes,
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

  // Cart row controls (keyed by the stable cart line key).
  const increment = (key: string, step: number) =>
    setCart(c => CartService.changeQuantity(c, key, step));
  const decrement = (key: string, step: number) =>
    setCart(c => CartService.changeQuantity(c, key, -step));
  const removeItem = (key: string) =>
    setCart(c => CartService.removeItem(c, key));
  // Inline price edit on a cart line (snapshot only; catalog untouched).
  const updatePrice = (key: string, price: number) =>
    setCart(c => CartService.setPrice(c, key, price));
  const updateQuantity = (key: string, quantity: number) =>
    setCart(c => CartService.setQuantity(c, key, quantity));

  // Manual (no-barcode) goods — add to cart, then save for reuse (best effort).
  const handleAddManual = (v: LineItemSubmit) => {
    setCart(c =>
      CartService.addManual(c, {
        name: v.name,
        price: v.price,
        gstRate: v.gstRate,
        hsnCode: v.code,
        unit: v.unit,
      }),
    );
    setManualOpen(false);
    // When GST is off the modal can't capture rate/code — omit them so a
    // previously-saved HSN/rate for this item isn't wiped on re-save.
    manualItemRepository
      .upsert({
        name: v.name,
        price: v.price,
        gstRate: gstEnabled ? v.gstRate : undefined,
        hsnCode: gstEnabled ? v.code : undefined,
        unit: v.unit,
      })
      .then(loadReuse)
      .catch(err => {
        if (__DEV__) {
          console.warn('Manual item reuse-save failed', err);
        }
      });
  };

  // Service line — add to cart, then save for reuse (best effort).
  const handleAddService = (v: LineItemSubmit) => {
    setCart(c =>
      CartService.addService(c, {
        name: v.name,
        price: v.price,
        gstRate: v.gstRate,
        hsnCode: v.code,
      }),
    );
    setServiceOpen(false);
    // When GST is off the modal can't capture rate/code — omit them so a
    // previously-saved SAC/rate for this service isn't wiped on re-save.
    serviceRepository
      .upsert({
        name: v.name,
        price: v.price,
        gstRate: gstEnabled ? v.gstRate : undefined,
        sacCode: gstEnabled ? v.code : undefined,
      })
      .then(loadReuse)
      .catch(err => {
        if (__DEV__) {
          console.warn('Service reuse-save failed', err);
        }
      });
  };

  // Hold/park the current cart so the counter can serve someone else (Phase G).
  const handlePark = () => {
    if (cart.length === 0) {
      return;
    }
    parkedBillRepository
      .park({label: 'Walk-in', items: cart})
      .then(() => {
        setCart([]);
        return loadReuse();
      })
      .catch(err => {
        if (__DEV__) {
          console.warn('Park bill failed', err);
        }
      });
  };

  // Empty the current cart (with a confirm), so the counter can start fresh.
  const handleClearAll = () => {
    if (cart.length === 0) {
      return;
    }
    Alert.alert('Clear all items?', 'Yeh bill ka saara saaman hat jaayega.', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Clear all', style: 'destructive', onPress: () => setCart([])},
    ]);
  };

  // Resume a held bill — restores its cart (replaces the current one) and removes
  // it from the parked list.
  const handleResume = async (id: number) => {
    const p = await parkedBillRepository.resume(id);
    setParkedSheetOpen(false);
    if (p) {
      setCart(p.items);
    }
    loadReuse();
  };

  const handleDeleteParked = async (id: number) => {
    await parkedBillRepository.delete(id);
    loadReuse();
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

      // Resolve the customer id (Phase F): use the picked one, else create/find
      // by phone so the udhaar ledger has someone to attach the bill to.
      let customerId = details.customerId;
      if (customerId == null && details.customerPhone.trim().length >= 10) {
        const saved = await customerRepository.upsertByPhone({
          name: details.customerName,
          phone: details.customerPhone,
        });
        customerId = saved.id;
      }

      const bill = await billRepository.create({
        customerName: details.customerName,
        customerPhone: details.customerPhone,
        items: cart,
        billType: details.billType,
        shopStateCode,
        customerGstin: details.customerGstin,
        customerState,
        customerStateCode: details.customerStateCode,
        paymentStatus: details.paymentStatus,
        paymentMode: details.paymentMode,
        customerId,
        discountType: details.discountType,
        discountValue: details.discountValue,
        roundOff: details.roundOff,
      });
      setCheckoutOpen(false);
      setCart([]); // clean slate for the next customer
      loadReuse(); // refresh customer pending for the next bill
      // Saving is done & independent of sharing — offer share as an optional
      // next step (can also be done later from bill history).
      const statusLabel =
        details.paymentStatus === 'unpaid' ? ' · Udhaar' : ' · Paid';
      Alert.alert(
        'Bill saved',
        `${details.billType === 'gst' ? 'GST ' : ''}Bill #${
          bill.billNumber
        } • ${formatPrice(bill.total)}${statusLabel}`,
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
      {/* Top row: billing-mode switcher (Phase E) + parked-bills access (Phase G). */}
      <View style={styles.topRow}>
        <View style={styles.topSide} />
        <Pressable
          style={styles.modePill}
          onPress={() => setModeSheetOpen(true)}
          hitSlop={6}>
          <AppText variant="label" color={DukaanColors.primary}>
            {billingModeLabel(billingMode)}
          </AppText>
          <Icon name="chevron-down" size={16} color={DukaanColors.primary} />
        </Pressable>
        <View style={styles.topSide}>
          {parked.length > 0 ? (
            <Pressable
              style={styles.parkedPill}
              onPress={() => setParkedSheetOpen(true)}
              hitSlop={6}>
              <Icon name="receipt" size={14} color={DukaanColors.warning} strokeWidth={2.2} />
              <AppText variant="cap" color={DukaanColors.warning}>
                {parked.length}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>

      {showScanner ? (
        <CameraScanner
          isActive={isFocused && !aModalIsOpen}
          onBarcode={processScan}
          style={styles.scanner}
        />
      ) : showList ? (
        // Scanner-free list mode: search + quick-add tiles + create-new.
        <View style={styles.listPanel}>
          <Input
            value={listQuery}
            onChangeText={setListQuery}
            placeholder="Search your items"
            prefix={<Icon name="search" size={18} color={DukaanColors.textFaint} />}
          />
          <QuickAddGrid items={quickAddItems} onAdd={handleQuickAdd} />
          <Button
            title="Add item"
            left={<Icon name="plus" size={16} color={DukaanColors.onPrimary} strokeWidth={2.4} />}
            block
            onPress={() => setManualOpen(true)}
          />
        </View>
      ) : (
        // Service-only: no scanner — prompt to add service lines instead.
        <View style={styles.serviceHeader}>
          <Icon name="wrench" size={22} color={DukaanColors.onPrimary} />
          <AppText variant="h3" color={DukaanColors.onPrimary}>
            Service bill
          </AppText>
          <AppText variant="bodySm" color={DukaanColors.onPrimary} center style={styles.serviceHeaderSub}>
            "＋ Service" se line add karein.
          </AppText>
        </View>
      )}

      <View style={styles.cartArea}>
        <View style={styles.cartHeader}>
          <View style={styles.cartHeaderLeft}>
            <AppText variant="overline" color={DukaanColors.textMuted}>
              {cart.length > 0 ? 'IN THIS BILL' : 'CART'}
            </AppText>
            {cart.length > 0 ? (
              <Pressable hitSlop={6} onPress={handleClearAll}>
                <AppText variant="cap" color={DukaanColors.danger}>
                  Clear all
                </AppText>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.addBtns}>
            {cart.length > 0 ? (
              <Button
                title="Hold"
                left={<Icon name="receipt" size={16} color={DukaanColors.ink} strokeWidth={2.2} />}
                variant="secondary"
                size="sm"
                onPress={handlePark}
              />
            ) : null}
            {headerManual ? (
              <Button
                title="Manual"
                left={<Icon name="plus" size={16} color={DukaanColors.ink} strokeWidth={2.4} />}
                variant="secondary"
                size="sm"
                onPress={() => setManualOpen(true)}
              />
            ) : null}
            {headerService ? (
              <Button
                title="Service"
                left={<Icon name="plus" size={16} color={DukaanColors.ink} strokeWidth={2.4} />}
                variant="secondary"
                size="sm"
                onPress={() => setServiceOpen(true)}
              />
            ) : null}
          </View>
        </View>

        <FlatList
          data={cart}
          keyExtractor={i => i.key}
          contentContainerStyle={styles.cartList}
          keyboardShouldPersistTaps="handled"
          renderItem={({item}) => (
            <CartItemRow
              item={item}
              onIncrement={increment}
              onDecrement={decrement}
              onRemove={removeItem}
              onPriceChange={updatePrice}
              onQuantityChange={updateQuantity}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyBadge}>
                <Icon
                  name={
                    billingMode === 'service'
                      ? 'wrench'
                      : billingMode === 'list'
                      ? 'tag'
                      : 'cart'
                  }
                  size={30}
                  color={DukaanColors.primary}
                />
              </View>
              <AppText variant="h3" center>
                {billingMode === 'service'
                  ? 'Add a service'
                  : billingMode === 'list'
                  ? 'Cart is empty'
                  : billingMode === 'mixed'
                  ? 'Scan or add to start'
                  : 'Scan to start'}
              </AppText>
              <AppText variant="bodySm" color={DukaanColors.textMuted} center>
                {billingMode === 'service'
                  ? '"＋ Service" se line add karein — cart mein jud jaayegi.'
                  : billingMode === 'list'
                  ? 'Upar se favourite tap karein, ya "Add item" se naya jodein.'
                  : 'Barcode camera ke saamne laayein — item apne aap cart mein jud jaayega.'}
              </AppText>
            </View>
          }
        />
      </View>

      {/* Sticky total + checkout */}
      <View style={styles.bottomBar}>
        <View style={styles.totalRow}>
          <AppText variant="cap" color={DukaanColors.textMuted}>
            Grand total{count > 0 ? ` · ${countLabel} qty` : ''}
          </AppText>
          <AppText variant="h1" numeric>
            {formatPrice(total)}
          </AppText>
        </View>
        <Button
          title="Checkout"
          right={<Icon name="chevron-right" size={18} color={DukaanColors.onPrimary} strokeWidth={2.4} />}
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
        initialUnit={defaultUnit ?? undefined}
        shopType={shopType}
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
        customers={customers}
        saving={savingBill}
        onConfirm={handleConfirmCheckout}
        onCancel={() => setCheckoutOpen(false)}
      />

      <LineItemModal
        visible={manualOpen}
        kind="manual"
        showGst={gstEnabled}
        reuse={manualReuse}
        onSubmit={handleAddManual}
        onCancel={() => setManualOpen(false)}
      />

      <LineItemModal
        visible={serviceOpen}
        kind="service"
        showGst={gstEnabled}
        reuse={serviceReuse}
        onSubmit={handleAddService}
        onCancel={() => setServiceOpen(false)}
      />

      <BillingModeSheet
        visible={modeSheetOpen}
        current={billingMode}
        onSelect={switchMode}
        onClose={() => setModeSheetOpen(false)}
      />

      <ParkedBillsSheet
        visible={parkedSheetOpen}
        parked={parked}
        onResume={handleResume}
        onDelete={handleDeleteParked}
        onClose={() => setParkedSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: DukaanColors.bg},
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.lg,
    marginTop: Space.sm,
  },
  topSide: {minWidth: 44, alignItems: 'flex-end'},
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: Space.md,
    borderRadius: 999,
    backgroundColor: Palette.orange[50],
  },
  parkedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Palette.amber[50],
  },
  listPanel: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
    paddingBottom: Space.sm,
    gap: Space.md,
  },
  scanner: {height: '34%', width: '100%'},
  serviceHeader: {
    backgroundColor: DukaanColors.primary,
    paddingTop: Space.xl,
    paddingBottom: Space.lg,
    paddingHorizontal: Space.lg,
    alignItems: 'center',
    gap: 4,
  },
  serviceHeaderSub: {opacity: 0.9},
  cartArea: {flex: 1, paddingHorizontal: Space.lg, paddingTop: Space.md},
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space.md,
  },
  cartHeaderLeft: {flexDirection: 'row', alignItems: 'center', gap: Space.md},
  addBtns: {flexDirection: 'row', gap: Space.sm},
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
