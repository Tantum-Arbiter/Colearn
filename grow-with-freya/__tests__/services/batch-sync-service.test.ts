import { BatchSyncService, BatchSyncStats, DeltaSyncResponse } from '../../services/batch-sync-service';
import { VersionManager, VersionCheckResult } from '../../services/version-manager';
import { CacheManager } from '../../services/cache-manager';
import { CatalogService } from '../../services/catalog-service';
import { ApiClient } from '../../services/api-client';
import { Story } from '../../types/story';

jest.mock('../../services/version-manager');
jest.mock('../../services/cache-manager');
jest.mock('../../services/api-client');
jest.mock('../../services/catalog-service');
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }),
}));

// Mock ALL_STORIES to include a bundled story for testing
jest.mock('../../data/stories', () => ({
  ALL_STORIES: [
    { id: 'snuggle-little-wombat', title: 'Snuggle Little Wombat', category: 'bedtime' },
    { id: 'placeholder-1', title: 'Coming Soon', category: 'adventure' },
  ],
}));

const mockVersionManager = VersionManager as jest.Mocked<typeof VersionManager>;
const mockCacheManager = CacheManager as jest.Mocked<typeof CacheManager>;
const mockCatalogService = CatalogService as jest.Mocked<typeof CatalogService>;
const mockApiClient = ApiClient as jest.Mocked<typeof ApiClient>;

// Test data - CMS-only story (not in bundled ALL_STORIES)
const mockCmsStory: Story = {
  id: 'story-1',
  title: 'CMS Test Story',
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
      text: 'Test page',
    },
  ],
};

// Bundled story update (matches an entry in ALL_STORIES)
const mockBundledStoryUpdate: Story = {
  id: 'snuggle-little-wombat',
  title: 'Snuggle Little Wombat',
  coverImage: 'assets/stories/snuggle-little-wombat/cover.webp',
  checksum: 'bundled123',
  category: 'bedtime',
  tag: 'bedtime',
  emoji: '🐨',
  isAvailable: true,
  pages: [{ id: 'page-1', pageNumber: 1, text: 'Updated text' }],
};

const mockDeltaResponse: DeltaSyncResponse = {
  serverVersion: 10,
  assetVersion: 5,
  stories: [mockCmsStory],
  deletedStoryIds: [],
  storyChecksums: { 'story-1': 'abc123' },
  totalStories: 1,
  updatedCount: 1,
  lastUpdated: Date.now(),
  catalog: [
    {
      storyId: 'story-1',
      title: 'CMS Test Story',
      category: 'adventure',
      emoji: '🗺️',
      thumbnailUrl: 'https://storage.googleapis.com/signed-thumbnail',
      isFree: true,
      isReferralReward: false,
      isPremium: false,
    },
  ],
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

    it('should sync metadata only — no asset downloads (on-demand model)', async () => {
      const versionCheck: VersionCheckResult = {
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      };
      mockVersionManager.checkVersions.mockResolvedValue(versionCheck);
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce(mockDeltaResponse);
      mockCacheManager.updateStories.mockResolvedValue();
      mockCatalogService.updateCatalog.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      // Should have: 1 version check + 1 delta = 2 API calls (no asset downloads)
      expect(stats.apiCalls).toBe(2);
      expect(stats.storiesUpdated).toBe(1);
      expect(stats.assetsDownloaded).toBe(0); // No asset downloads in on-demand model
      // CMS-only stories should NOT be saved to cache
      expect(mockCacheManager.updateStories).not.toHaveBeenCalled();
      // Catalog entries should be saved for on-demand download
      expect(mockCatalogService.updateCatalog).toHaveBeenCalledWith(mockDeltaResponse.catalog);
    });

    it('should save only bundled story updates to cache', async () => {
      const deltaWithBundled: DeltaSyncResponse = {
        ...mockDeltaResponse,
        stories: [mockCmsStory, mockBundledStoryUpdate],
      };
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce(deltaWithBundled);
      mockCacheManager.updateStories.mockResolvedValue();
      mockCatalogService.updateCatalog.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      await BatchSyncService.performBatchSync();

      // Only the bundled story should be saved to cache
      expect(mockCacheManager.updateStories).toHaveBeenCalledWith([mockBundledStoryUpdate]);
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
      mockCatalogService.updateCatalog.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.storiesDeleted).toBe(2);
      expect(mockCacheManager.removeStories).toHaveBeenCalledWith(['old-story-1', 'old-story-2']);
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

    it('should report progress during sync (no download phases)', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce(mockDeltaResponse);
      mockCacheManager.updateStories.mockResolvedValue();
      mockCatalogService.updateCatalog.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const progressUpdates: string[] = [];
      await BatchSyncService.performBatchSync((progress) => {
        progressUpdates.push(progress.phase);
      });

      expect(progressUpdates).toContain('version-check');
      expect(progressUpdates).toContain('fetching-delta');
      expect(progressUpdates).toContain('saving');
      expect(progressUpdates).toContain('complete');
      // Should NOT have download-related phases
      expect(progressUpdates).not.toContain('batch-urls');
      expect(progressUpdates).not.toContain('downloading');
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
  describe('Happy Path - performBatchSync (on-demand model)', () => {
    it('should sync CMS stories as catalog entries only', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 0, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: false,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce(mockDeltaResponse);
      mockCacheManager.updateStories.mockResolvedValue();
      mockCatalogService.updateCatalog.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.storiesUpdated).toBe(1);
      expect(stats.assetsDownloaded).toBe(0);
      expect(stats.errors).toHaveLength(0);
      // CMS story should NOT be saved to cache (it's on-demand)
      expect(mockCacheManager.updateStories).not.toHaveBeenCalled();
      // Catalog should be updated
      expect(mockCatalogService.updateCatalog).toHaveBeenCalled();
    });

    it('should save bundled story updates to cache', async () => {
      const deltaWithBundled: DeltaSyncResponse = {
        ...mockDeltaResponse,
        stories: [mockBundledStoryUpdate],
      };
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 1, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce(deltaWithBundled);
      mockCacheManager.updateStories.mockResolvedValue();
      mockCatalogService.updateCatalog.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      // Bundled story should be saved to cache (for localization updates)
      expect(mockCacheManager.updateStories).toHaveBeenCalledWith([mockBundledStoryUpdate]);
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
      mockCatalogService.updateCatalog.mockResolvedValue();
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

    it('should handle cache save failure for bundled updates', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 1, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: false,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce({
        ...mockDeltaResponse,
        stories: [mockBundledStoryUpdate],
      });
      mockCacheManager.updateStories.mockRejectedValue(new Error('Cache save failed'));

      await expect(BatchSyncService.performBatchSync()).rejects.toThrow('Cache save failed');
    });
  });

  // ==================== EDGE CASE TESTS ====================
  describe('Edge Cases - performBatchSync (on-demand model)', () => {
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

    it('should handle CMS stories with local: prefixed assets (goes to catalog)', async () => {
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

      // Not bundled, so not saved to cache
      expect(mockCacheManager.updateStories).not.toHaveBeenCalled();
      expect(stats.storiesUpdated).toBe(1);
    });

    it('should handle delta with no catalog entries', async () => {
      const deltaWithNoCatalog: DeltaSyncResponse = {
        ...mockDeltaResponse,
        catalog: undefined,
      };
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 1, assets: 1, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce(deltaWithNoCatalog);
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      // Should complete without errors even without catalog
      expect(stats.errors).toHaveLength(0);
      expect(mockCatalogService.updateCatalog).not.toHaveBeenCalled();
    });

    it('should handle mix of bundled and CMS stories in delta', async () => {
      const mixedDelta: DeltaSyncResponse = {
        ...mockDeltaResponse,
        stories: [mockCmsStory, mockBundledStoryUpdate],
        catalog: mockDeltaResponse.catalog,
      };
      mockVersionManager.checkVersions.mockResolvedValue({
        localVersion: null,
        serverVersion: { stories: 2, assets: 2, lastUpdated: new Date().toISOString() },
        needsStorySync: true,
        needsAssetSync: true,
      });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValueOnce(mixedDelta);
      mockCacheManager.updateStories.mockResolvedValue();
      mockCatalogService.updateCatalog.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const stats = await BatchSyncService.performBatchSync();

      // Only bundled story saved to cache
      expect(mockCacheManager.updateStories).toHaveBeenCalledWith([mockBundledStoryUpdate]);
      // Catalog saved for discovery
      expect(mockCatalogService.updateCatalog).toHaveBeenCalledWith(mockDeltaResponse.catalog);
      expect(stats.storiesUpdated).toBe(2);
      expect(stats.assetsDownloaded).toBe(0); // No asset downloads in on-demand model
    });
  });
});
