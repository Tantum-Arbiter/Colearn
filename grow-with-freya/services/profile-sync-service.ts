import { useAppStore } from '@/store/app-store';
import { reminderService } from './reminder-service';
import { Logger } from '@/utils/logger';

const log = Logger.create('ProfileSyncService');

export class ProfileSyncService {
  static async syncProfileData(profile: any): Promise<void> {
    if (!profile) {
      log.info('[User Journey Flow 3: Profile Sync] No profile data to sync');
      return;
    }

    const {
      setUserProfile,
      setScreenTimeEnabled,
      setNotificationsEnabled,
      setChildAge,
    } = useAppStore.getState();

    log.info('[User Journey Flow 3: Profile Sync] Step 1/4: Syncing profile data...');
    log.debug(`Profile data: ${JSON.stringify(profile, null, 2)}`);

    // Sync profile (nickname, avatar)
    if (profile.nickname && profile.avatarType && profile.avatarId) {
      setUserProfile(profile.nickname, profile.avatarType, profile.avatarId);
      log.info(`[User Journey Flow 3: Profile Sync] Step 2/4: Profile synced - nickname: ${profile.nickname}`);
    }

    // Sync notification settings
    if (profile.notifications) {
      log.debug(`Notifications data: ${JSON.stringify(profile.notifications)}`);

      if (typeof profile.notifications.screenTimeEnabled === 'boolean') {
        setScreenTimeEnabled(profile.notifications.screenTimeEnabled);
        log.debug(`Screen time enabled: ${profile.notifications.screenTimeEnabled}`);
      }

      if (typeof profile.notifications.smartRemindersEnabled === 'boolean') {
        setNotificationsEnabled(profile.notifications.smartRemindersEnabled);
        log.debug(`Smart reminders enabled: ${profile.notifications.smartRemindersEnabled}`);
      }
    } else {
      log.debug('No notifications data in profile');
    }

    // Sync child age from profile
    if (profile.schedule?.childAgeRange) {
      const ageRange = profile.schedule.childAgeRange;
      log.debug(`Child age range: ${ageRange}`);

      let ageInMonths = 24; // Default
      if (ageRange === '18-24m') {
        ageInMonths = 21; // Middle of range
      } else if (ageRange === '2-6y') {
        ageInMonths = 48; // 4 years (middle of range)
      } else if (ageRange === '6+') {
        ageInMonths = 84; // 7 years
      }

      setChildAge(ageInMonths);
      log.debug(`Child age set to: ${ageInMonths} months`);
    } else {
      log.debug('No schedule/childAgeRange data in profile');
    }

    log.info('[User Journey Flow 3: Profile Sync] Step 3/4: Settings synced from profile');
  }

  static async syncReminders(): Promise<void> {
    try {
      await reminderService.syncFromBackend();
      log.info('[User Journey Flow 3: Profile Sync] Step 4/4: Reminders synced from backend');
    } catch (error) {
      log.warn('[User Journey Flow 3: Profile Sync] Failed to sync reminders:', error);
    }
  }

  static async fullSync(profile?: any): Promise<void> {
    log.info('[User Journey Flow 3: Profile Sync] ========== SYNC STARTED ==========');

    if (profile) {
      await this.syncProfileData(profile);
    }

    await this.syncReminders();

    log.info('[User Journey Flow 3: Profile Sync] ========== SYNC COMPLETE ==========');
  }
}

