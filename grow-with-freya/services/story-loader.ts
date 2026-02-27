import { Story } from '@/types/story';
import { CacheManager } from './cache-manager';
import { StorySyncService } from './story-sync-service';
import { ALL_STORIES, getAvailableStories } from '@/data/stories';
import { Logger } from '@/utils/logger';

const log = Logger.create('StoryLoader');

export class StoryLoader {
  private static cachedStories: Story[] | null = null;
  private static isLoading: boolean = false;
  private static loadPromise: Promise<Story[]> | null = null;

  static getCachedStories(): Story[] | null {
    return this.cachedStories;
  }

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

  static async getStoryById(storyId: string): Promise<Story | undefined> {
    const stories = await this.getStories();
    return stories.find(story => story.id === storyId);
  }

  static async getStoriesByCategory(category: string): Promise<Story[]> {
    const stories = await this.getStories();
    return stories.filter(story => story.category === category);
  }

  static async getAvailableStories(): Promise<Story[]> {
    const stories = await this.getStories();
    return stories.filter(story => story.isAvailable);
  }

  static async isSynced(): Promise<boolean> {
    const status = await StorySyncService.getSyncStatus();
    return status.hasLocalData;
  }

  static invalidateCache(): void {
    log.debug('Invalidating story cache');
    this.cachedStories = null;
  }

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

  static async getSyncStatus() {
    return await StorySyncService.getSyncStatus();
  }

  static isLocalStory(storyId: string): boolean {
    return ALL_STORIES.some(story => story.id === storyId);
  }

  static getLocalStories(): Story[] {
    return [...ALL_STORIES];
  }

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

  static async getStoryCounts(): Promise<{ local: number; cms: number; total: number }> {
    const local = ALL_STORIES.length;
    const cmsStories = await this.getCmsStories();
    const cms = cmsStories.length;
    return { local, cms, total: local + cms };
  }

  // Keeps bundled assets (offline), takes CMS localized text
  private static mergeBundledWithCms(bundled: Story, cms: Story): Story {
    const merged: Story = { ...bundled };

    if (cms.localizedTitle) {
      merged.localizedTitle = cms.localizedTitle;
    }

    if (cms.localizedDescription) {
      merged.localizedDescription = cms.localizedDescription;
    }

    if (bundled.pages && cms.pages) {
      merged.pages = bundled.pages.map((bundledPage, index) => {
        const cmsPage = cms.pages?.find(p => p.id === bundledPage.id) || cms.pages?.[index];

        if (!cmsPage) {
          return bundledPage;
        }

        return {
          ...bundledPage,
          localizedText: cmsPage.localizedText || bundledPage.localizedText,
        };
      });
    }

    log.debug(`Merged story ${bundled.id}: bundled assets + CMS localization`);
    return merged;
  }
}

