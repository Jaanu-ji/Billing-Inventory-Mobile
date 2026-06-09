/**
 * Business-adaptive product fields (Phase H) — pure helpers, no DB.
 */
import {
  attributeFieldsFor,
  attributeSectionLabel,
  labelAttributes,
  summariseAttributes,
} from '../src/constants/productFields';

describe('attributeFieldsFor', () => {
  it('gives medical shops batch + expiry', () => {
    const keys = attributeFieldsFor('medical').map(f => f.key);
    expect(keys).toEqual(['batch', 'expiry']);
  });

  it('gives garment + footwear shops size + colour', () => {
    expect(attributeFieldsFor('garment').map(f => f.key)).toEqual([
      'size',
      'color',
    ]);
    expect(attributeFieldsFor('footwear').map(f => f.key)).toEqual([
      'size',
      'color',
    ]);
  });

  it('gives a plain shop type (kirana) no extra fields', () => {
    expect(attributeFieldsFor('kirana')).toEqual([]);
  });

  it('degrades safely for unknown / null shop types', () => {
    expect(attributeFieldsFor('something-new')).toEqual([]);
    expect(attributeFieldsFor(null)).toEqual([]);
    expect(attributeFieldsFor(undefined)).toEqual([]);
  });
});

describe('attributeSectionLabel', () => {
  it('labels the adaptive block per shop type', () => {
    expect(attributeSectionLabel('medical')).toBe('Medical details');
    expect(attributeSectionLabel('garment')).toBe('Variants');
  });

  it('is null when there are no adaptive fields', () => {
    expect(attributeSectionLabel('kirana')).toBeNull();
    expect(attributeSectionLabel(null)).toBeNull();
  });
});

describe('summariseAttributes', () => {
  it('joins set values with a separator, in order', () => {
    expect(summariseAttributes({size: 'M', color: 'Navy'})).toBe('M · Navy');
  });

  it('drops blank / whitespace-only values', () => {
    expect(summariseAttributes({size: 'L', color: '   '})).toBe('L');
  });

  it('returns empty string for no attributes', () => {
    expect(summariseAttributes({})).toBe('');
    expect(summariseAttributes(null)).toBe('');
    expect(summariseAttributes(undefined)).toBe('');
  });
});

describe('labelAttributes', () => {
  it('pairs values with their shop-type labels, in config order', () => {
    // Stored out of order; output follows the medical field order (batch, expiry).
    expect(
      labelAttributes('medical', {expiry: '12/26', batch: 'DL2207'}),
    ).toEqual([
      {label: 'Batch no.', value: 'DL2207'},
      {label: 'Expiry', value: '12/26'},
    ]);
  });

  it('skips blank values', () => {
    expect(labelAttributes('garment', {size: 'M', color: '  '})).toEqual([
      {label: 'Size(s)', value: 'M'},
    ]);
  });

  it('labels leftover keys (shop type changed) by their raw key', () => {
    // kirana has no configured fields, so a stored attribute falls back to key.
    expect(labelAttributes('kirana', {warranty: '1yr'})).toEqual([
      {label: 'warranty', value: '1yr'},
    ]);
  });

  it('is empty for no attributes', () => {
    expect(labelAttributes('medical', {})).toEqual([]);
    expect(labelAttributes('medical', null)).toEqual([]);
    expect(labelAttributes(null, {batch: 'X'})).toEqual([
      {label: 'batch', value: 'X'},
    ]);
  });
});
