import {getDatabase} from '../db/database';
import {Tables, AuthSessionColumns as AS} from '../db/schema';
import type {AuthSession} from '../models/AuthUser';
import type {IAuthRepository} from './IAuthRepository';

/**
 * op-sqlite implementation of IAuthRepository. The only place that knows the
 * auth_session SQL. Single-row table: a fresh login replaces any prior row.
 */
class AuthRepository implements IAuthRepository {
  async getSession(): Promise<AuthSession | null> {
    const db = await getDatabase();
    const res = await db.execute(
      `SELECT * FROM ${Tables.authSession} ORDER BY ${AS.id} ASC LIMIT 1;`,
    );
    const row = (res.rows ?? [])[0];
    if (!row) {
      return null;
    }
    return {
      user: {
        id: String(row[AS.userId]),
        phone: String(row[AS.phone]),
        displayName:
          row[AS.displayName] != null ? String(row[AS.displayName]) : null,
      },
      signedInAt: Number(row[AS.signedInAt]),
    };
  }

  async saveSession(session: AuthSession): Promise<void> {
    const db = await getDatabase();
    // Single-row table: clear then insert, so the latest login is the only row.
    await db.execute(`DELETE FROM ${Tables.authSession};`);
    await db.execute(
      `INSERT INTO ${Tables.authSession}
         (${AS.userId}, ${AS.phone}, ${AS.displayName}, ${AS.signedInAt})
       VALUES (?, ?, ?, ?);`,
      [
        session.user.id,
        session.user.phone,
        session.user.displayName,
        session.signedInAt,
      ],
    );
  }

  async clearSession(): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM ${Tables.authSession};`);
  }
}

/** Shared instance used across the app. */
export const authRepository: IAuthRepository = new AuthRepository();
