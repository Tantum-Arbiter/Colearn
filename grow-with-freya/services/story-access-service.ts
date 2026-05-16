import AsyncStorage from '@react-native-async-storage/async-storage';
import { CatalogEntry, Story } from '../types/story';
import { Logger } from '@/utils/logger';
import { useAppStore, BASIC_TIER_INSTRUMENTS, type SubscriptionTier } from '@/store/app-store';

const log = Logger.create('StoryAccessService');

const STORAGE_KEYS = {
  DOWNLOAD_COUNT: '@download_count',
  REFERRAL_UNLOCKS: '@referral_unlocks', // Set of storyIds unlocked via referral
  SHARE_UNLOCKED: '@share_unlocked', // Has the user completed a share-to-unlock? (boolean)
};

// Download limits per tier (max stories on device at any time)
const DOWNLOAD_LIMITS: Record<SubscriptionTier, number> = {
  free: 2,
  basic: 50,
  premium: 125,
};

export type AccessDeniedReason =
  | 'subscription_required'
  | 'referral_required'
  | 'share_required'
  | 'download_limit_reached'
  | 'not_authenticated';

export interface AccessCheckResult {
  allowed: boolean;
  reason?: AccessDeniedReason;
}

/**
 * Controls whether a user can download a story based on their
 * subscription status, referral unlocks, and the story's monetisation flags.
 *
 * Access rules:
 * 1. isFree stories → always downloadable
 * 2. isReferralReward stories → downloadable if user has referral credit
 * 3. isPremium stories → downloadable only with active subscription
 * 4. All other stories → downloadable with active subscription
 */
export class StoryAccessService {

  /**
   * Check if the user can download a given catalog entry.
   */
  static async canDownload(entry: CatalogEntry): Promise<AccessCheckResult> {
    // Free stories are always available
    if (entry.isFree) {
      return { allowed: true };
    }

    // Share-to-unlock stories — check if user has shared the app
    if (entry.isShareToUnlock) {
      const hasShared = await this.hasCompletedShareUnlock();
      if (hasShared) {
        return { allowed: true };
      }
      // If user also has a subscription, allow it
      const hasSub = await this.hasActiveSubscription();
      if (hasSub) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'share_required' };
    }

    // Referral reward stories — check if user has unlocked via referral
    if (entry.isReferralReward) {
      const hasUnlock = await this.hasReferralUnlock(entry.storyId);
      if (hasUnlock) {
        return { allowed: true };
      }
      // If user also has a subscription, allow it
      const hasSub = await this.hasActiveSubscription();
      if (hasSub) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'referral_required' };
    }

    // Premium / default — requires subscription
    const hasSub = await this.hasActiveSubscription();
    if (hasSub) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'subscription_required' };
  }

  // ──────────────────────────────────────────────
  // Subscription / tier helpers
  // ──────────────────────────────────────────────

  /** Return the effective subscription tier (respects dev override). */
  static getEffectiveTier(): SubscriptionTier {
    return useAppStore.getState().getEffectiveTier();
  }

  /**
   * Check if the user has an active subscription (basic or premium).
   */
  static async hasActiveSubscription(): Promise<boolean> {
    const tier = this.getEffectiveTier();
    return tier === 'basic' || tier === 'premium';
  }

  /**
   * Check if a specific instrument is unlocked for the current tier.
   * - Free / Basic: flute, recorder, ocarina
   * - Premium: all instruments
   */
  static isInstrumentUnlocked(instrumentId: string): boolean {
    const tier = this.getEffectiveTier();
    if (tier === 'premium') return true;
    return (BASIC_TIER_INSTRUMENTS as readonly string[]).includes(instrumentId);
  }

  /** Number of songs available per tier. */
  static readonly FREE_SONG_COUNT = 3;
  static readonly BASIC_SONG_COUNT = 10;

  /**
   * Check if a song at a given index in the practice list is unlocked.
   * - Free tier: top 3 songs
   * - Basic tier: top 10 songs
   * - Premium: all songs
   */
  static isSongUnlocked(songIndex: number): boolean {
    const tier = this.getEffectiveTier();
    if (tier === 'premium') return true;
    if (tier === 'basic') return songIndex < this.BASIC_SONG_COUNT;
    return songIndex < this.FREE_SONG_COUNT;
  }

  // ──────────────────────────────────────────────
  // Download limit enforcement
  // ──────────────────────────────────────────────

  /**
   * Get the download limit for the current tier.
   * - Free: 2 stories
   * - Basic: 50 stories
   * - Premium: 125 stories
   */
  static getDownloadLimit(): number {
    return DOWNLOAD_LIMITS[this.getEffectiveTier()];
  }

  /**
   * Get the number of stories currently on device.
   * Uses StoryLoader's cached stories (synchronous) for instant checks.
   * Falls back to async load if no cache is available.
   */
  static async getDownloadedStoryCount(): Promise<number> {
    // Lazy import to avoid circular dependency
    const { StoryLoader } = require('./story-loader');
    const stories: Story[] = await StoryLoader.getStories();
    return stories.length;
  }

  /**
   * Synchronous version — uses StoryLoader's in-memory cache.
   * Returns null if the cache hasn't been populated yet.
   */
  static getDownloadedStoryCountSync(): number | null {
    const { StoryLoader } = require('./story-loader');
    const cached: Story[] | null = StoryLoader.getCachedStories();
    return cached ? cached.length : null;
  }

  /**
   * Check whether the user has reached their download limit.
   * Returns { atLimit, currentCount, limit } for UI messaging.
   */
  static async checkDownloadLimit(): Promise<{
    atLimit: boolean;
    currentCount: number;
    limit: number;
  }> {
    const limit = this.getDownloadLimit();
    const currentCount = await this.getDownloadedStoryCount();
    return { atLimit: currentCount >= limit, currentCount, limit };
  }

  /**
   * Suggest a story to delete to make room for a new download.
   * Picks the oldest non-bundled (CMS-downloaded) story, or falls back
   * to the last bundled story in the list.
   */
  static async getSuggestedStoryToDelete(): Promise<Story | null> {
    const { StoryLoader } = require('./story-loader');
    const { ALL_STORIES } = require('../data/stories');
    const stories: Story[] = await StoryLoader.getStories();
    const bundledIds = new Set((ALL_STORIES as Story[]).map((s: Story) => s.id));

    // Prefer non-bundled (CMS) stories — the user downloaded these explicitly
    // and they can re-download them later. Pick the first one (oldest download).
    const cmsStory = stories.find((s: Story) => !bundledIds.has(s.id));
    if (cmsStory) return cmsStory;

    // Fallback: last bundled story (least likely to be actively reading)
    if (stories.length > 0) return stories[stories.length - 1];

    return null;
  }

  // ──────────────────────────────────────────────
  // Referral unlock tracking
  // ──────────────────────────────────────────────

  /**
   * Check if a specific story has been unlocked via referral.
   */
  static async hasReferralUnlock(storyId: string): Promise<boolean> {
    const unlocks = await this.getReferralUnlocks();
    return unlocks.includes(storyId);
  }

  /**
   * Grant a referral unlock for a story (called after successful share/invite).
   */
  static async grantReferralUnlock(storyId: string): Promise<void> {
    const unlocks = await this.getReferralUnlocks();
    if (!unlocks.includes(storyId)) {
      unlocks.push(storyId);
      await AsyncStorage.setItem(STORAGE_KEYS.REFERRAL_UNLOCKS, JSON.stringify(unlocks));
      log.info(`Referral unlock granted for story: ${storyId}`);
    }
  }

  /**
   * Get all story IDs unlocked via referral.
   */
  static async getReferralUnlocks(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.REFERRAL_UNLOCKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // ──────────────────────────────────────────────
  // Share-to-unlock tracking
  // ──────────────────────────────────────────────

  /**
   * Check if the user has already completed a share-to-unlock.
   * Once completed, this is permanent (persisted in AsyncStorage).
   */
  static async hasCompletedShareUnlock(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.SHARE_UNLOCKED);
      return val === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Mark the share-to-unlock as completed (called after native share dialog is used).
   */
  static async completeShareUnlock(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SHARE_UNLOCKED, 'true');
    log.info('Share-to-unlock completed — story permanently unlocked');
  }

  // ──────────────────────────────────────────────
  // Download count tracking (for analytics / limits)
  // ──────────────────────────────────────────────

  /**
   * Increment the total download count (called after successful download).
   */
  static async recordDownload(): Promise<number> {
    const count = await this.getDownloadCount();
    const newCount = count + 1;
    await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOAD_COUNT, String(newCount));
    return newCount;
  }

  /**
   * Get the total number of stories downloaded.
   */
  static async getDownloadCount(): Promise<number> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOAD_COUNT);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Clear all access state (for logout / reset).
   */
  static async clearAccessState(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.DOWNLOAD_COUNT,
      STORAGE_KEYS.REFERRAL_UNLOCKS,
      STORAGE_KEYS.SHARE_UNLOCKED,
    ]);
    log.debug('Access state cleared');
  }
}
