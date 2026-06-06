/**
 * Shop profile validation tests (Phase 2 Part 2) — pure logic.
 */
import {validateProfileForm} from '../src/utils/validation';

const base = {
  shopType: 'kirana',
  shopName: 'Sharma Store',
  phone: '9876543210',
  gstEnabled: false,
  gstin: '',
  stateCode: '',
};

describe('validateProfileForm', () => {
  it('requires shop type, name and phone', () => {
    const r = validateProfileForm({
      ...base,
      shopType: '',
      shopName: '  ',
      phone: '',
    });
    expect(r.valid).toBe(false);
    expect(r.errors.shopType).toBeDefined();
    expect(r.errors.shopName).toBeDefined();
    expect(r.errors.phone).toBeDefined();
  });

  it('passes for a non-GST shop with the basics filled', () => {
    const r = validateProfileForm(base);
    expect(r.valid).toBe(true);
  });

  it('requires GSTIN + state only when GST is enabled', () => {
    const r = validateProfileForm({...base, gstEnabled: true});
    expect(r.valid).toBe(false);
    expect(r.errors.gstin).toBeDefined();
    expect(r.errors.state).toBeDefined();
  });

  it('flags a GSTIN that is not 15 characters', () => {
    const r = validateProfileForm({
      ...base,
      gstEnabled: true,
      gstin: '27ABCDE',
      stateCode: '27',
    });
    expect(r.errors.gstin).toBeDefined();
  });

  it('accepts a valid GST shop', () => {
    const r = validateProfileForm({
      ...base,
      gstEnabled: true,
      gstin: '27ABCDE1234F1Z5',
      stateCode: '27',
    });
    expect(r.valid).toBe(true);
  });
});
