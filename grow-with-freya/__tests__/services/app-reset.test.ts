/**
 * Reset App leaves the device as a fresh install leaves it: nothing saved,
 * nothing remembered in memory, nobody signed in, no reminder waiting, and
 * the app not yet ready, so the journey starts again at the splash.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { resetApp } from '@/services/app-reset';
import { ApiClient } from '@/services/api-client';
import { VersionManager } from '@/services/version-manager';
import { CacheManager } from '@/services/cache-manager';
import { StorySyncService } from '@/services/story-sync-service';
import { StoryLoader } from '@/services/story-loader';
import i18n from '@/services/i18n';

jest.mock('@/services/api-client', () => ({ ApiClient: { logout: jest.fn(() => Promise.resolve()) } }));
jest.mock('@/services/version-manager', () => ({ VersionManager: { clearLocalVersion: jest.fn(() => Promise.resolve()) } }));
jest.mock('@/services/cache-manager', () => ({ CacheManager: { clearAll: jest.fn(() => Promise.resolve()) } }));
jest.mock('@/services/story-sync-service', () => ({ StorySyncService: { clearCache: jest.fn(() => Promise.resolve()) } }));
jest.mock('@/services/story-loader', () => ({ StoryLoader: { invalidateCache: jest.fn() } }));
jest.mock('@/services/i18n', () => ({
  __esModule: true,
  default: { changeLanguage: jest.fn(() => Promise.resolve()) },
  getStoredLanguage: jest.fn(() => Promise.resolve('en')),
}));

jest.mock('@/store/app-store', () => jest.requireActual('@/store/app-store'));

const { useAppStore } = jest.requireActual<typeof import('@/store/app-store')>('@/store/app-store');

function lived() {
  useAppStore.setState({
    isAppReady: true,
    hasHydrated: true,
    hasCompletedOnboarding: true,
    isGuestMode: true,
    userNickname: 'Freya',
    childAgeInMonths: 20,
    favoriteStoryIds: ['whale'],
    readStoryIds: ['whale', 'owl'],
  });
}

describe('resetApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lived();
  });

  it('forgets everything the app remembered, in memory as well as on disk', async () => {
    await resetApp();

    const state = useAppStore.getState();
    expect(AsyncStorage.clear).toHaveBeenCalled();
    expect(state.hasCompletedOnboarding).toBe(false);
    expect(state.isGuestMode).toBe(false);
    expect(state.userNickname).toBeNull();
    expect(state.favoriteStoryIds).toEqual([]);
    expect(state.readStoryIds).toEqual([]);
    expect(state.childAgeInMonths).toBe(useAppStore.getInitialState().childAgeInMonths);
  });

  it('starts the journey again at the splash, with the store still loaded', async () => {
    await resetApp();

    expect(useAppStore.getState().isAppReady).toBe(false);
    expect(useAppStore.getState().hasHydrated).toBe(true);
  });

  it('signs the family out and drops every downloaded story', async () => {
    await resetApp();

    expect(ApiClient.logout).toHaveBeenCalled();
    expect(VersionManager.clearLocalVersion).toHaveBeenCalled();
    expect(CacheManager.clearAll).toHaveBeenCalled();
    expect(StorySyncService.clearCache).toHaveBeenCalled();
    expect(StoryLoader.invalidateCache).toHaveBeenCalled();
  });

  it('cancels every reminder the app scheduled', async () => {
    await resetApp();

    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  it('speaks the device\'s language again, as a fresh install would', async () => {
    await resetApp();

    expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
  });

  it('still resets everything when one step fails', async () => {
    (CacheManager.clearAll as jest.Mock).mockRejectedValueOnce(new Error('disk'));
    (ApiClient.logout as jest.Mock).mockRejectedValueOnce(new Error('offline'));

    await resetApp();

    expect(AsyncStorage.clear).toHaveBeenCalled();
    expect(useAppStore.getState().hasCompletedOnboarding).toBe(false);
  });
});
