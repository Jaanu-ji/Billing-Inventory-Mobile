import {Config} from '../constants/config';

/** Format a price with the configured currency symbol, e.g. ₹49.50 */
export function formatPrice(price: number): string {
  const amount = Number.isFinite(price) ? price : 0;
  // Show up to 2 decimals but drop trailing .00 for clean shopkeeper display.
  const text =
    Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${Config.currencySymbol}${text}`;
}

/** Format an epoch-millis timestamp as a short readable date + time. */
export function formatDateTime(epochMs: number): string {
  const d = new Date(epochMs);
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  return `${date} ${time}`;
}
