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

function tokenExpiringAt(exp: number): string {
  const payload = Buffer.from(JSON.stringify({ exp, sub: 'family' })).toString('base64');

  return `header.${payload}.signature`;
}

function expiredToken(): string {
  return tokenExpiringAt(1);
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

  it('should not report a lapse for a guest, who has no tokens at all', async () => {
    (SecureStorage.getAccessToken as jest.Mock).mockResolvedValue(null);
    (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue(null);

    const underTest = await ApiClient.isAuthenticated();

    expect(underTest).toBe(false);
    expect(reportSessionLapse).not.toHaveBeenCalled();
  });

  it('should not report a lapse while the access token is still good', async () => {
    (SecureStorage.getAccessToken as jest.Mock).mockResolvedValue(tokenExpiringAt(Math.floor(Date.now() / 1000) + 3600));
    (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue('refresh');
    global.fetch = jest.fn() as any;

    const underTest = await ApiClient.isAuthenticated();

    expect(underTest).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(reportSessionLapse).not.toHaveBeenCalled();
  });

  it.each([
    ['cannot reach the server', () => Promise.reject(new TypeError('Network request failed'))],
    ['times out', () => Promise.reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))],
  ])('should keep the family signed in, reporting no lapse and keeping the tokens, when the refresh %s', async (_case, refresh) => {
    (SecureStorage.getAccessToken as jest.Mock).mockResolvedValue(expiredToken());
    (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue('refresh');
    global.fetch = jest.fn(refresh) as any;

    await ApiClient.isAuthenticated();

    expect(reportSessionLapse).not.toHaveBeenCalled();
    expect(SecureStorage.clearAuthData).not.toHaveBeenCalled();
  });
});
