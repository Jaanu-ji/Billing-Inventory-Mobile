import React, {useState} from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Colors, FontSize, Radius, Spacing} from '../constants/theme';

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
 * Simple, dependency-free dropdown: a tappable field that opens a modal list.
 * Reused for shop type and state selection.
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
  const selected = options.find(o => o.value === value);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.field}
        activeOpacity={0.8}
        onPress={() => setOpen(true)}>
        <Text style={selected ? styles.valueText : styles.placeholder}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={o => o.value}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}>
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.optionSelected,
                    ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  field: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueText: {color: Colors.text, fontSize: FontSize.md},
  placeholder: {color: Colors.textMuted, fontSize: FontSize.md},
  chevron: {color: Colors.textMuted, fontSize: FontSize.md},
  error: {color: Colors.danger, fontSize: FontSize.sm, marginTop: Spacing.xs},
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    maxHeight: '70%',
  },
  sheetTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '800',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  option: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  optionText: {color: Colors.text, fontSize: FontSize.md},
  optionSelected: {color: Colors.primary, fontWeight: '800'},
});
