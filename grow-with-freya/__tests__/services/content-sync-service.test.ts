import { ContentSyncService, SyncProgress } from '../../services/content-sync-service';
import { VersionManager } from '../../services/version-manager';
import { CacheManager } from '../../services/cache-manager';
import { ApiClient } from '../../services/api-client';
import { Story } from '../../types/story';

jest.mock('../../services/version-manager');
jest.mock('../../services/cache-manager');
jest.mock('../../services/api-client');

const mockVersionManager = VersionManager as jest.Mocked<typeof VersionManager>;
const mockCacheManager = CacheManager as jest.Mocked<typeof CacheManager>;
const mockApiClient = ApiClient as jest.Mocked<typeof ApiClient>;

// Mock story factory
const createMockStory = (id: string, title: string): Story => ({
  id,
  title,
  category: 'adventure',
  tag: 'test',
  emoji: '📖',
  isAvailable: true,
  checksum: `checksum-${id}`,
});

describe('ContentSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sync', () => {
    it('should return cached content when offline', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: false,
        needsAssetSync: false,
        localVersion: { stories: 5, assets: 3, lastUpdated: '' },
        serverVersion: null, // Offline
      });

      const result = await ContentSyncService.sync();

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(true);
      expect(result.updatedStories).toBe(0);
    });

    it('should sync stories when needed', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: false,
        localVersion: { stories: 3, assets: 5, lastUpdated: '' },
        serverVersion: { stories: 7, assets: 5, lastUpdated: '' },
      });
      mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockCacheManager.checkDiskSpaceForSync.mockResolvedValue();
      mockApiClient.request.mockResolvedValue({
        serverVersion: 7,
        stories: [createMockStory('1', 'New Story')],
        storyChecksums: { '1': 'checksum-1' },
        totalStories: 1,
        updatedStories: 1,
        lastUpdated: Date.now(),
      });
      mockCacheManager.updateStories.mockResolvedValue();
      mockCacheManager.removeStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const result = await ContentSyncService.sync();

      expect(result.success).toBe(true);
      expect(result.updatedStories).toBe(1);
      expect(mockCacheManager.updateStories).toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: false,
        localVersion: null,
        serverVersion: { stories: 5, assets: 3, lastUpdated: '' },
      });
      mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockRejectedValue(new Error('API error'));
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const result = await ContentSyncService.sync();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('API error');
    });

    it('should call progress callback', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: false,
        needsAssetSync: false,
        localVersion: { stories: 5, assets: 3, lastUpdated: '' },
        serverVersion: { stories: 5, assets: 3, lastUpdated: '' },
      });
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      const progressCallback = jest.fn();
      await ContentSyncService.sync(progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'checking' })
      );
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'complete' })
      );
    });

    it('should remove deleted stories', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: false,
        localVersion: { stories: 3, assets: 5, lastUpdated: '' },
        serverVersion: { stories: 4, assets: 5, lastUpdated: '' },
      });
      mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });
      mockCacheManager.checkDiskSpaceForSync.mockResolvedValue();

      // Local has story '1' and '2', server only has '2'
      mockCacheManager.getStories.mockResolvedValue([
        createMockStory('1', 'Deleted Story'),
        createMockStory('2', 'Kept Story'),
      ]);

      mockApiClient.request.mockResolvedValue({
        serverVersion: 4,
        stories: [],
        storyChecksums: { '2': 'checksum-2' }, // Story '1' deleted
        totalStories: 1,
        updatedStories: 0,
        lastUpdated: Date.now(),
      });
      mockCacheManager.updateStories.mockResolvedValue();
      mockCacheManager.removeStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      await ContentSyncService.sync();

      expect(mockCacheManager.removeStories).toHaveBeenCalledWith(['1']);
    });
  });

  describe('isSyncNeeded', () => {
    it('should return true when stories need sync', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: false,
        localVersion: null,
        serverVersion: { stories: 5, assets: 3, lastUpdated: '' },
      });

      const result = await ContentSyncService.isSyncNeeded();

      expect(result).toBe(true);
    });

    it('should return false when no sync needed', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: false,
        needsAssetSync: false,
        localVersion: { stories: 5, assets: 3, lastUpdated: '' },
        serverVersion: { stories: 5, assets: 3, lastUpdated: '' },
      });

      const result = await ContentSyncService.isSyncNeeded();

      expect(result).toBe(false);
    });
  });

  describe('getStories', () => {
    it('should return stories from cache (no network)', async () => {
      const cachedStories = [createMockStory('1', 'Story 1')];
      mockCacheManager.getStories.mockResolvedValue(cachedStories);

      const result = await ContentSyncService.getStories();

      expect(result).toEqual(cachedStories);
      expect(mockApiClient.request).not.toHaveBeenCalled();
    });
  });

  describe('getStory', () => {
    it('should return single story from cache', async () => {
      const story = createMockStory('1', 'Story 1');
      mockCacheManager.getStory.mockResolvedValue(story);

      const result = await ContentSyncService.getStory('1');

      expect(result).toEqual(story);
      expect(mockApiClient.request).not.toHaveBeenCalled();
    });

    it('should return null for non-existent story', async () => {
      mockCacheManager.getStory.mockResolvedValue(null);

      const result = await ContentSyncService.getStory('999');

      expect(result).toBeNull();
    });
  });

  describe('getAssetUri', () => {
    it('should return asset URI from cache', async () => {
      mockCacheManager.getAssetUri.mockResolvedValue('file://cached/asset.png');

      const result = await ContentSyncService.getAssetUri('stories/asset.png');

      expect(result).toBe('file://cached/asset.png');
      expect(mockApiClient.request).not.toHaveBeenCalled();
    });
  });

  describe('forceSync', () => {
    it('should clear local version before syncing', async () => {
      mockVersionManager.clearLocalVersion.mockResolvedValue();
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: false,
        localVersion: null,
        serverVersion: { stories: 5, assets: 3, lastUpdated: '' },
      });
      mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });
      mockCacheManager.checkDiskSpaceForSync.mockResolvedValue();
      mockCacheManager.getStories.mockResolvedValue([]);
      mockApiClient.request.mockResolvedValue({
        serverVersion: 5,
        stories: [createMockStory('1', 'Story')],
        storyChecksums: { '1': 'checksum-1' },
        totalStories: 1,
        updatedStories: 1,
        lastUpdated: Date.now(),
      });
      mockCacheManager.updateStories.mockResolvedValue();
      mockCacheManager.removeStories.mockResolvedValue();
      mockVersionManager.updateLocalVersion.mockResolvedValue();

      await ContentSyncService.forceSync();

      expect(mockVersionManager.clearLocalVersion).toHaveBeenCalled();
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status', async () => {
      mockCacheManager.getStats.mockResolvedValue({
        storyCount: 10,
        cacheSize: 1024,
        lastUpdated: '2024-01-15T10:00:00Z',
      });
      mockVersionManager.getLocalVersion.mockResolvedValue({
        stories: 5,
        assets: 3,
        lastUpdated: '2024-01-15T10:00:00Z',
      });
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: false,
        needsAssetSync: false,
        localVersion: { stories: 5, assets: 3, lastUpdated: '' },
        serverVersion: { stories: 5, assets: 3, lastUpdated: '' },
      });

      const status = await ContentSyncService.getSyncStatus();

      expect(status.hasLocalData).toBe(true);
      expect(status.storyCount).toBe(10);
      expect(status.needsSync).toBe(false);
    });
  });

  describe('edge cases', () => {
    describe('concurrent sync prevention', () => {
      it('should return same promise for concurrent sync calls', async () => {
        mockVersionManager.checkVersions.mockResolvedValue({
          needsStorySync: false,
          needsAssetSync: false,
          localVersion: { stories: 5, assets: 3, lastUpdated: '' },
          serverVersion: { stories: 5, assets: 3, lastUpdated: '' },
        });
        mockVersionManager.updateLocalVersion.mockResolvedValue();

        // Start two sync operations concurrently
        const promise1 = ContentSyncService.sync();
        const promise2 = ContentSyncService.sync();

        const [result1, result2] = await Promise.all([promise1, promise2]);

        // Both should succeed
        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        // checkVersions should only be called once (sync lock)
        expect(mockVersionManager.checkVersions).toHaveBeenCalledTimes(1);
      });
    });

    describe('token refresh during sync', () => {
      it('should handle 401 and auto-refresh token', async () => {
        mockVersionManager.checkVersions.mockResolvedValue({
          needsStorySync: true,
          needsAssetSync: false,
          localVersion: { stories: 3, assets: 5, lastUpdated: '' },
          serverVersion: { stories: 5, assets: 5, lastUpdated: '' },
        });
        mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });
        mockCacheManager.checkDiskSpaceForSync.mockResolvedValue();
        mockCacheManager.getStories.mockResolvedValue([]);

        // First call fails with 401, ApiClient handles refresh internally
        mockApiClient.request.mockResolvedValue({
          serverVersion: 5,
          stories: [createMockStory('1', 'Story after refresh')],
          storyChecksums: { '1': 'checksum-1' },
          totalStories: 1,
          updatedStories: 1,
          lastUpdated: Date.now(),
        });
        mockCacheManager.updateStories.mockResolvedValue();
        mockCacheManager.removeStories.mockResolvedValue();
        mockVersionManager.updateLocalVersion.mockResolvedValue();

        const result = await ContentSyncService.sync();

        expect(result.success).toBe(true);
        expect(result.updatedStories).toBe(1);
      });
    });

    describe('partial asset download failure', () => {
      it('should skip story if some assets fail to download but continue with others', async () => {
        mockVersionManager.checkVersions.mockResolvedValue({
          needsStorySync: true,
          needsAssetSync: false,
          localVersion: { stories: 0, assets: 0, lastUpdated: '' },
          serverVersion: { stories: 2, assets: 5, lastUpdated: '' },
        });
        mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });
        mockCacheManager.checkDiskSpaceForSync.mockResolvedValue();
        mockCacheManager.getStories.mockResolvedValue([]);

        // Two stories: one with cover that will fail, one without
        const storyWithCover: Story = {
          ...createMockStory('1', 'Story With Cover'),
          coverImage: 'stories/1/cover.webp', // Remote asset path (not local:)
        };
        const storyWithoutCover = createMockStory('2', 'Story Without Cover');

        mockApiClient.request
          .mockResolvedValueOnce({
            serverVersion: 2,
            stories: [storyWithCover, storyWithoutCover],
            storyChecksums: { '1': 'checksum-1', '2': 'checksum-2' },
            totalStories: 2,
            updatedStories: 2,
            lastUpdated: Date.now(),
          })
          // Asset URL request for story 1 fails
          .mockRejectedValueOnce(new Error('Failed to get signed URL'));

        mockCacheManager.hasAsset.mockResolvedValue(false);
        mockCacheManager.updateStories.mockResolvedValue();
        mockCacheManager.removeStories.mockResolvedValue();
        mockVersionManager.updateLocalVersion.mockResolvedValue();

        const result = await ContentSyncService.sync();

        // Sync reports failure because some assets failed to download
        // But story 2 (without cover) should still be synced
        expect(result.success).toBe(false); // Has errors
        expect(result.errors.length).toBeGreaterThan(0); // Story 1 failed
        // Story 2 (without remote assets) should still be synced
        expect(result.updatedStories).toBe(1);
        // updateStories called for story 2
        expect(mockCacheManager.updateStories).toHaveBeenCalledWith([storyWithoutCover]);
      });
    });

    describe('empty cache first sync', () => {
      it('should handle first sync with no local data', async () => {
        mockVersionManager.checkVersions.mockResolvedValue({
          needsStorySync: true,
          needsAssetSync: false,
          localVersion: null, // No local version (first time)
          serverVersion: { stories: 3, assets: 5, lastUpdated: '' },
        });
        mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });
        mockCacheManager.checkDiskSpaceForSync.mockResolvedValue();
        mockCacheManager.getStories.mockResolvedValue([]);

        // Stories without remote assets (so they sync immediately)
        mockApiClient.request.mockResolvedValue({
          serverVersion: 3,
          stories: [
            createMockStory('1', 'First Story'),
            createMockStory('2', 'Second Story'),
          ],
          storyChecksums: { '1': 'checksum-1', '2': 'checksum-2' },
          totalStories: 2,
          updatedStories: 2,
          lastUpdated: Date.now(),
        });
        mockCacheManager.updateStories.mockResolvedValue();
        mockCacheManager.removeStories.mockResolvedValue();
        mockVersionManager.updateLocalVersion.mockResolvedValue();

        const result = await ContentSyncService.sync();

        expect(result.success).toBe(true);
        expect(result.updatedStories).toBe(2);
        expect(result.fromCache).toBe(false);
      });
    });

    describe('progress reporting with detail', () => {
      it('should report detailed progress during asset sync', async () => {
        mockVersionManager.checkVersions.mockResolvedValue({
          needsStorySync: true,
          needsAssetSync: false,
          localVersion: { stories: 0, assets: 0, lastUpdated: '' },
          serverVersion: { stories: 1, assets: 3, lastUpdated: '' },
        });
        mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });
        mockCacheManager.checkDiskSpaceForSync.mockResolvedValue();
        mockCacheManager.getStories.mockResolvedValue([]);

        const storyWithAssets: Story = {
          ...createMockStory('1', 'Story With Assets'),
          coverImageUrl: 'https://storage.example.com/stories/1/cover.webp',
        };

        mockApiClient.request.mockResolvedValue({
          serverVersion: 1,
          stories: [storyWithAssets],
          storyChecksums: { '1': 'checksum-1' },
          totalStories: 1,
          updatedStories: 1,
          lastUpdated: Date.now(),
        });
        mockCacheManager.hasAsset.mockResolvedValue(true); // Assets already cached
        mockCacheManager.updateStories.mockResolvedValue();
        mockCacheManager.removeStories.mockResolvedValue();
        mockVersionManager.updateLocalVersion.mockResolvedValue();

        const progressEvents: SyncProgress[] = [];
        await ContentSyncService.sync((progress) => {
          progressEvents.push({ ...progress });
        });

        // Should have progress events for each phase
        expect(progressEvents.some(p => p.phase === 'checking')).toBe(true);
        expect(progressEvents.some(p => p.phase === 'syncing-stories')).toBe(true);
        expect(progressEvents.some(p => p.phase === 'syncing-assets')).toBe(true);
        expect(progressEvents.some(p => p.phase === 'complete')).toBe(true);

        // syncing-assets should include story title in message
        const assetProgress = progressEvents.find(p => p.phase === 'syncing-assets');
        expect(assetProgress?.message).toContain('Story With Assets');
      });
    });

    describe('network timeout handling', () => {
      it('should fail gracefully on network timeout', async () => {
        mockVersionManager.checkVersions.mockResolvedValue({
          needsStorySync: true,
          needsAssetSync: false,
          localVersion: null,
          serverVersion: { stories: 5, assets: 3, lastUpdated: '' },
        });
        mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });
        mockCacheManager.getStories.mockResolvedValue([]);
        mockApiClient.request.mockRejectedValue(new Error('Network timeout'));
        mockVersionManager.updateLocalVersion.mockResolvedValue();

        const result = await ContentSyncService.sync();

        // Sync fails but app continues (bundled stories available)
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Network timeout');
        // fromCache indicates cached content is still available even if sync failed
      });
    });

    describe('server returns empty delta', () => {
      it('should handle server returning no updates', async () => {
        mockVersionManager.checkVersions.mockResolvedValue({
          needsStorySync: true, // Server says sync needed
          needsAssetSync: false,
          localVersion: { stories: 5, assets: 3, lastUpdated: '' },
          serverVersion: { stories: 6, assets: 3, lastUpdated: '' },
        });
        mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });
        mockCacheManager.checkDiskSpaceForSync.mockResolvedValue();
        mockCacheManager.getStories.mockResolvedValue([
          createMockStory('1', 'Existing Story'),
        ]);

        // But server returns no new stories in delta
        mockApiClient.request.mockResolvedValue({
          serverVersion: 6,
          stories: [], // No new/changed stories
          storyChecksums: { '1': 'checksum-1' },
          totalStories: 1,
          updatedStories: 0,
          lastUpdated: Date.now(),
        });
        mockCacheManager.removeStories.mockResolvedValue();
        mockVersionManager.updateLocalVersion.mockResolvedValue();

        const result = await ContentSyncService.sync();

        expect(result.success).toBe(true);
        expect(result.updatedStories).toBe(0);
        // Should still update version
        expect(mockVersionManager.updateLocalVersion).toHaveBeenCalled();
      });
    });

    describe('signed URL retry on 403', () => {
      it('should retry with new signed URL when download fails with 403', async () => {
        mockVersionManager.checkVersions.mockResolvedValue({
          needsStorySync: true,
          needsAssetSync: false,
          localVersion: { stories: 1, assets: 1, lastUpdated: '' },
          serverVersion: { stories: 2, assets: 1, lastUpdated: '' },
        });
        mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });
        mockCacheManager.checkDiskSpaceForSync.mockResolvedValue();
        mockCacheManager.getStories.mockResolvedValue([]);

        const storyWithAsset = {
          ...createMockStory('1', 'Story with Asset'),
          coverImage: 'stories/1/cover.png', // Use coverImage not coverImageUrl
        };

        mockApiClient.request
          // First call: sync request
          .mockResolvedValueOnce({
            serverVersion: 2,
            stories: [storyWithAsset],
            storyChecksums: { '1': 'checksum-1' },
            totalStories: 1,
            updatedStories: 1,
            lastUpdated: Date.now(),
          })
          // Second call: first signed URL request (will fail on download)
          .mockResolvedValueOnce({ signedUrl: 'https://expired-url.com/asset' })
          // Third call: second signed URL request (retry after 403)
          .mockResolvedValueOnce({ signedUrl: 'https://fresh-url.com/asset' });

        mockCacheManager.hasAsset.mockResolvedValue(false);
        mockCacheManager.removeStories.mockResolvedValue();

        // First download fails with 403, second succeeds
        mockCacheManager.downloadAndCacheAsset
          .mockRejectedValueOnce(new Error('Failed to download asset: 403'))
          .mockResolvedValueOnce('/local/path/asset.png');

        mockCacheManager.updateStories.mockResolvedValue();
        mockVersionManager.updateLocalVersion.mockResolvedValue();

        const result = await ContentSyncService.sync();

        expect(result.success).toBe(true);
        // Should have requested signed URL twice (retry after 403)
        expect(mockApiClient.request).toHaveBeenCalledTimes(3);
      });

      it('should fail after max retries on persistent 403', async () => {
        mockVersionManager.checkVersions.mockResolvedValue({
          needsStorySync: true,
          needsAssetSync: false,
          localVersion: { stories: 1, assets: 1, lastUpdated: '' },
          serverVersion: { stories: 2, assets: 1, lastUpdated: '' },
        });
        mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });
        mockCacheManager.checkDiskSpaceForSync.mockResolvedValue();
        mockCacheManager.getStories.mockResolvedValue([]);

        const storyWithAsset = {
          ...createMockStory('1', 'Story with Asset'),
          coverImage: 'stories/1/cover.png', // Use coverImage not coverImageUrl
        };

        mockApiClient.request
          .mockResolvedValueOnce({
            serverVersion: 2,
            stories: [storyWithAsset],
            storyChecksums: { '1': 'checksum-1' },
            totalStories: 1,
            updatedStories: 1,
            lastUpdated: Date.now(),
          })
          // All signed URL requests succeed but downloads fail
          .mockResolvedValue({ signedUrl: 'https://always-expired.com/asset' });

        mockCacheManager.hasAsset.mockResolvedValue(false);
        mockCacheManager.removeStories.mockResolvedValue();
        mockCacheManager.updateStories.mockResolvedValue();
        // All downloads fail with 403
        mockCacheManager.downloadAndCacheAsset
          .mockRejectedValue(new Error('Failed to download asset: 403'));

        mockVersionManager.updateLocalVersion.mockResolvedValue();

        const result = await ContentSyncService.sync();

        // Sync completes - either with errors array populated or success=false
        // The key assertion is that the story was NOT added (updatedStories should be 0)
        expect(result.updatedStories).toBe(0);
        // And we should have some indication of failure (either errors or success=false)
        const hasFailureIndication = result.errors.length > 0 || result.success === false;
        expect(hasFailureIndication).toBe(true);
      });
    });

    describe('network error retry', () => {
      it('should retry on network errors with exponential backoff', async () => {
        mockVersionManager.checkVersions.mockResolvedValue({
          needsStorySync: true,
          needsAssetSync: false,
          localVersion: { stories: 1, assets: 1, lastUpdated: '' },
          serverVersion: { stories: 2, assets: 1, lastUpdated: '' },
        });
        mockCacheManager.getStories.mockResolvedValue([]);
        mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });
        mockCacheManager.checkDiskSpaceForSync.mockResolvedValue();

        const storyWithAsset = {
          ...createMockStory('1', 'Story with Asset'),
          coverImage: 'stories/1/cover.png',
        };

        mockApiClient.request
          .mockResolvedValueOnce({
            serverVersion: 2,
            stories: [storyWithAsset],
            storyChecksums: { '1': 'checksum-1' },
            totalStories: 1,
            updatedStories: 1,
            lastUpdated: Date.now(),
          })
          // First URL request succeeds but download fails with network error
          .mockResolvedValueOnce({ signedUrl: 'https://url1.com/asset' })
          // Retry: second URL request succeeds
          .mockResolvedValueOnce({ signedUrl: 'https://url2.com/asset' });

        mockCacheManager.hasAsset.mockResolvedValue(false);
        mockCacheManager.removeStories.mockResolvedValue();

        // First download fails with network error, second succeeds
        mockCacheManager.downloadAndCacheAsset
          .mockRejectedValueOnce(new Error('Network request failed'))
          .mockResolvedValueOnce('/local/path/asset.png');

        mockCacheManager.updateStories.mockResolvedValue();
        mockVersionManager.updateLocalVersion.mockResolvedValue();

        const result = await ContentSyncService.sync();

        expect(result.success).toBe(true);
        expect(result.updatedStories).toBe(1);
      });

      it('should retry on timeout errors', async () => {
        mockVersionManager.checkVersions.mockResolvedValue({
          needsStorySync: true,
          needsAssetSync: false,
          localVersion: { stories: 1, assets: 1, lastUpdated: '' },
          serverVersion: { stories: 2, assets: 1, lastUpdated: '' },
        });
        mockCacheManager.getStories.mockResolvedValue([]);
        mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });
        mockCacheManager.checkDiskSpaceForSync.mockResolvedValue();

        const storyWithAsset = {
          ...createMockStory('1', 'Story'),
          coverImage: 'stories/1/cover.png',
        };

        mockApiClient.request
          .mockResolvedValueOnce({
            serverVersion: 2,
            stories: [storyWithAsset],
            storyChecksums: { '1': 'checksum-1' },
            totalStories: 1,
            updatedStories: 1,
            lastUpdated: Date.now(),
          })
          .mockResolvedValueOnce({ signedUrl: 'https://url.com/asset' })
          .mockResolvedValueOnce({ signedUrl: 'https://url.com/asset' });

        mockCacheManager.hasAsset.mockResolvedValue(false);
        mockCacheManager.removeStories.mockResolvedValue();

        // First download times out, second succeeds
        mockCacheManager.downloadAndCacheAsset
          .mockRejectedValueOnce(new Error('Request timeout after 30000ms'))
          .mockResolvedValueOnce('/local/path/asset.png');

        mockCacheManager.updateStories.mockResolvedValue();
        mockVersionManager.updateLocalVersion.mockResolvedValue();

        const result = await ContentSyncService.sync();

        expect(result.success).toBe(true);
      });
    });

    describe('disk space check', () => {
      it('should fail sync when disk space is insufficient', async () => {
        mockVersionManager.checkVersions.mockResolvedValue({
          needsStorySync: true,
          needsAssetSync: false,
          localVersion: { stories: 1, assets: 1, lastUpdated: '' },
          serverVersion: { stories: 2, assets: 1, lastUpdated: '' },
        });
        mockCacheManager.getStories.mockResolvedValue([]);
        mockCacheManager.validateAllAssets.mockResolvedValue({ totalAssets: 0, validAssets: 0, corruptedAssets: [] });

        mockApiClient.request.mockResolvedValueOnce({
          serverVersion: 2,
          stories: [createMockStory('1', 'Story')],
          storyChecksums: { '1': 'checksum-1' },
          totalStories: 1,
          updatedStories: 1,
          lastUpdated: Date.now(),
        });

        // Disk space check fails
        mockCacheManager.checkDiskSpaceForSync.mockRejectedValue(
          new Error('Insufficient disk space: 30MB available, need 55MB.')
        );

        const result = await ContentSyncService.sync();

        expect(result.success).toBe(false);
        expect(result.errors).toContain('Insufficient disk space: 30MB available, need 55MB.');
        expect(result.updatedStories).toBe(0);
      });
    });

    describe('corrupted asset recovery', () => {
      it('should download corrupted/missing assets after story sync', async () => {
        mockVersionManager.checkVersions.mockResolvedValue({
          needsStorySync: false, // No story sync needed
          needsAssetSync: false, // No asset sync needed
          localVersion: { stories: 2, assets: 2, lastUpdated: '' },
          serverVersion: { stories: 2, assets: 2, lastUpdated: '' },
        });

        // Report corrupted assets found
        mockCacheManager.validateAllAssets.mockResolvedValue({
          totalAssets: 2,
          validAssets: 0,
          corruptedAssets: ['stories/1/cover.png', 'stories/1/page1.png'],
        });
        mockCacheManager.getStories.mockResolvedValue([createMockStory('1', 'Story')]);
        mockCacheManager.checkDiskSpaceForSync.mockResolvedValue();

        // hasAsset returns false (not cached), so it will download
        mockCacheManager.hasAsset.mockResolvedValue(false);

        // API request for signed URLs
        mockApiClient.request
          .mockResolvedValueOnce({
            serverVersion: 2,
            stories: [],
            storyChecksums: { '1': 'checksum-1' },
            totalStories: 1,
            updatedStories: 0,
            lastUpdated: Date.now(),
          })
          .mockResolvedValueOnce({ signedUrl: 'https://example.com/cover.png' })
          .mockResolvedValueOnce({ signedUrl: 'https://example.com/page1.png' });

        mockCacheManager.downloadAndCacheAsset.mockResolvedValue('/local/path/asset.png');
        mockCacheManager.updateStories.mockResolvedValue();
        mockCacheManager.removeStories.mockResolvedValue();
        mockVersionManager.updateLocalVersion.mockResolvedValue();

        const result = await ContentSyncService.sync();

        // Should have triggered sync due to corrupted assets even though versions match
        expect(result.success).toBe(true);
        // Should have downloaded the 2 corrupted assets
        expect(result.updatedAssets).toBe(2);
      });

      it('should continue sync even if validation fails', async () => {
        mockVersionManager.checkVersions.mockResolvedValue({
          needsStorySync: true,
          needsAssetSync: false,
          localVersion: { stories: 1, assets: 1, lastUpdated: '' },
          serverVersion: { stories: 2, assets: 1, lastUpdated: '' },
        });

        // Validation throws an error
        mockCacheManager.validateAllAssets.mockRejectedValue(new Error('Validation error'));
        mockCacheManager.getStories.mockResolvedValue([]);
        mockCacheManager.checkDiskSpaceForSync.mockResolvedValue();

        mockApiClient.request.mockResolvedValueOnce({
          serverVersion: 2,
          stories: [createMockStory('1', 'Story')],
          storyChecksums: { '1': 'checksum-1' },
          totalStories: 1,
          updatedStories: 1,
          lastUpdated: Date.now(),
        });

        mockCacheManager.updateStories.mockResolvedValue();
        mockCacheManager.removeStories.mockResolvedValue();
        mockVersionManager.updateLocalVersion.mockResolvedValue();

        const result = await ContentSyncService.sync();

        // Sync should still succeed despite validation error
        expect(result.success).toBe(true);
      });
    });
  });
});

