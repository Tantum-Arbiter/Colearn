import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorySyncService } from '../../services/story-sync-service';
import { ApiClient } from '../../services/api-client';
import { 
  Story, 
  StorySyncResponse, 
  ContentVersion,
  StorySyncMetadata 
} from '../../types/story';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../services/api-client');

describe('StorySyncService', () => {
  const mockStory1: Story = {
    id: 'story-1',
    title: 'Test Story 1',
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🐨',
    coverImage: 'assets/stories/story-1/cover.webp',
    isAvailable: true,
    ageRange: '2-5',
    duration: 8,
    description: 'A test story',
    version: 1,
    checksum: 'checksum-1',
    pages: [
      {
        id: 'story-1-page-1',
        pageNumber: 1,
        text: 'Page 1 text',
        backgroundImage: 'assets/stories/story-1/page-1/background.webp'
      }
    ]
  };

  const mockStory2: Story = {
    id: 'story-2',
    title: 'Test Story 2',
    category: 'adventure',
    tag: '🗺️ Adventure',
    emoji: '🦁',
    coverImage: 'assets/stories/story-2/cover.webp',
    isAvailable: true,
    ageRange: '3-6',
    duration: 10,
    description: 'Another test story',
    version: 1,
    checksum: 'checksum-2',
    pages: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('getLocalSyncMetadata', () => {
    it('should return null when no data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await StorySyncService.getLocalSyncMetadata();

      expect(result).toBeNull();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('story_sync_metadata');
    });

    it('should return parsed metadata when data exists', async () => {
      const mockMetadata: StorySyncMetadata = {
        version: 1,
        lastSyncTimestamp: Date.now(),
        storyChecksums: { 'story-1': 'checksum-1' },
        stories: [mockStory1]
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockMetadata));

      const result = await StorySyncService.getLocalSyncMetadata();

      expect(result).toEqual(mockMetadata);
    });

    it('should return null on parse error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await StorySyncService.getLocalSyncMetadata();

      expect(result).toBeNull();
    });
  });

  describe('saveSyncMetadata', () => {
    it('should save metadata to AsyncStorage', async () => {
      const mockMetadata: StorySyncMetadata = {
        version: 1,
        lastSyncTimestamp: Date.now(),
        storyChecksums: { 'story-1': 'checksum-1' },
        stories: [mockStory1]
      };

      await StorySyncService.saveSyncMetadata(mockMetadata);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'story_sync_metadata',
        JSON.stringify(mockMetadata)
      );
    });

    it('should throw error if save fails', async () => {
      const mockMetadata: StorySyncMetadata = {
        version: 1,
        lastSyncTimestamp: Date.now(),
        storyChecksums: {},
        stories: []
      };

      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(StorySyncService.saveSyncMetadata(mockMetadata)).rejects.toThrow('Storage error');
    });
  });

  describe('getContentVersion', () => {
    it('should fetch content version from API', async () => {
      const mockVersion: ContentVersion = {
        version: 2,
        lastUpdated: Date.now(),
        storyChecksums: { 'story-1': 'checksum-1', 'story-2': 'checksum-2' },
        totalStories: 2
      };

      (ApiClient.request as jest.Mock).mockResolvedValue(mockVersion);

      const result = await StorySyncService.getContentVersion();

      expect(result).toEqual(mockVersion);
      expect(ApiClient.request).toHaveBeenCalledWith('/api/stories/version');
    });

    it('should throw error if API call fails', async () => {
      (ApiClient.request as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(StorySyncService.getContentVersion()).rejects.toThrow('Network error');
    });
  });

  describe('isSyncNeeded', () => {
    it('should return true when no local data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await StorySyncService.isSyncNeeded();

      expect(result).toBe(true);
    });

    it('should return true when server version is higher', async () => {
      const localMetadata: StorySyncMetadata = {
        version: 1,
        lastSyncTimestamp: Date.now(),
        storyChecksums: {},
        stories: []
      };

      const serverVersion: ContentVersion = {
        version: 2,
        lastUpdated: Date.now(),
        storyChecksums: {},
        totalStories: 0
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(localMetadata));
      (ApiClient.request as jest.Mock).mockResolvedValue(serverVersion);

      const result = await StorySyncService.isSyncNeeded();

      expect(result).toBe(true);
    });

    it('should return false when versions match', async () => {
      const localMetadata: StorySyncMetadata = {
        version: 2,
        lastSyncTimestamp: Date.now(),
        storyChecksums: {},
        stories: []
      };

      const serverVersion: ContentVersion = {
        version: 2,
        lastUpdated: Date.now(),
        storyChecksums: {},
        totalStories: 0
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(localMetadata));
      (ApiClient.request as jest.Mock).mockResolvedValue(serverVersion);

      const result = await StorySyncService.isSyncNeeded();

      expect(result).toBe(false);
    });

    it('should return true on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await StorySyncService.isSyncNeeded();

      expect(result).toBe(true);
    });
  });

  describe('syncStories', () => {
    it('should perform initial sync when no local data exists', async () => {
      const syncResponse: StorySyncResponse = {
        serverVersion: 1,
        stories: [mockStory1, mockStory2],
        storyChecksums: { 'story-1': 'checksum-1', 'story-2': 'checksum-2' },
        totalStories: 2,
        updatedStories: 2,
        lastUpdated: Date.now()
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (ApiClient.request as jest.Mock).mockResolvedValue(syncResponse);

      const result = await StorySyncService.syncStories();

      expect(result).toHaveLength(2);
      expect(result).toEqual([mockStory1, mockStory2]);
      expect(ApiClient.request).toHaveBeenCalledWith('/api/stories/sync', {
        method: 'POST',
        body: JSON.stringify({
          clientVersion: 0,
          storyChecksums: {},
          lastSyncTimestamp: 0
        })
      });
    });

    it('should perform delta sync and merge stories', async () => {
      const localMetadata: StorySyncMetadata = {
        version: 1,
        lastSyncTimestamp: 1000,
        storyChecksums: { 'story-1': 'checksum-1' },
        stories: [mockStory1]
      };

      const updatedStory2 = { ...mockStory2, version: 2, checksum: 'checksum-2-updated' };
      const syncResponse: StorySyncResponse = {
        serverVersion: 2,
        stories: [updatedStory2],
        storyChecksums: { 'story-1': 'checksum-1', 'story-2': 'checksum-2-updated' },
        totalStories: 2,
        updatedStories: 1,
        lastUpdated: Date.now()
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(localMetadata));
      (ApiClient.request as jest.Mock).mockResolvedValue(syncResponse);

      const result = await StorySyncService.syncStories();

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(mockStory1);
      expect(result).toContainEqual(updatedStory2);
    });

    it('should save updated metadata after sync', async () => {
      const syncResponse: StorySyncResponse = {
        serverVersion: 1,
        stories: [mockStory1],
        storyChecksums: { 'story-1': 'checksum-1' },
        totalStories: 1,
        updatedStories: 1,
        lastUpdated: Date.now()
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (ApiClient.request as jest.Mock).mockResolvedValue(syncResponse);

      await StorySyncService.syncStories();

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData.version).toBe(1);
      expect(savedData.stories).toHaveLength(1);
    });
  });

  describe('prefetchStories', () => {
    it('should sync when sync is needed', async () => {
      const syncResponse: StorySyncResponse = {
        serverVersion: 1,
        stories: [mockStory1],
        storyChecksums: { 'story-1': 'checksum-1' },
        totalStories: 1,
        updatedStories: 1,
        lastUpdated: Date.now()
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (ApiClient.request as jest.Mock).mockResolvedValue(syncResponse);

      const result = await StorySyncService.prefetchStories();

      expect(result).toEqual([mockStory1]);
    });

    it('should use local cache when sync not needed', async () => {
      const localMetadata: StorySyncMetadata = {
        version: 1,
        lastSyncTimestamp: Date.now(),
        storyChecksums: { 'story-1': 'checksum-1' },
        stories: [mockStory1]
      };

      const serverVersion: ContentVersion = {
        version: 1,
        lastUpdated: Date.now(),
        storyChecksums: { 'story-1': 'checksum-1' },
        totalStories: 1
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(localMetadata));
      (ApiClient.request as jest.Mock).mockResolvedValue(serverVersion);

      const result = await StorySyncService.prefetchStories();

      expect(result).toEqual([mockStory1]);
    });

    it('should fallback to cache on sync error', async () => {
      const localMetadata: StorySyncMetadata = {
        version: 1,
        lastSyncTimestamp: Date.now(),
        storyChecksums: {},
        stories: [mockStory1]
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(localMetadata));
      (ApiClient.request as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await StorySyncService.prefetchStories();

      expect(result).toEqual([mockStory1]);
    });
  });

  describe('getLocalStories', () => {
    it('should return stories from cache', async () => {
      const localMetadata: StorySyncMetadata = {
        version: 1,
        lastSyncTimestamp: Date.now(),
        storyChecksums: {},
        stories: [mockStory1, mockStory2]
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(localMetadata));

      const result = await StorySyncService.getLocalStories();

      expect(result).toEqual([mockStory1, mockStory2]);
    });

    it('should return empty array when no cache exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await StorySyncService.getLocalStories();

      expect(result).toEqual([]);
    });
  });

  describe('clearCache', () => {
    it('should remove cache from AsyncStorage', async () => {
      await StorySyncService.clearCache();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('story_sync_metadata');
    });
  });

  describe('getSyncStatus', () => {
    it('should return status with local data', async () => {
      const timestamp = Date.now();
      const localMetadata: StorySyncMetadata = {
        version: 2,
        lastSyncTimestamp: timestamp,
        storyChecksums: {},
        stories: [mockStory1, mockStory2]
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(localMetadata));

      const result = await StorySyncService.getSyncStatus();

      expect(result).toEqual({
        hasLocalData: true,
        localVersion: 2,
        localStoryCount: 2,
        lastSyncTimestamp: timestamp,
        lastSyncDate: new Date(timestamp).toISOString()
      });
    });

    it('should return default status when no local data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await StorySyncService.getSyncStatus();

      expect(result).toEqual({
        hasLocalData: false,
        localVersion: 0,
        localStoryCount: 0,
        lastSyncTimestamp: 0,
        lastSyncDate: null
      });
    });
  });
});
