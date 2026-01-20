import { Story } from '@/types/story';
import { CacheManager } from './cache-manager';
import { StorySyncService } from './story-sync-service';
import { ALL_STORIES, getAvailableStories } from '@/data/stories';
import { Logger } from '@/utils/logger';

const log = Logger.create('StoryLoader');

/**
 * Story loader that combines bundled and CMS stories
 *
 * Strategy:
 * - Bundled stories: Always available (offline-first, part of app bundle)
 * - CMS stories: Additional premium content synced from backend
 * - CMS-only stories deleted from CMS are automatically removed
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
   * Internal method to load and merge stories
   *
   * Strategy:
   * - Bundled stories are always available (offline-first)
   * - CMS stories add additional premium content
   * - CMS-only stories that are deleted from CMS are removed (handled by sync)
   */
  private static async loadStoriesInternal(): Promise<Story[]> {
    try {
      // Start with bundled stories (always available)
      const bundledStories = [...ALL_STORIES];
      const bundledIds = new Set(bundledStories.map(s => s.id));
      log.debug(`Bundled stories: ${bundledStories.length}`);

      // Get CMS stories from CacheManager with URLs resolved to local cached paths
      // This ensures images load from local cache instead of making network requests
      const cmsStories = await CacheManager.getStoriesWithResolvedUrls();

      if (cmsStories && cmsStories.length > 0) {
        // Create a map of CMS stories by ID for quick lookup
        const cmsStoriesMap = new Map(cmsStories.map(s => [s.id, s]));

        // Merge bundled stories with CMS versions - keep bundled assets but take CMS localization
        const updatedBundledStories = bundledStories.map(bundledStory => {
          const cmsVersion = cmsStoriesMap.get(bundledStory.id);
          if (cmsVersion) {
            log.debug(`Merging CMS localization into bundled story: ${bundledStory.id}`);
            return this.mergeBundledWithCms(bundledStory, cmsVersion);
          }
          return bundledStory;
        });

        // Find CMS-only stories (not in bundled) - these use resolved cached paths
        const cmsOnlyStories = cmsStories.filter(s => !bundledIds.has(s.id));

        // Combine: updated bundled stories + CMS-only stories
        const allStories = [...updatedBundledStories, ...cmsOnlyStories];
        log.debug(`Combined: ${updatedBundledStories.length} bundled (${cmsStories.filter(s => bundledIds.has(s.id)).length} merged) + ${cmsOnlyStories.length} CMS-only = ${allStories.length} total`);
        return allStories;
      }

      // No CMS data - return bundled only
      log.debug(`No CMS data - using ${bundledStories.length} bundled stories`);
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
      // Get stories from CacheManager with resolved URLs for display
      const cmsStories = await CacheManager.getStoriesWithResolvedUrls();
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

  /**
   * Merge bundled story with CMS version
   *
   * Strategy:
   * - Keep bundled assets (require() references work offline)
   * - Take localized text from CMS (more up-to-date translations)
   * - Take other metadata from CMS if available
   *
   * This ensures bundled stories always work with their local assets
   * while getting fresh translations from the CMS.
   */
  private static mergeBundledWithCms(bundled: Story, cms: Story): Story {
    // Start with bundled story as base (preserves require() asset references)
    const merged: Story = { ...bundled };

    // Take localized titles from CMS if available
    if (cms.localizedTitle) {
      merged.localizedTitle = cms.localizedTitle;
    }

    // Take localized description from CMS if available
    if (cms.localizedDescription) {
      merged.localizedDescription = cms.localizedDescription;
    }

    // Merge pages - keep bundled assets, take CMS localized text
    if (bundled.pages && cms.pages) {
      merged.pages = bundled.pages.map((bundledPage, index) => {
        const cmsPage = cms.pages?.find(p => p.id === bundledPage.id) || cms.pages?.[index];

        if (!cmsPage) {
          return bundledPage;
        }

        // Keep bundled page assets, merge CMS localized text
        return {
          ...bundledPage,
          // Take localized text from CMS
          localizedText: cmsPage.localizedText || bundledPage.localizedText,
          // Keep bundled asset references (backgroundImage, characterImage, etc.)
        };
      });
    }

    log.debug(`Merged story ${bundled.id}: bundled assets + CMS localization`);
    return merged;
  }
}

