import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient } from './api-client';
import { AuthenticatedImageService } from './authenticated-image-service';

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
      console.error('[AssetSyncService] Error reading local metadata:', error);
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
      console.error('[AssetSyncService] Error saving local metadata:', error);
    }
  }

  /**
   * Prefetch and sync assets
   * Returns list of assets that were synced
   */
  static async prefetchAssets(): Promise<void> {
    try {
      console.log('[AssetSyncService] Starting asset prefetch...');

      // Get local metadata
      const localMetadata = await this.getLocalMetadata();
      const localChecksums = localMetadata?.assetChecksums || {};
      const localVersion = localMetadata?.version || 0;
      const lastSyncTimestamp = localMetadata?.lastSyncTimestamp || 0;

      // Get assets that need syncing from backend
      console.log('[AssetSyncService] Requesting assets to sync...');
      console.log('[AssetSyncService] Local version:', localVersion, 'Checksums:', Object.keys(localChecksums).length);

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

      console.log('[AssetSyncService] Server response:', {
        serverVersion: syncResponse.serverVersion,
        totalAssets: syncResponse.totalAssets,
        updatedCount: syncResponse.updatedCount,
        assetsToSyncCount: assetsToSync.length,
        assetPaths: assetsToSync.slice(0, 5).map(a => a.path), // Log first 5 asset paths
      });

      if (!assetsToSync || assetsToSync.length === 0) {
        console.log('[AssetSyncService] No assets need syncing - all assets are up to date');
        console.log('[AssetSyncService] Note: If you expect assets but none were returned, the backend asset_versions/current may not be populated. Run: npm run upload-assets in scripts/');
        return;
      }

      console.log(`[AssetSyncService] Syncing ${assetsToSync.length} assets...`);

      // Download all assets in parallel with forceUpdate=true since these are changed assets
      const downloadPromises = assetsToSync.map(async (asset) => {
        try {
          console.log(`[AssetSyncService] Downloading asset: ${asset.path}`);
          // Download using the signed URL with forceUpdate=true to replace existing cached files
          await AuthenticatedImageService.downloadAndCacheAsset(
            asset.signedUrl,
            asset.path,
            undefined, // remoteUrl
            true // forceUpdate - these are changed assets that need to be re-downloaded
          );
          return { path: asset.path, checksum: asset.checksum };
        } catch (error) {
          console.error(`[AssetSyncService] Failed to download asset ${asset.path}:`, error);
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
      console.log(
        `[AssetSyncService] Asset sync completed. Server version: ${syncResponse.serverVersion}, Synced ${successfulAssets.length}/${assetsToSync.length} assets`
      );
    } catch (error) {
      console.error('[AssetSyncService] Asset prefetch failed:', error);
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
      console.log('[AssetSyncService] Asset cache cleared');
    } catch (error) {
      console.error('[AssetSyncService] Error clearing cache:', error);
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
      console.log('[AssetSyncService] Asset checksums cleared - will re-validate on next sync');
    } catch (error) {
      console.error('[AssetSyncService] Error clearing checksums:', error);
    }
  }
}

