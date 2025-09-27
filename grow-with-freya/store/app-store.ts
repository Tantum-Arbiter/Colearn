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
  
  // Actions
  setAppReady: (ready: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setCurrentChild: (childId: string | null) => void;
  setCurrentScreen: (screen: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      isAppReady: false,
      hasCompletedOnboarding: false, // Always false for testing
      currentChildId: null,
      currentScreen: 'splash',
      isLoading: false,

      // Actions
      setAppReady: (ready) => set({ isAppReady: ready }),
      setOnboardingComplete: (complete) => {
        // For testing purposes, don't actually complete onboarding
        // set({ hasCompletedOnboarding: complete });
        console.log('Onboarding completed (but not persisted for testing)');
      },
      setCurrentChild: (childId) => set({ currentChildId: childId }),
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist certain fields - excluding onboarding for testing
      partialize: (state) => ({
        // hasCompletedOnboarding: state.hasCompletedOnboarding, // Commented out for testing
        currentChildId: state.currentChildId,
      }),
    }
  )
);
