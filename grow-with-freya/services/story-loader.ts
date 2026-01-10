import { Story } from '@/types/story';
import { StorySyncService } from './story-sync-service';
import { ALL_STORIES, getAvailableStories } from '@/data/stories';
import { Logger } from '@/utils/logger';

const log = Logger.create('StoryLoader');

/**
 * Story loader that uses CMS as the source of truth
 *
 * Strategy:
 * - CMS is the source of truth for what stories to display
 * - Once synced, only CMS stories are shown (stories deleted from CMS are removed)
 * - Bundled stories shown only when CMS has no stories (first launch, offline, or CMS empty)
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
      log.debug(`Returning ${this.cachedStories.length} cached stories instantly`);
      return this.cachedStories;
    }

    // If already loading, wait for the existing promise to avoid duplicate loads
    if (this.isLoading && this.loadPromise) {
      log.debug('Waiting for existing load to complete...');
      return this.loadPromise;
    }

    // Start loading
    this.isLoading = true;
    this.loadPromise = this.loadStoriesInternal();

    try {
      const stories = await this.loadPromise;
      this.cachedStories = stories;
      log.debug(`Cached ${stories.length} stories for instant access`);
      return stories;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Internal method to load stories
   *
   * Strategy:
   * - CMS is the source of truth for what stories to display
   * - If no CMS data yet (first launch before sync), show bundled stories as initial experience
   * - Once synced with actual stories, ONLY stories in the CMS are shown
   * - Stories deleted from CMS are removed from the app
   */
  private static async loadStoriesInternal(): Promise<Story[]> {
    try {
      // Check if we have synced with CMS and have stories
      const syncStatus = await StorySyncService.getSyncStatus();

      if (syncStatus.hasLocalData && syncStatus.localStoryCount > 0) {
        // We have synced and have stories - CMS is source of truth
        const cmsStories = await StorySyncService.getLocalStories();
        log.debug(`CMS stories (source of truth): ${cmsStories.length}`);
        return cmsStories;
      }

      // No CMS stories available (first launch, offline, or CMS is empty)
      // Show bundled stories as fallback
      const bundledStories = [...ALL_STORIES];
      log.debug(`No CMS stories - using ${bundledStories.length} bundled stories as fallback`);
      return bundledStories;
    } catch (error) {
      log.error('Error loading stories:', error);
      log.warn('Falling back to bundled stories');
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
    log.debug('Invalidating story cache');
    this.cachedStories = null;
  }

  /**
   * Force refresh stories from backend
   * Also invalidates cache so next getStories() loads fresh
   */
  static async refreshStories(): Promise<Story[]> {
    try {
      log.debug('Forcing story refresh...');
      this.invalidateCache();
      const stories = await StorySyncService.syncStories();
      // Update cache with fresh stories
      this.cachedStories = await this.loadStoriesInternal();
      log.debug(`Refreshed ${this.cachedStories.length} stories`);
      return this.cachedStories;
    } catch (error) {
      log.error('Refresh failed:', error);
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
      log.error('Error loading CMS stories:', error);
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

