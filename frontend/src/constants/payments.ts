/**
 * Payment status + mode (Phase F).
 *
 * Every bill is either fully paid or unpaid (udhaar). Partial payments are a
 * later refinement — for now a bill is one or the other. A paid bill optionally
 * records how it was paid (cash / UPI / card); an udhaar bill carries the debt
 * against a saved customer until it's cleared.
 */

export type PaymentStatus = 'paid' | 'unpaid';

/** How a paid bill was settled. null on an udhaar (unpaid) bill. */
export type PaymentMode = 'cash' | 'upi' | 'card';

export const DEFAULT_PAYMENT_STATUS: PaymentStatus = 'paid';

import type {IconName} from '../components/ui/Icon';

export interface PaymentModeOption {
  id: PaymentMode;
  label: string;
  icon: IconName;
}

/** Choices shown in the "Received payment" sheet. */
export const PAYMENT_MODE_OPTIONS: PaymentModeOption[] = [
  {id: 'cash', label: 'Cash', icon: 'cart'},
  {id: 'upi', label: 'UPI / QR', icon: 'grid'},
  {id: 'card', label: 'Card', icon: 'tag'},
];

/** Human label for a stored payment mode (e.g. on a bill). */
export function paymentModeLabel(mode: string | null | undefined): string {
  return PAYMENT_MODE_OPTIONS.find(m => m.id === mode)?.label ?? '';
}

/** True when a bill is outstanding (udhaar). */
export function isUnpaid(status: string | null | undefined): boolean {
  return status === 'unpaid';
}
