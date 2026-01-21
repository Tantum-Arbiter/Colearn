/**
 * Integration tests for the Batch Sync Flow
 *
 * These tests verify the complete batch sync flow including:
 * - Version checking
 * - Delta content fetching
 * - Batch URL signing
 * - Parallel asset downloads
 * - Cache persistence
 */

import { BatchSyncService, BatchSyncStats, BatchSyncProgress, DeltaSyncResponse } from '../../services/batch-sync-service';
import { VersionManager, VersionCheckResult } from '../../services/version-manager';
import { CacheManager } from '../../services/cache-manager';
import { ApiClient } from '../../services/api-client';
import { Story } from '../../types/story';

// Mock all dependencies
jest.mock('../../services/version-manager');
jest.mock('../../services/cache-manager');
jest.mock('../../services/api-client');
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }),
}));

const mockVersionManager = VersionManager as jest.Mocked<typeof VersionManager>;
const mockCacheManager = CacheManager as jest.Mocked<typeof CacheManager>;
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
    backgroundImage: `assets/stories/${id}/bg${i}.webp`,
    text: `Page ${i} text`,
  })),
});

describe('Batch Sync Integration Flow', () => {
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
    mockCacheManager.hasAsset.mockResolvedValue(false);
    mockCacheManager.downloadAndCacheAsset.mockResolvedValue('/local/path');
    mockVersionManager.getLocalVersion.mockResolvedValue(null);
    mockVersionManager.saveLocalVersion.mockResolvedValue();
    mockVersionManager.updateLocalVersion.mockResolvedValue();
  });

  describe('First-time User Flow', () => {
    it('should perform full batch sync on first launch', async () => {
      // First-time user: no local version, server has content
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

      // Delta response
      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 5,
        assetVersion: 3,
        stories,
        deletedStoryIds: [],
        storyChecksums: { '1': 'checksum-1', '2': 'checksum-2' },
        totalStories: 2,
        updatedCount: 2,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      // Batch URLs response (8 assets: 2 covers + 3 + 2 page backgrounds)
      mockApiClient.request.mockResolvedValueOnce({
        urls: [
          { path: 'stories/1/cover.webp', signedUrl: 'https://url1' },
          { path: 'stories/1/bg0.webp', signedUrl: 'https://url2' },
          { path: 'stories/1/bg1.webp', signedUrl: 'https://url3' },
          { path: 'stories/1/bg2.webp', signedUrl: 'https://url4' },
          { path: 'stories/2/cover.webp', signedUrl: 'https://url5' },
          { path: 'stories/2/bg0.webp', signedUrl: 'https://url6' },
          { path: 'stories/2/bg1.webp', signedUrl: 'https://url7' },
        ],
        failed: [],
      });

      const progressLog: BatchSyncProgress[] = [];
      const stats = await BatchSyncService.performBatchSync((progress) => {
        progressLog.push(progress);
      });

      // Verify API call reduction: 1 version + 1 delta + 1 batch URLs = 3 calls
      // Instead of: 1 version + 2 stories + 7 assets = 10 calls
      expect(stats.apiCalls).toBe(3);
      expect(stats.storiesUpdated).toBe(2);
      expect(stats.assetsDownloaded).toBe(7);

      // Verify progress phases
      const phases = progressLog.map(p => p.phase);
      expect(phases).toContain('version-check');
      expect(phases).toContain('fetching-delta');
      expect(phases).toContain('batch-urls');
      expect(phases).toContain('downloading');
      expect(phases).toContain('complete');

      // Verify cache was updated
      expect(mockCacheManager.updateStories).toHaveBeenCalledWith(stories);
      expect(mockVersionManager.updateLocalVersion).toHaveBeenCalledWith({
        stories: 5,
        assets: 3,
      });
    });
  });

  describe('Returning User Flow', () => {
    it('should skip sync when already up to date', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: false,
        needsAssetSync: false,
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
      });

      const stats = await BatchSyncService.performBatchSync();

      // Only version check, no other API calls
      expect(stats.apiCalls).toBe(1);
      expect(stats.storiesUpdated).toBe(0);
      expect(stats.assetsDownloaded).toBe(0);
      expect(mockApiClient.request).not.toHaveBeenCalled();
    });

    it('should only download new assets when some are cached', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: { stories: 3, assets: 2, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
      });

      const newStory = createMockStory('3', 'New Story', 2);
      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 5,
        assetVersion: 3,
        stories: [newStory],
        deletedStoryIds: [],
        storyChecksums: { '3': 'checksum-3' },
        totalStories: 3,
        updatedCount: 1,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      // Some assets already cached
      mockCacheManager.hasAsset
        .mockResolvedValueOnce(true)  // cover already cached
        .mockResolvedValueOnce(false) // bg0 needs download
        .mockResolvedValueOnce(false); // bg1 needs download

      mockApiClient.request.mockResolvedValueOnce({
        urls: [
          { path: 'stories/3/bg0.webp', signedUrl: 'https://url1' },
          { path: 'stories/3/bg1.webp', signedUrl: 'https://url2' },
        ],
        failed: [],
      });

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.assetsSkipped).toBe(1); // Cover was cached
      expect(stats.assetsDownloaded).toBe(2); // Only new assets downloaded
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
    it('should batch URL requests for many assets', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion: { stories: 100, assets: 50, lastUpdated: new Date().toISOString() },
      });

      // Create 10 stories with 10 assets each = 100 assets
      const stories = Array.from({ length: 10 }, (_, i) =>
        createMockStory(`story-${i}`, `Story ${i}`, 10)
      );

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 100,
        assetVersion: 50,
        stories,
        deletedStoryIds: [],
        storyChecksums: Object.fromEntries(stories.map(s => [s.id, s.checksum!])),
        totalStories: 10,
        updatedCount: 10,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      // All assets need downloading (110 total: 10 covers + 100 page backgrounds)
      mockCacheManager.hasAsset.mockResolvedValue(false);

      // Batch URLs - should be 3 batches (110 / 50 = 3 batches)
      mockApiClient.request
        .mockResolvedValueOnce({ urls: Array(50).fill({ path: 'p', signedUrl: 'u' }), failed: [] })
        .mockResolvedValueOnce({ urls: Array(50).fill({ path: 'p', signedUrl: 'u' }), failed: [] })
        .mockResolvedValueOnce({ urls: Array(10).fill({ path: 'p', signedUrl: 'u' }), failed: [] });

      const stats = await BatchSyncService.performBatchSync();

      // 1 version + 1 delta + 3 batch URL requests = 5 API calls
      // Instead of: 1 version + 10 stories + 110 assets = 121 API calls
      expect(stats.apiCalls).toBe(5);
      expect(stats.storiesUpdated).toBe(10);
      expect(stats.assetsDownloaded).toBe(110);
    });
  });

  describe('Error Recovery', () => {
    it('should continue sync even with partial asset failures', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
      });

      const story = createMockStory('1', 'Story 1', 3);
      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 5,
        assetVersion: 3,
        stories: [story],
        deletedStoryIds: [],
        storyChecksums: { '1': 'checksum-1' },
        totalStories: 1,
        updatedCount: 1,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      mockCacheManager.hasAsset.mockResolvedValue(false);
      mockApiClient.request.mockResolvedValueOnce({
        urls: [
          { path: 'stories/1/cover.webp', signedUrl: 'https://url1' },
          { path: 'stories/1/bg0.webp', signedUrl: 'https://url2' },
        ],
        failed: ['stories/1/bg1.webp', 'stories/1/bg2.webp'], // 2 failed
      });

      // One download succeeds, one fails
      mockCacheManager.downloadAndCacheAsset
        .mockResolvedValueOnce('/local/path')
        .mockRejectedValueOnce(new Error('Download failed'));

      const stats = await BatchSyncService.performBatchSync();

      // Story should still be saved despite asset failures
      expect(mockCacheManager.updateStories).toHaveBeenCalledWith([story]);
      expect(stats.assetsDownloaded).toBe(1);
      expect(stats.assetsFailed).toBe(3); // 2 URL failures + 1 download failure
      expect(stats.errors.length).toBeGreaterThan(0);
    });
  });

  // ==================== HAPPY PATH INTEGRATION TESTS ====================
  describe('Happy Path - Complete Flows', () => {
    it('should handle incremental update (only new stories)', async () => {
      // User has 3 stories, server has 5 stories
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

      mockCacheManager.hasAsset.mockResolvedValue(false);
      mockApiClient.request.mockResolvedValueOnce({
        urls: [
          { path: 'stories/4/cover.webp', signedUrl: 'https://url1' },
          { path: 'stories/4/bg0.webp', signedUrl: 'https://url2' },
          { path: 'stories/4/bg1.webp', signedUrl: 'https://url3' },
          { path: 'stories/5/cover.webp', signedUrl: 'https://url4' },
          { path: 'stories/5/bg0.webp', signedUrl: 'https://url5' },
          { path: 'stories/5/bg1.webp', signedUrl: 'https://url6' },
        ],
        failed: [],
      });

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.storiesUpdated).toBe(2);
      expect(stats.assetsDownloaded).toBe(6);
      expect(stats.errors).toHaveLength(0);
    });

    it('should handle story updates (existing stories modified)', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: false,
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 6, assets: 3, lastUpdated: new Date().toISOString() },
      });

      // Story 1 was updated (new checksum)
      const updatedStory = createMockStory('1', 'Updated Story 1', 2);

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 6,
        assetVersion: 3,
        stories: [updatedStory],
        deletedStoryIds: [],
        storyChecksums: { '1': 'new-checksum-1' },
        totalStories: 5,
        updatedCount: 1,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      // Assets are same, already cached
      mockCacheManager.hasAsset.mockResolvedValue(true);

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.storiesUpdated).toBe(1);
      expect(stats.assetsSkipped).toBe(3); // All cached
      expect(stats.assetsDownloaded).toBe(0);
    });

    it('should handle mixed scenario (updates, additions, deletions)', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 7, assets: 5, lastUpdated: new Date().toISOString() },
      });

      const stories = [
        createMockStory('1', 'Updated Story 1', 1),  // Updated
        createMockStory('6', 'New Story 6', 1),       // New
      ];

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 7,
        assetVersion: 5,
        stories,
        deletedStoryIds: ['3', '4'], // 2 deleted
        storyChecksums: { '1': 'new-checksum', '6': 'checksum-6' },
        totalStories: 4,
        updatedCount: 2,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      mockCacheManager.hasAsset.mockResolvedValue(false);
      mockApiClient.request.mockResolvedValueOnce({
        urls: [
          { path: 'stories/1/cover.webp', signedUrl: 'https://url1' },
          { path: 'stories/1/bg0.webp', signedUrl: 'https://url2' },
          { path: 'stories/6/cover.webp', signedUrl: 'https://url3' },
          { path: 'stories/6/bg0.webp', signedUrl: 'https://url4' },
        ],
        failed: [],
      });

      const stats = await BatchSyncService.performBatchSync();

      expect(stats.storiesUpdated).toBe(2);
      expect(stats.storiesDeleted).toBe(2);
      expect(stats.assetsDownloaded).toBe(4);
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

    it('should handle timeout during batch URL fetch', async () => {
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
      } as DeltaSyncResponse);

      mockCacheManager.hasAsset.mockResolvedValue(false);
      mockApiClient.request.mockRejectedValueOnce(new Error('Request timeout'));

      const stats = await BatchSyncService.performBatchSync();

      // Should still save story but mark assets as failed
      expect(mockCacheManager.updateStories).toHaveBeenCalled();
      expect(stats.assetsFailed).toBeGreaterThan(0);
    });

    it('should throw error on malformed response from delta endpoint', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
      });

      // Malformed response (missing required fields)
      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 5,
        // Missing: stories, assetVersion, etc.
      } as any);

      // Should throw because stories is undefined
      await expect(BatchSyncService.performBatchSync()).rejects.toThrow();
    });
  });

  // ==================== EDGE CASE INTEGRATION TESTS ====================
  describe('Edge Cases - Boundary Conditions', () => {
    it('should handle exactly 50 assets (single batch boundary)', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion: { stories: 50, assets: 50, lastUpdated: new Date().toISOString() },
      });

      // Create story with exactly 50 assets
      const story: Story = {
        id: 'fifty-assets',
        title: 'Fifty Assets Story',
        checksum: 'fifty123',
        pages: Array.from({ length: 50 }, (_, i) => ({
          id: `page-${i}`,
          backgroundImage: `stories/fifty-assets/bg${i}.webp`,
          text: `Page ${i}`,
        })),
      };

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 50,
        assetVersion: 50,
        stories: [story],
        deletedStoryIds: [],
        storyChecksums: { 'fifty-assets': 'fifty123' },
        totalStories: 1,
        updatedCount: 1,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      mockCacheManager.hasAsset.mockResolvedValue(false);
      // Exactly 1 batch (50 assets = 50 max per batch)
      mockApiClient.request.mockResolvedValueOnce({
        urls: Array(50).fill({ path: 'p', signedUrl: 'u' }),
        failed: [],
      });

      const stats = await BatchSyncService.performBatchSync();

      // 1 version + 1 delta + 1 batch URL = 3 API calls
      expect(stats.apiCalls).toBe(3);
    });

    it('should handle 51 assets (boundary requiring 2 batches)', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion: { stories: 51, assets: 51, lastUpdated: new Date().toISOString() },
      });

      const story: Story = {
        id: 'fifty-one-assets',
        title: 'Fifty One Assets Story',
        checksum: 'fiftyone123',
        pages: Array.from({ length: 51 }, (_, i) => ({
          id: `page-${i}`,
          backgroundImage: `stories/fifty-one-assets/bg${i}.webp`,
          text: `Page ${i}`,
        })),
      };

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 51,
        assetVersion: 51,
        stories: [story],
        deletedStoryIds: [],
        storyChecksums: { 'fifty-one-assets': 'fiftyone123' },
        totalStories: 1,
        updatedCount: 1,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      mockCacheManager.hasAsset.mockResolvedValue(false);
      // 2 batches (50 + 1)
      mockApiClient.request
        .mockResolvedValueOnce({ urls: Array(50).fill({ path: 'p', signedUrl: 'u' }), failed: [] })
        .mockResolvedValueOnce({ urls: Array(1).fill({ path: 'p', signedUrl: 'u' }), failed: [] });

      const stats = await BatchSyncService.performBatchSync();

      // 1 version + 1 delta + 2 batch URLs = 4 API calls
      expect(stats.apiCalls).toBe(4);
    });

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

    it('should handle sync with 0 total assets in new stories', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: false,
        localVersion: null,
        serverVersion: { stories: 2, assets: 0, lastUpdated: new Date().toISOString() },
      });

      const textOnlyStories = [
        { id: '1', title: 'Text Story 1', checksum: 'c1', pages: [{ id: 'p1', text: 'Text only' }] },
        { id: '2', title: 'Text Story 2', checksum: 'c2', pages: [{ id: 'p1', text: 'Also text' }] },
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
      expect(stats.totalAssets).toBe(0);
      expect(stats.assetsDownloaded).toBe(0);
      // No batch URL request should be made
      expect(mockApiClient.request).toHaveBeenCalledTimes(1); // Only delta
    });
  });
});

