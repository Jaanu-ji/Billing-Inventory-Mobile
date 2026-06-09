import type {ShopProfile, ShopProfileInput} from '../models/ShopProfile';
import type {BillingMode} from '../constants/billingModes';

/**
 * Data-access contract for the shop profile (a single row).
 * Screens depend on this interface, never on SQL.
 */
export interface IProfileRepository {
  /** The shop profile, or null if setup hasn't happened yet. */
  get(): Promise<ShopProfile | null>;

  /** Create or update the profile (upsert). Returns the saved profile. */
  save(input: ShopProfileInput): Promise<ShopProfile>;

  /** Persist the remembered billing mode (Phase E) without touching the rest. */
  setBillingMode(mode: BillingMode): Promise<void>;
}
