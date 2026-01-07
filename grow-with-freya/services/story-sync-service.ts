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
      console.error('[StorySyncService] Error reading local sync metadata:', error);
      return null;
    }
  }

  /**
   * Save sync metadata to local storage
   */
  static async saveSyncMetadata(metadata: StorySyncMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
      console.log('[StorySyncService] Sync metadata saved:', {
        version: metadata.version,
        stories: metadata.stories.length,
        lastSync: new Date(metadata.lastSyncTimestamp).toISOString()
      });
    } catch (error) {
      console.error('[StorySyncService] Error saving sync metadata:', error);
      throw error;
    }
  }

  /**
   * Get current content version from backend
   */
  static async getContentVersion(): Promise<ContentVersion> {
    try {
      console.log('[StorySyncService] Fetching content version from backend...');
      const response = await ApiClient.request<ContentVersion>('/api/stories/version');
      console.log('[StorySyncService] Content version:', response);
      return response;
    } catch (error) {
      console.error('[StorySyncService] Error fetching content version:', error);
      throw error;
    }
  }

  /**
   * Check if sync is needed by comparing local and server versions
   */
  static async isSyncNeeded(): Promise<boolean> {
    try {
      const localMetadata = await this.getLocalSyncMetadata();
      
      // If no local data, sync is needed
      if (!localMetadata) {
        console.log('[StorySyncService] No local data, sync needed');
        return true;
      }

      // Get server version
      const serverVersion = await this.getContentVersion();

      // Compare versions
      const syncNeeded = serverVersion.version > localMetadata.version;

      console.log('[StorySyncService] Sync check:', {
        localVersion: localMetadata.version,
        serverVersion: serverVersion.version,
        syncNeeded
      });

      return syncNeeded;
    } catch (error) {
      console.error('[StorySyncService] Error checking sync status:', error);
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
      console.log('[CMS-SYNC] ========================================');
      console.log('[CMS-SYNC] Starting CMS story sync...');

      // Get local metadata
      const localMetadata = await this.getLocalSyncMetadata();
      const isInitialSync = !localMetadata || localMetadata.version === 0;

      // Build sync request
      const syncRequest: StorySyncRequest = {
        clientVersion: localMetadata?.version || 0,
        storyChecksums: localMetadata?.storyChecksums || {},
        lastSyncTimestamp: localMetadata?.lastSyncTimestamp || 0
      };

      // Calculate request payload size (use length as fallback for test environments)
      const requestPayload = JSON.stringify(syncRequest);
      const requestSize = typeof TextEncoder !== 'undefined'
        ? new TextEncoder().encode(requestPayload).length
        : requestPayload.length;

      console.log('[CMS-SYNC] ----------------------------------------');
      console.log('[CMS-SYNC] SYNC TYPE:', isInitialSync ? '🆕 INITIAL SYNC (full download)' : '🔄 DELTA SYNC (changes only)');
      console.log('[CMS-SYNC] ----------------------------------------');
      console.log('[CMS-SYNC] Request payload:', {
        clientVersion: syncRequest.clientVersion,
        localStoriesCount: Object.keys(syncRequest.storyChecksums).length,
        requestPayloadSize: this.formatBytes(requestSize),
      });
      if (!isInitialSync) {
        console.log('[CMS-SYNC] Local story checksums sent for delta comparison:');
        Object.entries(syncRequest.storyChecksums).forEach(([id, checksum]) => {
          console.log(`[CMS-SYNC]   - ${id}: ${checksum.substring(0, 16)}...`);
        });
      }

      // Call sync endpoint
      const syncResponse = await ApiClient.request<StorySyncResponse>('/api/stories/sync', {
        method: 'POST',
        body: requestPayload
      });

      // Calculate response payload size (use length as fallback for test environments)
      const responsePayload = JSON.stringify(syncResponse);
      const responseSize = typeof TextEncoder !== 'undefined'
        ? new TextEncoder().encode(responsePayload).length
        : responsePayload.length;
      const storiesPayloadSize = JSON.stringify(syncResponse.stories || []);
      const storiesSize = typeof TextEncoder !== 'undefined'
        ? new TextEncoder().encode(storiesPayloadSize).length
        : storiesPayloadSize.length;

      console.log('[CMS-SYNC] ----------------------------------------');
      console.log('[CMS-SYNC] RESPONSE PAYLOAD SIZE:');
      console.log(`[CMS-SYNC]   📦 Total response: ${this.formatBytes(responseSize)}`);
      console.log(`[CMS-SYNC]   📚 Stories data: ${this.formatBytes(storiesSize)}`);
      console.log(`[CMS-SYNC]   📊 Metadata overhead: ${this.formatBytes(responseSize - storiesSize)}`);
      console.log('[CMS-SYNC] ----------------------------------------');

      // Log delta sync details
      if (!isInitialSync) {
        const unchangedCount = syncResponse.totalStories - syncResponse.updatedStories;
        const savedBytes = unchangedCount > 0 ?
          Math.round(storiesSize * (unchangedCount / Math.max(syncResponse.updatedStories, 1))) : 0;

        console.log('[CMS-SYNC] DELTA SYNC RESULTS:');
        console.log(`[CMS-SYNC]   ✅ Stories unchanged (skipped): ${unchangedCount}`);
        console.log(`[CMS-SYNC]   📝 Stories updated/new (downloaded): ${syncResponse.updatedStories}`);
        console.log(`[CMS-SYNC]   💾 Estimated bandwidth saved: ~${this.formatBytes(savedBytes)}`);
        console.log('[CMS-SYNC] ----------------------------------------');
      }

      console.log('[CMS-SYNC] Sync response summary:', {
        serverVersion: syncResponse.serverVersion,
        updatedStories: syncResponse.updatedStories,
        totalStories: syncResponse.totalStories,
        lastUpdated: new Date(syncResponse.lastUpdated).toISOString()
      });

      // Resolve asset URLs for all stories
      if (syncResponse.stories && syncResponse.stories.length > 0) {
        syncResponse.stories = syncResponse.stories.map(story => ({
          ...story,
          coverImage: resolveAssetUrl(story.coverImage as string | undefined),
          pages: story.pages?.map(page => ({
            ...page,
            backgroundImage: resolveAssetUrl(page.backgroundImage),
            characterImage: resolveAssetUrl(page.characterImage),
            interactiveElements: page.interactiveElements?.map(element => ({
              ...element,
              image: resolveAssetUrl(element.image) || element.image,
            })),
          }))
        }));

        // Invalidate cached images for updated stories
        // This ensures fresh images are downloaded if content changed on the server
        const existingStories = localMetadata?.stories || [];

        for (const story of syncResponse.stories) {
          // Get the old version of this story to find cached image URLs
          const oldStory = existingStories.find(s => s.id === story.id);
          if (oldStory) {
            const urlsToInvalidate = this.extractImageUrls(oldStory);
            if (urlsToInvalidate.length > 0) {
              console.log(`[CMS-SYNC] Invalidating ${urlsToInvalidate.length} cached images for updated story: ${story.id}`);
              await AuthenticatedImageService.invalidateCacheForUrls(urlsToInvalidate);
            }
          }
        }
      }

      // Log each story received from CMS
      if (syncResponse.stories && syncResponse.stories.length > 0) {
        console.log('[CMS-SYNC] Stories received from CMS:');
        syncResponse.stories.forEach((story, index) => {
          const pageCount = story.pages?.length || 0;
          console.log(`[CMS-SYNC]   ${index + 1}. ${story.id}`);
          console.log(`[CMS-SYNC]      Title: "${story.title}"`);
          console.log(`[CMS-SYNC]      Category: ${story.category}`);
          console.log(`[CMS-SYNC]      Pages: ${pageCount}`);
          console.log(`[CMS-SYNC]      Cover Image: ${story.coverImage ? '✓ Present' : '✗ Missing'}`);
          if (story.coverImage) {
            console.log(`[CMS-SYNC]        URL: ${story.coverImage}`);
          }

          // Log page images
          if (story.pages && story.pages.length > 0) {
            console.log(`[CMS-SYNC]      Page Images:`);
            story.pages.forEach(page => {
              const hasBackground = page.backgroundImage ? '✓' : '✗';
              const hasCharacter = page.characterImage ? '✓' : '✗';
              console.log(`[CMS-SYNC]        Page ${page.pageNumber}: Background ${hasBackground}, Character ${hasCharacter}`);
              if (page.backgroundImage) {
                console.log(`[CMS-SYNC]          BG: ${page.backgroundImage}`);
              }
              if (page.characterImage) {
                console.log(`[CMS-SYNC]          Char: ${page.characterImage}`);
              }
            });
          }
        });
      } else {
        console.log('[CMS-SYNC] No new stories to download (already up to date)');
      }

      // Merge updated stories with existing stories
      const existingStories = localMetadata?.stories || [];
      const updatedStoryIds = new Set(syncResponse.stories.map(s => s.id));

      // Keep existing stories that weren't updated
      const unchangedStories = existingStories.filter(s => !updatedStoryIds.has(s.id));

      // Combine unchanged + updated stories
      const allStories = [...unchangedStories, ...syncResponse.stories];

      // Save updated metadata
      const newMetadata: StorySyncMetadata = {
        version: syncResponse.serverVersion,
        lastSyncTimestamp: Date.now(),
        storyChecksums: syncResponse.storyChecksums,
        stories: allStories
      };

      await this.saveSyncMetadata(newMetadata);

      // Calculate final storage size (use length as fallback for test environments)
      const storedDataString = JSON.stringify(newMetadata);
      const storedDataSize = typeof TextEncoder !== 'undefined'
        ? new TextEncoder().encode(storedDataString).length
        : storedDataString.length;

      console.log('[CMS-SYNC] ----------------------------------------');
      console.log('[CMS-SYNC] SYNC COMPLETE SUMMARY:');
      console.log(`[CMS-SYNC]   📚 Total stories now cached: ${allStories.length}`);
      console.log(`[CMS-SYNC]   🆕 New/updated stories this sync: ${syncResponse.stories.length}`);
      console.log(`[CMS-SYNC]   ♻️  Unchanged stories retained: ${unchangedStories.length}`);
      console.log(`[CMS-SYNC]   💾 Local storage size: ${this.formatBytes(storedDataSize)}`);
      console.log(`[CMS-SYNC]   🔢 Content version: ${syncResponse.serverVersion}`);
      console.log('[CMS-SYNC] ----------------------------------------');
      console.log('[CMS-SYNC] Cached story IDs:', allStories.map(s => s.id));
      console.log('[CMS-SYNC] ========================================');

      return allStories;
    } catch (error) {
      console.error('[CMS-SYNC] Sync failed:', error);
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
        backgroundImage: resolveAssetUrl(page.backgroundImage),
        characterImage: resolveAssetUrl(page.characterImage),
        interactiveElements: page.interactiveElements?.map(element => ({
          ...element,
          image: resolveAssetUrl(element.image) || element.image,
        })),
      }))
    }));
  }

  /**
   * Prefetch stories on login
   * Performs initial sync or delta-sync based on local state
   */
  static async prefetchStories(): Promise<Story[]> {
    try {
      console.log('[StorySyncService] Prefetching stories...');

      const syncNeeded = await this.isSyncNeeded();

      if (syncNeeded) {
        console.log('[StorySyncService] Sync needed, fetching updates...');
        return await this.syncStories();
      } else {
        console.log('[StorySyncService] Stories up to date, using local cache');
        const metadata = await this.getLocalSyncMetadata();
        const stories = metadata?.stories || [];
        // Ensure all asset URLs are resolved
        return this.resolveStoriesAssetUrls(stories);
      }
    } catch (error) {
      console.error('[StorySyncService] Prefetch failed:', error);

      // Fallback to local cache if available
      const metadata = await this.getLocalSyncMetadata();
      if (metadata?.stories) {
        console.log('[StorySyncService] Using cached stories due to sync error');
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
      console.error('[StorySyncService] Error getting local stories:', error);
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
      console.log('[StorySyncService] Cache cleared');
    } catch (error) {
      console.error('[StorySyncService] Error clearing cache:', error);
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
   * Prefetch all story cover images to ensure they're cached before showing the story selection screen
   * This should be called after prefetchStories() to ensure smooth UX
   * Returns a map of storyId -> cachedCoverPath for instant display
   */
  static async prefetchCoverImages(): Promise<Map<string, string>> {
    const cachedPaths = new Map<string, string>();

    try {
      console.log('[StorySyncService] Prefetching cover images for instant display...');

      const stories = await this.getLocalStories();
      const storiesWithCovers = stories.filter(s => typeof s.coverImage === 'string' && s.coverImage);

      console.log(`[StorySyncService] Found ${storiesWithCovers.length} CMS stories with cover images to cache`);

      // DEBUG: Log all cover image URLs to check if they're unique
      storiesWithCovers.forEach((story, idx) => {
        console.log(`[StorySyncService] Story ${idx + 1}: ${story.id}`);
        console.log(`[StorySyncService]   coverImage URL: "${story.coverImage}"`);
      });

      // Download all cover images in parallel
      const downloadPromises = storiesWithCovers.map(async (story) => {
        try {
          const url = story.coverImage as string;
          const cachedPath = await AuthenticatedImageService.getImageUri(url);
          if (cachedPath) {
            cachedPaths.set(story.id, cachedPath);
            console.log(`[StorySyncService] ✓ Cover cached: ${story.id} -> ${cachedPath.split('/').pop()}`);
            return true;
          }
          return false;
        } catch (error) {
          console.warn(`[StorySyncService] ✗ Failed to cache cover: ${story.id}`, error);
          return false;
        }
      });

      const results = await Promise.all(downloadPromises);
      const successCount = results.filter(Boolean).length;

      console.log(`[StorySyncService] Cover image prefetch complete: ${successCount}/${storiesWithCovers.length} successful`);

      // Store the cached paths for quick lookup
      await this.saveCachedCoverPaths(cachedPaths);

      return cachedPaths;
    } catch (error) {
      console.error('[StorySyncService] Cover image prefetch failed:', error);
      return cachedPaths;
    }
  }

  /**
   * Save cached cover paths to AsyncStorage for instant access
   */
  private static async saveCachedCoverPaths(paths: Map<string, string>): Promise<void> {
    try {
      const obj = Object.fromEntries(paths);
      await AsyncStorage.setItem('cached_cover_paths', JSON.stringify(obj));
      console.log(`[StorySyncService] Saved ${paths.size} cached cover paths`);
    } catch (error) {
      console.error('[StorySyncService] Error saving cached cover paths:', error);
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
      console.warn('[StorySyncService] Error getting cached cover path:', error);
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
      console.warn('[StorySyncService] Error getting all cached cover paths:', error);
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
