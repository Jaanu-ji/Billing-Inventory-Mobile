/**
 * Billing mode (Phase E) — how the shopkeeper builds the CURRENT bill.
 *
 * This is distinct from `businessMode` (what the shop sells — product/service/
 * mixed, captured at onboarding). One shop can bill different ways at different
 * times (kabhi scan, kabhi loose), so the billing mode is switchable on the
 * billing screen and remembered (persisted on `shop_profile.billing_mode`,
 * migration v10) so the next bill opens the same way.
 *
 *   scan    — camera barcode scan (packaged goods).
 *   list    — scanner-free: search + quick-add tiles, no camera (loose goods,
 *             sabzi/chai/kirana-without-barcodes).
 *   service — service-only: manual line items + saved services (no camera).
 *   mixed   — products + services on one bill (camera + manual + service).
 */
import type {BusinessMode} from './businessModes';
import type {IconName} from '../components/ui/Icon';

export type BillingMode = 'scan' | 'list' | 'service' | 'mixed';

/** Fallback when nothing is stored/derivable. */
export const DEFAULT_BILLING_MODE: BillingMode = 'scan';

export interface BillingModeOption {
  id: BillingMode;
  label: string;
  /** Short helper shown under the label in the mode-switch sheet. */
  subtitle: string;
  icon: IconName;
}

export const BILLING_MODE_OPTIONS: BillingModeOption[] = [
  {
    id: 'scan',
    label: 'Scan / Barcode',
    subtitle: 'Camera scan for packaged goods',
    icon: 'scan',
  },
  {
    id: 'list',
    label: 'List / Scanner-free',
    subtitle: 'Search + tap, for loose goods, no camera',
    icon: 'grid',
  },
  {
    id: 'service',
    label: 'Service only',
    subtitle: 'Manual line items, saved services',
    icon: 'wrench',
  },
  {
    id: 'mixed',
    label: 'Mixed',
    subtitle: 'Products + services on one bill',
    icon: 'layers',
  },
];

/**
 * Default billing mode for a shop that hasn't explicitly chosen one — derived
 * from what it sells: a product shop scans, a service shop bills services, a
 * mixed shop does both. (A loose-goods product shop can switch to `list` once;
 * the choice is then remembered.)
 */
export function deriveBillingMode(mode: BusinessMode): BillingMode {
  switch (mode) {
    case 'service':
      return 'service';
    case 'mixed':
      return 'mixed';
    default:
      return 'scan';
  }
}

/** Human label for a stored billing-mode id. */
export function billingModeLabel(id: string | null | undefined): string {
  return BILLING_MODE_OPTIONS.find(m => m.id === id)?.label ?? 'Scan / Barcode';
}
