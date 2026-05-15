import { CacheManager } from './cache-manager';
import { ApiClient } from './api-client';
import { AssetDownloadUtils } from './asset-download-utils';
import { StoryAccessService, AccessCheckResult } from './story-access-service';
import { CatalogService } from './catalog-service';
import { Story, CatalogEntry } from '../types/story';
import { Logger } from '@/utils/logger';

const log = Logger.create('StoryDownloadService');

export type DownloadPhase =
  | 'access-check'
  | 'fetching-story'
  | 'fetching-urls'
  | 'downloading-assets'
  | 'saving'
  | 'complete'
  | 'failed';

export interface DownloadProgress {
  phase: DownloadPhase;
  progress: number; // 0-100
  message: string;
  detail?: {
    currentAsset?: number;
    totalAssets?: number;
    bytesDownloaded?: number;
    totalBytes?: number;
  };
}

export interface DownloadResult {
  success: boolean;
  storyId: string;
  story?: Story;
  assetsDownloaded: number;
  assetsFailed: number;
  bytesDownloaded: number;
  durationMs: number;
  error?: string;
}

export type DownloadProgressCallback = (progress: DownloadProgress) => void;

/**
 * Orchestrates on-demand single-story download.
 * Flow: access check → fetch story JSON → extract assets → get signed URLs → download assets → save to cache.
 */
export class StoryDownloadService {

  // Prevent concurrent downloads of the same story
  private static activeDownloads = new Map<string, Promise<DownloadResult>>();

  /**
   * Download a single story by ID. Checks access first, then fetches
   * the story data and all its assets to local cache.
   *
   * @param storyId - The story to download
   * @param catalogEntry - Optional catalog entry for access check (avoids extra lookup)
   * @param onProgress - Optional progress callback for UI updates
   */
  static async downloadStory(
    storyId: string,
    catalogEntry?: CatalogEntry,
    onProgress?: DownloadProgressCallback
  ): Promise<DownloadResult> {
    // Deduplicate concurrent downloads of the same story
    const existing = this.activeDownloads.get(storyId);
    if (existing) {
      log.info(`Download already in progress for ${storyId}, waiting...`);
      return existing;
    }

    const promise = this.executeDownload(storyId, catalogEntry, onProgress);
    this.activeDownloads.set(storyId, promise);

    try {
      return await promise;
    } finally {
      this.activeDownloads.delete(storyId);
    }
  }

  private static async executeDownload(
    storyId: string,
    catalogEntry?: CatalogEntry,
    onProgress?: DownloadProgressCallback
  ): Promise<DownloadResult> {
    const startTime = Date.now();
    const result: DownloadResult = {
      success: false,
      storyId,
      assetsDownloaded: 0,
      assetsFailed: 0,
      bytesDownloaded: 0,
      durationMs: 0,
    };

    try {
      // Phase 1: Access check
      onProgress?.({ phase: 'access-check', progress: 5, message: 'Checking access...' });
      const entry = catalogEntry ?? await CatalogService.getEntry(storyId);

      if (entry) {
        const access = await StoryAccessService.canDownload(entry);
        if (!access.allowed) {
          result.error = access.reason || 'Access denied';
          result.durationMs = Date.now() - startTime;
          onProgress?.({ phase: 'failed', progress: 0, message: result.error });
          return result;
        }
      }
      // If no catalog entry, proceed anyway (admin/test download)

      // Phase 2: Fetch story JSON from download endpoint
      log.info(`Downloading story ${storyId}...`);
      onProgress?.({ phase: 'fetching-story', progress: 15, message: 'Fetching story data...' });

      const story = await ApiClient.request<Story>(
        `/api/stories/${encodeURIComponent(storyId)}/download`,
        { method: 'GET' }
      );
      result.story = story;

      // Phase 3: Extract asset paths and filter uncached
      const assetPaths = AssetDownloadUtils.extractAssetPaths([story]);
      const uncachedPaths = await AssetDownloadUtils.filterUncachedAssets(assetPaths);

      log.info(`Story ${storyId}: ${assetPaths.length} total assets, ${uncachedPaths.length} need download`);

      if (uncachedPaths.length > 0) {
        // Phase 4: Get signed URLs
        onProgress?.({ phase: 'fetching-urls', progress: 30, message: 'Preparing downloads...' });
        const urlResult = await AssetDownloadUtils.getBatchSignedUrls(uncachedPaths);
        result.assetsFailed += urlResult.failed.length;

        // Phase 5: Download assets
        if (urlResult.urls.length > 0) {
          onProgress?.({ phase: 'downloading-assets', progress: 40, message: 'Downloading assets...' });
          const downloadResult = await AssetDownloadUtils.downloadAssetsInBatches(
            urlResult.urls,
            (current, total, bytesDownloaded, totalBytes) => {
              const progress = 40 + Math.floor((current / total) * 45);
              const bytesFmt = AssetDownloadUtils.formatBytes(bytesDownloaded);
              const totalFmt = totalBytes > 0 ? AssetDownloadUtils.formatBytes(totalBytes) : '?';
              onProgress?.({
                phase: 'downloading-assets',
                progress,
                message: `${bytesFmt} / ${totalFmt}`,
                detail: { currentAsset: current, totalAssets: total, bytesDownloaded, totalBytes },
              });
            }
          );
          result.assetsDownloaded = downloadResult.downloaded;
          result.assetsFailed += downloadResult.failed;
          result.bytesDownloaded = downloadResult.bytesDownloaded;
        }
      }

      // Phase 6: Save story to local cache
      onProgress?.({ phase: 'saving', progress: 90, message: 'Saving story...' });
      await CacheManager.updateStories([story]);

      // Remove from catalog (it's now a downloaded story)
      await CatalogService.removeEntry(storyId);

      // Record download for analytics/limits
      await StoryAccessService.recordDownload();

      result.success = true;
      result.durationMs = Date.now() - startTime;

      log.info(
        `Story ${storyId} downloaded in ${result.durationMs}ms: ` +
        `${result.assetsDownloaded} assets (${AssetDownloadUtils.formatBytes(result.bytesDownloaded)}), ` +
        `${result.assetsFailed} failed`
      );

      onProgress?.({ phase: 'complete', progress: 100, message: 'Download complete!' });
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.error = errorMsg;
      result.durationMs = Date.now() - startTime;
      log.error(`Download failed for ${storyId}: ${errorMsg}`);
      onProgress?.({ phase: 'failed', progress: 0, message: `Download failed: ${errorMsg}` });
      return result;
    }
  }

  /**
   * Check if a story is currently being downloaded.
   */
  static isDownloading(storyId: string): boolean {
    return this.activeDownloads.has(storyId);
  }

  /**
   * Check if a story is already downloaded and cached locally.
   */
  static async isDownloaded(storyId: string): Promise<boolean> {
    const story = await CacheManager.getStory(storyId);
    return story !== null;
  }
}
