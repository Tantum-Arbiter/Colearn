import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/utils/logger';

const log = Logger.create('Store');



// Subscription tiers
export type SubscriptionTier = 'free' | 'basic' | 'premium';

// Instruments available on each tier
export const BASIC_TIER_INSTRUMENTS = ['flute', 'recorder', 'ocarina'] as const;

export interface AppState {
  // App initialization
  isAppReady: boolean;
  hasHydrated: boolean; // True when store has loaded from AsyncStorage
  hasCompletedOnboarding: boolean;
  hasCompletedLogin: boolean;
  showLoginAfterOnboarding: boolean;
  isGuestMode: boolean; // User continued without signing in

  // Subscription
  subscriptionTier: SubscriptionTier; // Current active subscription tier
  /** Dev-only override: set to a tier to bypass real IAP checks during testing.
   *  Set to null to use the real subscription tier. NOT persisted. */
  _devSubscriptionOverride: SubscriptionTier | null;

  // User profile (synced from backend)
  userNickname: string | null;
  userAvatarType: 'boy' | 'girl' | null;
  userAvatarId: string | null;

  // Current user/child profile
  currentChildId: string | null;
  childAgeInMonths: number; // For screen time calculations

  // UI state
  currentScreen: string;
  isLoading: boolean;

  // Navigation state
  shouldReturnToMainMenu: boolean;

  // Screen time management
  screenTimeEnabled: boolean;
  notificationsEnabled: boolean;
  hasRequestedNotificationPermission: boolean;

  // Privacy settings
  crashReportingEnabled: boolean; // User consent for Sentry crash reporting

  // Parental consent (COPPA/GDPR)
  consentTimestamp: string | null; // ISO timestamp when parent gave consent
  consentPolicyVersion: string | null; // Version of privacy policy accepted (e.g. "1.0")

  // Accessibility settings
  textSizeScale: number; // 1.0 = normal, 0.8 = smaller, 1.2/1.4 = larger

  // Story favorites
  favoriteStoryIds: string[]; // Array of story IDs that user has favorited

  // Story read tracking
  readStoryIds: string[]; // Array of story IDs that user has opened/read
  /** The totalStoriesRead count when we last showed the rating prompt (0 = never prompted). */
  lastRatingPromptBookCount: number;

  // Reading streak gamification
  readingStreak: number; // Current consecutive-day streak
  longestStreak: number; // All-time best streak
  lastReadDate: string | null; // ISO date string (YYYY-MM-DD) of last reading session
  totalStoriesRead: number; // Lifetime count of stories opened

  // Background animation state persistence
  backgroundAnimationState: {
    cloudFloat1: number;
    cloudFloat2: number;
    rocketFloat1: number;
    rocketFloat2: number;
  };

  // Actions
  setAppReady: (ready: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setLoginComplete: (complete: boolean) => void;
  setShowLoginAfterOnboarding: (show: boolean) => void;
  setGuestMode: (isGuest: boolean) => void;
  resetAppForTesting: () => void; // Temporary function to reset app state
  setUserProfile: (nickname: string, avatarType: 'boy' | 'girl', avatarId: string) => void;
  clearUserProfile: () => void;
  setCurrentChild: (childId: string | null) => void;
  setChildAge: (ageInMonths: number) => void;
  setCurrentScreen: (screen: string) => void;
  setLoading: (loading: boolean) => void;
  requestReturnToMainMenu: () => void;
  clearReturnToMainMenu: () => void;
  setScreenTimeEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotificationPermissionRequested: (requested: boolean) => void;
  setCrashReportingEnabled: (enabled: boolean) => void;
  setConsent: (policyVersion: string) => void;
  setTextSizeScale: (scale: number) => void;
  setSubscriptionTier: (tier: SubscriptionTier) => void;
  setDevSubscriptionOverride: (tier: SubscriptionTier | null) => void;
  /** Returns the effective tier (dev override takes priority if set). */
  getEffectiveTier: () => SubscriptionTier;
  toggleFavoriteStory: (storyId: string) => void;
  isStoryFavorited: (storyId: string) => boolean;
  markStoryAsRead: (storyId: string) => void;
  setLastRatingPromptBookCount: (count: number) => void;
  recordReadingSession: () => void; // Call when a story is opened to update streak

  updateBackgroundAnimationState: (state: {
    cloudFloat1: number;
    cloudFloat2: number;
    rocketFloat1: number;
    rocketFloat2: number;
  }) => void;
  clearPersistedStorage: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAppReady: false,
      hasHydrated: false, // Will be set to true after AsyncStorage loads
      hasCompletedOnboarding: false, // This will be overridden by persisted state if it exists
      hasCompletedLogin: false,
      showLoginAfterOnboarding: false,
      isGuestMode: false,
      subscriptionTier: 'free' as SubscriptionTier,
      _devSubscriptionOverride: null,
      userNickname: null,
      userAvatarType: null,
      userAvatarId: null,
      currentChildId: null,
      childAgeInMonths: 24, // Default to 24 months (2 years)
      currentScreen: 'splash',
      isLoading: false,
      shouldReturnToMainMenu: false,
      screenTimeEnabled: true,
      notificationsEnabled: false,
      hasRequestedNotificationPermission: false,
      crashReportingEnabled: false, // Default to disabled until user consents
      consentTimestamp: null,
      consentPolicyVersion: null,
      textSizeScale: 1.0, // Default to normal size
      favoriteStoryIds: [], // Start with no favorites
      readStoryIds: [], // Start with no read stories
      lastRatingPromptBookCount: 0, // Never prompted for rating
      readingStreak: 0,
      longestStreak: 0,
      lastReadDate: null,
      totalStoriesRead: 0,

      backgroundAnimationState: {
        cloudFloat1: -200,
        cloudFloat2: -400,
        rocketFloat1: 1000, // SCREEN_WIDTH + 100
        rocketFloat2: -200,
      },

      // Actions
      setAppReady: (ready) => set({ isAppReady: ready }),
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      setOnboardingComplete: (complete) => set({ hasCompletedOnboarding: complete }),
      setLoginComplete: (complete) => set({ hasCompletedLogin: complete }),
      setShowLoginAfterOnboarding: (show) => set({ showLoginAfterOnboarding: show }),
      setGuestMode: (isGuest) => set({ isGuestMode: isGuest }),
      resetAppForTesting: () => set({
        hasCompletedOnboarding: false,
        hasCompletedLogin: false,
        isAppReady: false,
        showLoginAfterOnboarding: false,
        isGuestMode: false,
        currentScreen: 'splash'
      }),
      setUserProfile: (nickname, avatarType, avatarId) => set({
        userNickname: nickname,
        userAvatarType: avatarType,
        userAvatarId: avatarId
      }),
      clearUserProfile: () => set({
        userNickname: null,
        userAvatarType: null,
        userAvatarId: null
      }),
      setCurrentChild: (childId) => set({ currentChildId: childId }),
      setChildAge: (ageInMonths) => set({ childAgeInMonths: ageInMonths }),
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      setLoading: (loading) => set({ isLoading: loading }),
      setScreenTimeEnabled: (enabled) => set({ screenTimeEnabled: enabled }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setNotificationPermissionRequested: (requested) => set({ hasRequestedNotificationPermission: requested }),
      setCrashReportingEnabled: (enabled) => set({ crashReportingEnabled: enabled }),
      setConsent: (policyVersion) => set({
        consentTimestamp: new Date().toISOString(),
        consentPolicyVersion: policyVersion,
      }),
      setSubscriptionTier: (tier: SubscriptionTier) => set({ subscriptionTier: tier }),
      setDevSubscriptionOverride: (tier: SubscriptionTier | null) => set({ _devSubscriptionOverride: tier }),
      getEffectiveTier: (): SubscriptionTier => {
        const s = get();
        return s._devSubscriptionOverride ?? s.subscriptionTier;
      },
      setTextSizeScale: (scale: number) => set({ textSizeScale: scale }),
      toggleFavoriteStory: (storyId: string) => set((state) => {
        const isFavorited = state.favoriteStoryIds.includes(storyId);
        if (isFavorited) {
          return { favoriteStoryIds: state.favoriteStoryIds.filter(id => id !== storyId) };
        } else {
          return { favoriteStoryIds: [...state.favoriteStoryIds, storyId] };
        }
      }),
      isStoryFavorited: (storyId: string) => {
        // This is a selector-like function, but we need to return the value
        // For zustand, we use get() but since we're inside the store definition,
        // we need to access it differently. This will be used via useAppStore.getState()
        return false; // Placeholder - actual check is done via selector
      },
      markStoryAsRead: (storyId: string) => set((state) => {
        if (state.readStoryIds.includes(storyId)) {
          return state; // Already marked as read
        }
        return { readStoryIds: [...state.readStoryIds, storyId] };
      }),
      setLastRatingPromptBookCount: (count: number) => set({ lastRatingPromptBookCount: count }),
      recordReadingSession: () => set((state) => {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        if (state.lastReadDate === today) {
          // Already recorded today — just increment total
          return { totalStoriesRead: state.totalStoriesRead + 1 };
        }

        // Check if yesterday was the last read date (streak continues)
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const isConsecutive = state.lastReadDate === yesterday;
        const newStreak = isConsecutive ? state.readingStreak + 1 : 1;
        const newLongest = Math.max(newStreak, state.longestStreak);

        return {
          readingStreak: newStreak,
          longestStreak: newLongest,
          lastReadDate: today,
          totalStoriesRead: state.totalStoriesRead + 1,
        };
      }),

      requestReturnToMainMenu: () => set((state) => {
        // Prevent multiple rapid requests
        if (state.shouldReturnToMainMenu) {
          return state; // No change if already requested
        }
        return { shouldReturnToMainMenu: true };
      }),
      clearReturnToMainMenu: () => set({ shouldReturnToMainMenu: false }),
      updateBackgroundAnimationState: (animationState: { cloudFloat1: number; cloudFloat2: number; rocketFloat1: number; rocketFloat2: number }) => set({ backgroundAnimationState: animationState }),
      clearPersistedStorage: async () => {
        try {
          await AsyncStorage.removeItem('app-storage');
          log.info('Persisted storage cleared');
        } catch (error) {
          log.error('Failed to clear persisted storage:', error);
        }
      },
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist important app state including background animation positions
      // Note: isAppReady and hasHydrated are NOT persisted
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        hasCompletedLogin: state.hasCompletedLogin,
        showLoginAfterOnboarding: state.showLoginAfterOnboarding,
        isGuestMode: state.isGuestMode,
        subscriptionTier: state.subscriptionTier,
        userNickname: state.userNickname,
        userAvatarType: state.userAvatarType,
        userAvatarId: state.userAvatarId,
        currentChildId: state.currentChildId,
        childAgeInMonths: state.childAgeInMonths,
        screenTimeEnabled: state.screenTimeEnabled,
        notificationsEnabled: state.notificationsEnabled,
        hasRequestedNotificationPermission: state.hasRequestedNotificationPermission,
        crashReportingEnabled: state.crashReportingEnabled,
        consentTimestamp: state.consentTimestamp,
        consentPolicyVersion: state.consentPolicyVersion,
        textSizeScale: state.textSizeScale,
        favoriteStoryIds: state.favoriteStoryIds,
        readStoryIds: state.readStoryIds,
        lastRatingPromptBookCount: state.lastRatingPromptBookCount,
        readingStreak: state.readingStreak,
        longestStreak: state.longestStreak,
        lastReadDate: state.lastReadDate,
        totalStoriesRead: state.totalStoriesRead,
        backgroundAnimationState: state.backgroundAnimationState,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          log.error('Failed to hydrate:', error);
        }
        if (state) {
          // Use proper action to update state - avoids race conditions
          state.setHasHydrated(true);
          log.debug('Store hydrated');
        }
      },
    }
  )
);
