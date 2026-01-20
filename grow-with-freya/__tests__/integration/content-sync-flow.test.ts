/**
 * Integration tests for the Content Sync Flow
 *
 * These tests verify the full flow from version check to cache update
 * using realistic scenarios that users might encounter.
 */

import { ContentSyncService, SyncResult, SyncProgress } from '../../services/content-sync-service';
import { VersionManager } from '../../services/version-manager';
import { CacheManager } from '../../services/cache-manager';
import { ApiClient } from '../../services/api-client';
import { Story } from '../../types/story';

// Mock all dependencies
jest.mock('../../services/version-manager');
jest.mock('../../services/cache-manager');
jest.mock('../../services/api-client');

const mockVersionManager = VersionManager as jest.Mocked<typeof VersionManager>;
const mockCacheManager = CacheManager as jest.Mocked<typeof CacheManager>;
const mockApiClient = ApiClient as jest.Mocked<typeof ApiClient>;

// Mock story factory
const createMockStory = (id: string, title: string, checksum?: string): Story => ({
  id,
  title,
  category: 'adventure',
  tag: 'test',
  emoji: '📖',
  isAvailable: true,
  checksum: checksum || `checksum-${id}`,
  version: 1,
});

describe('Content Sync Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockVersionManager.clearLocalVersion.mockResolvedValue();
    mockCacheManager.clearAll.mockResolvedValue();
    mockCacheManager.getStories.mockResolvedValue([]);
    mockCacheManager.saveStories.mockResolvedValue();
    mockCacheManager.updateStories.mockResolvedValue();
    mockCacheManager.removeStories.mockResolvedValue();
    mockCacheManager.getStats.mockResolvedValue({ storyCount: 0, cacheSize: 0, lastUpdated: null });
    mockVersionManager.getLocalVersion.mockResolvedValue(null);
    mockVersionManager.saveLocalVersion.mockResolvedValue();
    mockVersionManager.updateLocalVersion.mockResolvedValue();
  });

  describe('First-time User Flow', () => {
    it('should perform full sync on first launch', async () => {
      // First-time user: no local version, server has content
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: false,
        localVersion: null,
        serverVersion: { stories: 5, assets: 3, lastUpdated: new Date().toISOString() },
      });

      mockApiClient.request.mockResolvedValue({
        serverVersion: 5,
        stories: [
          createMockStory('1', 'Story 1'),
          createMockStory('2', 'Story 2'),
        ],
        storyChecksums: {
          '1': 'checksum-1',
          '2': 'checksum-2',
        },
        totalStories: 2,
        updatedStories: 2,
        lastUpdated: Date.now(),
      });

      const progressLog: SyncProgress[] = [];
      const result = await ContentSyncService.sync((progress) => {
        progressLog.push(progress);
      });

      expect(result.success).toBe(true);
      expect(result.updatedStories).toBe(2);
      expect(progressLog.some(p => p.phase === 'checking')).toBe(true);
      expect(progressLog.some(p => p.phase === 'complete')).toBe(true);
      expect(mockCacheManager.updateStories).toHaveBeenCalled();
    });
  });

  describe('Returning User Flow', () => {
    it('should only sync deltas when cache exists', async () => {
      // Setup: User has stories 1-3 locally, server has updated story 2
      const cachedStories = [
        createMockStory('1', 'Story 1', 'old-checksum-1'),
        createMockStory('2', 'Story 2', 'old-checksum-2'),
        createMockStory('3', 'Story 3', 'old-checksum-3'),
      ];

      mockCacheManager.getStories.mockResolvedValue(cachedStories);
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: false,
        localVersion: { stories: 5, assets: 3, lastUpdated: '' },
        serverVersion: { stories: 6, assets: 3, lastUpdated: '' },
      });

      // Server returns only the updated story
      mockApiClient.request.mockResolvedValue({
        serverVersion: 6,
        stories: [createMockStory('2', 'Story 2 - Updated', 'new-checksum-2')],
        storyChecksums: {
          '1': 'old-checksum-1',
          '2': 'new-checksum-2',
          '3': 'old-checksum-3',
        },
        totalStories: 3,
        updatedStories: 1,
        lastUpdated: Date.now(),
      });

      const result = await ContentSyncService.sync();

      expect(result.success).toBe(true);
      expect(result.updatedStories).toBe(1);
      expect(mockCacheManager.updateStories).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: '2', title: 'Story 2 - Updated' })
        ])
      );
    });
  });

  describe('Offline Flow', () => {
    it('should return cached content when offline', async () => {
      // Setup: User has cached content but server is unreachable
      const cachedStories = [createMockStory('1', 'Cached Story')];
      mockCacheManager.getStories.mockResolvedValue(cachedStories);

      // Offline - no server version available
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: false,
        needsAssetSync: false,
        localVersion: { stories: 5, assets: 3, lastUpdated: '' },
        serverVersion: null, // Offline
      });

      const result = await ContentSyncService.sync();

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(true);

      // Stories should still be available from cache
      const stories = await ContentSyncService.getStories();
      expect(stories).toHaveLength(1);
      expect(stories[0].title).toBe('Cached Story');
    });
  });

  describe('Content Deletion Flow', () => {
    it('should remove locally cached stories that were deleted on server', async () => {
      // Setup: User has stories 1-3, server has deleted story 2
      const cachedStories = [
        createMockStory('1', 'Story 1'),
        createMockStory('2', 'Deleted Story'),
        createMockStory('3', 'Story 3'),
      ];
      mockCacheManager.getStories.mockResolvedValue(cachedStories);

      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: false,
        localVersion: { stories: 5, assets: 3, lastUpdated: '' },
        serverVersion: { stories: 6, assets: 3, lastUpdated: '' },
      });

      // Server response - story 2 is no longer in checksums
      mockApiClient.request.mockResolvedValue({
        serverVersion: 6,
        stories: [],
        storyChecksums: {
          '1': 'checksum-1',
          '3': 'checksum-3',
          // Note: story '2' is missing = deleted
        },
        totalStories: 2,
        updatedStories: 0,
        lastUpdated: Date.now(),
      });

      await ContentSyncService.sync();

      // Verify removeStories was called with the deleted story ID
      expect(mockCacheManager.removeStories).toHaveBeenCalledWith(['2']);
    });
  });

  describe('Display Methods (Cache Only)', () => {
    it('should read stories without network calls', async () => {
      const cachedStories = [
        createMockStory('1', 'Story 1'),
        createMockStory('2', 'Story 2'),
      ];
      mockCacheManager.getStories.mockResolvedValue(cachedStories);
      mockCacheManager.getStory.mockResolvedValue(cachedStories[0]);

      // Clear mock call history
      mockApiClient.request.mockClear();

      const stories = await ContentSyncService.getStories();
      const singleStory = await ContentSyncService.getStory('1');

      expect(stories).toHaveLength(2);
      expect(singleStory?.title).toBe('Story 1');
      expect(mockApiClient.request).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle partial sync failures gracefully', async () => {
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: { stories: 3, assets: 2, lastUpdated: '' },
        serverVersion: { stories: 5, assets: 4, lastUpdated: '' },
      });
      mockCacheManager.getStories.mockResolvedValue([]);

      // Story sync fails, asset sync succeeds
      mockApiClient.request
        .mockRejectedValueOnce(new Error('Story sync failed'))
        .mockResolvedValueOnce({
          serverVersion: 4,
          updatedAssets: [],
          assetChecksums: {},
          totalAssets: 0,
          updatedCount: 0,
          lastUpdated: Date.now(),
        });

      const result = await ContentSyncService.sync();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Story sync failed');
    });

    it('should continue with cached content after sync failure', async () => {
      const cachedStories = [createMockStory('1', 'Cached Story')];
      mockCacheManager.getStories.mockResolvedValue(cachedStories);

      // Offline - server unreachable
      mockVersionManager.checkVersions.mockResolvedValue({
        needsStorySync: false,
        needsAssetSync: false,
        localVersion: { stories: 5, assets: 3, lastUpdated: '' },
        serverVersion: null, // Offline
      });

      const result = await ContentSyncService.sync();

      // Sync returns cached content
      expect(result.fromCache).toBe(true);
      const stories = await ContentSyncService.getStories();
      expect(stories).toHaveLength(1);
    });
  });

  describe('Sync Status', () => {
    it('should report accurate sync status', async () => {
      const stories = [
        createMockStory('1', 'Story 1'),
        createMockStory('2', 'Story 2'),
      ];
      mockCacheManager.getStats.mockResolvedValue({
        storyCount: 2,
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
      expect(status.storyCount).toBe(2);
      expect(status.needsSync).toBe(false);
    });
  });
});

