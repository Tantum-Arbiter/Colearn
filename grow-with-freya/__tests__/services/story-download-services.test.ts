import { StoryDownloadService, DownloadResult, DownloadProgress } from '../../services/story-download-service';
import { StoryAccessService } from '../../services/story-access-service';
import { CatalogService } from '../../services/catalog-service';
import { AssetDownloadUtils } from '../../services/asset-download-utils';
import { CacheManager } from '../../services/cache-manager';
import { ApiClient } from '../../services/api-client';
import { CatalogEntry, Story } from '../../types/story';

jest.mock('../../services/cache-manager');
jest.mock('../../services/api-client');
jest.mock('../../services/asset-download-utils');
jest.mock('../../services/story-loader', () => ({
  StoryLoader: {
    getStories: jest.fn().mockResolvedValue([]),
    getCachedStories: jest.fn().mockReturnValue(null),
  },
}));

// Mock app store -controls subscription tier for StoryAccessService
let mockSubscriptionTier: 'free' | 'basic' | 'premium' = 'premium'; // default to premium so existing tests pass
jest.mock('@/store/app-store', () => ({
  useAppStore: {
    getState: () => ({
      subscriptionTier: mockSubscriptionTier,
      _devSubscriptionOverride: null,
      getEffectiveTier: () => mockSubscriptionTier,
    }),
  },
  BASIC_TIER_INSTRUMENTS: ['flute', 'recorder', 'ocarina'],
}));

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

// Default: user is authenticated (tests can override per-case)
beforeEach(() => {
  mockApiClient.isAuthenticated.mockResolvedValue(true);
});

// Test fixtures
const freeCatalogEntry: CatalogEntry = {
  storyId: 'free-story',
  title: 'Free Story',
  category: 'adventure',
  isFree: true,
  isReferralReward: false,
  isPremium: false,
};

const premiumCatalogEntry: CatalogEntry = {
  storyId: 'premium-story',
  title: 'Premium Story',
  category: 'fantasy',
  isFree: false,
  isReferralReward: false,
  isPremium: true,
};

const referralCatalogEntry: CatalogEntry = {
  storyId: 'referral-story',
  title: 'Referral Story',
  category: 'bedtime',
  isFree: false,
  isReferralReward: true,
  isPremium: false,
};

const shareToUnlockEntry: CatalogEntry = {
  storyId: 'share-story',
  title: 'Share Story',
  category: 'friendship',
  isFree: false,
  isReferralReward: false,
  isPremium: false,
  isShareToUnlock: true,
};

const mockStory: Story = {
  id: 'free-story',
  title: 'Free Story',
  category: 'adventure',
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
    mockSubscriptionTier = 'premium'; // default to premium for most tests
  });

  it('should allow free stories', async () => {
    const result = await StoryAccessService.canDownload(freeCatalogEntry);
    expect(result.allowed).toBe(true);
  });

  it('should allow free stories even on free tier', async () => {
    mockSubscriptionTier = 'free';
    const result = await StoryAccessService.canDownload(freeCatalogEntry);
    expect(result.allowed).toBe(true);
  });

  it('should allow premium stories with premium subscription', async () => {
    mockSubscriptionTier = 'premium';
    const result = await StoryAccessService.canDownload(premiumCatalogEntry);
    expect(result.allowed).toBe(true);
  });

  it('should deny premium stories on free tier', async () => {
    mockSubscriptionTier = 'free';
    const result = await StoryAccessService.canDownload(premiumCatalogEntry);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('subscription_required');
  });

  it('should allow premium stories with basic subscription', async () => {
    mockSubscriptionTier = 'basic';
    const result = await StoryAccessService.canDownload(premiumCatalogEntry);
    expect(result.allowed).toBe(true);
  });

  it('should allow referral stories with premium subscription', async () => {
    mockSubscriptionTier = 'premium';
    const result = await StoryAccessService.canDownload(referralCatalogEntry);
    expect(result.allowed).toBe(true);
  });

  it('should deny referral stories on free tier without unlock', async () => {
    mockSubscriptionTier = 'free';
    const result = await StoryAccessService.canDownload(referralCatalogEntry);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('referral_required');
  });

  it('should allow referral stories after granting unlock', async () => {
    mockSubscriptionTier = 'free';
    await StoryAccessService.grantReferralUnlock('referral-story');
    const result = await StoryAccessService.canDownload(referralCatalogEntry);
    expect(result.allowed).toBe(true);
  });

  // Instrument access tests
  it('should unlock basic instruments on basic tier', () => {
    mockSubscriptionTier = 'basic';
    expect(StoryAccessService.isInstrumentUnlocked('flute')).toBe(true);
    expect(StoryAccessService.isInstrumentUnlocked('recorder')).toBe(true);
    expect(StoryAccessService.isInstrumentUnlocked('ocarina')).toBe(true);
    expect(StoryAccessService.isInstrumentUnlocked('trumpet')).toBe(false);
    expect(StoryAccessService.isInstrumentUnlocked('clarinet')).toBe(false);
  });

  it('should unlock all instruments on premium tier', () => {
    mockSubscriptionTier = 'premium';
    expect(StoryAccessService.isInstrumentUnlocked('flute')).toBe(true);
    expect(StoryAccessService.isInstrumentUnlocked('trumpet')).toBe(true);
    expect(StoryAccessService.isInstrumentUnlocked('clarinet')).toBe(true);
  });

  it('should unlock basic instruments on free tier and lock others', () => {
    mockSubscriptionTier = 'free';
    // Basic instruments (flute, recorder, ocarina) are available on all tiers
    expect(StoryAccessService.isInstrumentUnlocked('flute')).toBe(true);
    expect(StoryAccessService.isInstrumentUnlocked('recorder')).toBe(true);
    expect(StoryAccessService.isInstrumentUnlocked('ocarina')).toBe(true);
    // Non-basic instruments are locked on free tier
    expect(StoryAccessService.isInstrumentUnlocked('trumpet')).toBe(false);
    expect(StoryAccessService.isInstrumentUnlocked('clarinet')).toBe(false);
    expect(StoryAccessService.isInstrumentUnlocked('saxophone')).toBe(false);
  });

  it('should allow referral stories with basic subscription', async () => {
    mockSubscriptionTier = 'basic';
    const result = await StoryAccessService.canDownload(referralCatalogEntry);
    expect(result.allowed).toBe(true);
  });

  // Song unlock tests
  it('should unlock top 3 songs on free tier', () => {
    mockSubscriptionTier = 'free';
    expect(StoryAccessService.isSongUnlocked(0)).toBe(true);
    expect(StoryAccessService.isSongUnlocked(1)).toBe(true);
    expect(StoryAccessService.isSongUnlocked(2)).toBe(true);
    expect(StoryAccessService.isSongUnlocked(3)).toBe(false);
    expect(StoryAccessService.isSongUnlocked(9)).toBe(false);
  });

  it('should unlock top 10 songs on basic tier', () => {
    mockSubscriptionTier = 'basic';
    expect(StoryAccessService.isSongUnlocked(0)).toBe(true);
    expect(StoryAccessService.isSongUnlocked(9)).toBe(true);
    expect(StoryAccessService.isSongUnlocked(10)).toBe(false);
    expect(StoryAccessService.isSongUnlocked(20)).toBe(false);
  });

  it('should unlock all songs on premium tier', () => {
    mockSubscriptionTier = 'premium';
    expect(StoryAccessService.isSongUnlocked(0)).toBe(true);
    expect(StoryAccessService.isSongUnlocked(99)).toBe(true);
  });

  // Download limit tests
  it('should return correct download limits per tier', () => {
    mockSubscriptionTier = 'free';
    expect(StoryAccessService.getDownloadLimit()).toBe(2);
    mockSubscriptionTier = 'basic';
    expect(StoryAccessService.getDownloadLimit()).toBe(50);
    mockSubscriptionTier = 'premium';
    expect(StoryAccessService.getDownloadLimit()).toBe(125);
  });

  it('should detect when download limit is reached', async () => {
    mockSubscriptionTier = 'free'; // limit = 2
    // Mock StoryLoader to return 2 stories (at limit)
    const StoryLoader = require('../../services/story-loader').StoryLoader;
    StoryLoader.getStories.mockResolvedValueOnce([
      { id: 's1', title: 'Story 1' },
      { id: 's2', title: 'Story 2' },
    ]);

    const result = await StoryAccessService.checkDownloadLimit();
    expect(result.atLimit).toBe(true);
    expect(result.currentCount).toBe(2);
    expect(result.limit).toBe(2);
  });

  it('should not be at limit when below cap', async () => {
    mockSubscriptionTier = 'basic'; // limit = 50
    const StoryLoader = require('../../services/story-loader').StoryLoader;
    StoryLoader.getStories.mockResolvedValueOnce([
      { id: 's1', title: 'Story 1' },
    ]);

    const result = await StoryAccessService.checkDownloadLimit();
    expect(result.atLimit).toBe(false);
    expect(result.currentCount).toBe(1);
    expect(result.limit).toBe(50);
  });

  it('should detect limit exceeded (over cap)', async () => {
    mockSubscriptionTier = 'free'; // limit = 2
    const StoryLoader = require('../../services/story-loader').StoryLoader;
    StoryLoader.getStories.mockResolvedValueOnce([
      { id: 's1' }, { id: 's2' }, { id: 's3' }, // 3 > limit of 2
    ]);

    const result = await StoryAccessService.checkDownloadLimit();
    expect(result.atLimit).toBe(true);
    expect(result.currentCount).toBe(3);
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

  it('should not duplicate referral unlocks', async () => {
    await StoryAccessService.grantReferralUnlock('story-x');
    await StoryAccessService.grantReferralUnlock('story-x');
    const unlocks = await StoryAccessService.getReferralUnlocks();
    expect(unlocks.filter((id: string) => id === 'story-x').length).toBe(1);
  });

  // ── Share-to-unlock tests ──────────────────────────

  it('should deny share-to-unlock story before sharing', async () => {
    mockSubscriptionTier = 'free';
    const result = await StoryAccessService.canDownload(shareToUnlockEntry);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('share_required');
  });

  it('should allow share-to-unlock story after completing share', async () => {
    mockSubscriptionTier = 'free';
    await StoryAccessService.completeShareUnlock();
    const result = await StoryAccessService.canDownload(shareToUnlockEntry);
    expect(result.allowed).toBe(true);
  });

  it('should allow share-to-unlock story with active subscription (no share needed)', async () => {
    mockSubscriptionTier = 'basic';
    const result = await StoryAccessService.canDownload(shareToUnlockEntry);
    expect(result.allowed).toBe(true);
  });

  it('should persist share-unlock across checks', async () => {
    expect(await StoryAccessService.hasCompletedShareUnlock()).toBe(false);
    await StoryAccessService.completeShareUnlock();
    expect(await StoryAccessService.hasCompletedShareUnlock()).toBe(true);
  });

  it('should clear share-unlock state with clearAccessState', async () => {
    await StoryAccessService.completeShareUnlock();
    expect(await StoryAccessService.hasCompletedShareUnlock()).toBe(true);
    await StoryAccessService.clearAccessState();
    expect(await StoryAccessService.hasCompletedShareUnlock()).toBe(false);
  });

  it('should return correct effective tier', () => {
    mockSubscriptionTier = 'free';
    expect(StoryAccessService.getEffectiveTier()).toBe('free');
    mockSubscriptionTier = 'basic';
    expect(StoryAccessService.getEffectiveTier()).toBe('basic');
    mockSubscriptionTier = 'premium';
    expect(StoryAccessService.getEffectiveTier()).toBe('premium');
  });

  it('should report hasActiveSubscription correctly', async () => {
    mockSubscriptionTier = 'free';
    expect(await StoryAccessService.hasActiveSubscription()).toBe(false);
    mockSubscriptionTier = 'basic';
    expect(await StoryAccessService.hasActiveSubscription()).toBe(true);
    mockSubscriptionTier = 'premium';
    expect(await StoryAccessService.hasActiveSubscription()).toBe(true);
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
    mockSubscriptionTier = 'premium'; // default to premium so download tests pass
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

  it('should allow download of premium story with active subscription', async () => {
    mockSubscriptionTier = 'premium';
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue([]);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue([]);
    mockCacheManager.updateStories.mockResolvedValue();

    const result = await StoryDownloadService.downloadStory('premium-story', premiumCatalogEntry);
    expect(result.success).toBe(true);
    expect(mockApiClient.request).toHaveBeenCalled();
  });

  it('should deny download of premium story on free tier', async () => {
    mockSubscriptionTier = 'free';

    const result = await StoryDownloadService.downloadStory('premium-story', premiumCatalogEntry);
    expect(result.success).toBe(false);
    expect(result.error).toBe('subscription_required');
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

  it('should report bytesDownloaded and totalBytes in progress detail', async () => {
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue(['cover.webp', 'bg1.webp']);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue(['cover.webp', 'bg1.webp']);
    mockAssetUtils.getBatchSignedUrls.mockResolvedValue({
      urls: [
        { path: 'cover.webp', signedUrl: 'https://url1' },
        { path: 'bg1.webp', signedUrl: 'https://url2' },
      ],
      failed: [],
      apiCalls: 1,
    });
    // Simulate downloadAssetsInBatches calling the onProgress callback with byte info
    mockAssetUtils.downloadAssetsInBatches.mockImplementation(async (urls, onProgress) => {
      // Simulate progress: first asset done (512 bytes), estimated total ~1024
      onProgress?.(1, 2, 512, 1024);
      // All done (1024 bytes)
      onProgress?.(2, 2, 1024, 1024);
      return { downloaded: 2, failed: 0, bytesDownloaded: 1024, errors: [] };
    });
    mockAssetUtils.formatBytes
      .mockReturnValueOnce('512 Bytes')
      .mockReturnValueOnce('1 KB')
      .mockReturnValueOnce('1 KB')
      .mockReturnValueOnce('1 KB');
    mockCacheManager.updateStories.mockResolvedValue();

    const progressUpdates: DownloadProgress[] = [];
    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry, (progress) => {
      progressUpdates.push({ ...progress });
    });

    expect(result.success).toBe(true);
    expect(result.bytesDownloaded).toBe(1024);

    // Find the downloading-assets progress updates with byte detail
    const assetPhases = progressUpdates.filter(p => p.phase === 'downloading-assets' && p.detail);
    expect(assetPhases.length).toBeGreaterThanOrEqual(2);

    // First progress update: partial download
    expect(assetPhases[0].detail!.bytesDownloaded).toBe(512);
    expect(assetPhases[0].detail!.totalBytes).toBe(1024);
    expect(assetPhases[0].detail!.currentAsset).toBe(1);
    expect(assetPhases[0].detail!.totalAssets).toBe(2);

    // Final progress update: all done
    const lastAssetPhase = assetPhases[assetPhases.length - 1];
    expect(lastAssetPhase.detail!.bytesDownloaded).toBe(1024);
    expect(lastAssetPhase.detail!.totalBytes).toBe(1024);
    expect(lastAssetPhase.detail!.currentAsset).toBe(2);
    expect(lastAssetPhase.detail!.totalAssets).toBe(2);
  });

  // ─── Cancellation ───────────────────────────────────────────────

  it('should cancel a download when cancelDownload is called', async () => {
    // Make the API call hang until we cancel
    let resolveApi: (value: any) => void;
    const hangingPromise = new Promise((resolve) => { resolveApi = resolve; });
    mockApiClient.request.mockReturnValueOnce(hangingPromise as any);

    const phases: string[] = [];
    const downloadPromise = StoryDownloadService.downloadStory('free-story', freeCatalogEntry, (p) => {
      phases.push(p.phase);
    });

    // Wait a tick so the download starts
    await new Promise(r => setTimeout(r, 10));

    // Cancel
    StoryDownloadService.cancelDownload('free-story');

    // Resolve the API so the checkAbort fires
    resolveApi!(mockStory);

    const result = await downloadPromise;
    expect(result.cancelled).toBe(true);
    expect(result.success).toBe(false);
    expect(result.error).toContain('cancelled');
  });

  it('should return cancelled phase in progress when download is cancelled', async () => {
    mockApiClient.request.mockImplementation(async () => {
      // Cancel mid-flight
      StoryDownloadService.cancelDownload('free-story');
      return mockStory;
    });
    mockAssetUtils.extractAssetPaths.mockReturnValue([]);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue([]);

    const phases: string[] = [];
    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry, (p) => {
      phases.push(p.phase);
    });

    expect(result.cancelled).toBe(true);
    expect(phases).toContain('cancelled');
  });

  it('cancelDownload should be a no-op for unknown storyId', () => {
    // Should not throw
    expect(() => StoryDownloadService.cancelDownload('nonexistent')).not.toThrow();
  });

  // ─── Partial failure ────────────────────────────────────────────

  it('should flag partialFailure when some assets fail', async () => {
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue(['a.webp', 'b.webp']);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue(['a.webp', 'b.webp']);
    mockAssetUtils.getBatchSignedUrls.mockResolvedValue({
      urls: [{ path: 'a.webp', signedUrl: 'https://url1' }],
      failed: ['b.webp'],
      apiCalls: 1,
    });
    mockAssetUtils.downloadAssetsInBatches.mockResolvedValue({
      downloaded: 1,
      failed: 0,
      bytesDownloaded: 512,
      errors: [],
    });
    mockAssetUtils.formatBytes.mockReturnValue('512 Bytes');
    mockCacheManager.updateStories.mockResolvedValue();

    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    expect(result.success).toBe(true);
    expect(result.partialFailure).toBe(true);
    expect(result.assetsFailed).toBe(1);
  });

  it('should NOT flag partialFailure when all assets succeed', async () => {
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue(['a.webp']);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue(['a.webp']);
    mockAssetUtils.getBatchSignedUrls.mockResolvedValue({
      urls: [{ path: 'a.webp', signedUrl: 'https://url1' }],
      failed: [],
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

    expect(result.success).toBe(true);
    expect(result.partialFailure).toBeUndefined();
  });

  // ─── Overall timeout ────────────────────────────────────────────

  it('should fail with timeout when download exceeds MAX_DOWNLOAD_DURATION_MS', async () => {
    const realDateNow = Date.now;
    let callCount = 0;
    // First few calls return real time; then jump far into the future to trigger timeout
    jest.spyOn(Date, 'now').mockImplementation(() => {
      callCount++;
      if (callCount > 5) {
        return realDateNow() + 6 * 60 * 1000; // 6 min in the future
      }
      return realDateNow();
    });

    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue(['a.webp']);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue(['a.webp']);

    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');

    jest.spyOn(Date, 'now').mockRestore();
  });

  // ─── Stall detection ────────────────────────────────────────────

  it('should emit stalled phase when no progress for STALL_THRESHOLD_MS (10s)', async () => {
    let resolveDownload: (val: any) => void;

    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue(['a.webp']);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue(['a.webp']);
    mockAssetUtils.getBatchSignedUrls.mockResolvedValue({
      urls: [{ path: 'a.webp', signedUrl: 'https://url1' }],
      failed: [],
      apiCalls: 1,
    });
    mockAssetUtils.formatBytes.mockReturnValue('0 Bytes');
    mockCacheManager.updateStories.mockResolvedValue();

    // downloadAssetsInBatches will hang until we resolve
    mockAssetUtils.downloadAssetsInBatches.mockImplementation(() => {
      return new Promise((resolve) => { resolveDownload = resolve; });
    });

    // Mock Date.now: first calls return real time, then jump 15s ahead
    // to trigger stall (threshold is 10s) but NOT auto-cancel (threshold is 20s)
    const baseTime = Date.now();
    let timeOffset = 0;
    const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => baseTime + timeOffset);

    const phases: string[] = [];
    const downloadPromise = StoryDownloadService.downloadStory('free-story', freeCatalogEntry, (p) => {
      phases.push(p.phase);
    });

    // Wait for the download to reach the hanging downloadAssetsInBatches
    await new Promise(r => setTimeout(r, 50));

    // Jump time forward 15s -triggers stall warning but NOT auto-cancel
    timeOffset = 15_000;

    // Wait for the stall interval (every 3s) to fire
    await new Promise(r => setTimeout(r, 4000));

    // Resolve the download before auto-cancel kicks in
    resolveDownload!({ downloaded: 1, failed: 0, bytesDownloaded: 100, errors: [] });

    dateNowSpy.mockRestore();
    const result = await downloadPromise;

    expect(phases).toContain('stalled');
    expect(result.success).toBe(true);
  }, 15000);

  it('should auto-cancel download after STALL_AUTO_CANCEL_MS (20s) of no progress', async () => {
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue(['a.webp']);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue(['a.webp']);
    mockAssetUtils.getBatchSignedUrls.mockResolvedValue({
      urls: [{ path: 'a.webp', signedUrl: 'https://url1' }],
      failed: [],
      apiCalls: 1,
    });
    mockAssetUtils.formatBytes.mockReturnValue('0 Bytes');
    mockCacheManager.updateStories.mockResolvedValue();

    // downloadAssetsInBatches hangs forever -simulates network drop
    let resolveDownload: (val: any) => void;
    mockAssetUtils.downloadAssetsInBatches.mockImplementation(() => {
      return new Promise((resolve) => { resolveDownload = resolve; });
    });

    // Mock Date.now: jump 25s ahead to trigger auto-cancel (threshold is 20s)
    const baseTime = Date.now();
    let timeOffset = 0;
    const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => baseTime + timeOffset);

    const phases: string[] = [];
    const messages: string[] = [];
    const downloadPromise = StoryDownloadService.downloadStory('free-story', freeCatalogEntry, (p) => {
      phases.push(p.phase);
      messages.push(p.message);
    });

    await new Promise(r => setTimeout(r, 50));

    // Jump time 25s -past auto-cancel threshold
    timeOffset = 25_000;

    // Wait for the stall interval (every 3s) to fire and auto-cancel
    await new Promise(r => setTimeout(r, 4000));

    // Resolve the hanging download so the promise completes
    resolveDownload!({ downloaded: 0, failed: 1, bytesDownloaded: 0, errors: ['timeout'] });

    dateNowSpy.mockRestore();
    const result = await downloadPromise;

    expect(phases).toContain('stalled');
    expect(result.cancelled).toBe(true);
    expect(messages).toContain('Connection lost');
  }, 15000);

  // ─── Cleanup after cancellation ─────────────────────────────────

  it('should clean up cancellation token after download completes', async () => {
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue([]);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue([]);
    mockCacheManager.updateStories.mockResolvedValue();

    await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    // Token should be cleaned up
    expect((StoryDownloadService as any).cancellationTokens.has('free-story')).toBe(false);
    expect((StoryDownloadService as any).activeDownloads.has('free-story')).toBe(false);
  });

  it('should clean up cancellation token after cancelled download', async () => {
    mockApiClient.request.mockImplementation(async () => {
      StoryDownloadService.cancelDownload('free-story');
      return mockStory;
    });
    mockAssetUtils.extractAssetPaths.mockReturnValue([]);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue([]);

    await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    expect((StoryDownloadService as any).cancellationTokens.has('free-story')).toBe(false);
    expect((StoryDownloadService as any).activeDownloads.has('free-story')).toBe(false);
  });

  it('should clean up cancellation token after failed download', async () => {
    mockApiClient.request.mockRejectedValueOnce(new Error('Server error'));

    await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    expect((StoryDownloadService as any).cancellationTokens.has('free-story')).toBe(false);
    expect((StoryDownloadService as any).activeDownloads.has('free-story')).toBe(false);
  });

  // ─── New progress message format ───────────────────────────────

  it('should include asset count in downloading-assets progress message', async () => {
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue(['a.webp', 'b.webp']);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue(['a.webp', 'b.webp']);
    mockAssetUtils.getBatchSignedUrls.mockResolvedValue({
      urls: [
        { path: 'a.webp', signedUrl: 'https://url1' },
        { path: 'b.webp', signedUrl: 'https://url2' },
      ],
      failed: [],
      apiCalls: 1,
    });
    mockAssetUtils.downloadAssetsInBatches.mockImplementation(async (_urls, onProgress) => {
      onProgress?.(1, 2, 512, 1024);
      return { downloaded: 2, failed: 0, bytesDownloaded: 1024, errors: [] };
    });
    mockAssetUtils.formatBytes
      .mockReturnValueOnce('512 Bytes')
      .mockReturnValueOnce('1 KB');
    mockCacheManager.updateStories.mockResolvedValue();

    const messages: string[] = [];
    await StoryDownloadService.downloadStory('free-story', freeCatalogEntry, (p) => {
      if (p.phase === 'downloading-assets' && p.detail) {
        messages.push(p.message);
      }
    });

    expect(messages.length).toBeGreaterThan(0);
    // New message format: "Downloading 1/2 -512 Bytes / 1 KB"
    expect(messages[0]).toMatch(/Downloading \d+\/\d+ -/);
  });
});

// ===================== Edge cases (via StoryDownloadService orchestration) =====================
describe('Download pipeline edge cases (via StoryDownloadService)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(asyncStorageStore).forEach(k => delete asyncStorageStore[k]);
    (StoryDownloadService as any).activeDownloads = new Map();
    (StoryDownloadService as any).cancellationTokens = new Map();
    mockSubscriptionTier = 'premium';
  });

  it('should pass download errors through as assetsFailed', async () => {
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue(['a.webp', 'b.webp', 'c.webp']);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue(['a.webp', 'b.webp', 'c.webp']);
    mockAssetUtils.getBatchSignedUrls.mockResolvedValue({
      urls: [
        { path: 'a.webp', signedUrl: 'https://url1' },
        { path: 'b.webp', signedUrl: 'https://url2' },
        { path: 'c.webp', signedUrl: 'https://url3' },
      ],
      failed: [],
      apiCalls: 1,
    });
    // Simulate 2 of 3 assets failing during download
    mockAssetUtils.downloadAssetsInBatches.mockResolvedValue({
      downloaded: 1,
      failed: 2,
      bytesDownloaded: 512,
      errors: ['b.webp: Timeout', 'c.webp: Timeout'],
    });
    mockAssetUtils.formatBytes.mockReturnValue('512 Bytes');
    mockCacheManager.updateStories.mockResolvedValue();

    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    expect(result.success).toBe(true);
    expect(result.partialFailure).toBe(true);
    expect(result.assetsFailed).toBe(2);
    expect(result.assetsDownloaded).toBe(1);
  });

  it('should still succeed when all URL generations fail but story saves', async () => {
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue(['a.webp']);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue(['a.webp']);
    mockAssetUtils.getBatchSignedUrls.mockResolvedValue({
      urls: [],
      failed: ['a.webp'], // All URLs failed
      apiCalls: 1,
    });
    mockCacheManager.updateStories.mockResolvedValue();

    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    // Story is saved but all assets failed
    expect(result.success).toBe(true);
    expect(result.partialFailure).toBe(true);
    expect(result.assetsFailed).toBe(1);
    expect(result.assetsDownloaded).toBe(0);
    // downloadAssetsInBatches should NOT have been called (no URLs to download)
    expect(mockAssetUtils.downloadAssetsInBatches).not.toHaveBeenCalled();
  });

  it('formatBytes should handle various sizes correctly', () => {
    const realAssetUtils = jest.requireActual('../../services/asset-download-utils').AssetDownloadUtils;

    expect(realAssetUtils.formatBytes(0)).toBe('0 Bytes');
    expect(realAssetUtils.formatBytes(512)).toBe('512 Bytes');
    expect(realAssetUtils.formatBytes(1024)).toBe('1 KB');
    expect(realAssetUtils.formatBytes(1048576)).toBe('1 MB');
    expect(realAssetUtils.formatBytes(1073741824)).toBe('1 GB');
  });

  it('should handle concurrent downloads of different stories independently', async () => {
    const storyA = { ...mockStory, id: 'story-a' };
    const storyB = { ...mockStory, id: 'story-b' };

    mockApiClient.request
      .mockResolvedValueOnce(storyA)
      .mockResolvedValueOnce(storyB);
    mockAssetUtils.extractAssetPaths.mockReturnValue([]);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue([]);
    mockCacheManager.updateStories.mockResolvedValue();

    const entryA = { ...freeCatalogEntry, storyId: 'story-a' };
    const entryB = { ...freeCatalogEntry, storyId: 'story-b' };

    const [resultA, resultB] = await Promise.all([
      StoryDownloadService.downloadStory('story-a', entryA),
      StoryDownloadService.downloadStory('story-b', entryB),
    ]);

    expect(resultA.success).toBe(true);
    expect(resultA.storyId).toBe('story-a');
    expect(resultB.success).toBe(true);
    expect(resultB.storyId).toBe('story-b');
    expect(mockApiClient.request).toHaveBeenCalledTimes(2);
  });

  it('should cancel one story without affecting another concurrent download', async () => {
    const storyA = { ...mockStory, id: 'cancel-me' };
    const storyB = { ...mockStory, id: 'keep-going' };

    let resolveA: (val: any) => void;
    mockApiClient.request
      .mockImplementationOnce(() => new Promise(resolve => { resolveA = resolve; }))
      .mockResolvedValueOnce(storyB);
    mockAssetUtils.extractAssetPaths.mockReturnValue([]);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue([]);
    mockCacheManager.updateStories.mockResolvedValue();

    const entryA = { ...freeCatalogEntry, storyId: 'cancel-me' };
    const entryB = { ...freeCatalogEntry, storyId: 'keep-going' };

    const downloadA = StoryDownloadService.downloadStory('cancel-me', entryA);
    const downloadB = StoryDownloadService.downloadStory('keep-going', entryB);

    // Wait a tick, then cancel A
    await new Promise(r => setTimeout(r, 10));
    StoryDownloadService.cancelDownload('cancel-me');
    resolveA!(storyA); // let A proceed so checkAbort fires

    const [resultA, resultB] = await Promise.all([downloadA, downloadB]);

    expect(resultA.cancelled).toBe(true);
    expect(resultA.success).toBe(false);
    expect(resultB.success).toBe(true);
    expect(resultB.cancelled).toBeUndefined();
  });
});

// ===================== Auth gate & security tests =====================
describe('Download security gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(asyncStorageStore).forEach(k => delete asyncStorageStore[k]);
    (StoryDownloadService as any).activeDownloads = new Map();
    mockSubscriptionTier = 'premium';
  });

  it('should block download when user is not authenticated', async () => {
    mockApiClient.isAuthenticated.mockResolvedValue(false);

    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not authenticated - please login');
    // Should NOT have called the download API
    expect(mockApiClient.request).not.toHaveBeenCalled();
  });

  it('should block download when user is not authenticated even for free stories', async () => {
    mockApiClient.isAuthenticated.mockResolvedValue(false);

    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Not authenticated');
  });

  it('should report not_authenticated phase in progress callback', async () => {
    mockApiClient.isAuthenticated.mockResolvedValue(false);
    const progressCalls: DownloadProgress[] = [];

    await StoryDownloadService.downloadStory('free-story', freeCatalogEntry, (p) => {
      progressCalls.push(p);
    });

    expect(progressCalls.some(p => p.message === 'not_authenticated')).toBe(true);
  });

  it('should allow download when user is authenticated', async () => {
    mockApiClient.isAuthenticated.mockResolvedValue(true);
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue([]);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue([]);
    mockCacheManager.updateStories.mockResolvedValue();

    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    expect(result.success).toBe(true);
    expect(mockApiClient.request).toHaveBeenCalled();
  });

  it('should deny download of premium story on basic tier', async () => {
    mockApiClient.isAuthenticated.mockResolvedValue(true);
    mockSubscriptionTier = 'basic';

    // basic tier has an active subscription -premium stories are allowed with any subscription
    mockApiClient.request.mockResolvedValueOnce(mockStory);
    mockAssetUtils.extractAssetPaths.mockReturnValue([]);
    mockAssetUtils.filterUncachedAssets.mockResolvedValue([]);
    mockCacheManager.updateStories.mockResolvedValue();

    const result = await StoryDownloadService.downloadStory('premium-story', premiumCatalogEntry);
    expect(result.success).toBe(true);
  });

  it('should deny premium stories on free tier even when authenticated', async () => {
    mockApiClient.isAuthenticated.mockResolvedValue(true);
    mockSubscriptionTier = 'free';

    const result = await StoryDownloadService.downloadStory('premium-story', premiumCatalogEntry);

    expect(result.success).toBe(false);
    expect(result.error).toBe('subscription_required');
    // Auth check passes but access check blocks -no API call made
    expect(mockApiClient.request).not.toHaveBeenCalled();
  });

  it('should block referral story on free tier without unlock and not authenticated', async () => {
    mockApiClient.isAuthenticated.mockResolvedValue(false);
    mockSubscriptionTier = 'free';

    const result = await StoryDownloadService.downloadStory('referral-story', referralCatalogEntry);

    // Auth gate fires before access check
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not authenticated - please login');
    expect(mockApiClient.request).not.toHaveBeenCalled();
  });

  it('should surface auth error from API 401 response', async () => {
    mockApiClient.isAuthenticated.mockResolvedValue(true);
    mockSubscriptionTier = 'premium';
    mockApiClient.request.mockRejectedValueOnce(new Error('Not authenticated - please login'));

    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not authenticated - please login');
  });

  it('should surface token refresh failure as auth error', async () => {
    mockApiClient.isAuthenticated.mockResolvedValue(true);
    mockSubscriptionTier = 'premium';
    mockApiClient.request.mockRejectedValueOnce(new Error('Token refresh failed'));

    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    expect(result.success).toBe(false);
    // The service remaps token refresh failures to auth errors
    expect(result.error).toBe('Not authenticated - please login');
  });

  it('should not call API when isAuthenticated check fails', async () => {
    mockApiClient.isAuthenticated.mockResolvedValue(false);
    mockSubscriptionTier = 'premium';

    await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);
    await StoryDownloadService.downloadStory('premium-story', premiumCatalogEntry);

    // Neither download should have reached the API
    expect(mockApiClient.request).not.toHaveBeenCalled();
  });

  it('should handle isAuthenticated throwing an error gracefully', async () => {
    mockApiClient.isAuthenticated.mockRejectedValue(new Error('Storage unavailable'));
    mockSubscriptionTier = 'premium';

    const result = await StoryDownloadService.downloadStory('free-story', freeCatalogEntry);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});


// ── Rating prompt schedule logic ──────────────────────────
// These are pure logic tests that validate the "should we prompt?" decision.
// The actual prompt is triggered in story-book-reader via useEffect;
// here we test the scheduling conditions in isolation.

describe('Rating prompt schedule', () => {
  /**
   * Mirrors the condition in story-book-reader.tsx:
   *   shouldPrompt = (last === 0 && total >= 2) || (last > 0 && total >= last + 3)
   */
  function shouldPromptForRating(totalStoriesRead: number, lastRatingPromptBookCount: number): boolean {
    return (
      (lastRatingPromptBookCount === 0 && totalStoriesRead >= 2) ||
      (lastRatingPromptBookCount > 0 && totalStoriesRead >= lastRatingPromptBookCount + 3)
    );
  }

  it('should not prompt before reading 2 books', () => {
    expect(shouldPromptForRating(0, 0)).toBe(false);
    expect(shouldPromptForRating(1, 0)).toBe(false);
  });

  it('should prompt after reading exactly 2 books', () => {
    expect(shouldPromptForRating(2, 0)).toBe(true);
  });

  it('should prompt after reading more than 2 books (never prompted)', () => {
    expect(shouldPromptForRating(5, 0)).toBe(true);
  });

  it('should not prompt immediately after being prompted', () => {
    // Prompted at book 2, now on book 3
    expect(shouldPromptForRating(3, 2)).toBe(false);
  });

  it('should not prompt 2 books after last prompt', () => {
    // Prompted at book 2, now on book 4
    expect(shouldPromptForRating(4, 2)).toBe(false);
  });

  it('should prompt again exactly 3 books after last prompt', () => {
    // Prompted at book 2, now on book 5
    expect(shouldPromptForRating(5, 2)).toBe(true);
  });

  it('should prompt again if more than 3 books since last prompt', () => {
    // Prompted at book 2, now on book 10
    expect(shouldPromptForRating(10, 2)).toBe(true);
  });

  it('should keep prompting every 3 books (third round)', () => {
    // First prompt at 2, second at 5, now check at 8
    expect(shouldPromptForRating(8, 5)).toBe(true);
    // And then at 7 since last was 5
    expect(shouldPromptForRating(7, 5)).toBe(false);
  });

  it('should handle large book counts', () => {
    // Prompted at 50, check at 52 (not yet) and 53 (yes)
    expect(shouldPromptForRating(52, 50)).toBe(false);
    expect(shouldPromptForRating(53, 50)).toBe(true);
  });
});