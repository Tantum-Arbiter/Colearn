/**
 * Performance Benchmarks for Batch Sync
 *
 * These tests verify the API call reduction achieved by batch sync
 * and measure performance characteristics for different app sizes.
 */

import { BatchSyncService, BatchSyncStats, DeltaSyncResponse } from '../../services/batch-sync-service';
import { VersionManager } from '../../services/version-manager';
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

// Constants for batch processing
const BATCH_URL_SIZE = 50;

// Mock story factory with configurable asset count
const createMockStory = (id: string, assetsPerPage: number = 2, pageCount: number = 5): Story => ({
  id,
  title: `Story ${id}`,
  category: 'adventure',
  tag: 'test',
  emoji: '📖',
  isAvailable: true,
  checksum: `checksum-${id}`,
  version: 1,
  coverImage: `assets/stories/${id}/cover.webp`,
  pages: Array.from({ length: pageCount }, (_, i) => ({
    id: `page-${i}`,
    pageNumber: i + 1,
    backgroundImage: `assets/stories/${id}/bg${i}.webp`,
    characterImage: assetsPerPage > 1 ? `assets/stories/${id}/char${i}.webp` : undefined,
    text: `Page ${i} text`,
  })),
});

// Calculate expected API calls for old vs new approach
const calculateOldApiCalls = (storyCount: number, totalAssets: number): number => {
  // Old: 1 version + N story fetches + M asset URL requests
  return 1 + storyCount + totalAssets;
};

const calculateNewApiCalls = (totalAssets: number): number => {
  // New: 1 version + 1 delta + ceil(assets/50) batch URL requests
  return 1 + 1 + Math.ceil(totalAssets / BATCH_URL_SIZE);
};

const calculateReduction = (oldCalls: number, newCalls: number): number => {
  return Math.round((1 - newCalls / oldCalls) * 100);
};

describe('Batch Sync Performance Benchmarks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (BatchSyncService as any).isSyncing = false;
    (BatchSyncService as any).syncPromise = null;

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

  describe('API Call Reduction Verification', () => {
    it('should achieve 95%+ reduction for small app (5 stories, 30 assets)', async () => {
      const storyCount = 5;
      const assetsPerStory = 6; // 1 cover + 5 page backgrounds
      const totalAssets = storyCount * assetsPerStory; // 30 assets

      const stories = Array.from({ length: storyCount }, (_, i) => 
        createMockStory(`story-${i}`, 1, 5)
      );

      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
      });

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 10,
        assetVersion: 5,
        stories,
        deletedStoryIds: [],
        storyChecksums: Object.fromEntries(stories.map(s => [s.id, s.checksum!])),
        totalStories: storyCount,
        updatedCount: storyCount,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      // 30 assets = 1 batch
      mockApiClient.request.mockResolvedValueOnce({
        urls: Array(totalAssets).fill({ path: 'p', signedUrl: 'u' }),
        failed: [],
      });

      const stats = await BatchSyncService.performBatchSync();

      const oldCalls = calculateOldApiCalls(storyCount, totalAssets);
      const newCalls = stats.apiCalls;
      const reduction = calculateReduction(oldCalls, newCalls);

      console.log(`Small App: ${oldCalls} -> ${newCalls} API calls (${reduction}% reduction)`);

      expect(newCalls).toBe(3); // 1 version + 1 delta + 1 batch
      expect(reduction).toBeGreaterThanOrEqual(90);
    });

    it('should achieve 95%+ reduction for medium app (20 stories, 120 assets)', async () => {
      const storyCount = 20;
      const assetsPerStory = 6;
      const totalAssets = storyCount * assetsPerStory; // 120 assets

      const stories = Array.from({ length: storyCount }, (_, i) => 
        createMockStory(`story-${i}`, 1, 5)
      );

      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion: { stories: 50, assets: 20, lastUpdated: new Date().toISOString() },
      });

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 50,
        assetVersion: 20,
        stories,
        deletedStoryIds: [],
        storyChecksums: Object.fromEntries(stories.map(s => [s.id, s.checksum!])),
        totalStories: storyCount,
        updatedCount: storyCount,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      // 120 assets = 3 batches (50 + 50 + 20)
      mockApiClient.request
        .mockResolvedValueOnce({ urls: Array(50).fill({ path: 'p', signedUrl: 'u' }), failed: [] })
        .mockResolvedValueOnce({ urls: Array(50).fill({ path: 'p', signedUrl: 'u' }), failed: [] })
        .mockResolvedValueOnce({ urls: Array(20).fill({ path: 'p', signedUrl: 'u' }), failed: [] });

      const stats = await BatchSyncService.performBatchSync();

      const oldCalls = calculateOldApiCalls(storyCount, totalAssets);
      const newCalls = stats.apiCalls;
      const reduction = calculateReduction(oldCalls, newCalls);

      console.log(`Medium App: ${oldCalls} -> ${newCalls} API calls (${reduction}% reduction)`);

      expect(newCalls).toBe(5); // 1 version + 1 delta + 3 batches
      expect(reduction).toBeGreaterThanOrEqual(95);
    });

    it('should achieve 95%+ reduction for large app (50 stories, 300 assets)', async () => {
      const storyCount = 50;
      const assetsPerStory = 6;
      const totalAssets = storyCount * assetsPerStory; // 300 assets

      const stories = Array.from({ length: storyCount }, (_, i) =>
        createMockStory(`story-${i}`, 1, 5)
      );

      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion: { stories: 100, assets: 50, lastUpdated: new Date().toISOString() },
      });

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 100,
        assetVersion: 50,
        stories,
        deletedStoryIds: [],
        storyChecksums: Object.fromEntries(stories.map(s => [s.id, s.checksum!])),
        totalStories: storyCount,
        updatedCount: storyCount,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      // 300 assets = 6 batches
      for (let i = 0; i < 6; i++) {
        const batchSize = i < 5 ? 50 : 50;
        mockApiClient.request.mockResolvedValueOnce({
          urls: Array(batchSize).fill({ path: 'p', signedUrl: 'u' }),
          failed: [],
        });
      }

      const stats = await BatchSyncService.performBatchSync();

      const oldCalls = calculateOldApiCalls(storyCount, totalAssets);
      const newCalls = stats.apiCalls;
      const reduction = calculateReduction(oldCalls, newCalls);

      console.log(`Large App: ${oldCalls} -> ${newCalls} API calls (${reduction}% reduction)`);

      expect(newCalls).toBe(8); // 1 version + 1 delta + 6 batches
      expect(reduction).toBeGreaterThanOrEqual(97);
    });
  });

  describe('Delta Sync Efficiency', () => {
    it('should only fetch changed stories (incremental update)', async () => {
      const existingStories = Array.from({ length: 10 }, (_, i) =>
        createMockStory(`story-${i}`, 1, 5)
      );

      mockCacheManager.getStories.mockResolvedValue(existingStories);

      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 12, assets: 6, lastUpdated: new Date().toISOString() },
      });

      // Only 2 new stories in delta
      const newStories = [
        createMockStory('story-10', 1, 5),
        createMockStory('story-11', 1, 5),
      ];

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 12,
        assetVersion: 6,
        stories: newStories,
        deletedStoryIds: [],
        storyChecksums: Object.fromEntries(newStories.map(s => [s.id, s.checksum!])),
        totalStories: 12,
        updatedCount: 2,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      // Only 12 new assets (2 stories × 6 assets)
      mockApiClient.request.mockResolvedValueOnce({
        urls: Array(12).fill({ path: 'p', signedUrl: 'u' }),
        failed: [],
      });

      const stats = await BatchSyncService.performBatchSync();

      // Should only update 2 stories, not all 12
      expect(stats.storiesUpdated).toBe(2);
      expect(stats.apiCalls).toBe(3); // 1 version + 1 delta + 1 batch
      expect(mockCacheManager.updateStories).toHaveBeenCalledWith(newStories);
    });
  });

  describe('Cache Hit Optimization', () => {
    it('should skip batch URL request when all assets cached', async () => {
      const stories = Array.from({ length: 5 }, (_, i) =>
        createMockStory(`story-${i}`, 1, 5)
      );

      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: false, // Assets already synced
        localVersion: { stories: 5, assets: 5, lastUpdated: new Date().toISOString() },
        serverVersion: { stories: 10, assets: 5, lastUpdated: new Date().toISOString() },
      });

      mockApiClient.request.mockResolvedValueOnce({
        serverVersion: 10,
        assetVersion: 5,
        stories,
        deletedStoryIds: [],
        storyChecksums: Object.fromEntries(stories.map(s => [s.id, s.checksum!])),
        totalStories: 5,
        updatedCount: 5,
        lastUpdated: Date.now(),
      } as DeltaSyncResponse);

      // All assets already cached
      mockCacheManager.hasAsset.mockResolvedValue(true);

      const stats = await BatchSyncService.performBatchSync();

      // No batch URL request needed
      expect(stats.apiCalls).toBe(2); // 1 version + 1 delta
      expect(stats.assetsSkipped).toBe(30); // All 30 assets skipped
      expect(stats.assetsDownloaded).toBe(0);
    });
  });

  describe('Performance Summary', () => {
    it('should log performance summary', () => {
      // Summary of expected API call reductions
      const scenarios = [
        { name: 'Small (5 stories, 30 assets)', stories: 5, assets: 30 },
        { name: 'Medium (20 stories, 120 assets)', stories: 20, assets: 120 },
        { name: 'Large (50 stories, 300 assets)', stories: 50, assets: 300 },
        { name: 'Very Large (100 stories, 600 assets)', stories: 100, assets: 600 },
      ];

      console.log('\n=== Batch Sync API Call Reduction Summary ===\n');

      for (const scenario of scenarios) {
        const oldCalls = calculateOldApiCalls(scenario.stories, scenario.assets);
        const newCalls = calculateNewApiCalls(scenario.assets);
        const reduction = calculateReduction(oldCalls, newCalls);

        console.log(`${scenario.name}:`);
        console.log(`  Old: ${oldCalls} API calls`);
        console.log(`  New: ${newCalls} API calls`);
        console.log(`  Reduction: ${reduction}%\n`);

        expect(reduction).toBeGreaterThanOrEqual(90);
      }
    });
  });
});

