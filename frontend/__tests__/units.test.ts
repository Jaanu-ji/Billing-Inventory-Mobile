import {
  DEFAULT_UNIT,
  unitAllowsDecimal,
  unitLabel,
  unitStep,
} from '../src/constants/units';

describe('unit helpers', () => {
  it('defaults missing/unknown labels safely', () => {
    expect(DEFAULT_UNIT).toBe('pcs');
    expect(unitLabel(null)).toBe('pcs');
    expect(unitLabel('crate')).toBe('crate');
  });

  it('marks measured units decimal-capable with sensible steps', () => {
    expect(unitAllowsDecimal('kg')).toBe(true);
    expect(unitStep('kg')).toBe(0.5);
    expect(unitAllowsDecimal('pcs')).toBe(false);
    expect(unitStep('pcs')).toBe(1);
  });
});
