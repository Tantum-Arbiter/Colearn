/**
 * Integration tests for the Batch Sync Flow (On-Demand Model)
 *
 * These tests verify the metadata-only batch sync flow:
 * - Version checking
 * - Delta content fetching
 * - Catalog updates for CMS-only stories (on-demand download)
 * - Cache updates for bundled story localizations only
 * - NO asset downloads at startup
 */

import { BatchSyncService, BatchSyncStats, BatchSyncProgress, DeltaSyncResponse } from '../../services/batch-sync-service';
import { VersionManager, VersionCheckResult } from '../../services/version-manager';
import { CacheManager } from '../../services/cache-manager';
import { CatalogService } from '../../services/catalog-service';
import { ApiClient } from '../../services/api-client';
import { Story } from '../../types/story';

// Mock all dependencies
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
  ],
}));

const mockVersionManager = VersionManager as jest.Mocked<typeof VersionManager>;
const mockCacheManager = CacheManager as jest.Mocked<typeof CacheManager>;
const mockCatalogService = CatalogService as jest.Mocked<typeof CatalogService>;
const mockApiClient = ApiClient as jest.Mocked<typeof ApiClient>;

// Mock story factory
const createMockStory = (id: string, title: string, assetCount: number = 2): Story => ({
  id,
  title,
  category: 'adventure',
  tag: 'test',
  emoji: '📖',
  isAvailable: true,
  checksum: `checksum-${id}`,
  version: 1,
  coverImage: `assets/stories/${id}/cover.webp`,
  pages: Array.from({ length: assetCount }, (_, i) => ({
    id: `page-${i}`,
    pageNumber: i + 1,
    backgroundImage: `assets/stories/${id}/bg${i}.webp`,
    text: `Page ${i} text`,
  })),
});

describe('Batch Sync Integration Flow (On-Demand Model)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset sync lock
    (BatchSyncService as any).isSyncing = false;
    (BatchSyncService as any).syncPromise = null;

    // Setup default mock implementations
    mockVersionManager.clearLocalVersion.mockResolvedValue();
    mockCacheManager.clearAll.mockResolvedValue();
    mockCacheManager.getStories.mockResolvedValue([]);
    mockCacheManager.saveStories.mockResolvedValue();
    mockCacheManager.updateStories.mockResolvedValue();
    mockCacheManager.removeStories.mockResolvedValue();
    mockCatalogService.updateCatalog.mockResolvedValue();
    mockVersionManager.getLocalVersion.mockResolvedValue(null);
    mockVersionManager.saveLocalVersion.mockResolvedValue();
    mockVersionManager.updateLocalVersion.mockResolvedValue();
  });

  describe('First-time User Flow', () => {
    it('should sync metadata only on first launch (no asset downloads)', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
      });

      const stories = [
        createMockStory('1', 'Story 1', 3),
        createMockStory('2', 'Story 2', 2),
      ];

      const catalog = [
        { storyId: '1', title: 'Story 1', category: 'adventure', emoji: '📖', thumbnailUrl: 'https://thumb1', isFree: true, isReferralReward: false, isPremium: false },
        { storyId: '2', title: 'Story 2', category: 'adventure', emoji: '📖', thumbnailUrl: 'https://thumb2', isFree: false, isReferralReward: false, isPremium: true },
      ];

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 5,
        assetVersion: 3,
        stories,
        deletedStoryIds: [],
        storyChecksums: { '1': 'checksum-1', '2': 'checksum-2' },
        totalStories: 2,
        updatedCount: 2,
        lastUpdated: Date.now(),
        catalog,
      } as DeltaSyncResponse);

      const progressLog: BatchSyncProgress[] = [];
      const stats = await BatchSyncService.performBatchSync((progress) => {
        progressLog.push(progress);
      });

      // On-demand model: 1 version + 1 delta = 2 API calls (no batch URLs, no downloads)
      expect(stats.apiCalls).toBe(2);
      expect(stats.storiesUpdated).toBe(2);
      expect(stats.assetsDownloaded).toBe(0); // No downloads at startup

      // Verify progress phases — no download phases
      const phases = progressLog.map(p => p.phase);
      expect(phases).toContain('version-check');
      expect(phases).toContain('fetching-delta');
      expect(phases).toContain('saving');
      expect(phases).toContain('complete');
      expect(phases).not.toContain('batch-urls');
      expect(phases).not.toContain('downloading');

      // CMS-only stories should NOT be saved to cache
      expect(mockCacheManager.updateStories).not.toHaveBeenCalled();
      // Catalog should be updated for on-demand discovery
      expect(mockCatalogService.updateCatalog).toHaveBeenCalledWith(catalog);
      expect(mockVersionManager.updateLocalVersion).toHaveBeenCalledWith({
        stories: 5,
        assets: 3,
      });
    });
  });

  describe('Returning User Flow', () => {
    it('should skip sync when already up to date but still refresh catalog', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: false,
        needsAssetSync: false,
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
      });

      const catalog = [{ storyId: 'cat-1', title: 'Cat Story', category: 'adventure', emoji: '🐱', thumbnailUrl: 'https://thumb', isFree: true, isReferralReward: false, isPremium: false }];
      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 5,
        assetVersion: 3,
        stories: [],
        deletedStoryIds: [],
        storyChecksums: {},
        catalog,
      });

      const stats = await BatchSyncService.performBatchSync();

      // Version check + delta call for catalog refresh (signed URLs expire)
      expect(stats.apiCalls).toBe(2);
      expect(stats.storiesUpdated).toBe(0);
      expect(stats.assetsDownloaded).toBe(0);
      // Catalog should be refreshed with fresh signed URLs
      expect(mockCatalogService.updateCatalog).toHaveBeenCalledWith(catalog);
    });

    it('should sync new CMS stories to catalog only (no asset downloads)', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: { stories: 3, assets: 2, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
      });

      const newStory = createMockStory('3', 'New Story', 2);
      const catalog = [{ storyId: '3', title: 'New Story', category: 'adventure', emoji: '📖', thumbnailUrl: 'https://thumb', isFree: true, isReferralReward: false, isPremium: false }];

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 5,
        assetVersion: 3,
        stories: [newStory],
        deletedStoryIds: [],
        storyChecksums: { '3': 'checksum-3' },
        totalStories: 3,
        updatedCount: 1,
        lastUpdated: Date.now(),
        catalog,
      } as DeltaSyncResponse);

      const stats = await BatchSyncService.performBatchSync();

      // On-demand: no assets downloaded
      expect(stats.assetsDownloaded).toBe(0);
      expect(stats.apiCalls).toBe(2); // version + delta
      // CMS story not saved to cache
      expect(mockCacheManager.updateStories).not.toHaveBeenCalled();
      // Catalog updated
      expect(mockCatalogService.updateCatalog).toHaveBeenCalledWith(catalog);
    });
  });

  describe('Offline Handling', () => {
    it('should use cached content when offline', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: false,
        needsAssetSync: false,
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: null, // Offline
      });

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.fromCache).toBe(true);
      expect(stats.apiCalls).toBe(1);
      expect(mockApiClient.request).not.toHaveBeenCalled();
    });
  });

  describe('Concurrent Sync Handling', () => {
    it('should prevent concurrent syncs', async () => {
      // Setup a slow sync
      mockVersionManager.checkVersions.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          needsStorySync: true,
          needsAssetSync: false,
          localVersion: null,
          serverVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        }), 100))
      );

      mockApiClient.request.mockResolvedValue({
        serverVersion: 5,
        assetVersion: 3,
        stories: [],
        deletedStoryIds: [],
        storyChecksums: {},
        totalStories: 0,
        updatedCount: 0,
        lastUpdated: Date.now(),
      });
      mockCacheManager.updateStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      // Start two syncs simultaneously
      const sync1 = BatchSyncService.performBatchSync();
      const sync2 = BatchSyncService.performBatchSync();

      const [result1, result2] = await Promise.all([sync1, sync2]);

      // Both should return the same result (second waits for first)
      expect(result1).toBe(result2);
      // Version check should only be called once
      expect(mockVersionManager.checkVersions).toHaveBeenCalledTimes(1);
    });
  });

  describe('Large App Scenario', () => {
    it('should handle many stories efficiently with metadata-only sync', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion: { stories: 100, assets: 50, lastUpdated: new Date().toISOString() },
      });

      // Create 10 stories with 10 assets each
      const stories = Array.from({ length: 10 }, (_, i) =>
        createMockStory(`story-${i}`, `Story ${i}`, 10)
      );

      const catalog = stories.map(s => ({
        storyId: s.id, title: s.title, category: 'adventure', emoji: '📖',
        thumbnailUrl: `https://thumb-${s.id}`, isFree: true, isReferralReward: false, isPremium: false,
      }));

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 100,
        assetVersion: 50,
        stories,
        deletedStoryIds: [],
        storyChecksums: Object.fromEntries(stories.map(s => [s.id, s.checksum!])),
        totalStories: 10,
        updatedCount: 10,
        lastUpdated: Date.now(),
        catalog,
      } as DeltaSyncResponse);

      const stats = await BatchSyncService.performBatchSync();

      // On-demand model: 1 version + 1 delta = 2 API calls (no batch URLs)
      expect(stats.apiCalls).toBe(2);
      expect(stats.storiesUpdated).toBe(10);
      expect(stats.assetsDownloaded).toBe(0); // No downloads at startup
      expect(mockCatalogService.updateCatalog).toHaveBeenCalledWith(catalog);
    });
  });

  // ==================== HAPPY PATH INTEGRATION TESTS ====================
  describe('Happy Path - Complete Flows (On-Demand)', () => {
    it('should handle incremental update with catalog entries', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: { stories: 3, assets: 2, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 5, assets: 4, lastUpdated: new Date().toISOString() },
      });

      const newStories = [
        createMockStory('4', 'New Story 4', 2),
        createMockStory('5', 'New Story 5', 2),
      ];

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 5,
        assetVersion: 4,
        stories: newStories,
        deletedStoryIds: [],
        storyChecksums: { '4': 'checksum-4', '5': 'checksum-5' },
        totalStories: 5,
        updatedCount: 2,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.storiesUpdated).toBe(2);
      expect(stats.assetsDownloaded).toBe(0); // On-demand: no downloads
      expect(stats.errors).toHaveLength(0);
    });

    it('should handle bundled story updates (saved to cache)', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: false,
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 6, assets: 3, lastUpdated: new Date().toISOString() },
      });

      // Bundled story was updated (matches ALL_STORIES)
      const updatedBundled: Story = {
        id: 'snuggle-little-wombat',
        title: 'Snuggle Little Wombat (Updated)',
        checksum: 'new-checksum',
        category: 'bedtime',
        tag: 'bedtime',
        emoji: '🐨',
        isAvailable: true,
        pages: [{ id: 'p1', pageNumber: 1, text: 'Updated text' }],
      };

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 6,
        assetVersion: 3,
        stories: [updatedBundled],
        deletedStoryIds: [],
        storyChecksums: { 'snuggle-little-wombat': 'new-checksum' },
        totalStories: 5,
        updatedCount: 1,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.storiesUpdated).toBe(1);
      expect(stats.assetsDownloaded).toBe(0);
      // Bundled story update should be saved to cache
      expect(mockCacheManager.updateStories).toHaveBeenCalledWith([updatedBundled]);
    });

    it('should handle mixed scenario (updates, additions, deletions)', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 7, assets: 5, lastUpdated: new Date().toISOString() },
      });

      const stories = [
        createMockStory('1', 'Updated Story 1', 1),
        createMockStory('6', 'New Story 6', 1),
      ];

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 7,
        assetVersion: 5,
        stories,
        deletedStoryIds: ['3', '4'],
        storyChecksums: { '1': 'new-checksum', '6': 'checksum-6' },
        totalStories: 4,
        updatedCount: 2,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.storiesUpdated).toBe(2);
      expect(stats.storiesDeleted).toBe(2);
      expect(stats.assetsDownloaded).toBe(0); // On-demand
      expect(mockCacheManager.removeStories).toHaveBeenCalledWith(['3', '4']);
    });
  });

  // ==================== SAD PATH INTEGRATION TESTS ====================
  describe('Sad Path - Error Scenarios', () => {
    it('should handle delta endpoint returning error', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
      });

      mockApiClient.request.mockRejectedValueOnce(new Error('Server error: 500'));

      await expect(BatchSyncService.performBatchSync()).rejects.toThrow('Server error: 500');
    });

    it('should handle catalog update failure gracefully', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
      });

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 5,
        assetVersion: 3,
        stories: [createMockStory('1', 'Story 1', 2)],
        deletedStoryIds: [],
        storyChecksums: { '1': 'checksum-1' },
        totalStories: 1,
        updatedCount: 1,
        lastUpdated: Date.now(),
        catalog: [{ storyId: '1', title: 'Story 1', category: 'adventure', emoji: '📖', thumbnailUrl: 'https://thumb', isFree: true, isReferralReward: false, isPremium: false }],
      } as DeltaSyncResponse);

      mockCatalogService.updateCatalog.mockRejectedValueOnce(new Error('Catalog save failed'));

      // Should throw since catalog update failure is an error
      await expect(BatchSyncService.performBatchSync()).rejects.toThrow('Catalog save failed');
    });

    it('should throw error on malformed response from delta endpoint', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
      });

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 5,
      } as any);

      await expect(BatchSyncService.performBatchSync()).rejects.toThrow();
    });
  });

  // ==================== EDGE CASE INTEGRATION TESTS ====================
  describe('Edge Cases - Boundary Conditions (On-Demand)', () => {
    it('should handle sync when all stories are deleted', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: false,
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 6, assets: 3, lastUpdated: new Date().toISOString() },
      });

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 6,
        assetVersion: 3,
        stories: [],
        deletedStoryIds: ['1', '2', '3', '4', '5'],
        storyChecksums: {},
        totalStories: 0,
        updatedCount: 0,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.storiesUpdated).toBe(0);
      expect(stats.storiesDeleted).toBe(5);
      expect(mockCacheManager.removeStories).toHaveBeenCalledWith(['1', '2', '3', '4', '5']);
    });

    it('should handle sync with text-only stories (no assets)', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: false,
        localVersion: null,
        serverVersion: { stories: 2, assets: 0, lastUpdated: new Date().toISOString() },
      });

      const textOnlyStories: Story[] = [
        { id: '1', title: 'Text Story 1', checksum: 'c1', category: 'adventure', tag: 'adventure', emoji: '📖', isAvailable: true, pages: [{ id: 'p1', pageNumber: 1, text: 'Text only' }] },
        { id: '2', title: 'Text Story 2', checksum: 'c2', category: 'adventure', tag: 'adventure', emoji: '📖', isAvailable: true, pages: [{ id: 'p1', pageNumber: 1, text: 'Also text' }] },
      ];

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 2,
        assetVersion: 0,
        stories: textOnlyStories,
        deletedStoryIds: [],
        storyChecksums: { '1': 'c1', '2': 'c2' },
        totalStories: 2,
        updatedCount: 2,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.storiesUpdated).toBe(2);
      expect(stats.assetsDownloaded).toBe(0);
      expect(mockApiClient.request).toHaveBeenCalledTimes(1); // Only delta
    });

    it('should handle many stories with only catalog updates', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion: { stories: 100, assets: 100, lastUpdated: new Date().toISOString() },
      });

      const stories = Array.from({ length: 50 }, (_, i) =>
        createMockStory(`story-${i}`, `Story ${i}`, 10)
      );
      const catalog = stories.map(s => ({
        storyId: s.id, title: s.title, category: 'adventure', emoji: '📖',
        thumbnailUrl: `https://thumb-${s.id}`, isFree: true, isReferralReward: false, isPremium: false,
      }));

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 100,
        assetVersion: 100,
        stories,
        deletedStoryIds: [],
        storyChecksums: Object.fromEntries(stories.map(s => [s.id, s.checksum!])),
        totalStories: 50,
        updatedCount: 50,
        lastUpdated: Date.now(),
        catalog,
      } as DeltaSyncResponse);

      const stats = await BatchSyncService.performBatchSync();

      // On-demand: 1 version + 1 delta = 2 API calls regardless of story/asset count
      expect(stats.apiCalls).toBe(2);
      expect(stats.storiesUpdated).toBe(50);
      expect(stats.assetsDownloaded).toBe(0);
      expect(mockCatalogService.updateCatalog).toHaveBeenCalledWith(catalog);
    });
  });
});
