/**
 * Auth logic tests (Phase J) — pure, no DB / no native Firebase.
 * Covers phone→E.164 normalisation, OTP validation, and the MockAuthService
 * flow against an in-memory session repository.
 */
import {toE164India, isValidOtp} from '../src/utils/validation';
import {MockAuthService} from '../src/services/AuthService';
import type {IAuthRepository} from '../src/repositories/IAuthRepository';
import type {AuthSession} from '../src/models/AuthUser';

describe('toE164India', () => {
  it('normalises a bare 10-digit mobile', () => {
    expect(toE164India('9876543210')).toBe('+919876543210');
    expect(toE164India('98765 43210')).toBe('+919876543210');
  });
  it('strips a 0 trunk prefix and an existing 91 / +91 code', () => {
    expect(toE164India('09876543210')).toBe('+919876543210');
    expect(toE164India('919876543210')).toBe('+919876543210');
    expect(toE164India('+91 98765 43210')).toBe('+919876543210');
  });
  it('rejects non-mobile / malformed input', () => {
    expect(toE164India('5876543210')).toBeNull(); // must start 6-9
    expect(toE164India('12345')).toBeNull();
    expect(toE164India('')).toBeNull();
    expect(toE164India(null)).toBeNull();
  });
});

describe('isValidOtp', () => {
  it('accepts an exact-length numeric code', () => {
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('0000', 4)).toBe(true);
  });
  it('rejects wrong length or non-digits', () => {
    expect(isValidOtp('12345')).toBe(false);
    expect(isValidOtp('12345a')).toBe(false);
    expect(isValidOtp('')).toBe(false);
  });
});

class MemAuthRepo implements IAuthRepository {
  session: AuthSession | null = null;
  async getSession() {
    return this.session;
  }
  async saveSession(s: AuthSession) {
    this.session = s;
  }
  async clearSession() {
    this.session = null;
  }
}

describe('MockAuthService', () => {
  it('requestOtp rejects an invalid number', async () => {
    const svc = new MockAuthService(new MemAuthRepo());
    await expect(svc.requestOtp('12345')).rejects.toThrow();
  });

  it('requestOtp normalises the number into the handle', async () => {
    const svc = new MockAuthService(new MemAuthRepo());
    const req = await svc.requestOtp('9876543210');
    expect(req.phoneE164).toBe('+919876543210');
    expect(req.verificationId).toContain('+919876543210');
  });

  it('verifyOtp rejects a wrong-length code', async () => {
    const svc = new MockAuthService(new MemAuthRepo());
    const req = await svc.requestOtp('9876543210');
    await expect(svc.verifyOtp(req, '123')).rejects.toThrow();
  });

  it('verifyOtp persists a session and getSession returns it; signOut clears', async () => {
    const repo = new MemAuthRepo();
    const svc = new MockAuthService(repo);
    const req = await svc.requestOtp('9876543210');
    const session = await svc.verifyOtp(req, '123456');
    expect(session.user.phone).toBe('+919876543210');
    expect(session.user.id).toBe('mock-919876543210');
    expect(await svc.getSession()).toEqual(session);

    await svc.signOut();
    expect(await svc.getSession()).toBeNull();
  });
});
