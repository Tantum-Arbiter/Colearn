import { VersionManager, ContentVersion } from '../../services/version-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient } from '../../services/api-client';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../services/api-client');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockApiClient = ApiClient as jest.Mocked<typeof ApiClient>;

describe('VersionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocalVersion', () => {
    it('should return null when no local version exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const result = await VersionManager.getLocalVersion();
      
      expect(result).toBeNull();
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@content_version');
    });

    it('should return parsed version when it exists', async () => {
      const mockVersion: ContentVersion = {
        stories: 5,
        assets: 3,
        lastUpdated: '2024-01-15T10:00:00Z',
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockVersion));
      
      const result = await VersionManager.getLocalVersion();
      
      expect(result).toEqual(mockVersion);
    });

    it('should return null on parse error', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid json');
      
      const result = await VersionManager.getLocalVersion();
      
      expect(result).toBeNull();
    });
  });

  describe('saveLocalVersion', () => {
    it('should save version to AsyncStorage', async () => {
      const version: ContentVersion = {
        stories: 10,
        assets: 5,
        lastUpdated: '2024-01-15T12:00:00Z',
      };
      mockAsyncStorage.setItem.mockResolvedValue();
      
      await VersionManager.saveLocalVersion(version);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@content_version',
        JSON.stringify(version)
      );
    });

    it('should throw on storage error', async () => {
      const version: ContentVersion = { stories: 1, assets: 1, lastUpdated: '' };
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));
      
      await expect(VersionManager.saveLocalVersion(version)).rejects.toThrow('Storage full');
    });
  });

  describe('getServerVersion', () => {
    it('should return server version on success with separate asset version', async () => {
      // Server response format from /api/stories/version (gateway ContentVersionResponse DTO)
      const testDate = new Date('2024-01-15T14:00:00.000Z');
      const serverResponse = {
        id: 'current',
        version: 15,
        assetVersion: 8, // Separate asset version
        lastUpdated: testDate.getTime(),
        storyChecksums: { 'story-1': 'abc123' },
        totalStories: 1,
      };
      mockApiClient.request.mockResolvedValue(serverResponse);

      const result = await VersionManager.getServerVersion();

      expect(result).toEqual({
        stories: 15,
        assets: 8, // Now uses separate asset version
        lastUpdated: testDate.toISOString(),
      });
      // Version check uses a shorter timeout (5 seconds) for fast fail-over
      expect(mockApiClient.request).toHaveBeenCalledWith('/api/stories/version', { method: 'GET' }, 5000);
    });

    it('should fallback to story version when assetVersion not present (backwards compat)', async () => {
      // Old server response without assetVersion
      const testDate = new Date('2024-01-15T14:00:00.000Z');
      const serverResponse = {
        id: 'current',
        version: 10,
        // assetVersion not present
        lastUpdated: testDate.getTime(),
        storyChecksums: {},
        totalStories: 1,
      };
      mockApiClient.request.mockResolvedValue(serverResponse);

      const result = await VersionManager.getServerVersion();

      expect(result).toEqual({
        stories: 10,
        assets: 10, // Falls back to story version
        lastUpdated: testDate.toISOString(),
      });
    });

    it('should return null when offline', async () => {
      mockApiClient.request.mockRejectedValue(new Error('Network error'));

      const result = await VersionManager.getServerVersion();

      expect(result).toBeNull();
    });
  });

  describe('checkVersions', () => {
    it('should indicate full sync needed when no local version', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockApiClient.request.mockResolvedValue({
        id: 'current',
        version: 5,
        assetVersion: 5,
        lastUpdated: 1705312800000,
        storyChecksums: {},
        totalStories: 5,
      });

      const result = await VersionManager.checkVersions();

      expect(result.needsStorySync).toBe(true);
      expect(result.needsAssetSync).toBe(true);
      expect(result.localVersion).toBeNull();
      expect(result.serverVersion).not.toBeNull();
    });

    it('should indicate no sync needed when versions match', async () => {
      const version: ContentVersion = { stories: 5, assets: 5, lastUpdated: '' };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(version));
      mockApiClient.request.mockResolvedValue({
        id: 'current',
        version: 5,
        assetVersion: 5,
        lastUpdated: 1705312800000,
        storyChecksums: {},
        totalStories: 5,
      });

      const result = await VersionManager.checkVersions();

      expect(result.needsStorySync).toBe(false);
      expect(result.needsAssetSync).toBe(false);
    });

    it('should indicate story sync needed when server has newer stories', async () => {
      const version: ContentVersion = { stories: 3, assets: 3, lastUpdated: '' };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(version));
      mockApiClient.request.mockResolvedValue({
        id: 'current',
        version: 7,
        assetVersion: 7,
        lastUpdated: 1705312800000,
        storyChecksums: {},
        totalStories: 7,
      });

      const result = await VersionManager.checkVersions();

      expect(result.needsStorySync).toBe(true);
      expect(result.needsAssetSync).toBe(true);
    });

    it('should indicate only asset sync needed when assets changed but stories same', async () => {
      const version: ContentVersion = { stories: 5, assets: 3, lastUpdated: '' };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(version));
      mockApiClient.request.mockResolvedValue({
        id: 'current',
        version: 5,
        assetVersion: 7, // Assets updated but stories same
        lastUpdated: 1705312800000,
        storyChecksums: {},
        totalStories: 5,
      });

      const result = await VersionManager.checkVersions();

      expect(result.needsStorySync).toBe(false); // Stories same
      expect(result.needsAssetSync).toBe(true);  // Assets updated
    });

    it('should indicate no sync when server is unreachable', async () => {
      const version: ContentVersion = { stories: 3, assets: 5, lastUpdated: '' };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(version));
      mockApiClient.request.mockRejectedValue(new Error('Network error'));

      const result = await VersionManager.checkVersions();

      expect(result.needsStorySync).toBe(false);
      expect(result.needsAssetSync).toBe(false);
      expect(result.serverVersion).toBeNull();
    });
  });

  describe('updateLocalVersion', () => {
    it('should update existing version with partial updates', async () => {
      const existing: ContentVersion = { stories: 5, assets: 3, lastUpdated: '2024-01-01T00:00:00Z' };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));
      mockAsyncStorage.setItem.mockResolvedValue();

      await VersionManager.updateLocalVersion({ stories: 10 });

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
      const savedValue = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedValue.stories).toBe(10);
      expect(savedValue.assets).toBe(3); // Preserved
    });

    it('should create new version when none exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();

      await VersionManager.updateLocalVersion({ stories: 5, assets: 3 });

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
      const savedValue = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedValue.stories).toBe(5);
      expect(savedValue.assets).toBe(3);
    });
  });

  describe('clearLocalVersion', () => {
    it('should remove version from storage', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue();

      await VersionManager.clearLocalVersion();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@content_version');
    });
  });
});

