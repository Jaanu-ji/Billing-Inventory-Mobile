import {getDatabase} from '../db/database';
import {Tables, ShopProfileColumns as SP} from '../db/schema';
import {DEFAULT_BUSINESS_MODE, type BusinessMode} from '../constants/businessModes';
import type {BillingMode} from '../constants/billingModes';
import type {ShopProfile, ShopProfileInput} from '../models/ShopProfile';
import type {IProfileRepository} from './IProfileRepository';
import {SyncQueue} from '../services/sync/SyncQueue';

/**
 * op-sqlite implementation of IProfileRepository.
 *
 * The profile is a single row. `save` upserts: updates the existing row if one
 * exists (preserving created_at), otherwise inserts the first one.
 */
class ProfileRepository implements IProfileRepository {
  private rowToProfile(row: any): ShopProfile {
    return {
      id: Number(row[SP.id]),
      shopType: String(row[SP.shopType]),
      shopName: String(row[SP.shopName]),
      phone: String(row[SP.phone]),
      address: row[SP.address] ?? null,
      gstEnabled: Number(row[SP.gstEnabled]) === 1,
      gstin: row[SP.gstin] ?? null,
      state: row[SP.state] ?? null,
      stateCode: row[SP.stateCode] ?? null,
      // Pre-v5 rows read back via the column default ('product').
      businessMode: (row[SP.businessMode] ?? DEFAULT_BUSINESS_MODE) as BusinessMode,
      // Pre-v10 rows (or never-chosen) read back null => app derives a default.
      billingMode: (row[SP.billingMode] ?? null) as BillingMode | null,
      // Pre-v15 rows read back null => new products fall back to 'pcs'.
      defaultUnit: row[SP.defaultUnit] ?? null,
      createdAt: Number(row[SP.createdAt]),
      updatedAt: Number(row[SP.updatedAt]),
    };
  }

  async get(): Promise<ShopProfile | null> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT * FROM ${Tables.shopProfile} ORDER BY ${SP.id} ASC LIMIT 1;`,
    );
    const rows = res.rows ?? [];
    return rows.length > 0 ? this.rowToProfile(rows[0]) : null;
  }

  async save(input: ShopProfileInput): Promise<ShopProfile> {
    const db = await getDatabase();
    const now = Date.now();

    // Normalise: GST fields are only meaningful when GST is enabled.
    const gstEnabled = input.gstEnabled ? 1 : 0;
    const gstin = input.gstEnabled ? input.gstin?.trim() || null : null;
    const state = input.gstEnabled ? input.state ?? null : null;
    const stateCode = input.gstEnabled ? input.stateCode ?? null : null;
    const address = input.address?.trim() || null;

    const existing = await this.get();

    // Keep the existing mode when an edit doesn't supply one; default for new.
    const businessMode: BusinessMode =
      input.businessMode ?? existing?.businessMode ?? DEFAULT_BUSINESS_MODE;
    // Billing mode is owned by setBillingMode() (the billing screen), not the
    // profile form — preserve it across a profile save; null for a new shop.
    const billingMode: BillingMode | null = existing?.billingMode ?? null;
    // Default selling unit for new products (Phase H). Keep the existing value
    // when an edit omits it; null until chosen (=> 'pcs').
    const defaultUnit: string | null =
      input.defaultUnit ?? existing?.defaultUnit ?? null;

    if (existing) {
      await db.execute(
        `UPDATE ${Tables.shopProfile} SET
           ${SP.shopType} = ?, ${SP.shopName} = ?, ${SP.phone} = ?,
           ${SP.address} = ?, ${SP.gstEnabled} = ?, ${SP.gstin} = ?,
           ${SP.state} = ?, ${SP.stateCode} = ?, ${SP.businessMode} = ?,
           ${SP.billingMode} = ?, ${SP.defaultUnit} = ?, ${SP.updatedAt} = ?
         WHERE ${SP.id} = ?;`,
        [
          input.shopType,
          input.shopName.trim(),
          input.phone.trim(),
          address,
          gstEnabled,
          gstin,
          state,
          stateCode,
          businessMode,
          billingMode,
          defaultUnit,
          now,
          existing.id,
        ],
      );
      SyncQueue.upsert('shop_profile', existing.id);
      return {
        ...existing,
        shopType: input.shopType,
        shopName: input.shopName.trim(),
        phone: input.phone.trim(),
        address,
        gstEnabled: input.gstEnabled,
        gstin,
        state,
        stateCode,
        businessMode,
        billingMode,
        defaultUnit,
        updatedAt: now,
      };
    }

    const res = await db.execute(
      `INSERT INTO ${Tables.shopProfile}
         (${SP.shopType}, ${SP.shopName}, ${SP.phone}, ${SP.address},
          ${SP.gstEnabled}, ${SP.gstin}, ${SP.state}, ${SP.stateCode},
          ${SP.businessMode}, ${SP.billingMode}, ${SP.defaultUnit},
          ${SP.createdAt}, ${SP.updatedAt})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        input.shopType,
        input.shopName.trim(),
        input.phone.trim(),
        address,
        gstEnabled,
        gstin,
        state,
        stateCode,
        businessMode,
        billingMode,
        defaultUnit,
        now,
        now,
      ],
    );
    const id = Number(res.insertId);
    SyncQueue.upsert('shop_profile', id);
    return {
      id,
      shopType: input.shopType,
      shopName: input.shopName.trim(),
      phone: input.phone.trim(),
      address,
      gstEnabled: input.gstEnabled,
      gstin,
      state,
      stateCode,
      businessMode,
      billingMode,
      defaultUnit,
      createdAt: now,
      updatedAt: now,
    };
  }

  async setBillingMode(mode: BillingMode): Promise<void> {
    const db = await getDatabase();
    // Targeted single-column update on the one profile row — cheap, and keeps
    // the rest of the profile untouched when the shopkeeper flips modes.
    await db.execute(
      `UPDATE ${Tables.shopProfile}
         SET ${SP.billingMode} = ?, ${SP.updatedAt} = ?;`,
      [mode, Date.now()],
    );
    const profile = await this.get();
    if (profile) {
      SyncQueue.upsert('shop_profile', profile.id);
    }
  }
}

/** Shared instance used across the app. */
export const profileRepository: IProfileRepository = new ProfileRepository();
