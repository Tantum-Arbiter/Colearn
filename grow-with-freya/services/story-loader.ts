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
 */
export class StoryLoader {

  /**
   * Get all available stories
   * Merges local stories with CMS-synced stories
   */
  static async getStories(): Promise<Story[]> {
    try {
      // Start with local stories (offline-first)
      const localStories = [...ALL_STORIES];

      // Try to get CMS stories from sync cache
      const cmsStories = await StorySyncService.getLocalStories();

      if (cmsStories && cmsStories.length > 0) {
        console.log(`📚 [StoryLoader] Merging ${localStories.length} local + ${cmsStories.length} CMS stories`);

        // Merge: CMS stories can override local stories with same ID
        const localIds = new Set(localStories.map(s => s.id));
        const uniqueCmsStories = cmsStories.filter(s => !localIds.has(s.id));

        const allStories = [...localStories, ...uniqueCmsStories];
        console.log(`✅ [StoryLoader] Total stories: ${allStories.length}`);
        return allStories;
      }

      // No CMS stories yet - return local only
      console.log(`📦 [StoryLoader] Using ${localStories.length} local stories (offline mode)`);
      return localStories;
    } catch (error) {
      console.error('❌ [StoryLoader] Error loading stories:', error);
      console.log('⚠️ [StoryLoader] Falling back to local stories');
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
   * Force refresh stories from backend
   */
  static async refreshStories(): Promise<Story[]> {
    try {
      console.log('🔄 [StoryLoader] Forcing story refresh...');
      const stories = await StorySyncService.syncStories();
      console.log(`✅ [StoryLoader] Refreshed ${stories.length} stories`);
      return stories;
    } catch (error) {
      console.error('❌ [StoryLoader] Refresh failed:', error);
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
      console.error('❌ [StoryLoader] Error loading CMS stories:', error);
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

