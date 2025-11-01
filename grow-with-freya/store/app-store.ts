import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppState {
  // App initialization
  isAppReady: boolean;
  hasCompletedOnboarding: boolean;

  // Current user/child profile
  currentChildId: string | null;

  // UI state
  currentScreen: string;
  isLoading: boolean;

  // Navigation state
  shouldReturnToMainMenu: boolean;

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
  resetAppForTesting: () => void; // Temporary function to reset app state
  setCurrentChild: (childId: string | null) => void;
  setCurrentScreen: (screen: string) => void;
  setLoading: (loading: boolean) => void;
  requestReturnToMainMenu: () => void;
  clearReturnToMainMenu: () => void;
  updateBackgroundAnimationState: (state: {
    cloudFloat1: number;
    cloudFloat2: number;
    rocketFloat1: number;
    rocketFloat2: number;
  }) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      isAppReady: false,
      hasCompletedOnboarding: false, // This will be overridden by persisted state if it exists
      currentChildId: null,
      currentScreen: 'splash',
      isLoading: false,
      shouldReturnToMainMenu: false,
      backgroundAnimationState: {
        cloudFloat1: -200,
        cloudFloat2: -400,
        rocketFloat1: 1000, // SCREEN_WIDTH + 100
        rocketFloat2: -200,
      },

      // Actions
      setAppReady: (ready) => set({ isAppReady: ready }),
      setOnboardingComplete: (complete) => set({ hasCompletedOnboarding: complete }),
      resetAppForTesting: () => set({ hasCompletedOnboarding: false, isAppReady: false }),
      setCurrentChild: (childId) => set({ currentChildId: childId }),
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      setLoading: (loading) => set({ isLoading: loading }),
      requestReturnToMainMenu: () => set((state) => {
        // Prevent multiple rapid requests
        if (state.shouldReturnToMainMenu) {
          return state; // No change if already requested
        }
        return { shouldReturnToMainMenu: true };
      }),
      clearReturnToMainMenu: () => set({ shouldReturnToMainMenu: false }),
      updateBackgroundAnimationState: (animationState) => set({ backgroundAnimationState: animationState }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist important app state including background animation positions
      partialize: (state) => ({
        isAppReady: state.isAppReady,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        currentChildId: state.currentChildId,
        backgroundAnimationState: state.backgroundAnimationState,
      }),

    }
  )
);
