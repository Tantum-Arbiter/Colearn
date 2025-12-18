import { useAppStore } from '@/store/app-store';
import { reminderService } from './reminder-service';

/**
 * Service for syncing user profile data across devices
 * Handles automatic sync on login and token refresh
 */
export class ProfileSyncService {
  /**
   * Sync profile data to app store
   * This is called on login and token refresh to keep data in sync
   */
  static async syncProfileData(profile: any): Promise<void> {
    if (!profile) {
      console.log('[ProfileSync] No profile data to sync');
      return;
    }

    const {
      setUserProfile,
      setScreenTimeEnabled,
      setNotificationsEnabled,
      setChildAge,
    } = useAppStore.getState();

    console.log('[ProfileSync] Syncing profile data:', JSON.stringify(profile, null, 2));

    // Sync profile (nickname, avatar)
    if (profile.nickname && profile.avatarType && profile.avatarId) {
      setUserProfile(profile.nickname, profile.avatarType, profile.avatarId);
      console.log('[ProfileSync] Profile synced:', profile.nickname);
    }

    // Sync notification settings
    if (profile.notifications) {
      console.log('[ProfileSync] Notifications data:', profile.notifications);

      if (typeof profile.notifications.screenTimeEnabled === 'boolean') {
        setScreenTimeEnabled(profile.notifications.screenTimeEnabled);
        console.log('[ProfileSync] Screen time enabled:', profile.notifications.screenTimeEnabled);
      }

      if (typeof profile.notifications.smartRemindersEnabled === 'boolean') {
        setNotificationsEnabled(profile.notifications.smartRemindersEnabled);
        console.log('[ProfileSync] Smart reminders enabled:', profile.notifications.smartRemindersEnabled);
      }
    } else {
      console.log('[ProfileSync] No notifications data in profile');
    }

    // Sync child age from profile
    if (profile.schedule?.childAgeRange) {
      const ageRange = profile.schedule.childAgeRange;
      console.log('[ProfileSync] Child age range:', ageRange);

      let ageInMonths = 24; // Default
      if (ageRange === '18-24m') {
        ageInMonths = 21; // Middle of range
      } else if (ageRange === '2-6y') {
        ageInMonths = 48; // 4 years (middle of range)
      } else if (ageRange === '6+') {
        ageInMonths = 84; // 7 years
      }

      setChildAge(ageInMonths);
      console.log('[ProfileSync] Child age set to:', ageInMonths, 'months');
    } else {
      console.log('[ProfileSync] No schedule/childAgeRange data in profile');
    }

    console.log('[ProfileSync] Settings synced from profile');
  }

  /**
   * Sync reminders from backend
   */
  static async syncReminders(): Promise<void> {
    try {
      await reminderService.syncFromBackend();
      console.log('[ProfileSync] Reminders synced from backend');
    } catch (error) {
      console.log('[ProfileSync] Failed to sync reminders:', error);
    }
  }

  /**
   * Full sync - profile data and reminders
   * Called on login and token refresh
   */
  static async fullSync(profile?: any): Promise<void> {
    console.log('[ProfileSync] Starting full sync...');

    if (profile) {
      await this.syncProfileData(profile);
    }

    await this.syncReminders();

    console.log('[ProfileSync] Full sync complete');
  }
}

