import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Story,
  StorySyncRequest,
  StorySyncResponse,
  StorySyncMetadata,
  ContentVersion
} from '../types/story';
import { ApiClient } from './api-client';
import Constants from 'expo-constants';
import { AuthenticatedImageService } from './authenticated-image-service';
import { Logger } from '../utils/logger';

const log = Logger.create('StorySyncService');

const STORAGE_KEY = 'story_sync_metadata';

const extra = Constants.expoConfig?.extra || {};
const GATEWAY_URL = extra.gatewayUrl || process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://localhost:8080';

/**
 * Convert relative asset paths to absolute URLs
 * If the path is already a full URL, return as-is
 * If the path is a number (require() result), return as-is for local images
 */
function resolveAssetUrl(path: string | number | undefined): string | number | undefined {
  if (path === undefined || path === null) return undefined;

  // If it's a number (require() result for local bundled images), return as-is
  if (typeof path === 'number') {
    return path;
  }

  // If it's already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // If it's a relative path, prepend the gateway URL
  if (path.startsWith('assets/')) {
    return `${GATEWAY_URL}/${path}`;
  }

  // For other paths, assume they're relative to the gateway
  return `${GATEWAY_URL}/${path}`;
}

/**
 * Service for syncing story metadata from backend with delta-sync
 * Visual assets (images, audio) remain in local asset packs
 */
export class StorySyncService {
  
  /**
   * Get locally stored sync metadata
   */
  static async getLocalSyncMetadata(): Promise<StorySyncMetadata | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) {
        return null;
      }
      return JSON.parse(data);
    } catch (error) {
      log.error('Error reading local sync metadata:', error);
      return null;
    }
  }

  /**
   * Save sync metadata to local storage
   */
  static async saveSyncMetadata(metadata: StorySyncMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
      log.debug('Sync metadata saved:', {
        version: metadata.version,
        stories: metadata.stories.length,
        lastSync: new Date(metadata.lastSyncTimestamp).toISOString()
      });
    } catch (error) {
      log.error('Error saving sync metadata:', error);
      throw error;
    }
  }

  /**
   * Get current content version from backend
   */
  static async getContentVersion(): Promise<ContentVersion> {
    try {
      log.debug('Fetching content version from backend...');
      const response = await ApiClient.request<ContentVersion>('/api/stories/version');
      log.debug('Content version:', response);
      return response;
    } catch (error) {
      log.error('Error fetching content version:', error);
      throw error;
    }
  }

  /**
   * Check if sync is needed by comparing local and server versions
   */
  static async isSyncNeeded(): Promise<boolean> {
    try {
      log.info('[User Journey Flow 4] Step 1: Checking if CMS sync is needed...');
      const localMetadata = await this.getLocalSyncMetadata();

      // If no local data, sync is needed
      if (!localMetadata) {
        log.info('[User Journey Flow 4] Step 2: No local data found, initial sync needed');
        return true;
      }
      log.info('[User Journey Flow 4] Step 2: Local data found, version=' + localMetadata.version + ', stories=' + (localMetadata.stories?.length || 0));

      // Get server version
      log.info('[User Journey Flow 4] Step 3: Fetching server content version...');
      const serverVersion = await this.getContentVersion();
      log.info('[User Journey Flow 4] Step 4: Server version=' + serverVersion.version + ', totalStories=' + serverVersion.totalStories);

      // Check 1: Version number increased (new content added)
      const versionIncreased = serverVersion.version > localMetadata.version;

      // Check 2: Story count changed (stories added or DELETED)
      const localStoryCount = localMetadata.stories?.length || 0;
      const serverStoryCount = serverVersion.totalStories || 0;
      const storyCountChanged = localStoryCount !== serverStoryCount;

      // Check 3: Local has stories that server doesn't (deletions)
      const serverStoryIds = new Set(Object.keys(serverVersion.storyChecksums || {}));
      const localStoryIds = Object.keys(localMetadata.storyChecksums || {});
      const deletedStories = localStoryIds.filter(id => !serverStoryIds.has(id));
      const hasDeletedStories = deletedStories.length > 0;

      const syncNeeded = versionIncreased || storyCountChanged || hasDeletedStories;

      const reason = versionIncreased ? 'version_increased' :
                storyCountChanged ? 'story_count_changed' :
                hasDeletedStories ? 'stories_deleted' : 'up_to_date';

      log.info('[User Journey Flow 4] Step 5: Sync check result - syncNeeded=' + syncNeeded + ', reason=' + reason);
      if (hasDeletedStories) {
        log.info('[User Journey Flow 4]   -> Deleted stories detected:', deletedStories);
      }

      return syncNeeded;
    } catch (error) {
      log.error('[User Journey Flow 4] FAILED: Error checking sync status:', error);
      // On error, assume sync is needed
      return true;
    }
  }

  /**
   * Helper to format bytes to human readable string
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Perform delta-sync with backend
   * Only downloads stories that have changed
   */
  static async syncStories(): Promise<Story[]> {
    try {
      const localMetadata = await this.getLocalSyncMetadata();
      const isInitialSync = !localMetadata || localMetadata.version === 0;

      log.info(`[User Journey Flow 4] Step 6: Starting ${isInitialSync ? 'INITIAL' : 'DELTA'} sync...`);
      log.info(`[User Journey Flow 4] Step 7: Building sync request with clientVersion=${localMetadata?.version || 0}, cachedStories=${Object.keys(localMetadata?.storyChecksums || {}).length}`);

      // Build sync request
      const syncRequest: StorySyncRequest = {
        clientVersion: localMetadata?.version || 0,
        storyChecksums: localMetadata?.storyChecksums || {},
        lastSyncTimestamp: localMetadata?.lastSyncTimestamp || 0
      };

      const requestPayload = JSON.stringify(syncRequest);

      // Call sync endpoint
      log.info('[User Journey Flow 4] Step 8: Calling backend POST /api/stories/sync...');
      const syncResponse = await ApiClient.request<StorySyncResponse>('/api/stories/sync', {
        method: 'POST',
        body: requestPayload
      });

      log.info(`[User Journey Flow 4] Step 9: Backend response - serverVersion=${syncResponse.serverVersion}, updatedStories=${syncResponse.updatedStories}, totalStories=${syncResponse.totalStories}`);

      // Resolve asset URLs for all stories
      if (syncResponse.stories && syncResponse.stories.length > 0) {
        syncResponse.stories = syncResponse.stories.map(story => ({
          ...story,
          coverImage: resolveAssetUrl(story.coverImage as string | undefined),
          pages: story.pages?.map(page => ({
            ...page,
            backgroundImage: resolveAssetUrl(page.backgroundImage) as string | undefined,
            characterImage: resolveAssetUrl(page.characterImage) as string | undefined,
            interactiveElements: page.interactiveElements?.map(element => {
              const resolvedImage = resolveAssetUrl(element.image);
              return {
                ...element,
                image: (resolvedImage !== undefined ? resolvedImage : element.image) as string | number,
              };
            }),
          }))
        })) as Story[];

        // Invalidate cached images for updated stories
        // This ensures fresh images are downloaded if content changed on the server
        const existingStories = localMetadata?.stories || [];

        for (const story of syncResponse.stories) {
          // Get the old version of this story to find cached image URLs
          const oldStory = existingStories.find(s => s.id === story.id);
          if (oldStory) {
            const urlsToInvalidate = this.extractImageUrls(oldStory);
            if (urlsToInvalidate.length > 0) {
              log.debug(`Invalidating ${urlsToInvalidate.length} cached images for: ${story.id}`);
              await AuthenticatedImageService.invalidateCacheForUrls(urlsToInvalidate);
            }
          }
        }
      }

      // Merge updated stories with existing stories
      const existingStories = localMetadata?.stories || [];
      const updatedStoryIds = new Set(syncResponse.stories.map(s => s.id));

      // Get set of story IDs that still exist on the server
      const serverStoryIds = new Set(Object.keys(syncResponse.storyChecksums || {}));

      // Keep existing stories that weren't updated AND still exist on the server
      // This handles deletions: if a story was deleted from CMS, it won't be in serverStoryIds
      const unchangedStories = existingStories.filter(s =>
        !updatedStoryIds.has(s.id) && serverStoryIds.has(s.id)
      );

      // Check for deleted stories
      const deletedStories = existingStories.filter(s => !serverStoryIds.has(s.id));
      if (deletedStories.length > 0) {
        log.info(`[User Journey Flow 4] Step 10: Detected ${deletedStories.length} DELETED stories:`, deletedStories.map(s => s.id));
      }

      // Combine unchanged + updated stories
      const allStories = [...unchangedStories, ...syncResponse.stories];

      // Save updated metadata
      const newMetadata: StorySyncMetadata = {
        version: syncResponse.serverVersion,
        lastSyncTimestamp: Date.now(),
        storyChecksums: syncResponse.storyChecksums,
        stories: allStories
      };

      log.info(`[User Journey Flow 4] Step 11: Saving updated metadata - version=${syncResponse.serverVersion}, stories=${allStories.length}`);
      await this.saveSyncMetadata(newMetadata);

      log.info(`[User Journey Flow 4] Step 12: Delta sync COMPLETE - cached ${allStories.length} stories, updated=${syncResponse.updatedStories}, deleted=${deletedStories.length}`);

      return allStories;
    } catch (error) {
      log.error('[User Journey Flow 4] FAILED: Sync error:', error);
      throw error;
    }
  }

  /**
   * Resolve asset URLs in stories
   * Ensures all image URLs are absolute, not relative
   */
  private static resolveStoriesAssetUrls(stories: Story[]): Story[] {
    return stories.map(story => ({
      ...story,
      coverImage: resolveAssetUrl(story.coverImage as string | undefined),
      pages: story.pages?.map(page => ({
        ...page,
        backgroundImage: resolveAssetUrl(page.backgroundImage) as string | undefined,
        characterImage: resolveAssetUrl(page.characterImage) as string | undefined,
        interactiveElements: page.interactiveElements?.map(element => {
          const resolvedImage = resolveAssetUrl(element.image);
          return {
            ...element,
            image: (resolvedImage !== undefined ? resolvedImage : element.image) as string | number,
          };
        }),
      }))
    })) as Story[];
  }

  /**
   * Prefetch stories on login
   * Performs initial sync or delta-sync based on local state
   */
  static async prefetchStories(): Promise<Story[]> {
    try {
      log.debug('Prefetching stories...');

      const syncNeeded = await this.isSyncNeeded();

      if (syncNeeded) {
        log.debug('Sync needed, fetching updates...');
        return await this.syncStories();
      } else {
        log.debug('Stories up to date, using local cache');
        const metadata = await this.getLocalSyncMetadata();
        const stories = metadata?.stories || [];
        // Ensure all asset URLs are resolved
        return this.resolveStoriesAssetUrls(stories);
      }
    } catch (error) {
      log.error('Prefetch failed:', error);

      // Fallback to local cache if available
      const metadata = await this.getLocalSyncMetadata();
      if (metadata?.stories) {
        log.warn('Using cached stories due to sync error');
        // Ensure all asset URLs are resolved
        return this.resolveStoriesAssetUrls(metadata.stories);
      }

      throw error;
    }
  }

  /**
   * Get locally cached stories
   * Returns empty array if no cache exists
   * Ensures all asset URLs are resolved to absolute URLs
   */
  static async getLocalStories(): Promise<Story[]> {
    try {
      const metadata = await this.getLocalSyncMetadata();
      const stories = metadata?.stories || [];
      // Ensure all asset URLs are resolved
      return this.resolveStoriesAssetUrls(stories);
    } catch (error) {
      log.error('Error getting local stories:', error);
      return [];
    }
  }

  /**
   * Clear local story cache
   * Useful for testing or forcing a full re-sync
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem('cached_cover_paths');
      log.debug('Cache cleared');
    } catch (error) {
      log.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Get sync status information
   */
  static async getSyncStatus(): Promise<{
    hasLocalData: boolean;
    localVersion: number;
    localStoryCount: number;
    lastSyncTimestamp: number;
    lastSyncDate: string | null;
  }> {
    const metadata = await this.getLocalSyncMetadata();

    return {
      hasLocalData: metadata !== null,
      localVersion: metadata?.version || 0,
      localStoryCount: metadata?.stories.length || 0,
      lastSyncTimestamp: metadata?.lastSyncTimestamp || 0,
      lastSyncDate: metadata?.lastSyncTimestamp
        ? new Date(metadata.lastSyncTimestamp).toISOString()
        : null
    };
  }

  /**
   * Result of prefetching cover images
   */
  static lastPrefetchRemovedStories = false;

  /**
   * Prefetch all story cover images to ensure they're cached before showing the story selection screen
   * This should be called after prefetchStories() to ensure smooth UX
   * Returns a map of storyId -> cachedCoverPath for instant display
   *
   * IMPORTANT: Stories whose covers fail to load are removed from local cache
   * This handles the case where a story was removed from CMS but still exists locally
   * Check StorySyncService.lastPrefetchRemovedStories to see if stories were removed
   */
  static async prefetchCoverImages(): Promise<Map<string, string>> {
    const cachedPaths = new Map<string, string>();
    const failedStoryIds: string[] = [];
    this.lastPrefetchRemovedStories = false;

    try {
      const stories = await this.getLocalStories();
      const storiesWithCovers = stories.filter(s => typeof s.coverImage === 'string' && s.coverImage);

      log.debug(`Prefetching ${storiesWithCovers.length} cover images...`);

      // Download all cover images in parallel
      const downloadPromises = storiesWithCovers.map(async (story) => {
        try {
          const url = story.coverImage as string;
          const cachedPath = await AuthenticatedImageService.getImageUri(url);
          if (cachedPath) {
            cachedPaths.set(story.id, cachedPath);
            return { storyId: story.id, success: true };
          }
          log.warn(`Cover not available: ${story.id}`);
          failedStoryIds.push(story.id);
          return { storyId: story.id, success: false };
        } catch (error) {
          log.warn(`Failed to cache cover: ${story.id}`, error);
          failedStoryIds.push(story.id);
          return { storyId: story.id, success: false };
        }
      });

      const results = await Promise.all(downloadPromises);
      const successCount = results.filter(r => r.success).length;

      if (failedStoryIds.length > 0) {
        log.info(`Cover prefetch: ${successCount}/${storiesWithCovers.length} cached, removing ${failedStoryIds.length} unavailable`);
        await this.removeStoriesFromCache(failedStoryIds);
        this.lastPrefetchRemovedStories = true;
      }

      // Store the cached paths for quick lookup
      await this.saveCachedCoverPaths(cachedPaths);

      return cachedPaths;
    } catch (error) {
      log.error('Cover image prefetch failed:', error);
      return cachedPaths;
    }
  }

  /**
   * Remove stories from local cache
   * Called when story assets are no longer available on the server
   */
  private static async removeStoriesFromCache(storyIds: string[]): Promise<void> {
    try {
      const metadata = await this.getLocalSyncMetadata();
      if (!metadata) return;

      const storyIdsSet = new Set(storyIds);
      const remainingStories = metadata.stories.filter(s => !storyIdsSet.has(s.id));

      // Update checksums to remove deleted stories
      const updatedChecksums = { ...metadata.storyChecksums };
      storyIds.forEach(id => delete updatedChecksums[id]);

      const updatedMetadata: StorySyncMetadata = {
        ...metadata,
        stories: remainingStories,
        storyChecksums: updatedChecksums,
      };

      await this.saveSyncMetadata(updatedMetadata);
      log.debug(`Removed ${storyIds.length} unavailable stories, ${remainingStories.length} remaining`);
    } catch (error) {
      log.error('Error removing stories from cache:', error);
    }
  }

  /**
   * Save cached cover paths to AsyncStorage for instant access
   */
  private static async saveCachedCoverPaths(paths: Map<string, string>): Promise<void> {
    try {
      const obj = Object.fromEntries(paths);
      await AsyncStorage.setItem('cached_cover_paths', JSON.stringify(obj));
    } catch (error) {
      log.error('Error saving cached cover paths:', error);
    }
  }

  /**
   * Get cached cover path for a story
   * Returns the local file path if cached, otherwise the remote URL
   */
  static async getCachedCoverPath(storyId: string, remoteUrl: string): Promise<string> {
    try {
      const data = await AsyncStorage.getItem('cached_cover_paths');
      if (data) {
        const paths = JSON.parse(data) as Record<string, string>;
        if (paths[storyId]) {
          // Verify the cached file still exists
          const FileSystem = await import('expo-file-system');
          const info = await FileSystem.getInfoAsync(paths[storyId]);
          if (info.exists) {
            return paths[storyId];
          }
        }
      }
    } catch (error) {
      log.warn('Error getting cached cover path:', error);
    }
    return remoteUrl;
  }

  /**
   * Get all cached cover paths
   */
  static async getAllCachedCoverPaths(): Promise<Record<string, string>> {
    try {
      const data = await AsyncStorage.getItem('cached_cover_paths');
      if (data) {
        return JSON.parse(data) as Record<string, string>;
      }
    } catch (error) {
      log.warn('Error getting all cached cover paths:', error);
    }
    return {};
  }

  /**
   * Extract all image URLs from a story
   * Used for cache invalidation when a story is updated
   */
  private static extractImageUrls(story: Story): string[] {
    const urls: string[] = [];

    // Cover image
    if (story.coverImage && typeof story.coverImage === 'string') {
      urls.push(story.coverImage);
    }

    // Page images
    if (story.pages) {
      for (const page of story.pages) {
        if (page.backgroundImage) {
          urls.push(page.backgroundImage);
        }
        if (page.characterImage) {
          urls.push(page.characterImage);
        }
        // Interactive element images (only string URLs, not require() numbers)
        if (page.interactiveElements) {
          for (const element of page.interactiveElements) {
            if (element.image && typeof element.image === 'string') {
              urls.push(element.image);
            }
          }
        }
      }
    }

    return urls;
  }
}
