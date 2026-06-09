/**
 * Domain models for authentication (Phase J).
 *
 * The app gates behind a phone-OTP login (Firebase Auth in production; a local
 * mock during scaffolding — see services/AuthService). Once signed in, the
 * session is persisted locally so the shopkeeper stays logged in and billing
 * keeps working **fully offline** — only the initial login needs network.
 */

/** The signed-in shopkeeper. `id` is the auth provider's stable uid. */
export interface AuthUser {
  /** Stable provider uid (Firebase uid; mock id during scaffolding). */
  id: string;
  /** E.164 phone number (e.g. "+919876543210"). */
  phone: string;
  /** Optional display name (not captured by phone auth; reserved). */
  displayName: string | null;
}

/** A persisted login session. */
export interface AuthSession {
  user: AuthUser;
  /** Unix epoch millis when the session was established. */
  signedInAt: number;
}

/**
 * Opaque handle returned by `requestOtp` and passed back to `verifyOtp`.
 * Wraps the provider's verification id (Firebase `confirmation.verificationId`)
 * plus the number the code was sent to.
 */
export interface OtpRequest {
  verificationId: string;
  phoneE164: string;
}
