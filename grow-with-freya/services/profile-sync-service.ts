import { useAppStore } from '@/store/app-store';
import { reminderService } from './reminder-service';
import { Logger } from '@/utils/logger';

const log = Logger.create('Profile');

export class ProfileSyncService {
  static async syncProfileData(profile: any): Promise<void> {
    if (!profile) {
      log.debug('No profile data to sync');
      return;
    }

    const {
      setUserProfile,
      setScreenTimeEnabled,
      setNotificationsEnabled,
      setChildAge,
    } = useAppStore.getState();

    log.info('Syncing profile data…');

    // Sync profile (nickname, avatar)
    if (profile.nickname && profile.avatarType && profile.avatarId) {
      setUserProfile(profile.nickname, profile.avatarType, profile.avatarId);
      log.info(`Profile synced: ${profile.nickname}`);
    }

    // Sync notification settings
    if (profile.notifications) {
      if (typeof profile.notifications.screenTimeEnabled === 'boolean') {
        setScreenTimeEnabled(profile.notifications.screenTimeEnabled);
      }
      if (typeof profile.notifications.smartRemindersEnabled === 'boolean') {
        setNotificationsEnabled(profile.notifications.smartRemindersEnabled);
      }
      log.debug(`Notifications: screenTime=${profile.notifications.screenTimeEnabled}, reminders=${profile.notifications.smartRemindersEnabled}`);
    }

    // Sync child age from profile
    if (profile.schedule?.childAgeRange) {
      const ageRange = profile.schedule.childAgeRange;
      let ageInMonths = 24; // Default
      if (ageRange === '18-24m') {
        ageInMonths = 21;
      } else if (ageRange === '2-6y') {
        ageInMonths = 48;
      } else if (ageRange === '6+') {
        ageInMonths = 84;
      }
      setChildAge(ageInMonths);
      log.debug(`Child age: ${ageInMonths} months (${ageRange})`);
    }

    log.info('Settings synced');
  }

  static async syncReminders(): Promise<void> {
    try {
      await reminderService.syncFromBackend();
      log.info('Reminders synced');
    } catch (error) {
      log.warn('Failed to sync reminders:', error);
    }
  }

  static async fullSync(profile?: any): Promise<void> {
    log.info('━━ Profile sync started ━━');

    if (profile) {
      await this.syncProfileData(profile);
    }

    await this.syncReminders();

    log.info('━━ Profile sync complete ━━');
  }
}

