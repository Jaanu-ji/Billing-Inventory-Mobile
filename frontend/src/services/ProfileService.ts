import {profileRepository} from '../repositories/ProfileRepository';
import {
  DEFAULT_BUSINESS_MODE,
  type BusinessMode,
} from '../constants/businessModes';
import {
  deriveBillingMode,
  type BillingMode,
} from '../constants/billingModes';
import type {ShopProfile, ShopProfileInput} from '../models/ShopProfile';

/**
 * Thin façade over ProfileRepository with a small in-memory cache.
 *
 * This is the single, clean place the rest of the app asks "what's the shop
 * profile?" and "is GST on?". The next part (GST billing) calls
 * `ProfileService.isGstEnabled()` to decide which bill type to offer — it never
 * needs to know about the DB.
 */
class ProfileServiceImpl {
  private cache: ShopProfile | null = null;
  private loaded = false;

  /** Returns the profile (cached after first load). null until setup is done. */
  async getProfile(): Promise<ShopProfile | null> {
    if (!this.loaded) {
      this.cache = await profileRepository.get();
      this.loaded = true;
    }
    return this.cache;
  }

  /** True only if a profile exists AND GST is turned on. Safe default: false. */
  async isGstEnabled(): Promise<boolean> {
    // Phase 2 next: GST billing reads this flag to enable/disable GST (pakka) bills.
    const profile = await this.getProfile();
    return profile?.gstEnabled ?? false;
  }

  /** True if first-launch setup has been completed. */
  async hasProfile(): Promise<boolean> {
    return (await this.getProfile()) !== null;
  }

  /**
   * What the shop sells (Phase C1). Drives the default billing flow in C6.
   * Safe default: 'product' when no profile yet.
   */
  async getBusinessMode(): Promise<BusinessMode> {
    const profile = await this.getProfile();
    return profile?.businessMode ?? DEFAULT_BUSINESS_MODE;
  }

  /**
   * The shop's active billing mode (Phase E): the stored choice if any, else a
   * sensible default derived from what the shop sells. Safe default: 'scan'.
   */
  async getBillingMode(): Promise<BillingMode> {
    const profile = await this.getProfile();
    if (!profile) {
      return deriveBillingMode(DEFAULT_BUSINESS_MODE);
    }
    return profile.billingMode ?? deriveBillingMode(profile.businessMode);
  }

  /**
   * Remember the shopkeeper's billing-mode switch. Persists + updates the cache
   * so the next bill opens the same way. Best-effort — callers must never let
   * this block billing.
   */
  async setBillingMode(mode: BillingMode): Promise<void> {
    await profileRepository.setBillingMode(mode);
    if (this.cache) {
      this.cache = {...this.cache, billingMode: mode};
    }
  }

  /** Save the profile and refresh the cache. */
  async saveProfile(input: ShopProfileInput): Promise<ShopProfile> {
    this.cache = await profileRepository.save(input);
    this.loaded = true;
    return this.cache;
  }

  /** Force a reload on next access (e.g. after external changes). */
  invalidate(): void {
    this.loaded = false;
    this.cache = null;
  }
}

export const ProfileService = new ProfileServiceImpl();
