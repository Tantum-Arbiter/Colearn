import { BatchSyncService, BatchSyncStats, DeltaSyncResponse } from '../../services/batch-sync-service';
import { VersionManager, VersionCheckResult } from '../../services/version-manager';
import { CacheManager } from '../../services/cache-manager';
import { ApiClient } from '../../services/api-client';
import { Story } from '../../types/story';

jest.mock('../../services/version-manager');
jest.mock('../../services/cache-manager');
jest.mock('../../services/api-client');
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }),
}));

const mockVersionManager = VersionManager as jest.Mocked<typeof VersionManager>;
const mockCacheManager = CacheManager as jest.Mocked<typeof CacheManager>;
const mockApiClient = ApiClient as jest.Mocked<typeof ApiClient>;

// Test data
const mockStory: Story = {
  id: 'story-1',
  title: 'Test Story',
  coverImage: 'assets/stories/story-1/cover.webp',
  checksum: 'abc123',
  category: 'adventure',
  tag: 'adventure',
  emoji: '🗺️',
  isAvailable: true,
  pages: [
    {
      id: 'page-1',
      pageNumber: 1,
      backgroundImage: 'assets/stories/story-1/bg1.webp',
      characterImage: 'assets/stories/story-1/char1.webp',
      text: 'Test page',
      interactiveElements: [
        { id: 'elem-1', type: 'reveal', image: 'assets/stories/story-1/btn.webp', position: { x: 0.5, y: 0.5 }, size: { width: 0.1, height: 0.1 } },
      ],
    },
  ],
};

const mockDeltaResponse: DeltaSyncResponse = {
  serverVersion: 10,
  assetVersion: 5,
  stories: [mockStory],
  deletedStoryIds: [],
  storyChecksums: { 'story-1': 'abc123' },
  totalStories: 1,
  updatedCount: 1,
  lastUpdated: Date.now(),
};

describe('BatchSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset sync lock
    (BatchSyncService as any).isSyncing = false;
    (BatchSyncService as any).syncPromise = null;
  });

  describe('performBatchSync', () => {
    it('should skip sync when already up to date', async () => {
      const versionCheck: VersionCheckResult = {
        localVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: false,
        needsAssetSync: false,
      };
      mockVersionManager.checkVersions.mockResolvedValue(versionCheck);

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.apiCalls).toBe(1); // Only version check
      expect(stats.storiesUpdated).toBe(0);
      expect(stats.assetsDownloaded).toBe(0);
      expect(mockApiClient.request).not.toHaveBeenCalled();
    });

    it('should use cached content when offline', async () => {
      const versionCheck: VersionCheckResult = {
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: null, // Offline
        needsStorySync: false,
        needsAssetSync: false,
      };
      mockVersionManager.checkVersions.mockResolvedValue(versionCheck);

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.fromCache).toBe(true);
      expect(stats.apiCalls).toBe(1);
    });

    it('should perform efficient batch sync with delta content', async () => {
      // Setup version check - needs sync
      const versionCheck: VersionCheckResult = {
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      };
      mockVersionManager.checkVersions.mockResolvedValue(versionCheck);
      mockCacheManager.getStories.mockResolvedValue([]);
      
      // Setup delta response
      mockApiClient.request.mockResolvedValueOnce(mockDeltaResponse);
      
      // Setup batch URLs response
      mockApiClient.request.mockResolvedValueOnce({
        urls: [
          { path: 'stories/story-1/cover.webp', signedUrl: 'https://signed-url-1' },
          { path: 'stories/story-1/bg1.webp', signedUrl: 'https://signed-url-2' },
          { path: 'stories/story-1/char1.webp', signedUrl: 'https://signed-url-3' },
          { path: 'stories/story-1/btn.webp', signedUrl: 'https://signed-url-4' },
        ],
        failed: [],
      });

      // All assets need downloading
      mockCacheManager.hasAsset.mockResolvedValue(false);
      mockCacheManager.downloadAndCacheAsset.mockResolvedValue('/local/path');
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      // Should have: 1 version check + 1 delta + 1 batch URLs = 3 API calls
      expect(stats.apiCalls).toBe(3);
      expect(stats.storiesUpdated).toBe(1);
      expect(stats.assetsDownloaded).toBe(4);
      expect(mockCacheManager.updateStories).toHaveBeenCalledWith([mockStory]);
    });

    it('should skip already cached assets', async () => {
      const versionCheck: VersionCheckResult = {
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      };
      mockVersionManager.checkVersions.mockResolvedValue(versionCheck);
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce(mockDeltaResponse);
      
      // All assets already cached
      mockCacheManager.hasAsset.mockResolvedValue(true);
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      // Should have: 1 version check + 1 delta = 2 API calls (no batch URLs needed)
      expect(stats.apiCalls).toBe(2);
      expect(stats.assetsSkipped).toBe(4);
      expect(stats.assetsDownloaded).toBe(0);
    });

    it('should handle deleted stories', async () => {
      const versionCheck: VersionCheckResult = {
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: false,
      };
      mockVersionManager.checkVersions.mockResolvedValue(versionCheck);
      mockCacheManager.getStories.mockResolvedValue([]);

      const deltaWithDeletions: DeltaSyncResponse = {
        ...mockDeltaResponse,
        stories: [],
        deletedStoryIds: ['old-story-1', 'old-story-2'],
        updatedCount: 0,
      };
      mockApiClient.request.mockResolvedValueOnce(deltaWithDeletions);
      mockCacheManager.removeStories.mockResolvedValue();
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.storiesDeleted).toBe(2);
      expect(mockCacheManager.removeStories).toHaveBeenCalledWith(['old-story-1', 'old-story-2']);
    });

    it('should handle partial asset download failures', async () => {
      const versionCheck: VersionCheckResult = {
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      };
      mockVersionManager.checkVersions.mockResolvedValue(versionCheck);
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce(mockDeltaResponse);
      mockApiClient.request.mockResolvedValueOnce({
        urls: [
          { path: 'stories/story-1/cover.webp', signedUrl: 'https://signed-url-1' },
          { path: 'stories/story-1/bg1.webp', signedUrl: 'https://signed-url-2' },
        ],
        failed: ['stories/story-1/char1.webp', 'stories/story-1/btn.webp'],
      });
      mockCacheManager.hasAsset.mockResolvedValue(false);
      mockCacheManager.downloadAndCacheAsset.mockResolvedValue('/local/path');
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.assetsFailed).toBe(2); // 2 failed to get URLs
      expect(stats.assetsDownloaded).toBe(2);
      expect(stats.errors.length).toBeGreaterThan(0);
    });

    it('should handle network failure during delta fetch', async () => {
      const versionCheck: VersionCheckResult = {
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      };
      mockVersionManager.checkVersions.mockResolvedValue(versionCheck);
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockRejectedValueOnce(new Error('Network error'));

      await expect(BatchSyncService.performBatchSync()).rejects.toThrow('Network error');
    });

    it('should report progress during sync', async () => {
      const versionCheck: VersionCheckResult = {
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      };
      mockVersionManager.checkVersions.mockResolvedValue(versionCheck);
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce(mockDeltaResponse);
      mockApiClient.request.mockResolvedValueOnce({
        urls: [{ path: 'stories/story-1/cover.webp', signedUrl: 'https://signed-url-1' }],
        failed: [],
      });
      mockCacheManager.hasAsset.mockResolvedValue(false);
      mockCacheManager.downloadAndCacheAsset.mockResolvedValue('/local/path');
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const progressUpdates: string[] = [];
      await BatchSyncService.performBatchSync((progress) => {
        progressUpdates.push(progress.phase);
      });

      expect(progressUpdates).toContain('version-check');
      expect(progressUpdates).toContain('fetching-delta');
      expect(progressUpdates).toContain('complete');
    });
  });

  describe('isSyncInProgress', () => {
    it('should return false when no sync is running', () => {
      expect(BatchSyncService.isSyncInProgress()).toBe(false);
    });
  });

  describe('isSyncNeeded', () => {
    it('should return true when sync is needed', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      });

      const result = await BatchSyncService.isSyncNeeded();

      expect(result).toBe(true);
    });

    it('should return false when already up to date', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: false,
        needsAssetSync: false,
      });

      const result = await BatchSyncService.isSyncNeeded();

      expect(result).toBe(false);
    });

    it('should return true when only story sync is needed', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: { stories: 5, assets: 5, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: false,
      });

      const result = await BatchSyncService.isSyncNeeded();

      expect(result).toBe(true);
    });

    it('should return true when only asset sync is needed', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: { stories: 10, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: false,
        needsAssetSync: true,
      });

      const result = await BatchSyncService.isSyncNeeded();

      expect(result).toBe(true);
    });
  });

  // ==================== HAPPY PATH TESTS ====================
  describe('Happy Path - performBatchSync', () => {
    it('should successfully sync stories with no assets', async () => {
      const storyWithNoAssets: Story = {
        id: 'text-only-story',
        title: 'Text Only Story',
        checksum: 'xyz789',
        category: 'adventure',
        tag: 'adventure',
        emoji: '📖',
        isAvailable: true,
        pages: [{ id: 'page-1', pageNumber: 1, text: 'Just text, no images' }],
      };

      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 0, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: false,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 1,
        assetVersion: 0,
        stories: [storyWithNoAssets],
        deletedStoryIds: [],
        storyChecksums: { 'text-only-story': 'xyz789' },
        totalStories: 1,
        updatedCount: 1,
        lastUpdated: Date.now(),
      });
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.storiesUpdated).toBe(1);
      expect(stats.assetsDownloaded).toBe(0);
      expect(stats.totalAssets).toBe(0);
      expect(stats.errors).toHaveLength(0);
    });

    it('should complete sync successfully with downloaded assets', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 1, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce(mockDeltaResponse);
      mockApiClient.request.mockResolvedValueOnce({
        urls: [{ path: 'stories/story-1/cover.webp', signedUrl: 'https://url' }],
        failed: [],
      });
      mockCacheManager.hasAsset.mockResolvedValue(false);
      mockCacheManager.downloadAndCacheAsset.mockResolvedValue('/local/path');
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.assetsDownloaded).toBeGreaterThan(0);
      expect(stats.errors).toHaveLength(0);
    });

    it('should update version after successful sync', async () => {
      const serverVersion = { stories: 15, assets: 8, lastUpdated: new Date().toISOString() };

      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        serverVersion,
        needsStorySync: true,
        needsAssetSync: false,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce({
        ...mockDeltaResponse,
        serverVersion: 15,
        assetVersion: 8,
      });
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      await BatchSyncService.performBatchSync();

      expect(mockVersionManager.updateLocalVersion).toHaveBeenCalledWith({
        stories: 15,
        assets: 8,
      });
    });
  });

  // ==================== SAD PATH TESTS ====================
  describe('Sad Path - performBatchSync', () => {
    it('should handle version check failure', async () => {
      mockVersionManager.checkVersions.mockRejectedValue(new Error('Version check failed'));

      await expect(BatchSyncService.performBatchSync()).rejects.toThrow('Version check failed');
    });

    it('should handle all assets failing to download', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 1, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce(mockDeltaResponse);
      mockApiClient.request.mockResolvedValueOnce({
        urls: [
          { path: 'stories/story-1/cover.webp', signedUrl: 'https://url1' },
          { path: 'stories/story-1/bg1.webp', signedUrl: 'https://url2' },
        ],
        failed: [],
      });
      mockCacheManager.hasAsset.mockResolvedValue(false);
      mockCacheManager.downloadAndCacheAsset.mockRejectedValue(new Error('Download failed'));
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.assetsDownloaded).toBe(0);
      expect(stats.assetsFailed).toBe(2);
      expect(stats.errors.length).toBe(2);
    });

    it('should handle batch URL request failure', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 1, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce(mockDeltaResponse);
      // Batch URL request fails
      mockApiClient.request.mockRejectedValueOnce(new Error('Batch URL request failed'));
      mockCacheManager.hasAsset.mockResolvedValue(false);
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      // All assets should be marked as failed
      expect(stats.assetsFailed).toBeGreaterThan(0);
      expect(stats.assetsDownloaded).toBe(0);
    });

    it('should handle cache save failure after successful download', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 1, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: false,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce({
        ...mockDeltaResponse,
        stories: [mockStory],
      });
      mockCacheManager.updateStories.mockRejectedValue(new Error('Cache save failed'));

      await expect(BatchSyncService.performBatchSync()).rejects.toThrow('Cache save failed');
    });
  });

  // ==================== EDGE CASE TESTS ====================
  describe('Edge Cases - performBatchSync', () => {
    it('should handle empty stories response', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: false,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 10,
        assetVersion: 5,
        stories: [],
        deletedStoryIds: [],
        storyChecksums: {},
        totalStories: 0,
        updatedCount: 0,
        lastUpdated: Date.now(),
      });
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.storiesUpdated).toBe(0);
      expect(stats.assetsDownloaded).toBe(0);
    });

    it('should handle stories with local: prefixed assets (skip them)', async () => {
      const storyWithLocalAssets: Story = {
        id: 'local-story',
        title: 'Local Story',
        coverImage: 'local:bundled-cover.webp',
        checksum: 'local123',
        category: 'adventure',
        tag: 'adventure',
        emoji: '📖',
        isAvailable: true,
        pages: [
          { id: 'page-1', pageNumber: 1, backgroundImage: 'local:bundled-bg.webp', text: 'Text' },
        ],
      };

      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 0, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: false,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 1,
        assetVersion: 0,
        stories: [storyWithLocalAssets],
        deletedStoryIds: [],
        storyChecksums: { 'local-story': 'local123' },
        totalStories: 1,
        updatedCount: 1,
        lastUpdated: Date.now(),
      });
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.totalAssets).toBe(0); // local: assets are skipped
      expect(stats.storiesUpdated).toBe(1);
    });

    it('should handle stories with assets/ prefix normalization', async () => {
      const storyWithAssetsPrefix: Story = {
        id: 'prefixed-story',
        title: 'Prefixed Story',
        coverImage: 'assets/stories/prefixed-story/cover.webp',
        checksum: 'prefix123',
        category: 'adventure',
        tag: 'adventure',
        emoji: '📖',
        isAvailable: true,
        pages: [],
      };

      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 1, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 1,
        assetVersion: 1,
        stories: [storyWithAssetsPrefix],
        deletedStoryIds: [],
        storyChecksums: { 'prefixed-story': 'prefix123' },
        totalStories: 1,
        updatedCount: 1,
        lastUpdated: Date.now(),
      });
      mockCacheManager.hasAsset.mockResolvedValue(false);
      mockApiClient.request.mockResolvedValueOnce({
        urls: [{ path: 'stories/prefixed-story/cover.webp', signedUrl: 'https://url' }],
        failed: [],
      });
      mockCacheManager.downloadAndCacheAsset.mockResolvedValue('/local/path');
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.totalAssets).toBe(1);
      expect(stats.assetsDownloaded).toBe(1);
    });

    it('should correctly count assets from interactive elements', async () => {
      const storyWithInteractive: Story = {
        id: 'interactive-story',
        title: 'Interactive Story',
        coverImage: 'stories/interactive/cover.webp',
        checksum: 'int123',
        category: 'adventure',
        tag: 'adventure',
        emoji: '📖',
        isAvailable: true,
        pages: [
          {
            id: 'page-1',
            pageNumber: 1,
            backgroundImage: 'stories/interactive/bg.webp',
            text: 'Interactive page',
            interactiveElements: [
              { id: 'btn1', type: 'reveal', image: 'stories/interactive/btn1.webp', position: { x: 0.5, y: 0.5 }, size: { width: 0.1, height: 0.1 } },
              { id: 'btn2', type: 'reveal', image: 'stories/interactive/btn2.webp', position: { x: 0.6, y: 0.5 }, size: { width: 0.1, height: 0.1 } },
            ],
          },
        ],
      };

      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 4, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 1,
        assetVersion: 4,
        stories: [storyWithInteractive],
        deletedStoryIds: [],
        storyChecksums: { 'interactive-story': 'int123' },
        totalStories: 1,
        updatedCount: 1,
        lastUpdated: Date.now(),
      });
      mockCacheManager.hasAsset.mockResolvedValue(false);
      mockApiClient.request.mockResolvedValueOnce({
        urls: [
          { path: 'stories/interactive/cover.webp', signedUrl: 'https://url1' },
          { path: 'stories/interactive/bg.webp', signedUrl: 'https://url2' },
          { path: 'stories/interactive/btn1.webp', signedUrl: 'https://url3' },
          { path: 'stories/interactive/btn2.webp', signedUrl: 'https://url4' },
        ],
        failed: [],
      });
      mockCacheManager.downloadAndCacheAsset.mockResolvedValue('/local/path');
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.totalAssets).toBe(4); // cover + bg + 2 buttons
      expect(stats.assetsDownloaded).toBe(4);
    });

    it('should handle duplicate asset paths (only download once)', async () => {
      const storyWithDuplicates: Story = {
        id: 'dup-story',
        title: 'Duplicate Story',
        coverImage: 'stories/dup/shared.webp',
        checksum: 'dup123',
        category: 'adventure',
        tag: 'adventure',
        emoji: '📖',
        isAvailable: true,
        pages: [
          { id: 'page-1', pageNumber: 1, backgroundImage: 'stories/dup/shared.webp', text: 'Uses same image' },
          { id: 'page-2', pageNumber: 2, backgroundImage: 'stories/dup/shared.webp', text: 'Also uses same' },
        ],
      };

      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 1, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 1,
        assetVersion: 1,
        stories: [storyWithDuplicates],
        deletedStoryIds: [],
        storyChecksums: { 'dup-story': 'dup123' },
        totalStories: 1,
        updatedCount: 1,
        lastUpdated: Date.now(),
      });
      mockCacheManager.hasAsset.mockResolvedValue(false);
      mockApiClient.request.mockResolvedValueOnce({
        urls: [{ path: 'stories/dup/shared.webp', signedUrl: 'https://url' }],
        failed: [],
      });
      mockCacheManager.downloadAndCacheAsset.mockResolvedValue('/local/path');
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      // Should deduplicate - only 1 unique asset
      expect(stats.totalAssets).toBe(1);
      expect(stats.assetsDownloaded).toBe(1);
    });

    it('should handle large number of batches correctly', async () => {
      // Create 250 unique assets (should be 3 batches at 100 per batch)
      const assetPaths = Array.from({ length: 250 }, (_, i) => `stories/batch/asset${i}.webp`);
      const storyWithManyAssets: Story = {
        id: 'many-assets',
        title: 'Many Assets',
        checksum: 'many123',
        category: 'adventure',
        tag: 'adventure',
        emoji: '📖',
        isAvailable: true,
        pages: assetPaths.map((path, i) => ({
          id: `page-${i}`,
          pageNumber: i + 1,
          backgroundImage: path,
          text: `Page ${i}`,
        })),
      };

      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 250, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 1,
        assetVersion: 250,
        stories: [storyWithManyAssets],
        deletedStoryIds: [],
        storyChecksums: { 'many-assets': 'many123' },
        totalStories: 1,
        updatedCount: 1,
        lastUpdated: Date.now(),
      });
      mockCacheManager.hasAsset.mockResolvedValue(false);

      // 3 batch URL responses (100 + 100 + 50 = 250 assets)
      mockApiClient.request
        .mockResolvedValueOnce({ urls: Array(100).fill({ path: 'p', signedUrl: 'u' }), failed: [] })
        .mockResolvedValueOnce({ urls: Array(100).fill({ path: 'p', signedUrl: 'u' }), failed: [] })
        .mockResolvedValueOnce({ urls: Array(50).fill({ path: 'p', signedUrl: 'u' }), failed: [] });

      mockCacheManager.downloadAndCacheAsset.mockResolvedValue('/local/path');
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      // 1 version + 1 delta + 3 batch URLs = 5 API calls
      expect(stats.apiCalls).toBe(5);
      expect(stats.assetsDownloaded).toBe(250);
    });

    it('should handle mix of successful and failed URL generations', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 4, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce(mockDeltaResponse);
      mockApiClient.request.mockResolvedValueOnce({
        urls: [
          { path: 'stories/story-1/cover.webp', signedUrl: 'https://url1' },
          { path: 'stories/story-1/bg1.webp', signedUrl: 'https://url2' },
        ],
        failed: ['stories/story-1/char1.webp', 'stories/story-1/btn.webp'],
      });
      mockCacheManager.hasAsset.mockResolvedValue(false);
      mockCacheManager.downloadAndCacheAsset.mockResolvedValue('/local/path');
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.assetsDownloaded).toBe(2);
      expect(stats.assetsFailed).toBe(2);
    });
  });
});

