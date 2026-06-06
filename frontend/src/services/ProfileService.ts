import {profileRepository} from '../repositories/ProfileRepository';
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
