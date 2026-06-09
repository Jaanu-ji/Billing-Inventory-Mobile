/**
 * Selling units (Phase D).
 *
 * Every product / manual goods line carries a `unit` — the way it is sold:
 * counted (pcs, dozen, box…) or measured (kg, gram, litre, ml, meter, where a
 * decimal quantity like 1.5 kg or 0.5 litre is normal).
 *
 * `unit` is stored as a plain TEXT code so the data layer never needs to know
 * the catalog: an unknown/older value (or a future custom unit defined in the
 * "Other business" setup) simply renders its own code. The helpers below degrade
 * gracefully for any string — `pcs` is the safe default that matches migration
 * v9 and keeps every pre-units row behaving exactly as before.
 *
 * Business-adaptive *filtering* of this list (medical → strip/tablet, kirana →
 * kg/pcs…) is a later phase; here we expose the full common set.
 */

/** Known unit codes. Stored as TEXT, so any other string is also valid. */
export type Unit =
  | 'pcs'
  | 'kg'
  | 'g'
  | 'litre'
  | 'ml'
  | 'meter'
  | 'dozen'
  | 'box'
  | 'packet'
  | 'bora'
  | 'strip'
  | 'tablet';

/** Safe default for existing installs / when not chosen (matches migration v9). */
export const DEFAULT_UNIT: Unit = 'pcs';

export interface UnitOption {
  code: Unit;
  /** Short display label shown on chips, cart, bill ("kg", "pcs"). */
  label: string;
  /** Whether a fractional quantity makes sense (1.5 kg, 0.5 litre). */
  allowDecimal: boolean;
  /** Default +/- nudge for the stepper. Exact values come from tap-to-edit. */
  step: number;
}

/**
 * The selectable units, ordered common-first. Counted units use whole steps;
 * measured units allow decimals with a sensible nudge.
 */
export const UNIT_OPTIONS: UnitOption[] = [
  {code: 'pcs', label: 'pcs', allowDecimal: false, step: 1},
  {code: 'kg', label: 'kg', allowDecimal: true, step: 0.5},
  {code: 'g', label: 'g', allowDecimal: true, step: 50},
  {code: 'litre', label: 'litre', allowDecimal: true, step: 0.5},
  {code: 'ml', label: 'ml', allowDecimal: true, step: 50},
  {code: 'meter', label: 'meter', allowDecimal: true, step: 0.5},
  {code: 'dozen', label: 'dozen', allowDecimal: false, step: 1},
  {code: 'box', label: 'box', allowDecimal: false, step: 1},
  {code: 'packet', label: 'packet', allowDecimal: false, step: 1},
  {code: 'bora', label: 'bora', allowDecimal: false, step: 1},
  {code: 'strip', label: 'strip', allowDecimal: false, step: 1},
  {code: 'tablet', label: 'tablet', allowDecimal: false, step: 1},
];

const BY_CODE = new Map<string, UnitOption>(UNIT_OPTIONS.map(u => [u.code, u]));

/** Display label for a stored unit code (falls back to the raw code). */
export function unitLabel(code: string | null | undefined): string {
  if (!code) {
    return DEFAULT_UNIT;
  }
  return BY_CODE.get(code)?.label ?? code;
}

/** Whether a unit accepts fractional quantities. Unknown => false (counted). */
export function unitAllowsDecimal(code: string | null | undefined): boolean {
  return BY_CODE.get(code ?? '')?.allowDecimal ?? false;
}

/** The stepper nudge for a unit. Unknown => 1. */
export function unitStep(code: string | null | undefined): number {
  return BY_CODE.get(code ?? '')?.step ?? 1;
}
