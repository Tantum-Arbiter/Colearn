/**
 * The version the app reports, in its headers and on Grown-ups, comes from the
 * build itself. The gateway rejects a request without a semantic version, so
 * when the bundle's config carries none it falls back to the installed app's
 * own, never to a number written into the code.
 */

const mockApplication: { nativeApplicationVersion: string | null; nativeBuildVersion: string | null } = {
  nativeApplicationVersion: '1.2.0',
  nativeBuildVersion: '42',
};

jest.mock('expo-application', () => ({
  get nativeApplicationVersion() {
    return mockApplication.nativeApplicationVersion;
  },
  get nativeBuildVersion() {
    return mockApplication.nativeBuildVersion;
  },
}));

const mockConstants: { expoConfig: { version?: string } | null } = { expoConfig: { version: '1.2.0' } };

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockConstants.expoConfig;
    },
    manifest: null,
    manifest2: null,
  },
}));

const { DeviceInfoService } = jest.requireActual('../../services/device-info-service');

describe('DeviceInfoService version', () => {
  afterEach(() => {
    mockConstants.expoConfig = { version: '1.2.0' };
    mockApplication.nativeApplicationVersion = '1.2.0';
    mockApplication.nativeBuildVersion = '42';
  });

  it('reports the version the bundle was built with', () => {
    expect(DeviceInfoService.getAppVersion()).toBe('1.2.0');
  });

  it('falls back to the installed app\'s own version when the bundle carries none', () => {
    mockConstants.expoConfig = null;
    mockApplication.nativeApplicationVersion = '1.3.1';

    expect(DeviceInfoService.getAppVersion()).toBe('1.3.1');
  });

  it('labels the version with the store build for Grown-ups', () => {
    expect(DeviceInfoService.getVersionLabel()).toBe('1.2.0 (42)');
  });

  it('labels the version alone when the build is unknown', () => {
    mockApplication.nativeBuildVersion = null;

    expect(DeviceInfoService.getVersionLabel()).toBe('1.2.0');
  });
});
