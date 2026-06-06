import {getDatabase} from '../db/database';
import {Tables, ShopProfileColumns as SP} from '../db/schema';
import type {ShopProfile, ShopProfileInput} from '../models/ShopProfile';
import type {IProfileRepository} from './IProfileRepository';

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

    if (existing) {
      await db.execute(
        `UPDATE ${Tables.shopProfile} SET
           ${SP.shopType} = ?, ${SP.shopName} = ?, ${SP.phone} = ?,
           ${SP.address} = ?, ${SP.gstEnabled} = ?, ${SP.gstin} = ?,
           ${SP.state} = ?, ${SP.stateCode} = ?, ${SP.updatedAt} = ?
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
          now,
          existing.id,
        ],
      );
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
        updatedAt: now,
      };
    }

    const res = await db.execute(
      `INSERT INTO ${Tables.shopProfile}
         (${SP.shopType}, ${SP.shopName}, ${SP.phone}, ${SP.address},
          ${SP.gstEnabled}, ${SP.gstin}, ${SP.state}, ${SP.stateCode},
          ${SP.createdAt}, ${SP.updatedAt})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        input.shopType,
        input.shopName.trim(),
        input.phone.trim(),
        address,
        gstEnabled,
        gstin,
        state,
        stateCode,
        now,
        now,
      ],
    );
    return {
      id: Number(res.insertId),
      shopType: input.shopType,
      shopName: input.shopName.trim(),
      phone: input.phone.trim(),
      address,
      gstEnabled: input.gstEnabled,
      gstin,
      state,
      stateCode,
      createdAt: now,
      updatedAt: now,
    };
  }
}

/** Shared instance used across the app. */
export const profileRepository: IProfileRepository = new ProfileRepository();
