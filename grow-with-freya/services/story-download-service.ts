import AsyncStorage from '@react-native-async-storage/async-storage';
import { CacheManager } from './cache-manager';
import { ApiClient } from './api-client';
import { AssetDownloadUtils } from './asset-download-utils';
import { StoryAccessService, AccessCheckResult } from './story-access-service';
import { CatalogService } from './catalog-service';
import { Story, CatalogEntry } from '../types/story';
import { Logger } from '@/utils/logger';

const log = Logger.create('StoryDownloadService');

/**
 * Key for storing IDs of bundled stories the user has "deleted".
 * These stories are excluded from StoryLoader results and shown
 * as catalog entries instead.
 */
const HIDDEN_BUNDLED_KEY = '@hidden_bundled_stories';

/** Maximum wall-clock time for an entire story download (2 minutes). */
const MAX_DOWNLOAD_DURATION_MS = 2 * 60 * 1000;

/** Show "Connection issue…" after this long with no progress (10 seconds). */
const STALL_THRESHOLD_MS = 10_000;

/** Auto-cancel the download after this long with no progress (20 seconds). */
const STALL_AUTO_CANCEL_MS = 20_000;

/** Stall detector polling interval. */
const STALL_POLL_INTERVAL_MS = 3_000;

export type DownloadPhase =
  | 'access-check'
  | 'fetching-story'
  | 'fetching-urls'
  | 'downloading-assets'
  | 'saving'
  | 'complete'
  | 'failed'
  | 'cancelled'
  | 'stalled';

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
  /** True when the user explicitly cancelled the download */
  cancelled?: boolean;
  /** True when some assets failed but the story itself was saved */
  partialFailure?: boolean;
}

export type DownloadProgressCallback = (progress: DownloadProgress) => void;

/**
 * Orchestrates on-demand single-story download.
 * Flow: access check → fetch story JSON → extract assets → get signed URLs → download assets → save to cache.
 */
export class StoryDownloadService {

  // Prevent concurrent downloads of the same story
  private static activeDownloads = new Map<string, Promise<DownloadResult>>();
  // Cancellation tokens keyed by storyId
  private static cancellationTokens = new Map<string, { cancelled: boolean }>();

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

    const token = { cancelled: false };
    this.cancellationTokens.set(storyId, token);

    const promise = this.executeDownload(storyId, catalogEntry, onProgress, token);
    this.activeDownloads.set(storyId, promise);

    try {
      return await promise;
    } finally {
      this.activeDownloads.delete(storyId);
      this.cancellationTokens.delete(storyId);
    }
  }

  /**
   * Cancel an in-progress download. Immediately removes it from the active
   * downloads map so a retry won't return the old stale promise.
   */
  static cancelDownload(storyId: string): void {
    const token = this.cancellationTokens.get(storyId);
    if (token) {
      token.cancelled = true;
      log.info(`Download cancelled for ${storyId}`);
    }
    // Remove from active downloads immediately so a retry starts fresh.
    // The old promise will still resolve eventually (via timeout), but
    // nothing will be waiting on it.
    this.activeDownloads.delete(storyId);
    this.cancellationTokens.delete(storyId);
  }

  private static async executeDownload(
    storyId: string,
    catalogEntry?: CatalogEntry,
    onProgress?: DownloadProgressCallback,
    cancelToken?: { cancelled: boolean }
  ): Promise<DownloadResult> {
    const startTime = Date.now();
    let lastProgressTime = Date.now();
    let stallNotified = false;
    const result: DownloadResult = {
      success: false,
      storyId,
      assetsDownloaded: 0,
      assetsFailed: 0,
      bytesDownloaded: 0,
      durationMs: 0,
    };

    /** Track whether this download was auto-cancelled by the stall detector (vs user tap). */
    let autoTimedOut = false;

    /** Check whether we should abort (cancelled or timed out). */
    const checkAbort = () => {
      if (cancelToken?.cancelled) {
        throw new DownloadAbortError(
          autoTimedOut
            ? 'Download failed — connection lost'
            : 'Download cancelled by user'
        );
      }
      if (Date.now() - startTime > MAX_DOWNLOAD_DURATION_MS) {
        throw new DownloadAbortError(
          `Download timed out after ${Math.round(MAX_DOWNLOAD_DURATION_MS / 60_000)} minutes`
        );
      }
    };

    /** Wraps onProgress to also track stall detection. */
    const reportProgress = (p: DownloadProgress) => {
      lastProgressTime = Date.now();
      stallNotified = false;
      onProgress?.(p);
    };

    // Stall detector — fires every 3s during the download
    let stallInterval: ReturnType<typeof setInterval> | null = setInterval(() => {
      const stalledFor = Date.now() - lastProgressTime;

      // Auto-cancel after sustained stall — stop the interval immediately
      if (stalledFor > STALL_AUTO_CANCEL_MS && cancelToken && !cancelToken.cancelled) {
        autoTimedOut = true;
        cancelToken.cancelled = true;
        if (stallInterval) { clearInterval(stallInterval); stallInterval = null; }
        log.warn(`Auto-cancelling download for ${storyId} — no progress for ${Math.round(stalledFor / 1000)}s`);
        onProgress?.({
          phase: 'stalled',
          progress: -1,
          message: 'Connection lost',
        });
        return;
      }

      // Show "Connection issue…" warning
      if (stalledFor > STALL_THRESHOLD_MS && !stallNotified) {
        stallNotified = true;
        onProgress?.({
          phase: 'stalled',
          progress: -1,
          message: 'Connection issue…',
        });
      }
    }, STALL_POLL_INTERVAL_MS);

    try {
      // Phase 1: Access check
      checkAbort();
      reportProgress({ phase: 'access-check', progress: 5, message: 'Checking access...' });
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
      checkAbort();
      log.info(`Downloading story ${storyId}...`);
      reportProgress({ phase: 'fetching-story', progress: 15, message: 'Fetching story data...' });

      let story: Story;
      try {
        story = await ApiClient.request<Story>(
          `/api/stories/${encodeURIComponent(storyId)}/download`,
          { method: 'GET' }
        );
      } catch (apiError) {
        // If the API call fails during token refresh or auth, surface it as an
        // auth error so the UI shows "Sign In Required" instead of "internet failed".
        const msg = apiError instanceof Error ? apiError.message : '';
        const isAuth = /not authenticated|authentication failed|token refresh|no refresh token|please login|login required/i.test(msg);
        if (isAuth) {
          throw new Error('Not authenticated - please login');
        }
        throw apiError; // genuine network / server error — let outer catch handle it
      }
      result.story = story;

      // Phase 3: Extract asset paths and filter uncached
      checkAbort();
      const assetPaths = AssetDownloadUtils.extractAssetPaths([story]);
      const uncachedPaths = await AssetDownloadUtils.filterUncachedAssets(assetPaths);

      log.info(`Story ${storyId}: ${assetPaths.length} total assets, ${uncachedPaths.length} need download`);

      if (uncachedPaths.length > 0) {
        // Phase 4: Get signed URLs
        checkAbort();
        reportProgress({ phase: 'fetching-urls', progress: 30, message: 'Preparing downloads...' });
        const urlResult = await AssetDownloadUtils.getBatchSignedUrls(uncachedPaths);
        result.assetsFailed += urlResult.failed.length;

        // Phase 5: Download assets
        if (urlResult.urls.length > 0) {
          checkAbort();
          reportProgress({ phase: 'downloading-assets', progress: 40, message: 'Downloading assets...' });
          const downloadResult = await AssetDownloadUtils.downloadAssetsInBatches(
            urlResult.urls,
            (current, total, bytesDownloaded, totalBytes) => {
              checkAbort(); // Check cancellation between batches
              const progress = 40 + Math.floor((current / total) * 45);
              const bytesFmt = AssetDownloadUtils.formatBytes(bytesDownloaded);
              const totalFmt = totalBytes > 0 ? AssetDownloadUtils.formatBytes(totalBytes) : '?';
              reportProgress({
                phase: 'downloading-assets',
                progress,
                message: `Downloading ${current}/${total} — ${bytesFmt} / ${totalFmt}`,
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
      checkAbort();
      reportProgress({ phase: 'saving', progress: 90, message: 'Saving story...' });
      await CacheManager.updateStories([story]);

      // Remove from catalog (it's now a downloaded story)
      await CatalogService.removeEntry(storyId);

      // If this was a previously hidden bundled story, un-hide it
      await this.unhideBundledStory(storyId);

      // Record download for analytics/limits
      await StoryAccessService.recordDownload();

      result.success = true;
      result.durationMs = Date.now() - startTime;

      // Flag partial failure so the UI can warn the user
      if (result.assetsFailed > 0) {
        result.partialFailure = true;
        log.warn(
          `Story ${storyId} downloaded with ${result.assetsFailed} failed assets ` +
          `(${result.assetsDownloaded} succeeded)`
        );
      }

      log.info(
        `Story ${storyId} downloaded in ${result.durationMs}ms: ` +
        `${result.assetsDownloaded} assets (${AssetDownloadUtils.formatBytes(result.bytesDownloaded)}), ` +
        `${result.assetsFailed} failed`
      );

      reportProgress({ phase: 'complete', progress: 100, message: 'Download complete!' });
      return result;

    } catch (error) {
      if (error instanceof DownloadAbortError) {
        result.cancelled = cancelToken?.cancelled ?? false;
        result.error = error.message;
        result.durationMs = Date.now() - startTime;
        const phase = result.cancelled ? 'cancelled' : 'failed';
        log.info(`Download ${phase} for ${storyId}: ${error.message}`);
        onProgress?.({ phase, progress: 0, message: error.message });
        return result;
      }

      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.error = errorMsg;
      result.durationMs = Date.now() - startTime;
      log.error(`Download failed for ${storyId}: ${errorMsg}`);
      onProgress?.({ phase: 'failed', progress: 0, message: `Download failed: ${errorMsg}` });
      return result;
    } finally {
      if (stallInterval) { clearInterval(stallInterval); stallInterval = null; }
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

  /**
   * Delete a downloaded story from local cache and re-add it to the catalog
   * so the user can re-download it later.
   *
   * For bundled stories (shipped with the app), also marks the story as
   * "hidden" so StoryLoader excludes it from the stories list.
   */
  static async deleteStory(storyId: string): Promise<boolean> {
    try {
      // Get the story before removing so we can build a catalog entry
      const story = await CacheManager.getStory(storyId);

      // For bundled stories the CacheManager may not have them, so also
      // check ALL_STORIES from the static bundle
      const { ALL_STORIES } = require('../data/stories');
      const bundledStory = ALL_STORIES.find((s: Story) => s.id === storyId);
      const storyData: Story | undefined = story ?? bundledStory;

      if (!storyData) {
        log.warn(`Cannot delete story ${storyId}: not found in cache or bundle`);
        return false;
      }

      // Remove from local story cache (no-op if not in cache)
      await CacheManager.removeStories([storyId]);

      // If this is a bundled story, mark it as hidden so StoryLoader skips it
      if (bundledStory) {
        await this.hideBundledStory(storyId);
      }

      // Re-add to catalog as a downloadable entry
      const catalogEntry: CatalogEntry = {
        storyId: storyData.id,
        title: storyData.title,
        localizedTitle: storyData.localizedTitle,
        description: storyData.description,
        localizedDescription: storyData.localizedDescription,
        category: storyData.category,
        tag: storyData.tag,
        tags: storyData.tags,
        emoji: storyData.emoji,
        thumbnailUrl: typeof storyData.coverImage === 'string' ? storyData.coverImage : undefined,
        isFree: storyData.isFree ?? false,
        isPremium: storyData.isPremium ?? false,
        isReferralReward: storyData.isReferralReward ?? false,
        ageRange: storyData.ageRange,
        duration: storyData.duration,
        gender: storyData.gender,
      };

      await CatalogService.addEntry(catalogEntry);

      log.info(`Story ${storyId} deleted from cache and returned to catalog`);
      return true;
    } catch (error) {
      log.error(`Failed to delete story ${storyId}:`, error);
      return false;
    }
  }

  // ─── Hidden bundled stories ───────────────────────────────────────

  /**
   * Get the set of bundled story IDs the user has "deleted".
   */
  static async getHiddenBundledStoryIds(): Promise<Set<string>> {
    try {
      const data = await AsyncStorage.getItem(HIDDEN_BUNDLED_KEY);
      if (!data) return new Set();
      return new Set(JSON.parse(data) as string[]);
    } catch (error) {
      log.error('Failed to read hidden bundled stories:', error);
      return new Set();
    }
  }

  /**
   * Mark a bundled story as hidden (user "deleted" it).
   */
  static async hideBundledStory(storyId: string): Promise<void> {
    const hidden = await this.getHiddenBundledStoryIds();
    hidden.add(storyId);
    await AsyncStorage.setItem(HIDDEN_BUNDLED_KEY, JSON.stringify([...hidden]));
    log.debug(`Bundled story ${storyId} marked as hidden`);
  }

  /**
   * Un-hide a bundled story (user re-downloaded it).
   */
  static async unhideBundledStory(storyId: string): Promise<void> {
    const hidden = await this.getHiddenBundledStoryIds();
    if (hidden.delete(storyId)) {
      await AsyncStorage.setItem(HIDDEN_BUNDLED_KEY, JSON.stringify([...hidden]));
      log.debug(`Bundled story ${storyId} un-hidden`);
    }
  }
}


/** Sentinel error used for cancellation and overall timeout — distinguished from real failures. */
class DownloadAbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DownloadAbortError';
  }
}