/**
 * A request the gateway answers with 204 No Content resolves with nothing,
 * rather than failing to read a body that is not there.
 */

import { ApiClient } from '@/services/api-client';
import { SecureStorage } from '@/services/secure-storage';

jest.mock('@/services/session-lapse', () => ({ reportSessionLapse: jest.fn() }));
jest.mock('@/services/secure-storage', () => ({
  SecureStorage: {
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    clearAuthData: jest.fn(() => Promise.resolve()),
  },
}));

function freshToken(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, sub: 'family' })).toString('base64');
  return `header.${payload}.signature`;
}

describe('ApiClient and an empty answer', () => {
  beforeEach(() => {
    (SecureStorage.getAccessToken as jest.Mock).mockResolvedValue(freshToken());
    (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue('refresh');
  });

  it('resolves a 204 with nothing', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      status: 204,
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    })) as any;

    await expect(ApiClient.request('/api/stories/snowy/download', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('still reads the body of a 200', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id: 'snowy' }) })) as any;

    await expect(ApiClient.request('/api/stories/snowy/download')).resolves.toEqual({ id: 'snowy' });
  });
});
