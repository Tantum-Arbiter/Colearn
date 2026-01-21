import { VersionManager, ContentVersion, VersionCheckResult } from './version-manager';
import { CacheManager } from './cache-manager';
import { ApiClient } from './api-client';
import { Story } from '../types/story';
import { Logger } from '@/utils/logger';

const log = Logger.create('BatchSyncService');

// Batch size for URL requests (max 50 per batch)
const BATCH_URL_SIZE = 50;
// Concurrent download limit
const CONCURRENT_DOWNLOADS = 5;

/**
 * Response from POST /api/assets/batch-urls endpoint
 */
export interface BatchUrlsResponse {
  urls: Array<{
    path: string;
    signedUrl: string;
    expiresAt: number;
  }>;
  failed: string[]; // Paths that failed to generate URLs
}

/**
 * Response from GET /api/stories/delta endpoint
 */
export interface DeltaSyncResponse {
  serverVersion: number;
  assetVersion: number;
  stories: Story[];
  deletedStoryIds: string[];
  storyChecksums: Record<string, string>;
  totalStories: number;
  updatedCount: number;
  lastUpdated: number;
}

/**
 * Sync statistics for monitoring
 */
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

/**
 * Progress callback for batch sync
 */
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

/**
 * BatchSyncService - High-performance batch sync with 95%+ API call reduction
 * 
 * Key optimizations:
 * 1. Single version check instead of per-story checks
 * 2. Delta sync - only fetch changed stories
 * 3. Batch URL signing - 50 URLs per request instead of 1
 * 4. Parallel asset downloads with concurrency limit
 * 
 * API Call Flow:
 * Before: Version + Story1 + Story2 + ... + Asset1 + Asset2 + ... = 180+ calls
 * After:  Version + Delta + BatchURLs (×N) = 3-6 calls (95%+ reduction)
 */
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

  /**
   * Internal batch sync implementation
   */
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

    log.info('[Batch Sync] ========== BATCH SYNC STARTED ==========');

    try {
      // Phase 1: Version check (1 API call)
      onProgress?.({ phase: 'version-check', progress: 5, message: 'Checking for updates...' });
      
      const versionCheck = await VersionManager.checkVersions();
      stats.apiCalls++;

      if (!versionCheck.serverVersion) {
        log.info('[Batch Sync] Offline - using cached content');
        stats.fromCache = true;
        stats.endTime = Date.now();
        stats.durationMs = stats.endTime - stats.startTime;
        onProgress?.({ phase: 'complete', progress: 100, message: 'Using cached content' });
        return stats;
      }

      // Check if sync is needed
      if (!versionCheck.needsStorySync && !versionCheck.needsAssetSync) {
        log.info('[Batch Sync] Already up to date - no sync needed');
        stats.endTime = Date.now();
        stats.durationMs = stats.endTime - stats.startTime;
        onProgress?.({ phase: 'complete', progress: 100, message: 'Already up to date' });
        return stats;
      }

      log.info(`[Batch Sync] Local: stories=${versionCheck.localVersion?.stories || 0}, assets=${versionCheck.localVersion?.assets || 0}`);
      log.info(`[Batch Sync] Server: stories=${versionCheck.serverVersion.stories}, assets=${versionCheck.serverVersion.assets}`);

      // Phase 2: Fetch delta content (1 API call)
      onProgress?.({ phase: 'fetching-delta', progress: 15, message: 'Fetching updates...' });

      const deltaResult = await this.fetchDeltaContent(versionCheck);
      stats.apiCalls++;
      stats.storiesUpdated = deltaResult.stories.length;
      stats.storiesDeleted = deltaResult.deletedStoryIds.length;

      log.info(`[Batch Sync] Delta: ${deltaResult.stories.length} new/updated, ${deltaResult.deletedStoryIds.length} deleted`);

      // Handle deletions
      if (deltaResult.deletedStoryIds.length > 0) {
        await CacheManager.removeStories(deltaResult.deletedStoryIds);
        log.info(`[Batch Sync] Removed ${deltaResult.deletedStoryIds.length} deleted stories`);
      }

      // Phase 3: Extract all asset paths from new/updated stories
      const assetPaths = this.extractAssetPaths(deltaResult.stories);
      stats.totalAssets = assetPaths.length;
      log.info(`[Batch Sync] Total assets to sync: ${assetPaths.length}`);

      if (assetPaths.length > 0) {
        // Filter out already cached assets
        const uncachedPaths = await this.filterUncachedAssets(assetPaths);
        stats.assetsSkipped = assetPaths.length - uncachedPaths.length;
        log.info(`[Batch Sync] Assets to download: ${uncachedPaths.length} (${stats.assetsSkipped} already cached)`);

        if (uncachedPaths.length > 0) {
          // Phase 4: Get batch signed URLs
          onProgress?.({ phase: 'batch-urls', progress: 25, message: 'Preparing downloads...' });

          const batchUrlResult = await this.getBatchSignedUrls(uncachedPaths);
          stats.apiCalls += batchUrlResult.apiCalls;
          stats.assetsFailed += batchUrlResult.failed.length;

          if (batchUrlResult.failed.length > 0) {
            log.warn(`[Batch Sync] Failed to get URLs for ${batchUrlResult.failed.length} assets`);
            stats.errors.push(`Failed to get URLs for ${batchUrlResult.failed.length} assets`);
          }

          // Phase 5: Download assets in parallel batches
          if (batchUrlResult.urls.length > 0) {
            const downloadResult = await this.downloadAssetsInBatches(
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
          }
        }
      }

      // Phase 6: Save stories to cache
      if (deltaResult.stories.length > 0) {
        await CacheManager.updateStories(deltaResult.stories);
        log.info(`[Batch Sync] Saved ${deltaResult.stories.length} stories to cache`);
      }

      // Update local version
      await VersionManager.updateLocalVersion({
        stories: versionCheck.serverVersion.stories,
        assets: versionCheck.serverVersion.assets,
      });

      stats.endTime = Date.now();
      stats.durationMs = stats.endTime - stats.startTime;

      log.info('[Batch Sync] ========== BATCH SYNC COMPLETE ==========');
      log.info(`[Batch Sync] Duration: ${stats.durationMs}ms`);
      log.info(`[Batch Sync] API Calls: ${stats.apiCalls}`);
      log.info(`[Batch Sync] Stories: ${stats.storiesUpdated} updated, ${stats.storiesDeleted} deleted`);
      log.info(`[Batch Sync] Assets: ${stats.assetsDownloaded} downloaded, ${stats.assetsSkipped} cached, ${stats.assetsFailed} failed`);

      onProgress?.({ phase: 'complete', progress: 100, message: 'Sync complete' });
      return stats;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      stats.errors.push(errorMsg);
      stats.endTime = Date.now();
      stats.durationMs = stats.endTime - stats.startTime;
      log.error('[Batch Sync] ========== BATCH SYNC FAILED ==========');
      log.error(`[Batch Sync] Error: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Fetch delta content from server
   * Only returns stories that have changed since last sync
   */
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

  /**
   * Extract all asset paths from stories
   * Returns normalized paths (without "assets/" prefix for GCS compatibility)
   */
  private static extractAssetPaths(stories: Story[]): string[] {
    const assets: Set<string> = new Set();

    for (const story of stories) {
      // Cover image
      if (story.coverImage && typeof story.coverImage === 'string' && !story.coverImage.startsWith('local:')) {
        assets.add(this.normalizePath(story.coverImage));
      }

      // Page images
      if (story.pages) {
        for (const page of story.pages) {
          if (page.backgroundImage && !page.backgroundImage.startsWith('local:')) {
            assets.add(this.normalizePath(page.backgroundImage));
          }
          if (page.characterImage && !page.characterImage.startsWith('local:')) {
            assets.add(this.normalizePath(page.characterImage));
          }
          // Interactive elements
          if (page.interactiveElements) {
            for (const element of page.interactiveElements) {
              if (element.image && typeof element.image === 'string' && !element.image.startsWith('local:')) {
                assets.add(this.normalizePath(element.image));
              }
            }
          }
        }
      }
    }

    return Array.from(assets);
  }

  /**
   * Normalize asset path for GCS (remove "assets/" prefix if present)
   */
  private static normalizePath(path: string): string {
    if (path.startsWith('assets/')) {
      return path.substring(7);
    }
    return path;
  }

  /**
   * Filter out assets that are already cached
   */
  private static async filterUncachedAssets(assetPaths: string[]): Promise<string[]> {
    const uncached: string[] = [];

    for (const path of assetPaths) {
      const isCached = await CacheManager.hasAsset(path);
      if (!isCached) {
        uncached.push(path);
      }
    }

    return uncached;
  }

  /**
   * Get a signed URL for a single asset path
   * Uses the batch endpoint but for a single item
   * @param assetPath The asset path (e.g., "stories/story-1/cover.webp")
   * @returns The signed URL or null if not found
   */
  public static async getSignedUrl(assetPath: string): Promise<string | null> {
    try {
      const response = await ApiClient.request<BatchUrlsResponse>('/api/assets/batch-urls', {
        method: 'POST',
        body: JSON.stringify({ paths: [assetPath] }),
      });

      if (response.urls.length > 0) {
        return response.urls[0].signedUrl;
      }

      if (response.failed.length > 0) {
        log.warn(`[Batch Sync] Failed to get signed URL for: ${assetPath}`);
      }

      return null;
    } catch (error) {
      log.error(`[Batch Sync] Error getting signed URL for ${assetPath}:`, error);
      return null;
    }
  }

  /**
   * Get batch signed URLs for multiple assets
   * Batches requests into groups of BATCH_URL_SIZE (50) to reduce API calls
   */
  private static async getBatchSignedUrls(
    assetPaths: string[]
  ): Promise<{ urls: Array<{ path: string; signedUrl: string }>; failed: string[]; apiCalls: number }> {
    const allUrls: Array<{ path: string; signedUrl: string }> = [];
    const allFailed: string[] = [];
    let apiCalls = 0;

    // Split into batches of BATCH_URL_SIZE
    const batches: string[][] = [];
    for (let i = 0; i < assetPaths.length; i += BATCH_URL_SIZE) {
      batches.push(assetPaths.slice(i, i + BATCH_URL_SIZE));
    }

    log.info(`[Batch Sync] Requesting URLs in ${batches.length} batches (${BATCH_URL_SIZE} per batch)`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        log.debug(`[Batch Sync] Batch ${i + 1}/${batches.length}: ${batch.length} assets`);

        const response = await ApiClient.request<BatchUrlsResponse>('/api/assets/batch-urls', {
          method: 'POST',
          body: JSON.stringify({ paths: batch }),
        });
        apiCalls++;

        allUrls.push(...response.urls);
        allFailed.push(...response.failed);
      } catch (error) {
        log.error(`[Batch Sync] Batch ${i + 1} failed:`, error);
        allFailed.push(...batch);
        apiCalls++;
      }
    }

    return { urls: allUrls, failed: allFailed, apiCalls };
  }

  /**
   * Download assets in parallel with concurrency limit
   */
  private static async downloadAssetsInBatches(
    urls: Array<{ path: string; signedUrl: string }>,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ downloaded: number; failed: number; bytesDownloaded: number; errors: string[] }> {
    let downloaded = 0;
    let failed = 0;
    let bytesDownloaded = 0;
    const errors: string[] = [];
    const total = urls.length;

    // Process in chunks of CONCURRENT_DOWNLOADS
    for (let i = 0; i < urls.length; i += CONCURRENT_DOWNLOADS) {
      const chunk = urls.slice(i, i + CONCURRENT_DOWNLOADS);

      const results = await Promise.allSettled(
        chunk.map(async ({ path, signedUrl }) => {
          try {
            const localPath = await CacheManager.downloadAndCacheAsset(signedUrl, path);
            // Try to get file size for stats
            try {
              const FileSystem = await import('expo-file-system/legacy');
              const info = await FileSystem.getInfoAsync(localPath);
              if (info.exists && 'size' in info) {
                bytesDownloaded += info.size || 0;
              }
            } catch {
              // Ignore size tracking errors
            }
            return { success: true, path };
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, path, error: errorMsg };
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            downloaded++;
          } else {
            failed++;
            errors.push(`${result.value.path}: ${result.value.error}`);
          }
        } else {
          failed++;
          errors.push(`Download failed: ${result.reason}`);
        }
      }

      onProgress?.(Math.min(i + chunk.length, total), total);
    }

    return { downloaded, failed, bytesDownloaded, errors };
  }

  /**
   * Check if a sync is currently in progress
   */
  static isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Quick check if sync is needed (without performing sync)
   */
  static async isSyncNeeded(): Promise<boolean> {
    const versionCheck = await VersionManager.checkVersions();
    return versionCheck.needsStorySync || versionCheck.needsAssetSync;
  }
}
