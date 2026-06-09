/**
 * Business mode — what the shop primarily sells. Captured during onboarding
 * (Phase C1) and stored on the shop profile (migration v5). Drives the default
 * billing experience in Phase C6 (product => scan, service => service lines,
 * mixed => both).
 *
 * This is independent of `shopType` (kirana/medical/…): a kirana is a product
 * business, a salon/repair shop is a service business, a restaurant is mixed.
 */
export type BusinessMode = 'product' | 'service' | 'mixed';

/** Safe default for existing installs / when not chosen (matches migration v5). */
export const DEFAULT_BUSINESS_MODE: BusinessMode = 'product';

export interface BusinessModeOption {
  id: BusinessMode;
  label: string;
  /** Short Hinglish helper shown under the label. */
  subtitle: string;
}

export const BUSINESS_MODES: BusinessModeOption[] = [
  {id: 'product', label: 'Products', subtitle: 'Saman bechte hain (barcode/manual)'},
  {id: 'service', label: 'Services', subtitle: 'Sevaayein dete hain (kaam/charge)'},
  {id: 'mixed', label: 'Both', subtitle: 'Products + services, dono'},
];

/** Human label for a stored business-mode id. */
export function businessModeLabel(id: string | null | undefined): string {
  return BUSINESS_MODES.find(m => m.id === id)?.label ?? 'Products';
}
