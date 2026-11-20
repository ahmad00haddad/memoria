import { describe, it, expect } from 'vitest';
import { isTrackToken } from '../validation';

// دوال الخادم (reconcilePaymentStatus, getGalleryByToken …) لا تعمل خارج بيئة TanStack Start،
// فنختبر المتحقق المشترك الذي تستخدمه كلها لرمز الرابط.
describe('Security: track token validator', () => {
  it('rejects short tokens', () => {
    expect(isTrackToken('short')).toBe(false);
  });
  it('rejects SQL injection patterns', () => {
    expect(isTrackToken("validtoken123456'; DROP TABLE users;--")).toBe(false);
  });
  it('rejects spaces and symbols', () => {
    expect(isTrackToken('invalid token!')).toBe(false);
  });
  it('rejects non-strings', () => {
    expect(isTrackToken(undefined)).toBe(false);
    expect(isTrackToken(1234567890123456 as any)).toBe(false);
  });
  it('accepts a real-looking token', () => {
    expect(isTrackToken('aB3_dE5-fG7hI9jK1lM')).toBe(true);
  });
});
