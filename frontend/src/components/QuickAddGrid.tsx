/**
 * QuickAddGrid (Phase E) — the ⭐ QUICK ADD tiles for scanner-free list mode.
 *
 * A grid of the shop's recent items (catalog products + saved manual goods);
 * tapping a tile (or its + button) drops that line into the cart. "Favourites"
 * here are derived from recent items — no separate pinning/storage yet. The
 * screen owns loading + the add action; this component is pure presentation.
 */
import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText, Icon, RowThumb} from './ui';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';
import {formatPrice} from '../utils/format';
import {unitLabel} from '../constants/units';

/** One quick-add candidate. `kind`/`id` let the screen build the right line. */
export interface QuickAddItem {
  /** Stable key, e.g. `product:12` / `manual:3`. */
  key: string;
  kind: 'product' | 'manual';
  /** Catalog row id (product id or manual item id). */
  id: number;
  name: string;
  price: number;
  unit: string;
}

interface Props {
  items: QuickAddItem[];
  onAdd: (item: QuickAddItem) => void;
}

/** Up-to-2-char initials for the tile thumbnail. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const text = parts
    .slice(0, 2)
    .map(w => w[0])
    .join('');
  return text ? text.toUpperCase() : '#';
}

export function QuickAddGrid({items, onAdd}: Props): React.JSX.Element | null {
  if (items.length === 0) {
    return null;
  }
  return (
    <View>
      <View style={styles.header}>
        <Icon name="tag" size={14} color={DukaanColors.gold} />
        <AppText variant="overline" color={DukaanColors.textMuted}>
          QUICK ADD
        </AppText>
      </View>
      <View style={styles.grid}>
        {items.map(item => (
          <Pressable
            key={item.key}
            onPress={() => onAdd(item)}
            style={({pressed}) => [styles.tile, pressed && styles.tilePressed]}>
            <View style={styles.tileTop}>
              <RowThumb label={initials(item.name)} />
              <View style={styles.plus}>
                <Icon name="plus" size={16} color={DukaanColors.primary} strokeWidth={2.4} />
              </View>
            </View>
            <AppText variant="bodySm" weight="700" numberOfLines={2} style={styles.name}>
              {item.name}
            </AppText>
            <AppText variant="bodySm" color={DukaanColors.textMuted} numeric>
              {formatPrice(item.price)}
              <AppText variant="cap" color={DukaanColors.textFaint}>
                {' '}/ {unitLabel(item.unit)}
              </AppText>
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Space.sm,
  },
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm},
  tile: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: DukaanColors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: DukaanColors.hairline,
    padding: 12,
    gap: 6,
  },
  tilePressed: {backgroundColor: Palette.orange[50]},
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plus: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: Palette.orange[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {color: DukaanColors.ink, minHeight: 34},
});
