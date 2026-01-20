import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient } from './api-client';
import { AuthenticatedImageService } from './authenticated-image-service';
import { Logger } from '@/utils/logger';

const log = Logger.create('AssetSyncService');

interface AssetInfo {
  path: string;
  signedUrl: string;
  checksum: string;
}

interface AssetSyncMetadata {
  version: number;
  lastSyncTimestamp: number;
  assetChecksums: Record<string, string>;
}

/**
 * Service for syncing and caching assets (images) from the backend
 * Similar to StorySyncService but for assets
 * 
 * Flow:
 * 1. Prefetch: Get list of assets that need to be synced
 * 2. Compare: Check local checksums against server
 * 3. Download: Only download assets that are new or changed
 * 4. Cache: Store checksums locally for next sync
 */
export class AssetSyncService {
  private static readonly STORAGE_KEY = 'asset_sync_metadata';

  /**
   * Get local asset sync metadata
   */
  static async getLocalMetadata(): Promise<AssetSyncMetadata | null> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      log.error('Error reading local metadata:', error);
      return null;
    }
  }

  /**
   * Save asset sync metadata locally
   */
  static async saveLocalMetadata(metadata: AssetSyncMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(metadata));
    } catch (error) {
      log.error('Error saving local metadata:', error);
    }
  }

  /**
   * Prefetch and sync assets
   * Returns list of assets that were synced
   */
  static async prefetchAssets(): Promise<void> {
    try {
      log.info('[User Journey Flow 5: Asset Sync] Step 1/6: Checking local asset metadata...');

      // Get local metadata
      const localMetadata = await this.getLocalMetadata();
      const localChecksums = localMetadata?.assetChecksums || {};
      const localVersion = localMetadata?.version || 0;
      const lastSyncTimestamp = localMetadata?.lastSyncTimestamp || 0;

      log.info(`[User Journey Flow 5: Asset Sync] Step 2/6: Local version=${localVersion}, cached assets=${Object.keys(localChecksums).length}`);

      // Get assets that need syncing from backend
      log.info('[User Journey Flow 5: Asset Sync] Step 3/6: Calling backend POST /api/assets/sync...');
      const syncResponse = await ApiClient.request<{
        serverVersion: number;
        updatedAssets: AssetInfo[];
        assetChecksums: Record<string, string>;
        totalAssets: number;
        updatedCount: number;
        lastUpdated: number;
      }>(
        '/api/assets/sync',
        {
          method: 'POST',
          body: JSON.stringify({
            clientVersion: localVersion,
            assetChecksums: localChecksums,
            lastSyncTimestamp: lastSyncTimestamp,
          }),
        }
      );

      const assetsToSync = syncResponse.updatedAssets || [];

      log.info(`[User Journey Flow 5: Asset Sync] Step 4/6: Backend response - serverVersion=${syncResponse.serverVersion}, assetsToSync=${assetsToSync.length}, totalAssets=${syncResponse.totalAssets}`);

      if (!assetsToSync || assetsToSync.length === 0) {
        log.info('[User Journey Flow 5: Asset Sync] Step 5/6: No assets to sync - all up to date');
        return;
      }

      log.info(`[User Journey Flow 5: Asset Sync] Step 5/6: Downloading ${assetsToSync.length} assets...`);

      // Download all assets in parallel with forceUpdate=true since these are changed assets
      let downloadedCount = 0;
      const downloadPromises = assetsToSync.map(async (asset) => {
        try {
          log.debug(`[User Journey Flow 5: Asset Sync] Downloading: ${asset.path}`);
          // Download using the signed URL with forceUpdate=true to replace existing cached files
          await AuthenticatedImageService.downloadAndCacheAsset(
            asset.signedUrl,
            asset.path,
            undefined, // remoteUrl
            true // forceUpdate - these are changed assets that need to be re-downloaded
          );
          downloadedCount++;
          return { path: asset.path, checksum: asset.checksum };
        } catch (error) {
          log.error(`[User Journey Flow 5: Asset Sync] Failed to download: ${asset.path}`, error);
          return null;
        }
      });

      const results = await Promise.all(downloadPromises);
      const successfulAssets = results.filter((r) => r !== null) as Array<{
        path: string;
        checksum: string;
      }>;

      // Update local metadata with new checksums
      const updatedChecksums = {
        ...localChecksums,
        ...Object.fromEntries(successfulAssets.map((a) => [a.path, a.checksum])),
      };

      const newMetadata: AssetSyncMetadata = {
        version: syncResponse.serverVersion,
        lastSyncTimestamp: Date.now(),
        assetChecksums: updatedChecksums,
      };

      await this.saveLocalMetadata(newMetadata);

      log.info(`[User Journey Flow 5: Asset Sync] Step 6/6: Asset sync COMPLETE - downloaded ${successfulAssets.length}/${assetsToSync.length} assets`);
    } catch (error) {
      log.error('[User Journey Flow 5: Asset Sync] FAILED: Asset prefetch error:', error);
      // Don't throw - asset sync is not critical
    }
  }

  /**
   * Clear asset cache
   */
  static async clearCache(): Promise<void> {
    try {
      await AuthenticatedImageService.clearCache();
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      log.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear asset checksums only (not the cached files)
   * This forces a full re-validation on next sync, ensuring any corrupted
   * or outdated files are detected and re-downloaded
   */
  static async clearChecksums(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      log.info('[User Journey Flow 5: Asset Sync] Asset checksums cleared - will re-validate on next sync');
    } catch (error) {
      log.error('Error clearing checksums:', error);
    }
  }
}

