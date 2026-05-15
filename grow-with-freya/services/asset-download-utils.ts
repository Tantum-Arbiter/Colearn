import { CacheManager } from './cache-manager';
import { ApiClient } from './api-client';
import { Story } from '../types/story';
import { Logger } from '@/utils/logger';

const log = Logger.create('AssetDownloadUtils');

// Batch size for URL requests (max 100 per batch)
export const BATCH_URL_SIZE = 100;
// Concurrent download limit
export const CONCURRENT_DOWNLOADS = 5;

export interface BatchUrlsResponse {
  urls: Array<{
    path: string;
    signedUrl: string;
    expiresAt: number;
  }>;
  failed: string[]; // Paths that failed to generate URLs
}

/**
 * Shared asset download utilities used by both BatchSyncService (bulk sync)
 * and StoryDownloadService (on-demand single-story download).
 */
export class AssetDownloadUtils {

  /**
   * Extract all asset paths from one or more stories.
   * Returns deduplicated set of normalized paths.
   */
  static extractAssetPaths(stories: Story[]): string[] {
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

  /** Strip "assets/" prefix since CacheManager handles the base directory. */
  static normalizePath(path: string): string {
    if (path.startsWith('assets/')) {
      return path.substring(7);
    }
    return path;
  }

  /** Filter asset paths to only those not already in the local cache. */
  static async filterUncachedAssets(assetPaths: string[]): Promise<string[]> {
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
   * Request signed URLs in batches of BATCH_URL_SIZE.
   * Returns all successful URLs, failed paths, and total API calls made.
   */
  static async getBatchSignedUrls(
    assetPaths: string[]
  ): Promise<{ urls: Array<{ path: string; signedUrl: string }>; failed: string[]; apiCalls: number }> {
    const allUrls: Array<{ path: string; signedUrl: string }> = [];
    const allFailed: string[] = [];
    let apiCalls = 0;

    // Split into batches
    const batches: string[][] = [];
    for (let i = 0; i < assetPaths.length; i += BATCH_URL_SIZE) {
      batches.push(assetPaths.slice(i, i + BATCH_URL_SIZE));
    }

    log.info(`Requesting signed URLs in ${batches.length} batches (${BATCH_URL_SIZE} per batch)`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        log.debug(`Batch ${i + 1}/${batches.length}: ${batch.length} assets`);
        const response = await ApiClient.request<BatchUrlsResponse>('/api/assets/batch-urls', {
          method: 'POST',
          body: JSON.stringify({ paths: batch }),
        });
        apiCalls++;
        allUrls.push(...response.urls);
        allFailed.push(...response.failed);
      } catch (error) {
        log.error(`Batch ${i + 1} failed:`, error);
        allFailed.push(...batch);
        apiCalls++;
      }
    }

    return { urls: allUrls, failed: allFailed, apiCalls };
  }

  /**
   * Download assets in parallel chunks of CONCURRENT_DOWNLOADS.
   * Reports progress via optional callback.
   */
  static async downloadAssetsInBatches(
    urls: Array<{ path: string; signedUrl: string }>,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ downloaded: number; failed: number; bytesDownloaded: number; errors: string[] }> {
    let downloaded = 0;
    let failed = 0;
    let bytesDownloaded = 0;
    const errors: string[] = [];
    const total = urls.length;

    for (let i = 0; i < urls.length; i += CONCURRENT_DOWNLOADS) {
      const chunk = urls.slice(i, i + CONCURRENT_DOWNLOADS);

      const results = await Promise.allSettled(
        chunk.map(async ({ path, signedUrl }) => {
          try {
            const localPath = await CacheManager.downloadAndCacheAsset(signedUrl, path);
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

  /** Format bytes into human-readable string. */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
