/**
 * Signing in hands the provider's token to the gateway and returns the
 * gateway's session. A refusal, a slow gateway or a cancelled sheet each
 * surface as a clear error, never a hang or a half-signed-in state.
 */

jest.mock('expo-constants', () => ({ expoConfig: { extra: { gatewayUrl: 'https://gateway.test' } } }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  isAvailableAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
jest.mock('@/services/device-info-service', () => ({
  DeviceInfoService: { getDeviceHeaders: () => ({ 'X-Client-Platform': 'ios', 'X-Client-Version': '1.4.0', 'X-Device-ID': 'device-1234' }) },
}));

import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { AuthService } from '@/services/auth-service';

const session = {
  success: true,
  user: { id: 'u1', email: 'a@b.c', name: 'A', provider: 'google' },
  tokens: { accessToken: 'access', refreshToken: 'refresh', expiresIn: 900 },
  message: 'ok',
};

function respond(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  });
}

function hangUntilAborted() {
  return (_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    });
}

describe('AuthService.completeGoogleSignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should post the Google token with the device headers and return the session', async () => {
    global.fetch = jest.fn(() => respond(200, session)) as jest.Mock;

    const underTest = await AuthService.completeGoogleSignIn('google-id-token');

    expect(underTest).toEqual(session);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://gateway.test/auth/google');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ idToken: 'google-id-token' });
    expect(init.headers).toEqual(expect.objectContaining({
      'Content-Type': 'application/json',
      'X-Client-Platform': 'ios',
      'X-Device-ID': 'device-1234',
    }));
  });

  it.each([401, 429, 500, 503])('should throw with the gateway reason when it answers %i', async (status) => {
    global.fetch = jest.fn(() => respond(status, 'provider token rejected')) as jest.Mock;

    await expect(AuthService.completeGoogleSignIn('bad')).rejects.toThrow('Authentication failed: provider token rejected');
  });

  it('should pass a network failure through', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as jest.Mock;

    await expect(AuthService.completeGoogleSignIn('t')).rejects.toThrow('Network request failed');
  });

  describe('when the gateway is slow', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('should give up after three seconds with a friendly message', async () => {
      global.fetch = jest.fn(hangUntilAborted()) as jest.Mock;

      const pending = AuthService.completeGoogleSignIn('t');
      const assertion = expect(pending).rejects.toThrow('Login timed out. Please try again.');
      jest.advanceTimersByTime(3000);

      await assertion;
    });

    it('should still be waiting just before three seconds', async () => {
      global.fetch = jest.fn(hangUntilAborted()) as jest.Mock;
      let settled = false;

      AuthService.completeGoogleSignIn('t').catch(() => undefined).finally(() => { settled = true; });
      jest.advanceTimersByTime(2999);
      for (let i = 0; i < 10; i++) await Promise.resolve();

      expect(settled).toBe(false);
      jest.advanceTimersByTime(1);
    });
  });
});

describe('AuthService.signInWithApple', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should post the Apple token, code and name, and return the session', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
      identityToken: 'apple-id-token',
      authorizationCode: 'code',
      fullName: { givenName: 'Ada', familyName: 'Lovelace' },
    });
    global.fetch = jest.fn(() => respond(200, session)) as jest.Mock;

    const underTest = await AuthService.signInWithApple();

    expect(underTest).toEqual(session);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://gateway.test/auth/apple');
    expect(JSON.parse(init.body)).toEqual({
      idToken: 'apple-id-token',
      authorizationCode: 'code',
      userInfo: { name: 'Ada Lovelace' },
    });
  });

  it.each([
    ['no name at all', null, undefined],
    ['a given name only', { givenName: 'Ada', familyName: null }, { name: 'Ada' }],
    ['a family name only', { givenName: null, familyName: 'Lovelace' }, { name: 'Lovelace' }],
  ])('should send %s correctly', async (_label, fullName, userInfo) => {
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({ identityToken: 't', authorizationCode: 'c', fullName });
    global.fetch = jest.fn(() => respond(200, session)) as jest.Mock;

    await AuthService.signInWithApple();

    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).userInfo).toEqual(userInfo);
  });

  it('should report a cancelled Apple sheet and never call the gateway', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue(Object.assign(new Error('x'), { code: 'ERR_CANCELED' }));
    global.fetch = jest.fn() as jest.Mock;

    await expect(AuthService.signInWithApple()).rejects.toThrow('Apple sign-in was cancelled');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should throw with the gateway reason when it refuses the Apple token', async () => {
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({ identityToken: 't', authorizationCode: 'c', fullName: null });
    global.fetch = jest.fn(() => respond(401, 'invalid apple token')) as jest.Mock;

    await expect(AuthService.signInWithApple()).rejects.toThrow('Authentication failed: invalid apple token');
  });
});

describe('AuthService.isAppleSignInAvailable', () => {
  const originalOs = Platform.OS;
  afterEach(() => { Platform.OS = originalOs; });

  it('should ask the device on iOS', async () => {
    Platform.OS = 'ios';
    (AppleAuthentication.isAvailableAsync as jest.Mock).mockResolvedValue(true);

    await expect(AuthService.isAppleSignInAvailable()).resolves.toBe(true);
  });

  it('should say no on Android without asking', async () => {
    Platform.OS = 'android';
    (AppleAuthentication.isAvailableAsync as jest.Mock).mockClear();

    await expect(AuthService.isAppleSignInAvailable()).resolves.toBe(false);
    expect(AppleAuthentication.isAvailableAsync).not.toHaveBeenCalled();
  });
});
