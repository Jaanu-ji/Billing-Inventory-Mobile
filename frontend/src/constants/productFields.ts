/**
 * Business-adaptive product fields (Phase H).
 *
 * Different shops describe their stock differently — a medical store needs a
 * batch number and expiry, a garment shop needs size and colour, a kirana needs
 * nothing extra. Rather than a column per business, these extra fields are
 * stored in the product's free-form `attributes` map; this module says WHICH
 * fields to show (and the section label) for a given shop type.
 *
 * Add a business's fields here = the product form adapts automatically.
 */
export interface ProductAttrField {
  /** Stable key stored in `product.attributes`. */
  key: string;
  label: string;
  placeholder?: string;
}

interface AttrSpec {
  /** Heading over the adaptive block (e.g. "MEDICAL DETAILS", "VARIANTS"). */
  section: string;
  fields: ProductAttrField[];
}

const SPECS: Record<string, AttrSpec> = {
  medical: {
    section: 'Medical details',
    fields: [
      {key: 'batch', label: 'Batch no.', placeholder: 'e.g. DL2207'},
      {key: 'expiry', label: 'Expiry', placeholder: 'MM/YY'},
    ],
  },
  garment: {
    section: 'Variants',
    fields: [
      {key: 'size', label: 'Size(s)', placeholder: 'e.g. S, M, L'},
      {key: 'color', label: 'Colour', placeholder: 'e.g. Navy'},
    ],
  },
  footwear: {
    section: 'Variants',
    fields: [
      {key: 'size', label: 'Size(s)', placeholder: 'e.g. 7, 8, 9'},
      {key: 'color', label: 'Colour', placeholder: 'e.g. Black'},
    ],
  },
};

/** Adaptive attribute fields for a shop type (empty when none apply). */
export function attributeFieldsFor(shopType: string | null | undefined): ProductAttrField[] {
  return shopType ? SPECS[shopType]?.fields ?? [] : [];
}

/** Section heading for the adaptive block, or null when there are no fields. */
export function attributeSectionLabel(shopType: string | null | undefined): string | null {
  return shopType ? SPECS[shopType]?.section ?? null : null;
}

/** Compact one-line summary of set attributes, for list rows (e.g. "S, M, L · Navy"). */
export function summariseAttributes(
  attributes: Record<string, string> | null | undefined,
): string {
  if (!attributes) {
    return '';
  }
  return Object.values(attributes)
    .map(v => v?.trim())
    .filter(Boolean)
    .join(' · ');
}

/**
 * Set attributes paired with their human labels, for a bill/invoice line.
 * Ordered by the shop type's field config first (so "Batch" precedes "Expiry"),
 * then any leftover keys (e.g. the shop type changed since the sale) labelled by
 * their raw key. Only non-blank values are returned.
 */
export function labelAttributes(
  shopType: string | null | undefined,
  attributes: Record<string, string> | null | undefined,
): {label: string; value: string}[] {
  if (!attributes) {
    return [];
  }
  const fields = attributeFieldsFor(shopType);
  const labelByKey = new Map(fields.map(f => [f.key, f.label]));
  const out: {label: string; value: string}[] = [];
  const used = new Set<string>();
  for (const f of fields) {
    const v = attributes[f.key]?.trim();
    if (v) {
      out.push({label: f.label, value: v});
      used.add(f.key);
    }
  }
  for (const [k, v] of Object.entries(attributes)) {
    if (!used.has(k) && !labelByKey.has(k)) {
      const t = v?.trim();
      if (t) {
        out.push({label: k, value: t});
      }
    }
  }
  return out;
}
