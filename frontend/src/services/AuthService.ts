/**
 * AuthService — the phone-OTP login behind an interface (Phase J).
 *
 * `IAuthService` is the **seam** (exactly like the repository interfaces are the
 * seam for sync): screens/App depend only on this, so the real provider can be
 * swapped in without touching the UI.
 *
 *  - **Production:** a `FirebaseAuthService` backed by `@react-native-firebase/auth`
 *    (phone auth → SMS OTP). Wiring it needs the native package + a Firebase
 *    project's `google-services.json` + a rebuild — see the template at the
 *    bottom of this file. Once added, set `Config.auth.enabled = true` and export
 *    `authService = new FirebaseAuthService()`.
 *  - **Now (scaffolding):** `MockAuthService` — no native deps, no SMS. It
 *    accepts any correctly-sized OTP and persists the session locally, so the
 *    login UI + gate are fully buildable/testable today. The session it writes is
 *    real (local), so offline billing after "login" behaves like production.
 *
 * Session persistence is local (AuthRepository → auth_session table), so after
 * the one-time login the shopkeeper stays signed in and billing works fully
 * offline. Only `requestOtp`/`verifyOtp` need network in production.
 */
import {Config} from '../constants/config';
import {isValidOtp, toE164India} from '../utils/validation';
import {authRepository} from '../repositories/AuthRepository';
import type {IAuthRepository} from '../repositories/IAuthRepository';
import type {AuthSession, OtpRequest} from '../models/AuthUser';

export interface IAuthService {
  /** The persisted session, or null when signed out. */
  getSession(): Promise<AuthSession | null>;

  /**
   * Start phone verification: send an OTP to `phoneE164` and return a handle to
   * verify it. Throws if the number isn't a valid Indian mobile.
   */
  requestOtp(phoneE164: string): Promise<OtpRequest>;

  /**
   * Verify the SMS `code` against a prior `requestOtp`. On success persists and
   * returns the session. Throws on an invalid code.
   */
  verifyOtp(request: OtpRequest, code: string): Promise<AuthSession>;

  /** Sign out and clear the local session. */
  signOut(): Promise<void>;
}

/**
 * Local mock used while Firebase isn't wired. Accepts ANY code of the configured
 * length (no real SMS is sent) and stores a local session. DO NOT ship enabled
 * with this in production — it performs no real verification.
 */
export class MockAuthService implements IAuthService {
  constructor(private readonly repo: IAuthRepository = authRepository) {}

  getSession(): Promise<AuthSession | null> {
    return this.repo.getSession();
  }

  async requestOtp(phoneE164: string): Promise<OtpRequest> {
    const e164 = toE164India(phoneE164);
    if (!e164) {
      throw new Error('Enter a valid 10-digit mobile number');
    }
    // No SMS in the mock — the verification id is just an opaque marker.
    return {verificationId: `mock:${e164}:${Date.now()}`, phoneE164: e164};
  }

  async verifyOtp(request: OtpRequest, code: string): Promise<AuthSession> {
    if (!isValidOtp(code, Config.auth.otpLength)) {
      throw new Error(`Enter the ${Config.auth.otpLength}-digit code`);
    }
    // Mock: any correctly-sized code passes. The uid is derived from the number
    // so the same phone maps to a stable id across logins.
    const digits = request.phoneE164.replace(/\D/g, '');
    const session: AuthSession = {
      user: {id: `mock-${digits}`, phone: request.phoneE164, displayName: null},
      signedInAt: Date.now(),
    };
    await this.repo.saveSession(session);
    return session;
  }

  signOut(): Promise<void> {
    return this.repo.clearSession();
  }
}

/**
 * The app's auth service. Swap this line for the Firebase-backed implementation
 * once the native package is installed:
 *
 *   export const authService: IAuthService = new FirebaseAuthService();
 *
 * --- FirebaseAuthService template (uncomment after `npm i @react-native-firebase/app
 *     @react-native-firebase/auth` + add google-services.json + rebuild) ---
 *
 *   import auth from '@react-native-firebase/auth';
 *   export class FirebaseAuthService implements IAuthService {
 *     async getSession() {
 *       const u = auth().currentUser;
 *       return u ? {user: {id: u.uid, phone: u.phoneNumber ?? '', displayName: u.displayName},
 *                   signedInAt: Date.now()} : null;
 *     }
 *     async requestOtp(phoneE164: string) {
 *       const c = await auth().signInWithPhoneNumber(phoneE164);
 *       return {verificationId: c.verificationId!, phoneE164};
 *     }
 *     async verifyOtp(req, code) {
 *       const cred = auth.PhoneAuthProvider.credential(req.verificationId, code);
 *       const {user} = await auth().signInWithCredential(cred);
 *       return {user: {id: user.uid, phone: user.phoneNumber ?? req.phoneE164, displayName: user.displayName},
 *               signedInAt: Date.now()};
 *     }
 *     signOut() { return auth().signOut(); }
 *   }
 *
 * Firebase manages its own session persistence natively; the AuthRepository row
 * is what the mock uses and what Phase K reads for the owner `user_id`.
 */
export const authService: IAuthService = new MockAuthService();
