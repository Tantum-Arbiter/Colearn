import AsyncStorage from '@react-native-async-storage/async-storage';
import { VersionManager, VersionCheckResult } from './version-manager';
import { CacheManager } from './cache-manager';
import { ApiClient } from './api-client';
import { Story, StorySyncResponse } from '../types/story';
import { Logger } from '@/utils/logger';

const log = Logger.create('ContentSyncService');

const CHECKPOINT_KEY = '@sync_checkpoint';

export interface SyncResult {
  success: boolean;
  updatedStories: number;
  updatedAssets: number;
  errors: string[];
  fromCache: boolean;
  wasSkipped?: boolean; // True if sync was skipped due to another sync in progress
}

export interface SyncProgress {
  phase: 'authenticating' | 'checking' | 'syncing-stories' | 'syncing-assets' | 'complete' | 'skipped';
  progress: number; // 0-100
  message: string;
  detail?: {
    currentItem?: number;
    totalItems?: number;
    itemName?: string;
    // Byte progress for downloads
    downloadedBytes?: number;
    totalBytes?: number;
  };
}

export type SyncProgressCallback = (progress: SyncProgress) => void;

interface AssetInfo {
  path: string;
  signedUrl: string;
  checksum: string;
  size: number;
}

interface AssetSyncResponse {
  serverVersion: number;
  updatedAssets: AssetInfo[];
  assetChecksums: Record<string, string>;
  totalAssets: number;
  updatedCount: number;
  lastUpdated: number;
}

/**
 * Pending story that's being synced with its assets
 * Story is only made visible once all required assets are downloaded
 */
interface PendingStorySync {
  story: Story;
  requiredAssets: string[];
  downloadedAssets: Set<string>;
  isReady: boolean;
}

/**
 * Checkpoint to resume sync if app is interrupted
 * Stores the sync state so it can continue from where it left off
 */
interface SyncCheckpoint {
  serverVersion: number;
  assetVersion: number;
  pendingStoryIds: string[];      // Story IDs that still need syncing
  completedStoryIds: string[];    // Story IDs successfully synced
  storyChecksums: Record<string, string>; // Checksums for delta comparison
  createdAt: number;              // When checkpoint was created
  expiresAt: number;              // When checkpoint becomes stale (24 hours)
}

/**
 * ContentSyncService - Handles delta downloads only
 *
 * Responsibilities:
 * - Check versions and determine what needs syncing
 * - Download only changed content (delta sync)
 * - Update cache with new content
 * - Report sync progress
 *
 * Key principles:
 * - This service ONLY syncs. Display components read from CacheManager.
 * - Sync lock prevents concurrent sync operations
 * - Atomic updates ensure story + assets are synced together
 * - Graceful degradation when offline or errors occur
 */
export class ContentSyncService {

  // Sync lock to prevent concurrent sync operations
  private static isSyncing = false;
  private static syncPromise: Promise<SyncResult> | null = null;

  // Checkpoint expiry time: 24 hours
  private static readonly CHECKPOINT_EXPIRY_MS = 24 * 60 * 60 * 1000;

  /**
   * Save a sync checkpoint so sync can resume if interrupted
   */
  private static async saveCheckpoint(checkpoint: SyncCheckpoint): Promise<void> {
    try {
      await AsyncStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint));
      log.debug(`Saved checkpoint: ${checkpoint.completedStoryIds.length} complete, ${checkpoint.pendingStoryIds.length} pending`);
    } catch (error) {
      log.warn('Failed to save sync checkpoint:', error);
    }
  }

  /**
   * Load an existing sync checkpoint if one exists and is valid
   */
  private static async loadCheckpoint(): Promise<SyncCheckpoint | null> {
    try {
      const data = await AsyncStorage.getItem(CHECKPOINT_KEY);
      if (!data) return null;

      const checkpoint: SyncCheckpoint = JSON.parse(data);

      // Check if checkpoint has expired
      if (Date.now() > checkpoint.expiresAt) {
        log.info('Sync checkpoint expired, starting fresh');
        await this.clearCheckpoint();
        return null;
      }

      log.info(`Loaded checkpoint: ${checkpoint.completedStoryIds.length} complete, ${checkpoint.pendingStoryIds.length} pending`);
      return checkpoint;
    } catch (error) {
      log.warn('Failed to load sync checkpoint:', error);
      return null;
    }
  }

  /**
   * Clear the sync checkpoint after successful completion
   */
  private static async clearCheckpoint(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CHECKPOINT_KEY);
      log.debug('Cleared sync checkpoint');
    } catch (error) {
      log.warn('Failed to clear sync checkpoint:', error);
    }
  }

  /**
   * Perform a full sync check and download any updates
   *
   * SYNC LOCK: If a sync is already in progress, returns the existing sync promise
   * This prevents race conditions from multiple components triggering sync
   */
  static async sync(onProgress?: SyncProgressCallback): Promise<SyncResult> {
    // Check if sync is already in progress
    if (this.isSyncing && this.syncPromise) {
      log.info('[Sync Lock] Another sync is in progress, waiting...');
      onProgress?.({ phase: 'skipped', progress: 0, message: 'Sync already in progress' });
      return this.syncPromise;
    }

    // Acquire sync lock
    log.info('[Sync Lock] Acquired');
    this.isSyncing = true;
    this.syncPromise = this.performSync(onProgress);

    try {
      return await this.syncPromise;
    } finally {
      // Release sync lock
      this.isSyncing = false;
      this.syncPromise = null;
      log.info('[Sync Lock] Released');
    }
  }

  /**
   * Internal sync implementation
   *
   * ATOMIC SYNC STRATEGY:
   * 1. Fetch new stories from server (but don't add to cache yet)
   * 2. Download all required assets for new stories
   * 3. Only after assets are ready, add stories to cache
   * 4. This ensures users never see CMS stories with broken images
   *
   * Note: Bundled stories always work - they have bundled assets
   */
  private static async performSync(onProgress?: SyncProgressCallback): Promise<SyncResult> {
    const syncStartTime = Date.now();
    log.info('[Content Sync] ========== SYNC STARTED ==========');

    const result: SyncResult = {
      success: true,
      updatedStories: 0,
      updatedAssets: 0,
      errors: [],
      fromCache: false,
    };

    try {
      // Phase 1: Check versions
      log.info('[Content Sync] Step 1/4: Checking versions with server...');
      onProgress?.({ phase: 'checking', progress: 0, message: 'Checking for updates...' });

      const versionCheck = await VersionManager.checkVersions();

      // If offline, return cached content
      if (!versionCheck.serverVersion) {
        log.info('[Content Sync] OFFLINE - No server connection, using cached content');
        result.fromCache = true;
        onProgress?.({ phase: 'complete', progress: 100, message: 'Using cached content' });
        return result;
      }

      log.info(`[Content Sync]   Local version: stories=${versionCheck.localVersion?.stories || 0}, assets=${versionCheck.localVersion?.assets || 0}`);
      log.info(`[Content Sync]   Server version: stories=${versionCheck.serverVersion.stories}, assets=${versionCheck.serverVersion.assets}`);
      log.info(`[Content Sync]   Needs story sync: ${versionCheck.needsStorySync}, Needs asset sync: ${versionCheck.needsAssetSync}`);

      // Phase 1.5: Validate and repair corrupted cached assets before sync
      log.info('[Content Sync] Step 2/4: Validating cached assets for corruption...');
      onProgress?.({ phase: 'checking', progress: 10, message: 'Validating cached assets...' });
      let corruptedAssetPaths: string[] = [];
      try {
        const validationResult = await CacheManager.validateAllAssets();
        if (validationResult.corruptedAssets.length > 0) {
          corruptedAssetPaths = validationResult.corruptedAssets;
          log.warn(`[Content Sync]   WARNING: Found ${corruptedAssetPaths.length} corrupted/missing assets, will re-download`);
          // Note: We don't remove them here - we'll download them below
        } else {
          log.info('[Content Sync]   All cached assets are valid');
        }
      } catch (validationError) {
        log.warn('[Content Sync]   WARNING: Asset validation failed, continuing with sync:', validationError);
        // Don't fail sync due to validation errors
      }

      // Phase 2: Sync stories and their assets atomically
      const hasCorruptedAssets = corruptedAssetPaths.length > 0;
      const needsSync = versionCheck.needsStorySync || versionCheck.needsAssetSync || hasCorruptedAssets;
      if (needsSync) {
        if (hasCorruptedAssets && !versionCheck.needsStorySync) {
          log.info('[Content Sync] Step 3/4: Re-downloading missing/corrupted assets...');
        } else {
          log.info('[Content Sync] Step 3/4: Syncing content from server...');
        }
        onProgress?.({ phase: 'syncing-stories', progress: 25, message: 'Syncing content...' });

        try {
          // First, do the normal story sync
          const syncResult = await this.syncStoriesWithAssets(versionCheck, onProgress);
          result.updatedStories = syncResult.storiesUpdated;
          result.updatedAssets = syncResult.assetsDownloaded;
          result.errors.push(...syncResult.errors);

          // Then, download any corrupted/missing assets that weren't covered by story sync
          if (corruptedAssetPaths.length > 0) {
            const totalMissing = corruptedAssetPaths.length;
            log.info(`[Content Sync]   Downloading ${totalMissing} corrupted/missing assets...`);
            onProgress?.({ phase: 'syncing-assets', progress: 75, message: `Downloading ${totalMissing} missing assets...` });

            let downloadedCount = 0;
            let skippedCount = 0;

            for (let i = 0; i < corruptedAssetPaths.length; i++) {
              const assetPath = corruptedAssetPaths[i];
              const assetNum = i + 1;

              try {
                // Check if the asset is already downloaded (story sync may have covered it)
                const hasAsset = await CacheManager.hasAsset(assetPath);
                if (hasAsset) {
                  log.debug(`[Content Sync]   [${assetNum}/${totalMissing}] Already downloaded: ${assetPath}`);
                  skippedCount++;
                  continue;
                }

                // Convert to GCS path and download
                const gcsPath = this.toGcsPath(assetPath);
                const assetName = gcsPath.split('/').pop() || gcsPath;
                log.info(`[Content Sync]   [${assetNum}/${totalMissing}] Downloading: ${assetName}`);

                // Update progress
                const progressPercent = 75 + Math.floor((assetNum / totalMissing) * 20);
                onProgress?.({
                  phase: 'syncing-assets',
                  progress: progressPercent,
                  message: `Downloading missing assets (${assetNum}/${totalMissing})...`
                });

                await this.downloadAssetWithRetry(gcsPath);
                downloadedCount++;
                result.updatedAssets++;
                log.info(`[Content Sync]   [${assetNum}/${totalMissing}] ✓ Downloaded: ${assetName}`);
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                log.warn(`[Content Sync]   [${assetNum}/${totalMissing}] ✗ Failed: ${assetPath} - ${errorMsg}`);
                result.errors.push(`Failed to download ${assetPath}: ${errorMsg}`);
              }
            }

            log.info(`[Content Sync]   Missing assets summary: ${downloadedCount} downloaded, ${skippedCount} already cached, ${result.errors.length} failed`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Content sync failed';
          result.errors.push(errorMsg);
          log.error('[Content Sync]   ERROR: Content sync failed:', error);
        }
      } else {
        log.info('[Content Sync] Step 3/4: No sync needed - content is up to date');
      }

      // Update local version only if sync was successful
      if (result.errors.length === 0 && versionCheck.serverVersion) {
        log.info('[Content Sync] Step 4/4: Saving updated version to local storage...');
        await VersionManager.updateLocalVersion({
          stories: versionCheck.serverVersion.stories,
          assets: versionCheck.serverVersion.assets,
        });
        log.info(`[Content Sync]   Saved version: stories=${versionCheck.serverVersion.stories}, assets=${versionCheck.serverVersion.assets}`);
      }

      result.success = result.errors.length === 0;
      onProgress?.({ phase: 'complete', progress: 100, message: 'Sync complete' });

      const syncDuration = ((Date.now() - syncStartTime) / 1000).toFixed(2);
      log.info('[Content Sync] ========== SYNC COMPLETE ==========');
      log.info(`[Content Sync] Duration: ${syncDuration}s`);
      log.info(`[Content Sync] Stories updated: ${result.updatedStories}`);
      log.info(`[Content Sync] Assets downloaded: ${result.updatedAssets}`);
      log.info(`[Content Sync] Errors: ${result.errors.length}`);
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Sync failed';
      result.success = false;
      result.errors.push(errorMsg);
      const syncDuration = ((Date.now() - syncStartTime) / 1000).toFixed(2);
      log.error('[Content Sync] ========== SYNC FAILED ==========');
      log.error(`[Content Sync] Duration: ${syncDuration}s, Error: ${errorMsg}`);
      return result;
    }
  }

  /**
   * Convert a story asset path to a GCS-compatible path.
   * Backend sends paths like "assets/stories/story-1/cover.webp"
   * But the /api/assets/url endpoint expects "stories/story-1/cover.webp"
   * (the allowed prefixes are: stories/, audio/, images/, thumbnails/)
   */
  private static toGcsPath(path: string): string {
    const originalPath = path;
    // If path starts with "assets/", strip it
    if (path.startsWith('assets/')) {
      const gcsPath = path.substring(7); // Remove "assets/" prefix
      log.debug(`[Path Transform] "${originalPath}" -> "${gcsPath}"`);
      return gcsPath;
    }
    log.debug(`[Path Transform] "${originalPath}" (no transform needed)`);
    return path;
  }

  /**
   * Extract all asset paths from a story (cover, pages, audio)
   * Returns GCS-compatible paths (without "assets/" prefix)
   */
  private static getStoryAssetPaths(story: Story): string[] {
    const assets: string[] = [];

    log.debug(`[Asset Paths] Extracting assets from story "${story.id}":`);
    log.debug(`[Asset Paths]   Raw coverImage: ${typeof story.coverImage === 'string' ? story.coverImage : typeof story.coverImage}`);

    // Cover image
    if (story.coverImage && typeof story.coverImage === 'string' && !story.coverImage.startsWith('local:')) {
      const gcsPath = this.toGcsPath(story.coverImage);
      assets.push(gcsPath);
      log.debug(`[Asset Paths]   Cover -> ${gcsPath}`);
    }

    // Page images (backgroundImage, characterImage, interactiveElements)
    if (story.pages) {
      for (const page of story.pages) {
        if (page.backgroundImage && typeof page.backgroundImage === 'string' && !page.backgroundImage.startsWith('local:')) {
          const gcsPath = this.toGcsPath(page.backgroundImage);
          assets.push(gcsPath);
          log.debug(`[Asset Paths]   Page ${page.pageNumber} bg -> ${gcsPath}`);
        }
        if (page.characterImage && typeof page.characterImage === 'string' && !page.characterImage.startsWith('local:')) {
          const gcsPath = this.toGcsPath(page.characterImage);
          assets.push(gcsPath);
          log.debug(`[Asset Paths]   Page ${page.pageNumber} char -> ${gcsPath}`);
        }
        // Interactive element images (props that can be tapped to reveal)
        if (page.interactiveElements) {
          for (const element of page.interactiveElements) {
            if (element.image && typeof element.image === 'string' && !element.image.startsWith('local:')) {
              const gcsPath = this.toGcsPath(element.image);
              assets.push(gcsPath);
              log.debug(`[Asset Paths]   Page ${page.pageNumber} interactive "${element.id}" -> ${gcsPath}`);
            }
          }
        }
      }
    }

    log.info(`[Asset Paths] Story "${story.id}": ${assets.length} assets extracted`);
    if (assets.length > 0) {
      log.info(`[Asset Paths]   First asset: ${assets[0]}`);
    }

    return assets;
  }

  /**
   * Check if an error is retryable (network errors, timeouts, or 403 expired URLs)
   */
  private static isRetryableError(error: Error): { retryable: boolean; type: string } {
    const message = error.message.toLowerCase();

    // 403 errors - likely expired signed URL
    if (message.includes('403') || message.includes('forbidden') || message.includes('expired')) {
      return { retryable: true, type: '403/expired' };
    }

    // Network/connection errors
    if (message.includes('network') || message.includes('connection') ||
        message.includes('failed to fetch') || message.includes('fetch failed')) {
      return { retryable: true, type: 'network' };
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('aborted') ||
        error.name === 'AbortError') {
      return { retryable: true, type: 'timeout' };
    }

    // DNS/host resolution errors
    if (message.includes('dns') || message.includes('host') ||
        message.includes('enotfound') || message.includes('econnrefused')) {
      return { retryable: true, type: 'dns' };
    }

    // Server errors (5xx) - these are often transient
    if (message.includes('500') || message.includes('502') ||
        message.includes('503') || message.includes('504')) {
      return { retryable: true, type: 'server' };
    }

    return { retryable: false, type: 'permanent' };
  }

  /**
   * Download an asset with retry logic for transient errors
   * Retries on: 403 (expired URL), network errors, timeouts, server errors
   */
  private static async downloadAssetWithRetry(
    assetPath: string,
    maxRetries: number = 2
  ): Promise<void> {
    let lastError: Error | null = null;
    const assetName = assetPath.split('/').pop() || assetPath;
    const apiUrl = `/api/assets/url?path=${encodeURIComponent(assetPath)}`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt === 0) {
          log.info(`[Asset Download] Downloading: ${assetName}`);
          log.info(`[Asset Download]   Full path: ${assetPath}`);
          log.info(`[Asset Download]   API URL: ${apiUrl}`);
        }

        // Request signed URL for this asset (GET with query param to match Gateway API)
        const assetResponse = await ApiClient.request<{ signedUrl: string }>(apiUrl);

        log.debug(`[Asset Download]   Signed URL received, downloading...`);

        await CacheManager.downloadAndCacheAsset(
          assetResponse.signedUrl,
          assetPath
        );

        if (attempt > 0) {
          log.info(`[Asset Download] Download succeeded on retry ${attempt}`);
        }
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const { retryable, type } = this.isRetryableError(lastError);

        log.warn(`[Asset Download] Error details: path="${assetPath}", error="${lastError.message}", retryable=${retryable}, type=${type}`);

        if (retryable && attempt < maxRetries) {
          // Exponential backoff: 500ms, 1000ms, 2000ms...
          const delayMs = 500 * Math.pow(2, attempt);
          log.warn(`[Asset Download] RETRY: Download failed (${type}), retrying in ${delayMs}ms [${attempt + 1}/${maxRetries}]`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }

        // Not retryable or out of retries
        log.error(`[Asset Download] FAILED: ${lastError.message}`);
        throw lastError;
      }
    }

    throw lastError || new Error('Download failed after retries');
  }

  /**
   * Sync stories and their assets atomically
   * Stories are only added to cache after their assets are downloaded
   * Supports checkpoint/resume if sync is interrupted
   */
  private static async syncStoriesWithAssets(
    versionCheck: VersionCheckResult,
    onProgress?: SyncProgressCallback
  ): Promise<{ storiesUpdated: number; assetsDownloaded: number; errors: string[] }> {
    const errors: string[] = [];
    let storiesUpdated = 0;
    let assetsDownloaded = 0;
    const completedStoryIds: string[] = [];

    const localVersion = versionCheck.localVersion?.stories || 0;
    const serverVersion = versionCheck.serverVersion?.stories || 0;
    const assetVersion = versionCheck.serverVersion?.assets || 0;

    // Check for existing checkpoint to resume
    const existingCheckpoint = await this.loadCheckpoint();

    // Get current checksums from cache
    const cachedStories = await CacheManager.getStories();
    const checksums: Record<string, string> = {};
    for (const story of cachedStories) {
      if (story.checksum) {
        checksums[story.id] = story.checksum;
      }
    }

    // Request delta from server
    log.info('[Story Sync] Fetching delta from server...');
    onProgress?.({ phase: 'syncing-stories', progress: 30, message: 'Fetching story updates...' });

    const response = await ApiClient.request<StorySyncResponse>('/api/stories/sync', {
      method: 'POST',
      body: JSON.stringify({
        clientVersion: localVersion,
        storyChecksums: checksums,
        lastSyncTimestamp: Date.now(),
      }),
    });

    log.info(`[Story Sync] Server response: ${response.stories?.length || 0} new/updated stories, ${Object.keys(response.storyChecksums || {}).length} total stories`);

    let newStories = response.stories || [];

    // Handle deletions first (safe operation)
    const serverStoryIds = new Set(Object.keys(response.storyChecksums || {}));
    const deletedIds = cachedStories
      .filter(s => !serverStoryIds.has(s.id))
      .map(s => s.id);

    if (deletedIds.length > 0) {
      log.info(`[Story Sync] Removing ${deletedIds.length} deleted stories from cache`);
      await CacheManager.removeStories(deletedIds);
    }

    // If resuming from checkpoint, filter out already-completed stories
    if (existingCheckpoint && existingCheckpoint.serverVersion === serverVersion) {
      const completedSet = new Set(existingCheckpoint.completedStoryIds);
      const originalCount = newStories.length;
      newStories = newStories.filter(s => !completedSet.has(s.id));
      if (newStories.length < originalCount) {
        log.info(`[Story Sync] Resuming from checkpoint: ${originalCount - newStories.length} already done, ${newStories.length} remaining`);
        completedStoryIds.push(...existingCheckpoint.completedStoryIds);
      }
    }

    if (newStories.length === 0) {
      log.info('[Story Sync] No new stories to sync - everything is up to date');
      await this.clearCheckpoint();
      return { storiesUpdated: 0, assetsDownloaded: 0, errors };
    }

    log.info(`[Story Sync] ${newStories.length} stories to sync with their assets`);

    // Check disk space before starting downloads
    // Estimate ~5MB per story as a rough approximation
    const estimatedBytes = newStories.length * 5 * 1024 * 1024;
    const estimatedMB = (estimatedBytes / 1024 / 1024).toFixed(1);
    log.info(`[Disk Space] Checking disk space (estimated need: ~${estimatedMB}MB)...`);
    try {
      await CacheManager.checkDiskSpaceForSync(estimatedBytes);
      log.info('[Disk Space] Sufficient disk space available');
    } catch (diskError) {
      const errorMsg = diskError instanceof Error ? diskError.message : 'Disk space check failed';
      errors.push(errorMsg);
      log.error(`[Disk Space] ERROR: ${errorMsg}`);
      return { storiesUpdated: 0, assetsDownloaded: 0, errors };
    }

    // Create initial checkpoint
    const checkpoint: SyncCheckpoint = {
      serverVersion,
      assetVersion,
      pendingStoryIds: newStories.map(s => s.id),
      completedStoryIds,
      storyChecksums: response.storyChecksums || {},
      createdAt: Date.now(),
      expiresAt: Date.now() + this.CHECKPOINT_EXPIRY_MS,
    };

    // Count total assets to download upfront for better progress reporting
    let totalAssets = 0;
    let totalAssetsDownloaded = 0;
    const storyAssetMap = new Map<string, string[]>();

    for (const story of newStories) {
      const assets = this.getStoryAssetPaths(story);
      storyAssetMap.set(story.id, assets);
      totalAssets += assets.length;
    }

    log.info(`[Story Sync] Total assets to check: ${totalAssets}`);

    // Process each story: download assets first, then add story to cache
    log.info('[Story Sync] Processing stories:');
    for (let i = 0; i < newStories.length; i++) {
      const story = newStories[i];

      // Show story progress with name
      const storyTitle = story.title || `Story ${i + 1}`;
      log.info(`[Story Sync] [${i + 1}/${newStories.length}] "${storyTitle}" (${story.id})`);

      // Report progress at start of each story
      const storyProgress = 30 + Math.floor((i / newStories.length) * 60);
      onProgress?.({
        phase: 'syncing-assets',
        progress: storyProgress,
        message: `Downloading "${storyTitle}"...`,
        detail: {
          currentItem: i + 1,
          totalItems: newStories.length,
          itemName: storyTitle,
        },
      });

      try {
        // Get all assets required for this story
        const requiredAssets = storyAssetMap.get(story.id) || [];
        log.info(`[Story Sync]   ${requiredAssets.length} assets required`);

        // Download all assets for this story
        let allAssetsDownloaded = true;
        let assetsSkipped = 0;

        for (const assetPath of requiredAssets) {
          const hasAsset = await CacheManager.hasAsset(assetPath);

          if (!hasAsset) {
            try {
              // Download with retry logic for expired signed URLs
              await this.downloadAssetWithRetry(assetPath);
              assetsDownloaded++;
              totalAssetsDownloaded++;

              // Update progress after each download
              const progressPercent = 30 + Math.floor((totalAssetsDownloaded / totalAssets) * 60);
              onProgress?.({
                phase: 'syncing-assets',
                progress: progressPercent,
                message: `Downloading ${totalAssetsDownloaded}/${totalAssets} assets...`,
                detail: {
                  currentItem: totalAssetsDownloaded,
                  totalItems: totalAssets,
                  itemName: storyTitle,
                },
              });
            } catch (assetError) {
              log.error(`[Story Sync]   Asset failed: ${assetPath.split('/').pop()}`);
              allAssetsDownloaded = false;
              // Continue trying other assets
            }
          } else {
            assetsSkipped++;
            totalAssetsDownloaded++;
          }
        }

        if (assetsSkipped > 0) {
          log.info(`[Story Sync]   ${assetsSkipped} assets already cached (skipped)`);
        }

        // Only add story to cache if all assets are ready (or story has no remote assets)
        if (allAssetsDownloaded || requiredAssets.length === 0) {
          await CacheManager.updateStories([story]);
          storiesUpdated++;
          log.info('[Story Sync]   Story saved to cache');

          // Update checkpoint with completed story
          checkpoint.completedStoryIds.push(story.id);
          checkpoint.pendingStoryIds = checkpoint.pendingStoryIds.filter(id => id !== story.id);
          await this.saveCheckpoint(checkpoint);
        } else {
          errors.push(`Story ${story.id}: Some assets failed to download`);
          log.warn('[Story Sync]   WARNING: Skipped - not all assets downloaded');
        }

      } catch (storyError) {
        const errorMsg = `Story ${story.id} sync failed: ${storyError instanceof Error ? storyError.message : 'Unknown error'}`;
        errors.push(errorMsg);
        log.error(`[Story Sync]   ERROR: ${storyError instanceof Error ? storyError.message : 'Unknown error'}`);
      }
    }

    // Clear checkpoint on successful completion
    if (errors.length === 0) {
      log.info('[Checkpoint] Clearing sync checkpoint (all complete)');
      await this.clearCheckpoint();
    } else {
      log.warn(`[Checkpoint] Keeping checkpoint (${errors.length} errors, can resume later)`);
    }

    return { storiesUpdated, assetsDownloaded, errors };
  }

  /**
   * Quick check if sync is needed (without full sync)
   */
  static async isSyncNeeded(): Promise<boolean> {
    const versionCheck = await VersionManager.checkVersions();
    return versionCheck.needsStorySync || versionCheck.needsAssetSync;
  }

  /**
   * Get stories from cache (display method - no network)
   */
  static async getStories(): Promise<Story[]> {
    return CacheManager.getStories();
  }

  /**
   * Get a single story from cache (display method - no network)
   */
  static async getStory(storyId: string): Promise<Story | null> {
    return CacheManager.getStory(storyId);
  }

  /**
   * Get asset URI from cache (display method - no network)
   */
  static async getAssetUri(assetPath: string): Promise<string | null> {
    return CacheManager.getAssetUri(assetPath);
  }

  /**
   * Force a full sync (clears local version to trigger full download)
   */
  static async forceSync(onProgress?: SyncProgressCallback): Promise<SyncResult> {
    await VersionManager.clearLocalVersion();
    return this.sync(onProgress);
  }

  /**
   * Get sync status
   */
  static async getSyncStatus(): Promise<{
    hasLocalData: boolean;
    storyCount: number;
    lastSyncTime: string | null;
    needsSync: boolean;
  }> {
    const stats = await CacheManager.getStats();
    const version = await VersionManager.getLocalVersion();
    const needsSync = await this.isSyncNeeded();

    return {
      hasLocalData: stats.storyCount > 0,
      storyCount: stats.storyCount,
      lastSyncTime: version?.lastUpdated || null,
      needsSync,
    };
  }
}

