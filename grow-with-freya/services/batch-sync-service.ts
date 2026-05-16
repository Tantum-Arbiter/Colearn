import { VersionManager, VersionCheckResult } from './version-manager';
import { CacheManager } from './cache-manager';
import { ApiClient } from './api-client';
import { CatalogService } from './catalog-service';
import { Story, CatalogEntry } from '../types/story';
import { ALL_STORIES } from '@/data/stories';
import { Logger } from '@/utils/logger';

const log = Logger.create('Sync');

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
  phase: 'version-check' | 'fetching-delta' | 'saving' | 'complete' | 'skipped';
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
      log.info('Sync already in progress, waiting…');
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

    log.info('━━ Batch sync started ━━');

    try {
      // Phase 1: Version check (1 API call)
      log.info('Checking content versions…');
      onProgress?.({ phase: 'version-check', progress: 5, message: 'Checking for updates...' });

      const versionCheck = await VersionManager.checkVersions();
      stats.apiCalls++;

      if (!versionCheck.serverVersion) {
        log.info('Offline — using cached content');
        stats.fromCache = true;
        stats.endTime = Date.now();
        stats.durationMs = stats.endTime - stats.startTime;
        onProgress?.({ phase: 'complete', progress: 100, message: 'Using cached content' });
        return stats;
      }

      // Check if sync is needed
      if (!versionCheck.needsStorySync && !versionCheck.needsAssetSync) {
        log.info('Stories up to date — refreshing catalog URLs…');
        // Stories are up to date, but we still need to call delta to get fresh catalog
        // entries with valid signed thumbnail URLs (they expire after 1 hour)
        try {
          const deltaResult = await this.fetchDeltaContent(versionCheck);
          stats.apiCalls++;
          if (deltaResult.catalog && deltaResult.catalog.length > 0) {
            await CatalogService.updateCatalog(deltaResult.catalog);
            log.info(`Catalog refreshed: ${deltaResult.catalog.length} entries`);
          }
        } catch (e) {
          log.warn('Catalog refresh failed (non-critical):', e);
        }
        stats.endTime = Date.now();
        stats.durationMs = stats.endTime - stats.startTime;
        onProgress?.({ phase: 'complete', progress: 100, message: 'Already up to date' });
        return stats;
      }

      log.info(`Sync needed — local v${versionCheck.localVersion?.stories || 0} → server v${versionCheck.serverVersion.stories}`);

      // Phase 2: Fetch delta content (1 API call) — metadata only, no asset downloads
      log.info('Fetching delta content…');
      onProgress?.({ phase: 'fetching-delta', progress: 15, message: 'Fetching updates...' });

      const deltaResult = await this.fetchDeltaContent(versionCheck);
      stats.apiCalls++;
      stats.storiesUpdated = deltaResult.stories.length;
      stats.storiesDeleted = deltaResult.deletedStoryIds.length;

      log.info(`Delta: +${deltaResult.stories.length} updated, -${deltaResult.deletedStoryIds.length} deleted`);

      // Handle deletions
      if (deltaResult.deletedStoryIds.length > 0) {
        log.debug(`Removing deleted: ${deltaResult.deletedStoryIds.join(', ')}`);
        await CacheManager.removeStories(deltaResult.deletedStoryIds);
      }

      // Phase 3: Save only bundled story metadata updates to cache
      // CMS-only stories are NOT saved to cache — they appear in the catalog for on-demand download
      onProgress?.({ phase: 'saving', progress: 60, message: 'Updating stories...' });

      const bundledIds = new Set(ALL_STORIES.map(s => s.id));
      const bundledUpdates = deltaResult.stories.filter(s => bundledIds.has(s.id));
      const cmsOnlyCount = deltaResult.stories.length - bundledUpdates.length;

      if (bundledUpdates.length > 0) {
        await CacheManager.updateStories(bundledUpdates);
        log.info(`Saved ${bundledUpdates.length} bundled updates, ${cmsOnlyCount} CMS-only in catalog`);
      } else if (cmsOnlyCount > 0) {
        log.debug(`No bundled updates (${cmsOnlyCount} CMS-only in catalog)`);
      }

      // Persist catalog for browse/discovery UI
      if (deltaResult.catalog && deltaResult.catalog.length > 0) {
        await CatalogService.updateCatalog(deltaResult.catalog);
        log.info(`Catalog: ${deltaResult.catalog.length} entries`);
      }

      // Update local version
      await VersionManager.updateLocalVersion({
        stories: versionCheck.serverVersion.stories,
        assets: versionCheck.serverVersion.assets,
      });

      stats.endTime = Date.now();
      stats.durationMs = stats.endTime - stats.startTime;

      log.info(`━━ Sync complete ━━ ${stats.durationMs}ms · ${stats.storiesUpdated} stories · ${stats.apiCalls} API calls`);

      onProgress?.({ phase: 'complete', progress: 100, message: 'Sync complete' });
      return stats;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      stats.errors.push(errorMsg);
      stats.endTime = Date.now();
      stats.durationMs = stats.endTime - stats.startTime;
      log.error(`Sync failed after ${stats.durationMs}ms: ${errorMsg}`);
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

    log.debug(`Fetching delta from v${localVersion} (${Object.keys(checksums).length} cached)`);

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
