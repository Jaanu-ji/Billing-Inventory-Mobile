import type {AuthSession} from '../models/AuthUser';

/**
 * Local persistence for the login session (Phase J). Screens/services depend on
 * this interface, never on SQL. The session is a single row, like the profile.
 */
export interface IAuthRepository {
  /** The persisted session, or null if not signed in. */
  getSession(): Promise<AuthSession | null>;

  /** Persist (replace) the current session. */
  saveSession(session: AuthSession): Promise<void>;

  /** Remove the session (sign out). */
  clearSession(): Promise<void>;
}
