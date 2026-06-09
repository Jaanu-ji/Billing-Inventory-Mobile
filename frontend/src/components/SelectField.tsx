import React, {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {AppText, BottomSheet, Field, Input, Row, Select, Icon} from './ui';
import {DukaanColors, Space} from '../constants/theme';

export interface SelectOption {
  label: string;
  value: string;
}

interface Props {
  label: string;
  placeholder?: string;
  /** Currently selected value (matches an option's `value`), or null. */
  value: string | null;
  options: SelectOption[];
  onSelect: (value: string) => void;
  error?: string;
}

/**
 * Light dropdown (DUKAAN styling): a tappable Select that opens a searchable
 * bottom sheet of options. Same props/contract as before — reused for shop type
 * and state selection in the profile form.
 */
export function SelectField({
  label,
  placeholder = 'Select…',
  value,
  options,
  onSelect,
  error,
}: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find(o => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  // Only show the search box for longer lists (e.g. states), not short ones.
  const searchable = options.length > 8;

  return (
    <View style={styles.wrap}>
      <Field label={label}>
        <Select
          value={selected?.label ?? null}
          placeholder={placeholder}
          onPress={() => {
            setQuery('');
            setOpen(true);
          }}
        />
      </Field>
      {error ? (
        <AppText variant="cap" color={DukaanColors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <AppText variant="h3" style={styles.sheetTitle}>
          {label}
        </AppText>
        {searchable ? (
          <Input
            placeholder="Search"
            value={query}
            onChangeText={setQuery}
            containerStyle={styles.search}
          />
        ) : null}
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {filtered.map(o => (
            <Row
              key={o.value}
              title={o.label}
              onPress={() => {
                onSelect(o.value);
                setOpen(false);
              }}
              right={
                o.value === value ? (
                  <Icon name="check" size={18} color={DukaanColors.primary} strokeWidth={2.4} />
                ) : undefined
              }
              divider
            />
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: Space.xs},
  error: {marginTop: 2},
  sheetTitle: {marginBottom: Space.md},
  search: {marginBottom: Space.sm},
  list: {maxHeight: 360},
});
