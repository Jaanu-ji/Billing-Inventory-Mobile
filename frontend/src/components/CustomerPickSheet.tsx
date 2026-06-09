/**
 * CustomerPickSheet (Phase F) — pick a saved customer or add a new one
 * (screenshot 21). Used at checkout to attach a customer to the bill (required
 * for udhaar). Returns a selection; the caller upserts it (by phone) at save.
 */
import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {AppText, Badge, BottomSheet, Button, Field, Input, Icon} from './ui';
import {DukaanColors, Palette, Space} from '../constants/theme';
import {formatPrice} from '../utils/format';
import type {CustomerWithPending} from '../models/Customer';

/** A chosen customer. `id` is null for a brand-new one (created on save). */
export interface CustomerSelection {
  id: number | null;
  name: string;
  phone: string;
}

interface Props {
  visible: boolean;
  customers: CustomerWithPending[];
  onPick: (sel: CustomerSelection) => void;
  onClose: () => void;
}

export function CustomerPickSheet({
  visible,
  customers,
  onPick,
  onClose,
}: Props): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset to the list view each time the sheet (re)opens.
  React.useEffect(() => {
    if (visible) {
      setQuery('');
      setAdding(false);
      setNewName('');
      setNewPhone('');
      setError(null);
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? customers.filter(
          c =>
            c.name.toLowerCase().includes(q) || c.phone.includes(q),
        )
      : customers;
  }, [customers, query]);

  const confirmNew = () => {
    const name = newName.trim();
    const phone = newPhone.trim();
    if (!name) {
      setError('Naam daalein');
      return;
    }
    if (phone.length < 10) {
      setError('Sahi number daalein');
      return;
    }
    onPick({id: null, name, phone});
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="h2">Customer</AppText>
      <AppText variant="bodySm" color={DukaanColors.textMuted} style={styles.sub}>
        {adding ? 'Add a new customer' : 'Pick a saved customer or add new'}
      </AppText>

      {adding ? (
        <View>
          <Field label="Name" style={styles.block}>
            <Input value={newName} onChangeText={setNewName} placeholder="e.g. Rohit Verma" autoFocus />
          </Field>
          <Field label="Phone" style={styles.block}>
            <Input
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="e.g. 98765 43210"
              keyboardType="phone-pad"
              maxLength={10}
            />
          </Field>
          {error ? (
            <AppText variant="cap" color={DukaanColors.danger} style={styles.error}>
              {error}
            </AppText>
          ) : null}
          <View style={styles.actions}>
            <Button title="Back" variant="outline" onPress={() => setAdding(false)} style={styles.actionBtn} />
            <Button title="Use customer" onPress={confirmNew} style={styles.actionBtn} />
          </View>
        </View>
      ) : (
        <View>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or phone…"
            prefix={<Icon name="search" size={18} color={DukaanColors.textFaint} />}
            containerStyle={styles.block}
          />
          <Button
            title="Add new customer"
            variant="outline"
            left={<Icon name="plus" size={16} color={DukaanColors.primary} strokeWidth={2.4} />}
            block
            onPress={() => setAdding(true)}
          />

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {filtered.map(c => (
              <Pressable
                key={c.id}
                onPress={() => onPick({id: c.id, name: c.name, phone: c.phone})}
                style={({pressed}) => [styles.row, pressed && styles.rowPressed]}>
                <View style={styles.info}>
                  <AppText variant="body" weight="700" numberOfLines={1}>
                    {c.name}
                  </AppText>
                  <AppText variant="bodySm" color={DukaanColors.textMuted}>
                    {c.phone}
                  </AppText>
                </View>
                {c.pending > 0 ? (
                  <Badge variant="unpaid">{`${formatPrice(c.pending)} baaki`}</Badge>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sub: {marginTop: 2, marginBottom: Space.md},
  block: {marginBottom: Space.md},
  list: {maxHeight: 320, marginTop: Space.md},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: DukaanColors.hairline,
  },
  rowPressed: {backgroundColor: Palette.orange[50]},
  info: {flex: 1, gap: 2},
  actions: {flexDirection: 'row', marginTop: Space.sm, gap: Space.md},
  actionBtn: {flex: 1},
  error: {marginTop: -Space.sm, marginBottom: Space.md},
});
