import React, {useCallback, useLayoutEffect, useState} from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
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
import {productRepository} from '../repositories/ProductRepository';
import {ProfileService} from '../services/ProfileService';
import {Colors, FontSize, Spacing} from '../constants/theme';
import type {Product} from '../models/Product';
import type {MainTabParamList, RootStackParamList} from '../navigation/types';

// A tab screen that also pushes the Scan screen onto the parent stack.
type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Products'>,
  NativeStackScreenProps<RootStackParamList>
>;

/**
 * Products list screen: shows every saved product and lets the shopkeeper
 * edit or delete entries. Reads/writes only through the repository.
 */
export function ProductsScreen({navigation}: Props): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  // Drives whether the edit form shows GST rate + HSN fields.
  const [gstEnabled, setGstEnabled] = useState(false);

  // Header shortcut to add products by scanning (Phase 1 Scan screen).
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Scan')}>
          <Text style={styles.headerBtn}>+ Scan</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, gst] = await Promise.all([
        productRepository.getAll(),
        ProfileService.isGstEnabled(),
      ]);
      setProducts(list);
      setGstEnabled(gst);
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
      <FlatList
        data={products}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
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
              <Text style={styles.emptyText}>No products yet.</Text>
              <Text style={styles.emptySub}>
                Scan a barcode to add your first product.
              </Text>
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
  container: {flex: 1, backgroundColor: Colors.background},
  headerBtn: {color: Colors.primary, fontSize: FontSize.md, fontWeight: '700'},
  listContent: {padding: Spacing.md, flexGrow: 1},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl},
  emptyText: {color: Colors.text, fontSize: FontSize.lg, fontWeight: '700'},
  emptySub: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
