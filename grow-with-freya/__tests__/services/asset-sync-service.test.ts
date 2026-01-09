import AsyncStorage from '@react-native-async-storage/async-storage';
import { AssetSyncService } from '../../services/asset-sync-service';
import { AuthenticatedImageService } from '../../services/authenticated-image-service';
import { ApiClient } from '../../services/api-client';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../services/api-client');
jest.mock('../../services/authenticated-image-service');

describe('AssetSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('prefetchAssets', () => {
    it('should call downloadAndCacheAsset with forceUpdate=true for changed assets', async () => {
      // Setup: local has old checksum, server has new checksum
      const localMetadata = {
        version: 1,
        lastSyncTimestamp: 1000,
        assetChecksums: {
          'stories/test/page-10/props/old-prop.webp': 'old-checksum',
        },
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(localMetadata));

      // Server returns updated assets
      const syncResponse = {
        serverVersion: 2,
        updatedAssets: [
          {
            path: 'stories/test/page-10/props/old-prop.webp',
            signedUrl: 'https://storage.googleapis.com/bucket/old-prop.webp?token=new',
            checksum: 'new-checksum',
          },
        ],
        assetChecksums: {
          'stories/test/page-10/props/old-prop.webp': 'new-checksum',
        },
        totalAssets: 1,
        updatedCount: 1,
        lastUpdated: Date.now(),
      };

      (ApiClient.request as jest.Mock).mockResolvedValue(syncResponse);
      (AuthenticatedImageService.downloadAndCacheAsset as jest.Mock).mockResolvedValue(
        'file:///cache/old-prop.webp'
      );

      await AssetSyncService.prefetchAssets();

      // Verify downloadAndCacheAsset was called with forceUpdate=true
      expect(AuthenticatedImageService.downloadAndCacheAsset).toHaveBeenCalledWith(
        'https://storage.googleapis.com/bucket/old-prop.webp?token=new',
        'stories/test/page-10/props/old-prop.webp',
        undefined, // remoteUrl
        true // forceUpdate - critical for delta sync to work!
      );
    });

    it('should update local checksums after successful sync', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const syncResponse = {
        serverVersion: 1,
        updatedAssets: [
          {
            path: 'stories/test/props/prop.webp',
            signedUrl: 'https://storage.googleapis.com/bucket/prop.webp?token=abc',
            checksum: 'checksum-1',
          },
        ],
        assetChecksums: { 'stories/test/props/prop.webp': 'checksum-1' },
        totalAssets: 1,
        updatedCount: 1,
        lastUpdated: Date.now(),
      };

      (ApiClient.request as jest.Mock).mockResolvedValue(syncResponse);
      (AuthenticatedImageService.downloadAndCacheAsset as jest.Mock).mockResolvedValue(
        'file:///cache/prop.webp'
      );

      await AssetSyncService.prefetchAssets();

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData.assetChecksums['stories/test/props/prop.webp']).toBe('checksum-1');
    });

    it('should not download when no assets need syncing', async () => {
      const localMetadata = {
        version: 1,
        lastSyncTimestamp: Date.now(),
        assetChecksums: { 'stories/test/prop.webp': 'current-checksum' },
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(localMetadata));

      // Server returns no updated assets
      const syncResponse = {
        serverVersion: 1,
        updatedAssets: [],
        assetChecksums: { 'stories/test/prop.webp': 'current-checksum' },
        totalAssets: 1,
        updatedCount: 0,
        lastUpdated: Date.now(),
      };

      (ApiClient.request as jest.Mock).mockResolvedValue(syncResponse);

      await AssetSyncService.prefetchAssets();

      expect(AuthenticatedImageService.downloadAndCacheAsset).not.toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear both AuthenticatedImageService cache and local metadata', async () => {
      (AuthenticatedImageService.clearCache as jest.Mock).mockResolvedValue(undefined);

      await AssetSyncService.clearCache();

      expect(AuthenticatedImageService.clearCache).toHaveBeenCalled();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('asset_sync_metadata');
    });
  });
});

