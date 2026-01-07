import { Story } from '@/types/story';
import { StorySyncService } from './story-sync-service';
import { ALL_STORIES, getAvailableStories } from '@/data/stories';

/**
 * Story loader that merges local stories with CMS-synced stories
 *
 * Strategy:
 * - Local stories (from stories.ts): Always available, work offline
 * - CMS stories: Downloaded after login, premium content
 * - Merged result: Local stories + CMS stories (no duplicates)
 * - Memory cache: Keeps stories in memory for instant access after first load
 */
export class StoryLoader {
  // In-memory cache for instant story access after first load
  // Prevents stories from "disappearing" when navigating between screens
  private static cachedStories: Story[] | null = null;
  private static isLoading: boolean = false;
  private static loadPromise: Promise<Story[]> | null = null;

  /**
   * Get cached stories synchronously if available
   * Returns null if no cache exists yet
   * Use this for initial render to avoid blank state
   */
  static getCachedStories(): Story[] | null {
    return this.cachedStories;
  }

  /**
   * Get stories with instant return if cached
   * First call loads async and caches; subsequent calls return cached instantly
   */
  static async getStories(): Promise<Story[]> {
    // Return cached stories immediately if available
    if (this.cachedStories) {
      console.log(`[CMS-LOADER] ⚡ Returning ${this.cachedStories.length} cached stories instantly`);
      return this.cachedStories;
    }

    // If already loading, wait for the existing promise to avoid duplicate loads
    if (this.isLoading && this.loadPromise) {
      console.log(`[CMS-LOADER] Waiting for existing load to complete...`);
      return this.loadPromise;
    }

    // Start loading
    this.isLoading = true;
    this.loadPromise = this.loadStoriesInternal();

    try {
      const stories = await this.loadPromise;
      this.cachedStories = stories;
      console.log(`[CMS-LOADER] ✓ Cached ${stories.length} stories for instant access`);
      return stories;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Internal method to actually load and merge stories
   */
  private static async loadStoriesInternal(): Promise<Story[]> {
    try {
      // Start with local stories (offline-first)
      const localStories = [...ALL_STORIES];
      console.log(`[CMS-LOADER] Local bundled stories: ${localStories.length}`);

      // Try to get CMS stories from sync cache
      const cmsStories = await StorySyncService.getLocalStories();

      // Debug: Log CMS stories with image info
      if (cmsStories && cmsStories.length > 0) {
        console.log(`[CMS-LOADER] CMS stories loaded from cache: ${cmsStories.length}`);
        cmsStories.forEach((story, index) => {
          const hasCover = story.coverImage ? '✓' : '✗';
          const pageCount = story.pages?.length || 0;
          console.log(`[CMS-LOADER]   ${index + 1}. ${story.id} - Cover: ${hasCover}, Pages: ${pageCount}`);
          if (story.coverImage) {
            console.log(`[CMS-LOADER]      Cover URL: ${story.coverImage}`);
          }
          if (story.pages && story.pages.length > 0) {
            story.pages.forEach(page => {
              // Log full URL for debugging
              console.log(`[CMS-LOADER]      Page ${page.pageNumber}: ${page.backgroundImage || 'NO_BG_IMAGE'}`);
            });
          }
        });
      }

      if (cmsStories && cmsStories.length > 0) {
        console.log(`[CMS-LOADER] CMS stories in cache: ${cmsStories.length}`);

        // Log each CMS story
        cmsStories.forEach((story, index) => {
          console.log(`[CMS-LOADER]   ${index + 1}. ${story.id} - "${story.title}" (${story.pages?.length || 0} pages)`);
        });

        // Merge: CMS stories can override local stories with same ID
        const localIds = new Set(localStories.map(s => s.id));
        const uniqueCmsStories = cmsStories.filter(s => !localIds.has(s.id));

        const allStories = [...localStories, ...uniqueCmsStories];
        console.log(`[CMS-LOADER] Merged: ${localStories.length} local + ${uniqueCmsStories.length} unique CMS = ${allStories.length} total`);
        return allStories;
      }

      // No CMS stories yet - return local only
      console.log(`[CMS-LOADER] No CMS stories in cache - using ${localStories.length} local stories (offline mode)`);
      return localStories;
    } catch (error) {
      console.error('[CMS-LOADER] Error loading stories:', error);
      console.log('[CMS-LOADER] Falling back to local stories');
      return ALL_STORIES;
    }
  }

  /**
   * Get a specific story by ID
   */
  static async getStoryById(storyId: string): Promise<Story | undefined> {
    const stories = await this.getStories();
    return stories.find(story => story.id === storyId);
  }

  /**
   * Get stories by category
   */
  static async getStoriesByCategory(category: string): Promise<Story[]> {
    const stories = await this.getStories();
    return stories.filter(story => story.category === category);
  }

  /**
   * Get available stories (non-premium or user has access)
   */
  static async getAvailableStories(): Promise<Story[]> {
    const stories = await this.getStories();
    return stories.filter(story => story.isAvailable);
  }

  /**
   * Check if stories are synced from backend
   */
  static async isSynced(): Promise<boolean> {
    const status = await StorySyncService.getSyncStatus();
    return status.hasLocalData;
  }

  /**
   * Invalidate the in-memory cache
   * Call this after sync completes to ensure fresh stories are loaded
   */
  static invalidateCache(): void {
    console.log('[StoryLoader] Invalidating story cache');
    this.cachedStories = null;
  }

  /**
   * Force refresh stories from backend
   * Also invalidates cache so next getStories() loads fresh
   */
  static async refreshStories(): Promise<Story[]> {
    try {
      console.log('[StoryLoader] Forcing story refresh...');
      this.invalidateCache();
      const stories = await StorySyncService.syncStories();
      // Update cache with fresh stories
      this.cachedStories = await this.loadStoriesInternal();
      console.log(`[StoryLoader] Refreshed ${this.cachedStories.length} stories`);
      return this.cachedStories;
    } catch (error) {
      console.error('[StoryLoader] Refresh failed:', error);
      throw error;
    }
  }

  /**
   * Get sync status information
   */
  static async getSyncStatus() {
    return await StorySyncService.getSyncStatus();
  }

  /**
   * Check if a story is local (vs CMS-only)
   */
  static isLocalStory(storyId: string): boolean {
    return ALL_STORIES.some(story => story.id === storyId);
  }

  /**
   * Get only local stories
   */
  static getLocalStories(): Story[] {
    return [...ALL_STORIES];
  }

  /**
   * Get only CMS stories (requires sync)
   */
  static async getCmsStories(): Promise<Story[]> {
    try {
      const cmsStories = await StorySyncService.getLocalStories();
      if (!cmsStories || cmsStories.length === 0) {
        return [];
      }

      // Filter out local stories
      const localIds = new Set(ALL_STORIES.map(s => s.id));
      return cmsStories.filter(s => !localIds.has(s.id));
    } catch (error) {
      console.error('[StoryLoader] Error loading CMS stories:', error);
      return [];
    }
  }

  /**
   * Get story counts
   */
  static async getStoryCounts(): Promise<{ local: number; cms: number; total: number }> {
    const local = ALL_STORIES.length;
    const cmsStories = await this.getCmsStories();
    const cms = cmsStories.length;
    return { local, cms, total: local + cms };
  }
}

