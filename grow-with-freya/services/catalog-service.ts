import AsyncStorage from '@react-native-async-storage/async-storage';
import { CatalogEntry, StoryCategory } from '../types/story';
import { Logger } from '@/utils/logger';

const log = Logger.create('CatalogService');

const STORAGE_KEY = '@story_catalog';

export type CatalogSortField = 'title' | 'category';
export type CatalogSortOrder = 'asc' | 'desc';

export interface CatalogFilter {
  category?: StoryCategory;
  isFree?: boolean;
  isPremium?: boolean;
  isReferralReward?: boolean;
  searchText?: string;
}

/**
 * Manages the catalog of stories available for download.
 * The catalog is received from the delta sync response and persisted locally
 * so the browse/discovery UI can render without network.
 */
export class CatalogService {

  // Simple listener pattern so the UI can react to catalog updates
  private static listeners: Set<() => void> = new Set();

  /** Subscribe to catalog changes. Returns an unsubscribe function. */
  static onCatalogUpdated(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private static notifyListeners(): void {
    this.listeners.forEach(fn => { try { fn(); } catch {} });
  }

  /**
   * Replace the entire catalog with fresh data from a delta sync response.
   */
  static async updateCatalog(entries: CatalogEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      log.info(`Catalog updated with ${entries.length} entries`);
      this.notifyListeners();
    } catch (error) {
      log.error('Failed to save catalog:', error);
      throw error;
    }
  }

  /**
   * Get all catalog entries (raw, unfiltered).
   */
  static async getCatalog(): Promise<CatalogEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data) as CatalogEntry[];
    } catch (error) {
      log.error('Failed to read catalog:', error);
      return [];
    }
  }

  /**
   * Get filtered and optionally sorted catalog entries.
   */
  static async getFilteredCatalog(
    filter?: CatalogFilter,
    sort?: { field: CatalogSortField; order: CatalogSortOrder }
  ): Promise<CatalogEntry[]> {
    let entries = await this.getCatalog();

    if (filter) {
      entries = entries.filter(entry => {
        if (filter.category && entry.category !== filter.category) return false;
        if (filter.isFree !== undefined && entry.isFree !== filter.isFree) return false;
        if (filter.isPremium !== undefined && entry.isPremium !== filter.isPremium) return false;
        if (filter.isReferralReward !== undefined && entry.isReferralReward !== filter.isReferralReward) return false;
        if (filter.searchText) {
          const search = filter.searchText.toLowerCase();
          const titleMatch = entry.title.toLowerCase().includes(search);
          const descMatch = entry.description?.toLowerCase().includes(search) ?? false;
          if (!titleMatch && !descMatch) return false;
        }
        return true;
      });
    }

    if (sort) {
      entries.sort((a, b) => {
        const aVal = a[sort.field] || '';
        const bVal = b[sort.field] || '';
        const cmp = aVal.localeCompare(bVal);
        return sort.order === 'desc' ? -cmp : cmp;
      });
    }

    return entries;
  }

  /**
   * Get a single catalog entry by storyId.
   */
  static async getEntry(storyId: string): Promise<CatalogEntry | null> {
    const entries = await this.getCatalog();
    return entries.find(e => e.storyId === storyId) ?? null;
  }

  /**
   * Remove a story from the catalog (e.g. after it's been downloaded).
   * The story is now in the local cache and will appear in delta sync checksums.
   */
  static async removeEntry(storyId: string): Promise<void> {
    const entries = await this.getCatalog();
    const filtered = entries.filter(e => e.storyId !== storyId);
    if (filtered.length !== entries.length) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      log.debug(`Removed ${storyId} from catalog (${entries.length} → ${filtered.length})`);
    }
  }

  /**
   * Add a single entry to the catalog (e.g. when a story is deleted from cache).
   * If the storyId already exists, it's replaced.
   */
  static async addEntry(entry: CatalogEntry): Promise<void> {
    const entries = await this.getCatalog();
    const filtered = entries.filter(e => e.storyId !== entry.storyId);
    filtered.push(entry);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    log.debug(`Added ${entry.storyId} to catalog (now ${filtered.length} entries)`);
    this.notifyListeners();
  }

  /**
   * Get available categories from the current catalog.
   */
  static async getCategories(): Promise<StoryCategory[]> {
    const entries = await this.getCatalog();
    const categories = new Set(entries.map(e => e.category));
    return Array.from(categories);
  }

  /**
   * Clear all catalog data.
   */
  static async clearCatalog(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    log.debug('Catalog cleared');
  }

  /**
   * Get counts for the catalog summary (total, free, premium, referral).
   */
  static async getCatalogSummary(): Promise<{
    total: number;
    free: number;
    premium: number;
    referralReward: number;
  }> {
    const entries = await this.getCatalog();
    return {
      total: entries.length,
      free: entries.filter(e => e.isFree).length,
      premium: entries.filter(e => e.isPremium).length,
      referralReward: entries.filter(e => e.isReferralReward).length,
    };
  }
}
