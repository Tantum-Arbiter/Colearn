/**
 * When the API client cannot keep the family signed in, it says so: the
 * tokens go and the lapse is reported, so the app can ask for a login.
 */

import { ApiClient } from '@/services/api-client';
import { SecureStorage } from '@/services/secure-storage';
import { reportSessionLapse } from '@/services/session-lapse';

jest.mock('@/services/session-lapse', () => ({ reportSessionLapse: jest.fn() }));
jest.mock('@/services/secure-storage', () => ({
  SecureStorage: {
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    clearAuthData: jest.fn(() => Promise.resolve()),
    saveAuthData: jest.fn(() => Promise.resolve()),
  },
}));

function expiredToken(): string {
  const payload = Buffer.from(JSON.stringify({ exp: 1, sub: 'family' })).toString('base64');

  return `header.${payload}.signature`;
}

describe('ApiClient reporting a session lapse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should report a lapse, and clear the tokens, when the server refuses to refresh', async () => {
    (SecureStorage.getAccessToken as jest.Mock).mockResolvedValue(expiredToken());
    (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue('stale-refresh');
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) })) as any;

    const underTest = await ApiClient.isAuthenticated();

    expect(underTest).toBe(false);
    expect(SecureStorage.clearAuthData).toHaveBeenCalled();
    expect(reportSessionLapse).toHaveBeenCalled();
  });

  it('should report a lapse when there is no refresh token to try', async () => {
    (SecureStorage.getAccessToken as jest.Mock).mockResolvedValue(expiredToken());
    (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue(null);

    await expect(ApiClient.refreshToken()).rejects.toThrow();

    expect(reportSessionLapse).toHaveBeenCalled();
  });

  it('should not report a lapse while the tokens are still good', async () => {
    (SecureStorage.getAccessToken as jest.Mock).mockResolvedValue(null);
    (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue(null);

    const underTest = await ApiClient.isAuthenticated();

    expect(underTest).toBe(false);
    expect(reportSessionLapse).not.toHaveBeenCalled();
  });
});
