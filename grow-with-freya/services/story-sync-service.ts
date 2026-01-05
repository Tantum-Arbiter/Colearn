import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Story, 
  StorySyncRequest, 
  StorySyncResponse, 
  StorySyncMetadata,
  ContentVersion 
} from '../types/story';
import { ApiClient } from './api-client';

const STORAGE_KEY = 'story_sync_metadata';

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
   * Perform delta-sync with backend
   * Only downloads stories that have changed
   */
  static async syncStories(): Promise<Story[]> {
    try {
      console.log('[CMS-SYNC] ========================================');
      console.log('[CMS-SYNC] Starting CMS story sync...');

      // Get local metadata
      const localMetadata = await this.getLocalSyncMetadata();

      // Build sync request
      const syncRequest: StorySyncRequest = {
        clientVersion: localMetadata?.version || 0,
        storyChecksums: localMetadata?.storyChecksums || {},
        lastSyncTimestamp: localMetadata?.lastSyncTimestamp || 0
      };

      console.log('[CMS-SYNC] Sync request:', {
        clientVersion: syncRequest.clientVersion,
        localStories: Object.keys(syncRequest.storyChecksums).length,
        cachedStoryIds: Object.keys(syncRequest.storyChecksums)
      });

      // Call sync endpoint
      const syncResponse = await ApiClient.request<StorySyncResponse>('/api/stories/sync', {
        method: 'POST',
        body: JSON.stringify(syncRequest)
      });

      console.log('[CMS-SYNC] Sync response received:', {
        serverVersion: syncResponse.serverVersion,
        updatedStories: syncResponse.updatedStories,
        totalStories: syncResponse.totalStories,
        lastUpdated: new Date(syncResponse.lastUpdated).toISOString()
      });

      // Log each story received from CMS
      if (syncResponse.stories && syncResponse.stories.length > 0) {
        console.log('[CMS-SYNC] Stories received from CMS:');
        syncResponse.stories.forEach((story, index) => {
          const pageCount = story.pages?.length || 0;
          console.log(`[CMS-SYNC]   ${index + 1}. ${story.id}`);
          console.log(`[CMS-SYNC]      Title: "${story.title}"`);
          console.log(`[CMS-SYNC]      Category: ${story.category}`);
          console.log(`[CMS-SYNC]      Pages: ${pageCount}`);
          console.log(`[CMS-SYNC]      Cover: ${story.coverImage}`);

          // Log page images
          if (story.pages) {
            story.pages.forEach(page => {
              console.log(`[CMS-SYNC]      Page ${page.pageNumber}: ${page.backgroundImage}`);
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

      console.log('[CMS-SYNC] Sync complete - saved to local storage:', {
        totalStories: allStories.length,
        newStories: syncResponse.stories.length,
        unchangedStories: unchangedStories.length,
        storyIds: allStories.map(s => s.id)
      });
      console.log('[CMS-SYNC] ========================================');

      return allStories;
    } catch (error) {
      console.error('[CMS-SYNC] Sync failed:', error);
      throw error;
    }
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
        return metadata?.stories || [];
      }
    } catch (error) {
      console.error('[StorySyncService] Prefetch failed:', error);

      // Fallback to local cache if available
      const metadata = await this.getLocalSyncMetadata();
      if (metadata?.stories) {
        console.log('[StorySyncService] Using cached stories due to sync error');
        return metadata.stories;
      }

      throw error;
    }
  }

  /**
   * Get locally cached stories
   * Returns empty array if no cache exists
   */
  static async getLocalStories(): Promise<Story[]> {
    try {
      const metadata = await this.getLocalSyncMetadata();
      return metadata?.stories || [];
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
}
