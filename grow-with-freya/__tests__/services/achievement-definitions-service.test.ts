/**
 * Badge definitions from the CMS arrive through delta sync and are kept on the
 * device, so badges work offline. Only what changed is sent; what the CMS
 * removed is forgotten; art the CMS names is fetched once and shown from disk.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AchievementDefinitionsService, type RemoteAchievementDefinition } from '@/services/achievement-definitions-service';
import { AssetDownloadUtils } from '@/services/asset-download-utils';
import { CacheManager } from '@/services/cache-manager';

jest.mock('@/services/asset-download-utils', () => ({
  AssetDownloadUtils: {
    normalizePath: (path: string) => (path.startsWith('assets/') ? path.substring(7) : path),
    filterUncachedAssets: jest.fn(),
    getBatchSignedUrls: jest.fn(),
    downloadAssetsInBatches: jest.fn(),
  },
}));
jest.mock('@/services/cache-manager', () => ({
  CacheManager: { getAssetUri: jest.fn() },
}));

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockDownloads = AssetDownloadUtils as jest.Mocked<typeof AssetDownloadUtils>;
const mockCache = CacheManager as jest.Mocked<typeof CacheManager>;

let store: Record<string, string>;

function definition(id: string, overrides: Partial<RemoteAchievementDefinition> = {}): RemoteAchievementDefinition {
  return {
    id,
    version: 1,
    status: 'active',
    family: 'theme',
    category: 'calm',
    rule: { kind: 'finishedCount', target: 2 },
    art: 'bearHappy',
    copy: { title: { en: id }, earned: { en: 'done' }, next: { en: 'next' } },
    checksum: `sum-${id}`,
    ...overrides,
  } as RemoteAchievementDefinition;
}

beforeEach(() => {
  store = {};
  mockStorage.getItem.mockImplementation(async (key: string) => store[key] ?? null);
  mockStorage.setItem.mockImplementation(async (key: string, value: string) => {
    store[key] = value;
  });
  mockStorage.removeItem.mockImplementation(async (key: string) => {
    delete store[key];
  });
  mockDownloads.filterUncachedAssets.mockImplementation(async (paths: string[]) => paths);
  mockDownloads.getBatchSignedUrls.mockImplementation(async (paths: string[]) => ({
    urls: paths.map(path => ({ path, signedUrl: `https://signed/${path}` })),
    failed: [],
    apiCalls: 1,
  }));
  mockDownloads.downloadAssetsInBatches.mockResolvedValue({ downloaded: 1, failed: 0, bytesDownloaded: 10, errors: [] });
  mockCache.getAssetUri.mockResolvedValue(null);
});

describe('AchievementDefinitionsService', () => {
  it('has nothing before the first sync', async () => {
    expect(await AchievementDefinitionsService.getDefinitions()).toEqual([]);
    expect(await AchievementDefinitionsService.getChecksums()).toEqual({});
  });

  it('keeps what the delta sent, and reports its checksums for the next delta', async () => {
    await AchievementDefinitionsService.applyDelta([definition('a'), definition('b')], []);

    expect((await AchievementDefinitionsService.getDefinitions()).map(d => d.id)).toEqual(['a', 'b']);
    expect(await AchievementDefinitionsService.getChecksums()).toEqual({ a: 'sum-a', b: 'sum-b' });
  });

  it('replaces a changed definition and keeps the unchanged ones', async () => {
    await AchievementDefinitionsService.applyDelta([definition('a'), definition('b')], []);

    await AchievementDefinitionsService.applyDelta([definition('a', { version: 2, checksum: 'sum-a2' })], []);

    const underTest = await AchievementDefinitionsService.getDefinitions();
    expect(underTest.map(d => [d.id, d.version])).toEqual([['a', 2], ['b', 1]]);
    expect(await AchievementDefinitionsService.getChecksums()).toEqual({ a: 'sum-a2', b: 'sum-b' });
  });

  it('forgets a definition the CMS deleted', async () => {
    await AchievementDefinitionsService.applyDelta([definition('a'), definition('b')], []);

    await AchievementDefinitionsService.applyDelta([], ['a']);

    expect((await AchievementDefinitionsService.getDefinitions()).map(d => d.id)).toEqual(['b']);
  });

  it('does not hand the checksum to the evaluator', async () => {
    await AchievementDefinitionsService.applyDelta([definition('a')], []);

    const [underTest] = await AchievementDefinitionsService.getDefinitions();

    expect(underTest).not.toHaveProperty('checksum');
  });

  it('fetches CMS art once and shows it from disk', async () => {
    mockCache.getAssetUri.mockImplementation(async (path: string) => (path === 'badges/calm.webp' ? 'file:///cache/badges/calm.webp' : null));

    await AchievementDefinitionsService.applyDelta([definition('a', { art: 'assets/badges/calm.webp' })], []);

    expect(mockDownloads.getBatchSignedUrls).toHaveBeenCalledWith(['badges/calm.webp']);
    expect(mockDownloads.downloadAssetsInBatches).toHaveBeenCalledWith([{ path: 'badges/calm.webp', signedUrl: 'https://signed/badges/calm.webp' }]);
    expect((await AchievementDefinitionsService.getDefinitions())[0].art).toBe('file:///cache/badges/calm.webp');
  });

  it('does not fetch art the app already carries, or art already on disk', async () => {
    mockDownloads.filterUncachedAssets.mockResolvedValue([]);

    await AchievementDefinitionsService.applyDelta([definition('a', { art: 'moon' }), definition('b', { art: 'assets/badges/x.webp' })], []);

    expect(mockDownloads.filterUncachedAssets).toHaveBeenCalledWith(['badges/x.webp']);
    expect(mockDownloads.getBatchSignedUrls).not.toHaveBeenCalled();
  });

  it('leaves art given as an address alone, and never looks bundled art up on disk', async () => {
    await AchievementDefinitionsService.applyDelta([definition('a', { art: 'https://cdn.example/a.webp' }), definition('b', { art: 'moon' })], []);

    const underTest = await AchievementDefinitionsService.getDefinitions();

    expect(mockDownloads.filterUncachedAssets).not.toHaveBeenCalled();
    expect(mockCache.getAssetUri).not.toHaveBeenCalled();
    expect(underTest.map(d => d.art)).toEqual(['https://cdn.example/a.webp', 'moon']);
  });

  it('keeps the definition when its art could not be fetched, so the badge shows with the default art', async () => {
    mockDownloads.getBatchSignedUrls.mockRejectedValue(new Error('offline'));

    await AchievementDefinitionsService.applyDelta([definition('a', { art: 'assets/badges/calm.webp' })], []);

    expect((await AchievementDefinitionsService.getDefinitions())[0].art).toBe('assets/badges/calm.webp');
  });

  it('tells listeners when definitions change, and not when nothing did', async () => {
    const listener = jest.fn();
    const unsubscribe = AchievementDefinitionsService.onDefinitionsUpdated(listener);

    await AchievementDefinitionsService.applyDelta([], []);
    await AchievementDefinitionsService.applyDelta([definition('a')], []);
    unsubscribe();
    await AchievementDefinitionsService.applyDelta([definition('b')], []);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('treats unreadable storage as empty rather than failing the badges', async () => {
    store['@achievement_definitions'] = '{not json';

    expect(await AchievementDefinitionsService.getDefinitions()).toEqual([]);
  });

  it('treats storage holding something other than a list as empty', async () => {
    store['@achievement_definitions'] = '{"a":1}';

    expect(await AchievementDefinitionsService.getDefinitions()).toEqual([]);
  });

  it('forgets everything on clear', async () => {
    await AchievementDefinitionsService.applyDelta([definition('a')], []);

    await AchievementDefinitionsService.clear();

    expect(await AchievementDefinitionsService.getChecksums()).toEqual({});
  });
});
