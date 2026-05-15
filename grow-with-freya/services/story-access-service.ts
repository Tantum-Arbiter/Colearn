import AsyncStorage from '@react-native-async-storage/async-storage';
import { CatalogEntry } from '../types/story';
import { Logger } from '@/utils/logger';

const log = Logger.create('StoryAccessService');

const STORAGE_KEYS = {
  DOWNLOAD_COUNT: '@download_count',
  REFERRAL_UNLOCKS: '@referral_unlocks', // Set of storyIds unlocked via referral
};

// Free tier limits (no subscription)
const FREE_DOWNLOAD_LIMIT = 2; // Number of free stories available to all users

export type AccessDeniedReason =
  | 'subscription_required'
  | 'referral_required'
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
  // Subscription state (placeholder — will integrate with IAP)
  // ──────────────────────────────────────────────

  /**
   * Check if the user has an active subscription.
   * TODO: Replace with real IAP / RevenueCat check when subscription is implemented.
   */
  static async hasActiveSubscription(): Promise<boolean> {
    // All stories are downloadable until subscription/IAP is implemented.
    // When ready, this will check RevenueCat / StoreKit entitlements.
    return true;
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
    ]);
    log.debug('Access state cleared');
  }
}
