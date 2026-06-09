import React, {useCallback, useLayoutEffect, useMemo, useState} from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {type CompositeScreenProps, useFocusEffect} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ProductListItem} from '../components/ProductListItem';
import {
  ProductFormModal,
  type ProductFormSubmit,
} from '../components/ProductFormModal';
import {AppText, Chip, Input, Icon} from '../components/ui';
import {productRepository} from '../repositories/ProductRepository';
import {ProfileService} from '../services/ProfileService';
import {DukaanColors, Palette, Space} from '../constants/theme';
import type {Product} from '../models/Product';
import type {MainTabParamList, RootStackParamList} from '../navigation/types';

// A tab screen that also pushes the Scan screen onto the parent stack.
type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Products'>,
  NativeStackScreenProps<RootStackParamList>
>;

/**
 * Products list screen: shows every saved product, with search, and lets the
 * shopkeeper edit or delete entries. Reads/writes only through the repository.
 */
export function ProductsScreen({navigation}: Props): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  // Selected category filter (null = All). Phase H.
  const [category, setCategory] = useState<string | null>(null);
  // Drives whether the edit form shows GST rate + HSN fields.
  const [gstEnabled, setGstEnabled] = useState(false);
  // Drives the business-adaptive product fields (Phase H).
  const [shopType, setShopType] = useState<string | null>(null);

  // Header shortcut to add products by scanning (Phase 1 Scan screen).
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('Scan')}
          hitSlop={8}
          style={styles.headerBtn}>
          <Icon name="plus" size={16} color={DukaanColors.primary} strokeWidth={2.4} />
          <AppText variant="label" color={DukaanColors.primary}>
            Scan
          </AppText>
        </Pressable>
      ),
    });
  }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, profile] = await Promise.all([
        productRepository.getAll(),
        ProfileService.getProfile(),
      ]);
      setProducts(list);
      setGstEnabled(profile?.gstEnabled ?? false);
      setShopType(profile?.shopType ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload every time the screen comes into focus (e.g. after a new scan/save).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Distinct categories present in the catalog (sorted), for the filter chips.
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const c = p.category?.trim();
      if (c) {
        set.add(c);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // If the selected category disappears (e.g. last product deleted), ignore it.
  const activeCategory =
    category && categories.includes(category) ? category : null;

  // Client-side filter by category, then name or barcode.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => {
      if (activeCategory && p.category?.trim() !== activeCategory) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
      );
    });
  }, [products, query, activeCategory]);

  const handleEditSave = async (values: ProductFormSubmit) => {
    if (!editing) {
      return;
    }
    setSaving(true);
    try {
      await productRepository.update(editing.id, {
        name: values.name,
        price: values.price,
        gstRate: values.gstRate,
        hsnCode: values.hsnCode,
        unit: values.unit,
        category: values.category,
        attributes: values.attributes,
      });
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (product: Product) => {
    Alert.alert(
      'Delete product',
      `Delete "${product.name}"? This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await productRepository.delete(product.id);
            await load();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search name or barcode"
          prefix={<Icon name="search" size={18} color={DukaanColors.textFaint} />}
        />
      </View>

      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.filterRow}>
          <Chip
            label="All"
            variant="primary"
            active={activeCategory === null}
            onPress={() => setCategory(null)}
          />
          {categories.map(c => (
            <Chip
              key={c}
              label={c}
              variant="primary"
              active={activeCategory === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </ScrollView>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({item}) => (
          <ProductListItem
            product={item}
            onEdit={setEditing}
            onDelete={confirmDelete}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyBadge}>
                <Icon name="grid" size={30} color={DukaanColors.primary} />
              </View>
              <AppText variant="h3" center>
                {query ? 'No matches' : 'No products yet'}
              </AppText>
              <AppText variant="bodySm" color={DukaanColors.textMuted} center>
                {query
                  ? 'Koi product is search se match nahi hua.'
                  : 'Barcode scan karke apna pehla product add karein.'}
              </AppText>
            </View>
          ) : null
        }
      />

      <ProductFormModal
        visible={editing !== null}
        title="Edit product"
        initialName={editing?.name}
        initialPrice={editing?.price}
        initialGstRate={editing?.gstRate}
        initialHsnCode={editing?.hsnCode}
        initialUnit={editing?.unit}
        initialCategory={editing?.category}
        initialAttributes={editing?.attributes}
        shopType={shopType}
        showGst={gstEnabled}
        submitLabel="Save changes"
        saving={saving}
        onSubmit={handleEditSave}
        onCancel={() => setEditing(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: DukaanColors.bg},
  searchWrap: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
    paddingBottom: Space.sm,
  },
  filterRow: {
    paddingHorizontal: Space.lg,
    paddingBottom: Space.sm,
    gap: Space.sm,
  },
  listContent: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.sm,
    paddingBottom: Space.lg,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    padding: Space.xl,
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
  headerBtn: {flexDirection: 'row', alignItems: 'center', gap: 4},
});
