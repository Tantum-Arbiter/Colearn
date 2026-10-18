import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { ApiClient } from './api-client';
import { VersionManager } from './version-manager';
import { CacheManager } from './cache-manager';
import { StorySyncService } from './story-sync-service';
import { StoryLoader } from './story-loader';
import i18n, { getStoredLanguage } from './i18n';
import { useAppStore } from '@/store/app-store';
import { Logger } from '@/utils/logger';

const log = Logger.create('AppReset');

async function attempt(step: string, work: () => unknown): Promise<void> {
  try {
    await work();
  } catch (error) {
    log.error(`Reset step failed: ${step}`, error);
  }
}

export async function resetApp(): Promise<void> {
  await attempt('sign out', () => ApiClient.logout());
  await attempt('story version', () => VersionManager.clearLocalVersion());
  await attempt('story files', () => CacheManager.clearAll());
  await attempt('story sync', () => StorySyncService.clearCache());
  await attempt('story list', () => StoryLoader.invalidateCache());
  await attempt('reminders', () => Notifications.cancelAllScheduledNotificationsAsync());
  await attempt('saved data', () => AsyncStorage.clear());
  await attempt('language', async () => i18n.changeLanguage(await getStoredLanguage()));
  useAppStore.getState().resetToFreshInstall();
  log.info('App reset to a fresh install');
}
