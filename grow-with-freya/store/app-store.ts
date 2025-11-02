import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';



export interface AppState {
  // App initialization
  isAppReady: boolean;
  hasCompletedOnboarding: boolean;
  hasCompletedLogin: boolean;
  showLoginAfterOnboarding: boolean;

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



  // Background animation state persistence
  backgroundAnimationState: {
    cloudFloat1: number;
    cloudFloat2: number;
    rocketFloat1: number;
    rocketFloat2: number;
  };

  // Actions
  setAppReady: (ready: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setLoginComplete: (complete: boolean) => void;
  setShowLoginAfterOnboarding: (show: boolean) => void;
  resetAppForTesting: () => void; // Temporary function to reset app state
  setCurrentChild: (childId: string | null) => void;
  setChildAge: (ageInMonths: number) => void;
  setCurrentScreen: (screen: string) => void;
  setLoading: (loading: boolean) => void;
  requestReturnToMainMenu: () => void;
  clearReturnToMainMenu: () => void;
  setScreenTimeEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotificationPermissionRequested: (requested: boolean) => void;

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
      hasCompletedOnboarding: false, // This will be overridden by persisted state if it exists
      hasCompletedLogin: false,
      showLoginAfterOnboarding: false,
      currentChildId: null,
      childAgeInMonths: 24, // Default to 24 months (2 years)
      currentScreen: 'splash',
      isLoading: false,
      shouldReturnToMainMenu: false,
      screenTimeEnabled: true,
      notificationsEnabled: false,
      hasRequestedNotificationPermission: false,

      backgroundAnimationState: {
        cloudFloat1: -200,
        cloudFloat2: -400,
        rocketFloat1: 1000, // SCREEN_WIDTH + 100
        rocketFloat2: -200,
      },

      // Actions
      setAppReady: (ready) => set({ isAppReady: ready }),
      setOnboardingComplete: (complete) => set({ hasCompletedOnboarding: complete }),
      setLoginComplete: (complete) => set({ hasCompletedLogin: complete }),
      setShowLoginAfterOnboarding: (show) => set({ showLoginAfterOnboarding: show }),
      resetAppForTesting: () => set({
        hasCompletedOnboarding: false,
        hasCompletedLogin: false,
        isAppReady: false,
        showLoginAfterOnboarding: false,
        currentScreen: 'splash'
      }),
      setCurrentChild: (childId) => set({ currentChildId: childId }),
      setChildAge: (ageInMonths) => set({ childAgeInMonths: ageInMonths }),
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      setLoading: (loading) => set({ isLoading: loading }),
      setScreenTimeEnabled: (enabled) => set({ screenTimeEnabled: enabled }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setNotificationPermissionRequested: (requested) => set({ hasRequestedNotificationPermission: requested }),

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
      partialize: (state) => ({
        isAppReady: state.isAppReady,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        hasCompletedLogin: state.hasCompletedLogin,
        showLoginAfterOnboarding: state.showLoginAfterOnboarding,
        currentChildId: state.currentChildId,
        childAgeInMonths: state.childAgeInMonths,
        screenTimeEnabled: state.screenTimeEnabled,
        notificationsEnabled: state.notificationsEnabled,
        hasRequestedNotificationPermission: state.hasRequestedNotificationPermission,

        backgroundAnimationState: state.backgroundAnimationState,
      }),

    }
  )
);
