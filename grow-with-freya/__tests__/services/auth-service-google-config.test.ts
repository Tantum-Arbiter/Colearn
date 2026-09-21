/**
 * Tests for AuthService Google configuration resilience.
 *
 * A missing EXPO_PUBLIC_GOOGLE_*_CLIENT_ID must never crash the login screen:
 * Google.useAuthRequest throws when the platform client id is undefined, so
 * getGoogleConfig must always return defined ids (placeholders when missing)
 * and isGoogleAuthConfigured must gate the actual sign-in flow.
 */

const ENV_KEYS = [
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
] as const;

describe('AuthService Google configuration', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {};
    ENV_KEYS.forEach((key) => {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    });
  });

  afterEach(() => {
    ENV_KEYS.forEach((key) => {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key];
      }
    });
    jest.resetModules();
  });

  const loadAuthService = () => {
    let service: typeof import('@/services/auth-service').AuthService;
    jest.isolateModules(() => {
      service = require('@/services/auth-service').AuthService;
    });
    return service!;
  };

  it('should report unconfigured when no client ids are present', () => {
    const underTest = loadAuthService();

    expect(underTest.isGoogleAuthConfigured()).toBe(false);
  });

  it('should return defined client ids even when unconfigured, so useAuthRequest never throws', () => {
    const underTest = loadAuthService();

    const config = underTest.getGoogleConfig();

    expect(config.iosClientId).toBeDefined();
    expect(config.androidClientId).toBeDefined();
    expect(config.webClientId).toBeDefined();
  });

  it('should substitute placeholders when client ids are present but empty', () => {
    ENV_KEYS.forEach((key) => {
      process.env[key] = '';
    });

    const underTest = loadAuthService();

    const config = underTest.getGoogleConfig();

    expect(config.iosClientId).toBeTruthy();
    expect(config.androidClientId).toBeTruthy();
    expect(config.webClientId).toBeTruthy();
    expect(underTest.isGoogleAuthConfigured()).toBe(false);
  });

  it('should report configured when the platform client id is provided via env', () => {
    // Jest maps react-native to react-native-web, so Platform.OS is 'web' here
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-id.apps.googleusercontent.com';
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'test-id.apps.googleusercontent.com';

    const underTest = loadAuthService();

    expect(underTest.isGoogleAuthConfigured()).toBe(true);
    expect(underTest.getGoogleConfig().iosClientId).toBe('test-id.apps.googleusercontent.com');
  });
});
