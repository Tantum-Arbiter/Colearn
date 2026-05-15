import { StoryDownloadService, DownloadResult } from '../../services/story-download-service';
import { StoryAccessService } from '../../services/story-access-service';
import { CatalogService } from '../../services/catalog-service';
import { AssetDownloadUtils } from '../../services/asset-download-utils';
import { CacheManager } from '../../services/cache-manager';
import { ApiClient } from '../../services/api-client';
import { CatalogEntry, Story } from '../../types/story';

jest.mock('../../services/cache-manager');
jest.mock('../../services/api-client');
jest.mock('../../services/asset-download-utils');

// In-memory AsyncStorage mock for CatalogService & StoryAccessService
const asyncStorageStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(asyncStorageStore[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    asyncStorageStore[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete asyncStorageStore[key];
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach(k => delete asyncStorageStore[k]);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(asyncStorageStore).forEach(k => delete asyncStorageStore[k]);
    return Promise.resolve();
  }),
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }),
}));

const mockCacheManager = CacheManager as jest.Mocked<typeof CacheManager>;
const mockApiClient = ApiClient as jest.Mocked<typeof ApiClient>;
const mockAssetUtils = AssetDownloadUtils as jest.Mocked<typeof AssetDownloadUtils>;

// Test fixtures
const freeCatalogEntry: CatalogEntry = {
  storyId: 'free-story',
  title: 'Free Story',
  category: 'adventure',
  emoji: '🗺️',
  isFree: true,
  isReferralReward: false,
  isPremium: false,
};

const premiumCatalogEntry: CatalogEntry = {
  storyId: 'premium-story',
  title: 'Premium Story',
  category: 'fantasy',
  emoji: '✨',
  isFree: false,
  isReferralReward: false,
  isPremium: true,
};

const referralCatalogEntry: CatalogEntry = {
  storyId: 'referral-story',
  title: 'Referral Story',
  category: 'bedtime',
  emoji: '🌙',
  isFree: false,
  isReferralReward: true,
  isPremium: false,
};

const mockStory: Story = {
  id: 'free-story',
  title: 'Free Story',
  category: 'adventure',
  tag: 'adventure',
  emoji: '🗺️',
  isAvailable: true,
  coverImage: 'assets/stories/free-story/cover.webp',
  checksum: 'abc123',
  pages: [
    {
      id: 'p1',
      pageNumber: 1,
      text: 'Page one',
      backgroundImage: 'assets/stories/free-story/bg1.webp',
    },
  ],
};

// ===================== StoryAccessService =====================
describe('StoryAccessService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(asyncStorageStore).forEach(k => delete asyncStorageStore[k]);
  });

  it('should allow free stories', async () => {
    const result = await StoryAccessService.canDownload(freeCatalogEntry);
    expect(result.allowed).toBe(true);
  });

  it('should deny premium stories without subscription', async () => {
    const result = await StoryAccessService.canDownload(premiumCatalogEntry);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('subscription_required');
  });

  it('should deny referral stories without unlock or subscription', async () => {
    const result = await StoryAccessService.canDownload(referralCatalogEntry);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('referral_required');
  });

  it('should allow referral stories after granting unlock', async () => {
    await StoryAccessService.grantReferralUnlock('referral-story');
    const result = await StoryAccessService.canDownload(referralCatalogEntry);
    expect(result.allowed).toBe(true);
  });

  it('should track download count', async () => {
    const count1 = await StoryAccessService.recordDownload();
    const count2 = await StoryAccessService.recordDownload();
    expect(count2).toBe(count1 + 1);
  });

  it('should clear access state', async () => {
    await StoryAccessService.grantReferralUnlock('some-story');
    await StoryAccessService.clearAccessState();
    const unlocks = await StoryAccessService.getReferralUnlocks();
    expect(unlocks).toEqual([]);
  });
});

// ===================== CatalogService =====================
describe('CatalogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(asyncStorageStore).forEach(k => delete asyncStorageStore[k]);
  });

  const sampleCatalog: CatalogEntry[] = [
    freeCatalogEntry,
    premiumCatalogEntry,
    referralCatalogEntry,
  ];

  it('should store and retrieve catalog', async () => {
    await CatalogService.updateCatalog(sampleCatalog);
    const catalog = await CatalogService.getCatalog();
    expect(catalog).toHaveLength(3);
  });

  it('should filter by category', async () => {
    await CatalogService.updateCatalog(sampleCatalog);
    const filtered = await CatalogService.getFilteredCatalog({ category: 'adventure' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].storyId).toBe('free-story');
  });

  it('should filter by isFree', async () => {
    await CatalogService.updateCatalog(sampleCatalog);
    const filtered = await CatalogService.getFilteredCatalog({ isFree: true });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].storyId).toBe('free-story');
  });

  it('should filter by search text', async () => {
    await CatalogService.updateCatalog(sampleCatalog);
    const filtered = await CatalogService.getFilteredCatalog({ searchText: 'premium' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].storyId).toBe('premium-story');
  });

  it('should sort by title', async () => {
    await CatalogService.updateCatalog(sampleCatalog);
    const sorted = await CatalogService.getFilteredCatalog(
      undefined,
      { field: 'title', order: 'asc' }
    );
    expect(sorted[0].title).toBe('Free Story');
    expect(sorted[2].title).toBe('Referral Story');
  });

  it('should remove entry from catalog', async () => {
    await CatalogService.updateCatalog(sampleCatalog);
    await CatalogService.removeEntry('free-story');
    const catalog = await CatalogService.getCatalog();
    expect(catalog).toHaveLength(2);
    expect(catalog.find(e => e.storyId === 'free-story')).toBeUndefined();
  });

  it('should get catalog summary', async () => {
    await CatalogService.updateCatalog(sampleCatalog);
    const summary = await CatalogService.getCatalogSummary();
    expect(summary.total).toBe(3);
    expect(summary.free).toBe(1);
    expect(summary.premium).toBe(1);
    expect(summary.referralReward).toBe(1);
  });

  it('should return empty catalog when none stored', async () => {
    await CatalogService.clearCatalog();
    const catalog = await CatalogService.getCatalog();
    expect(catalog).toEqual([]);
  });

  it('should get a single entry by storyId', async () => {
    await CatalogService.updateCatalog(sampleCatalog);
    const entry = await CatalogService.getEntry('premium-story');
    expect(entry).not.toBeNull();
    expect(entry!.title).toBe('Premium Story');
  });

  it('should return null for unknown storyId', async () => {
    await CatalogService.updateCatalog(sampleCatalog);
    const entry = await CatalogService.getEntry('nonexistent');
    expect(entry).toBeNull();
  });

  it('should get available categories', async () => {
    await CatalogService.updateCatalog(sampleCatalog);
    const categories = await CatalogService.getCategories();
    expect(categories).toContain('adventure');
    expect(categories).toContain('fantasy');
    expect(categories).toContain('bedtime');
  });
});

// ===================== StoryDownloadService =====================
describe('StoryDownloadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(asyncStorageStore).forEach(k => delete asyncStorageStore[k]);
    // Reset active downloads map
    (StoryDownloadService as any).activeDownloads = new Map();
  });

  it('should download a free story successfully', async () => {
    // Mock the API call for story download
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    // Mock asset extraction
    mockAssetUtils.extractAssetPaths.mockReturnValue(['stories/free-story/cover.webp', 'stories/free-story/bg1.webp']);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue(['stories/free-story/cover.webp', 'stories/free-story/bg1.webp']);
    mockAssetUtils.getBatchSignedUrls.mockResolvedValue({
      urls: [
        { path: 'stories/free-story/cover.webp', signedUrl: 'https://signed-url-1' },
        { path: 'stories/free-story/bg1.webp', signedUrl: 'https://signed-url-2' },
      ],
      failed: [],
      apiCalls: 1,
    });
    mockAssetUtils.downloadAssetsInBatches.mockResolvedValue({
      downloaded: 2,
      failed: 0,
      bytesDownloaded: 2048,
      errors: [],
    });
    mockAssetUtils.formatBytes.mockReturnValue('2 KB');
    mockCacheManager.updateStories.mockResolvedValue();
    mockCacheManager.getStory.mockResolvedValue(null); // Not yet cached

    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    expect(result.success).toBe(true);
    expect(result.storyId).toBe('free-story');
    expect(result.assetsDownloaded).toBe(2);
    expect(result.assetsFailed).toBe(0);
    expect(mockCacheManager.updateStories).toHaveBeenCalledWith([mockStory]);
    expect(mockApiClient.request).toHaveBeenCalledWith(
      '/api/stories/free-story/download',
      { method: 'GET' }
    );
  });

  it('should deny download of premium story without subscription', async () => {
    const result = await StoryDownloadService.downloadStory('premium-story', premiumCatalogEntry);
    expect(result.success).toBe(false);
    expect(result.error).toBe('subscription_required');
    // Should not call API
    expect(mockApiClient.request).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    mockApiClient.request.mockRejectedValueOnce(new Error('Network error'));

    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should handle story with all assets already cached', async () => {
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue(['stories/free-story/cover.webp']);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue([]); // All cached
    mockCacheManager.updateStories.mockResolvedValue();

    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    expect(result.success).toBe(true);
    expect(result.assetsDownloaded).toBe(0);
    // Should NOT call getBatchSignedUrls since nothing needs download
    expect(mockAssetUtils.getBatchSignedUrls).not.toHaveBeenCalled();
  });

  it('should handle partial asset download failures', async () => {
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue(['cover.webp', 'bg1.webp']);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue(['cover.webp', 'bg1.webp']);
    mockAssetUtils.getBatchSignedUrls.mockResolvedValue({
      urls: [{ path: 'cover.webp', signedUrl: 'https://url1' }],
      failed: ['bg1.webp'], // 1 URL failed
      apiCalls: 1,
    });
    mockAssetUtils.downloadAssetsInBatches.mockResolvedValue({
      downloaded: 1,
      failed: 0,
      bytesDownloaded: 1024,
      errors: [],
    });
    mockAssetUtils.formatBytes.mockReturnValue('1 KB');
    mockCacheManager.updateStories.mockResolvedValue();

    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    // Story still succeeds even with partial asset failures
    expect(result.success).toBe(true);
    expect(result.assetsDownloaded).toBe(1);
    expect(result.assetsFailed).toBe(1); // bg1.webp failed URL generation
  });

  it('should deduplicate concurrent downloads of same story', async () => {
    let resolveFirst: (value: Story) => void;
    const slowPromise = new Promise<Story>((resolve) => { resolveFirst = resolve; });
    mockApiClient.request.mockReturnValueOnce(slowPromise as any);
    mockAssetUtils.extractAssetPaths.mockReturnValue([]);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue([]);
    mockCacheManager.updateStories.mockResolvedValue();

    // Start two downloads simultaneously
    const download1 = StoryDownloadService.downloadStory('free-story', freeCatalogEntry);
    const download2 = StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    // Resolve the API call
    resolveFirst!(mockStory);

    const [result1, result2] = await Promise.all([download1, download2]);
    // Both should get the same result (deduped)
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    // API should only be called once
    expect(mockApiClient.request).toHaveBeenCalledTimes(1);
  });

  it('should report isDownloading state', async () => {
    expect(StoryDownloadService.isDownloading('free-story')).toBe(false);
  });

  it('should check isDownloaded from cache', async () => {
    mockCacheManager.getStory.mockResolvedValue(mockStory);
    expect(await StoryDownloadService.isDownloaded('free-story')).toBe(true);

    mockCacheManager.getStory.mockResolvedValue(null);
    expect(await StoryDownloadService.isDownloaded('nonexistent')).toBe(false);
  });

  it('should report progress through callback', async () => {
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue([]);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue([]);
    mockCacheManager.updateStories.mockResolvedValue();

    const phases: string[] = [];
    await StoryDownloadService.downloadStory('free-story', freeCatalogEntry, (progress) => {
      phases.push(progress.phase);
    });

    expect(phases).toContain('access-check');
    expect(phases).toContain('fetching-story');
    expect(phases).toContain('saving');
    expect(phases).toContain('complete');
  });
});
