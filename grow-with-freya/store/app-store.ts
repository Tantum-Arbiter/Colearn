import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';



export interface AppState {
  // App initialization
  isAppReady: boolean;
  hasHydrated: boolean; // True when store has loaded from AsyncStorage
  hasCompletedOnboarding: boolean;
  hasCompletedLogin: boolean;
  showLoginAfterOnboarding: boolean;
  isGuestMode: boolean; // User continued without signing in

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

  // Accessibility settings
  textSizeScale: number; // 1.0 = normal, 0.8 = smaller, 1.2/1.4 = larger

  // Story favorites
  favoriteStoryIds: string[]; // Array of story IDs that user has favorited

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
  setTextSizeScale: (scale: number) => void;
  toggleFavoriteStory: (storyId: string) => void;
  isStoryFavorited: (storyId: string) => boolean;

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
    (set) => ({
      // Initial state
      isAppReady: false,
      hasHydrated: false, // Will be set to true after AsyncStorage loads
      hasCompletedOnboarding: false, // This will be overridden by persisted state if it exists
      hasCompletedLogin: false,
      showLoginAfterOnboarding: false,
      isGuestMode: false,
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
      textSizeScale: 1.0, // Default to normal size
      favoriteStoryIds: [], // Start with no favorites

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
      setTextSizeScale: (scale) => set({ textSizeScale: scale }),
      toggleFavoriteStory: (storyId) => set((state) => {
        const isFavorited = state.favoriteStoryIds.includes(storyId);
        if (isFavorited) {
          return { favoriteStoryIds: state.favoriteStoryIds.filter(id => id !== storyId) };
        } else {
          return { favoriteStoryIds: [...state.favoriteStoryIds, storyId] };
        }
      }),
      isStoryFavorited: (storyId) => {
        // This is a selector-like function, but we need to return the value
        // For zustand, we use get() but since we're inside the store definition,
        // we need to access it differently. This will be used via useAppStore.getState()
        return false; // Placeholder - actual check is done via selector
      },

      requestReturnToMainMenu: () => set((state) => {
        // Prevent multiple rapid requests
        if (state.shouldReturnToMainMenu) {
          return state; // No change if already requested
        }
        return { shouldReturnToMainMenu: true };
      }),
      clearReturnToMainMenu: () => set({ shouldReturnToMainMenu: false }),
      updateBackgroundAnimationState: (animationState) => set({ backgroundAnimationState: animationState }),
      clearPersistedStorage: async () => {
        try {
          await AsyncStorage.removeItem('app-storage');
          console.log('Persisted storage cleared successfully');
        } catch (error) {
          console.error('Failed to clear persisted storage:', error);
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
        userNickname: state.userNickname,
        userAvatarType: state.userAvatarType,
        userAvatarId: state.userAvatarId,
        currentChildId: state.currentChildId,
        childAgeInMonths: state.childAgeInMonths,
        screenTimeEnabled: state.screenTimeEnabled,
        notificationsEnabled: state.notificationsEnabled,
        hasRequestedNotificationPermission: state.hasRequestedNotificationPermission,
        crashReportingEnabled: state.crashReportingEnabled,
        textSizeScale: state.textSizeScale,
        favoriteStoryIds: state.favoriteStoryIds,
        backgroundAnimationState: state.backgroundAnimationState,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[AppStore] Failed to hydrate from AsyncStorage:', error);
        }
        if (state) {
          // Use proper action to update state - avoids race conditions
          state.setHasHydrated(true);
          console.log('[AppStore] Store hydrated from AsyncStorage');
        }
      },
    }
  )
);
