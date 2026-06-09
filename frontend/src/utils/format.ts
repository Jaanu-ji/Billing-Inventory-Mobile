import {Config} from '../constants/config';

/** Format a price with the configured currency symbol, e.g. ₹49.50 */
export function formatPrice(price: number): string {
  const amount = Number.isFinite(price) ? price : 0;
  // Show up to 2 decimals but drop trailing .00 for clean shopkeeper display.
  const text =
    Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${Config.currencySymbol}${text}`;
}

/**
 * Format a (possibly fractional) quantity for display: whole numbers show
 * plain (2), fractional units trim trailing zeros (1.5, 1.25), capped at 3
 * decimals so float drift never leaks (1.250000001 -> 1.25).
 */
export function formatQuantity(qty: number): string {
  const n = Number.isFinite(qty) ? qty : 0;
  if (Number.isInteger(n)) {
    return String(n);
  }
  return String(parseFloat(n.toFixed(3)));
}

/** Format an epoch-millis timestamp as a short readable date + time. */
export function formatDateTime(epochMs: number): string {
  const d = new Date(epochMs);
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  return `${date} ${time}`;
}
