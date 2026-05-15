import { VersionManager, VersionCheckResult } from './version-manager';
import { CacheManager } from './cache-manager';
import { ApiClient } from './api-client';
import { AssetDownloadUtils } from './asset-download-utils';
import { CatalogService } from './catalog-service';
import { Story, CatalogEntry } from '../types/story';
import { Logger } from '@/utils/logger';

const log = Logger.create('BatchSyncService');

// Re-export for backwards compatibility
export type { BatchUrlsResponse } from './asset-download-utils';

export interface DeltaSyncResponse {
  serverVersion: number;
  assetVersion: number;
  stories: Story[];
  deletedStoryIds: string[];
  storyChecksums: Record<string, string>;
  totalStories: number;
  updatedCount: number;
  lastUpdated: number;
  catalog?: CatalogEntry[]; // Lightweight entries for stories the client hasn't downloaded
}

export interface BatchSyncStats {
  startTime: number;
  endTime: number;
  durationMs: number;
  apiCalls: number;
  storiesUpdated: number;
  storiesDeleted: number;
  assetsDownloaded: number;
  assetsSkipped: number;
  assetsFailed: number;
  totalAssets: number;
  bytesDownloaded: number;
  fromCache: boolean;
  wasSkipped: boolean;
  errors: string[];
}

export interface BatchSyncProgress {
  phase: 'version-check' | 'fetching-delta' | 'batch-urls' | 'downloading' | 'complete' | 'skipped';
  progress: number; // 0-100
  message: string;
  detail?: {
    currentBatch?: number;
    totalBatches?: number;
    currentAsset?: number;
    totalAssets?: number;
    assetName?: string;
  };
}

export type BatchSyncProgressCallback = (progress: BatchSyncProgress) => void;

export class BatchSyncService {
  
  // Sync lock to prevent concurrent sync operations
  private static isSyncing = false;
  private static syncPromise: Promise<BatchSyncStats> | null = null;

  /**
   * Perform a batch sync with optimized API calls
   * 
   * Returns immediately if another sync is in progress
   */
  static async performBatchSync(
    onProgress?: BatchSyncProgressCallback
  ): Promise<BatchSyncStats> {
    // Check if sync is already in progress
    if (this.isSyncing && this.syncPromise) {
      log.info('[Batch Sync] Another sync in progress, waiting...');
      onProgress?.({ phase: 'skipped', progress: 0, message: 'Sync already in progress' });
      return this.syncPromise;
    }

    // Acquire sync lock
    this.isSyncing = true;
    this.syncPromise = this.executeBatchSync(onProgress);

    try {
      return await this.syncPromise;
    } finally {
      this.isSyncing = false;
      this.syncPromise = null;
    }
  }

  private static async executeBatchSync(
    onProgress?: BatchSyncProgressCallback
  ): Promise<BatchSyncStats> {
    const stats: BatchSyncStats = {
      startTime: Date.now(),
      endTime: 0,
      durationMs: 0,
      apiCalls: 0,
      storiesUpdated: 0,
      storiesDeleted: 0,
      assetsDownloaded: 0,
      assetsSkipped: 0,
      assetsFailed: 0,
      totalAssets: 0,
      bytesDownloaded: 0,
      fromCache: false,
      wasSkipped: false,
      errors: [],
    };

    log.info('[User Journey Flow 4: Batch Sync] ========== BATCH SYNC STARTED ==========');

    try {
      // Phase 1: Version check (1 API call)
      log.info('[User Journey Flow 4: Batch Sync] Step 1/8: Checking content versions...');
      onProgress?.({ phase: 'version-check', progress: 5, message: 'Checking for updates...' });

      const versionCheck = await VersionManager.checkVersions();
      stats.apiCalls++;

      if (!versionCheck.serverVersion) {
        log.info('[User Journey Flow 4: Batch Sync] Step 2/8: OFFLINE - using cached content');
        stats.fromCache = true;
        stats.endTime = Date.now();
        stats.durationMs = stats.endTime - stats.startTime;
        onProgress?.({ phase: 'complete', progress: 100, message: 'Using cached content' });
        return stats;
      }

      // Check if sync is needed
      if (!versionCheck.needsStorySync && !versionCheck.needsAssetSync) {
        log.info('[User Journey Flow 4: Batch Sync] Step 2/8: Already up to date - no sync needed');
        stats.endTime = Date.now();
        stats.durationMs = stats.endTime - stats.startTime;
        onProgress?.({ phase: 'complete', progress: 100, message: 'Already up to date' });
        return stats;
      }

      log.info(`[User Journey Flow 4: Batch Sync] Step 2/8: Sync needed - local(stories=${versionCheck.localVersion?.stories || 0}, assets=${versionCheck.localVersion?.assets || 0})`);
      log.info(`[User Journey Flow 4: Batch Sync] Step 2/8: Sync needed - server(stories=${versionCheck.serverVersion.stories}, assets=${versionCheck.serverVersion.assets})`);

      // Phase 2: Fetch delta content (1 API call)
      log.info('[User Journey Flow 4: Batch Sync] Step 3/8: Fetching delta content from POST /api/stories/delta...');
      onProgress?.({ phase: 'fetching-delta', progress: 15, message: 'Fetching updates...' });

      const deltaResult = await this.fetchDeltaContent(versionCheck);
      stats.apiCalls++;
      stats.storiesUpdated = deltaResult.stories.length;
      stats.storiesDeleted = deltaResult.deletedStoryIds.length;

      log.info(`[User Journey Flow 4: Batch Sync] Step 3/8: Delta result - ${deltaResult.stories.length} new/updated stories, ${deltaResult.deletedStoryIds.length} deleted`);

      // Handle deletions
      if (deltaResult.deletedStoryIds.length > 0) {
        log.info(`[User Journey Flow 4: Batch Sync] Step 4/8: Removing ${deltaResult.deletedStoryIds.length} deleted stories from cache: ${deltaResult.deletedStoryIds.join(', ')}`);
        await CacheManager.removeStories(deltaResult.deletedStoryIds);
      }

      // Phase 3: Extract all asset paths from new/updated stories
      const assetPaths = AssetDownloadUtils.extractAssetPaths(deltaResult.stories);
      stats.totalAssets = assetPaths.length;
      log.info(`[User Journey Flow 4: Batch Sync] Step 5/8: Extracted ${assetPaths.length} total assets from updated stories`);

      if (assetPaths.length > 0) {
        // Filter out already cached assets
        const uncachedPaths = await AssetDownloadUtils.filterUncachedAssets(assetPaths);
        stats.assetsSkipped = assetPaths.length - uncachedPaths.length;
        log.info(`[User Journey Flow 4: Batch Sync] Step 5/8: ${uncachedPaths.length} assets need download, ${stats.assetsSkipped} already cached`);

        if (uncachedPaths.length > 0) {
          // Phase 4: Get batch signed URLs
          log.info(`[User Journey Flow 4: Batch Sync] Step 6/8: Fetching batch URLs from POST /api/assets/batch-urls...`);
          onProgress?.({ phase: 'batch-urls', progress: 25, message: 'Preparing downloads...' });

          const batchUrlResult = await AssetDownloadUtils.getBatchSignedUrls(uncachedPaths);
          stats.apiCalls += batchUrlResult.apiCalls;
          stats.assetsFailed += batchUrlResult.failed.length;

          if (batchUrlResult.failed.length > 0) {
            log.warn(`[User Journey Flow 4: Batch Sync] Step 6/8: Failed to get URLs for ${batchUrlResult.failed.length} assets`);
            stats.errors.push(`Failed to get URLs for ${batchUrlResult.failed.length} assets`);
          }

          // Phase 5: Download assets in parallel batches
          if (batchUrlResult.urls.length > 0) {
            log.info(`[User Journey Flow 4: Batch Sync] Step 7/8: Downloading ${batchUrlResult.urls.length} assets to local cache...`);
            const downloadResult = await AssetDownloadUtils.downloadAssetsInBatches(
              batchUrlResult.urls,
              (current, total) => {
                const progress = 30 + Math.floor((current / total) * 65);
                onProgress?.({
                  phase: 'downloading',
                  progress,
                  message: `Downloading assets (${current}/${total})...`,
                  detail: { currentAsset: current, totalAssets: total },
                });
              }
            );
            stats.assetsDownloaded = downloadResult.downloaded;
            stats.assetsFailed += downloadResult.failed;
            stats.bytesDownloaded = downloadResult.bytesDownloaded;
            stats.errors.push(...downloadResult.errors);
            log.info(`[User Journey Flow 4: Batch Sync] Step 7/8: Downloaded ${downloadResult.downloaded} assets (${AssetDownloadUtils.formatBytes(downloadResult.bytesDownloaded)}), ${downloadResult.failed} failed`);
          }
        }
      }

      // Phase 6: Save stories to cache
      if (deltaResult.stories.length > 0) {
        await CacheManager.updateStories(deltaResult.stories);
        log.info(`[User Journey Flow 4: Batch Sync] Step 8/8: Saved ${deltaResult.stories.length} stories to unified cache`);
      }

      // Persist catalog for browse/discovery UI
      if (deltaResult.catalog && deltaResult.catalog.length > 0) {
        await CatalogService.updateCatalog(deltaResult.catalog);
        log.info(`[User Journey Flow 4: Batch Sync] Catalog updated with ${deltaResult.catalog.length} entries`);
      }

      // Update local version
      await VersionManager.updateLocalVersion({
        stories: versionCheck.serverVersion.stories,
        assets: versionCheck.serverVersion.assets,
      });

      stats.endTime = Date.now();
      stats.durationMs = stats.endTime - stats.startTime;

      log.info('[User Journey Flow 4: Batch Sync] ========== BATCH SYNC COMPLETE ==========');
      log.info(`[User Journey Flow 4: Batch Sync] Duration: ${stats.durationMs}ms, API Calls: ${stats.apiCalls}`);
      log.info(`[User Journey Flow 4: Batch Sync] Stories: ${stats.storiesUpdated} updated, ${stats.storiesDeleted} deleted`);
      log.info(`[User Journey Flow 4: Batch Sync] Assets: ${stats.assetsDownloaded} downloaded (${AssetDownloadUtils.formatBytes(stats.bytesDownloaded)}), ${stats.assetsSkipped} cached, ${stats.assetsFailed} failed`);

      onProgress?.({ phase: 'complete', progress: 100, message: 'Sync complete' });
      return stats;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      stats.errors.push(errorMsg);
      stats.endTime = Date.now();
      stats.durationMs = stats.endTime - stats.startTime;
      log.error('[User Journey Flow 4: Batch Sync] ========== BATCH SYNC FAILED ==========');
      log.error(`[User Journey Flow 4: Batch Sync] Error: ${errorMsg}`);
      throw error;
    }
  }

  private static async fetchDeltaContent(
    versionCheck: VersionCheckResult
  ): Promise<DeltaSyncResponse> {
    const localVersion = versionCheck.localVersion?.stories || 0;

    // Get current story checksums from cache
    const cachedStories = await CacheManager.getStories();
    const checksums: Record<string, string> = {};
    for (const story of cachedStories) {
      if (story.checksum) {
        checksums[story.id] = story.checksum;
      }
    }

    log.info(`[Batch Sync] Fetching delta from version ${localVersion} with ${Object.keys(checksums).length} cached stories`);

    const response = await ApiClient.request<DeltaSyncResponse>('/api/stories/delta', {
      method: 'POST',
      body: JSON.stringify({
        clientVersion: localVersion,
        storyChecksums: checksums,
      }),
    });

    return response;
  }

  static isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  static async isSyncNeeded(): Promise<boolean> {
    const versionCheck = await VersionManager.checkVersions();
    return versionCheck.needsStorySync || versionCheck.needsAssetSync;
  }
}
