/**
 * Authentication Store
 * Zustand store for authentication state management with persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AuthState,
  AuthStore,
  UserProfile,
  JWTToken,
  OAuthProvider,
} from '../types/auth';
import AuthenticationService from '../services/auth-service';
import SecureStorageService from '../services/secure-storage';

// Store implementation
interface AuthStoreState {
  // State
  authState: AuthState;
  user: UserProfile | null;
  tokens: JWTToken | null;
  error: string | null;
  isLoading: boolean;
  
  // Computed properties
  isAuthenticated: boolean;
  hasValidToken: boolean;
  
  // Actions
  signIn: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
  initialize: () => Promise<void>;
  
  // Internal actions
  setAuthState: (state: AuthState) => void;
  setUser: (user: UserProfile | null) => void;
  setTokens: (tokens: JWTToken | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

// Create the store
export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      authState: 'loading',
      user: null,
      tokens: null,
      error: null,
      isLoading: false,

      // Computed properties
      get isAuthenticated() {
        const state = get();
        return state.authState === 'authenticated' && state.user !== null;
      },

      get hasValidToken() {
        const state = get();
        if (!state.tokens) return false;
        return Date.now() < state.tokens.expiresAt;
      },

      // Actions
      signIn: async (provider: OAuthProvider) => {
        const authService = AuthenticationService.getInstance();
        
        try {
          set({ isLoading: true, error: null });
          
          let response;
          if (provider === 'google') {
            response = await authService.signInWithGoogle();
          } else if (provider === 'apple') {
            response = await authService.signInWithApple();
          } else {
            throw new Error(`Unsupported provider: ${provider}`);
          }

          if (response.success) {
            set({
              authState: 'authenticated',
              user: response.user,
              tokens: response.tokens,
              error: null,
              isLoading: false,
            });
          } else {
            throw new Error(response.message || 'Authentication failed');
          }
        } catch (error) {
          console.error('Sign in failed:', error);
          set({
            authState: 'error',
            error: error instanceof Error ? error.message : 'Sign in failed',
            isLoading: false,
          });
          throw error;
        }
      },

      signOut: async () => {
        const authService = AuthenticationService.getInstance();
        
        try {
          set({ isLoading: true, error: null });
          
          await authService.signOut();
          
          set({
            authState: 'unauthenticated',
            user: null,
            tokens: null,
            error: null,
            isLoading: false,
          });
        } catch (error) {
          console.error('Sign out failed:', error);
          // Even if sign out fails on backend, clear local state
          set({
            authState: 'unauthenticated',
            user: null,
            tokens: null,
            error: error instanceof Error ? error.message : 'Sign out failed',
            isLoading: false,
          });
        }
      },

      refreshTokens: async () => {
        const authService = AuthenticationService.getInstance();
        
        try {
          const response = await authService.refreshTokens();
          
          if (response.success && response.tokens) {
            set({
              tokens: response.tokens,
              authState: 'authenticated',
              error: null,
            });
          } else {
            throw new Error(response.message || 'Token refresh failed');
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          set({
            authState: 'unauthenticated',
            user: null,
            tokens: null,
            error: error instanceof Error ? error.message : 'Token refresh failed',
          });
          throw error;
        }
      },

      updateProfile: async (updates: Partial<UserProfile>) => {
        try {
          set({ isLoading: true, error: null });
          
          const currentUser = get().user;
          if (!currentUser) {
            throw new Error('No user to update');
          }

          const updatedUser = { ...currentUser, ...updates, updatedAt: new Date().toISOString() };
          
          // Store updated profile
          const secureStorage = SecureStorageService.getInstance();
          await secureStorage.storeUserProfile(updatedUser);
          
          set({
            user: updatedUser,
            isLoading: false,
          });
        } catch (error) {
          console.error('Profile update failed:', error);
          set({
            error: error instanceof Error ? error.message : 'Profile update failed',
            isLoading: false,
          });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      initialize: async () => {
        const authService = AuthenticationService.getInstance();
        const secureStorage = SecureStorageService.getInstance();
        
        try {
          set({ authState: 'loading', isLoading: true });
          
          // Initialize services
          await Promise.all([
            authService.initialize(),
            secureStorage.initialize(),
          ]);

          // Check if user is authenticated
          const [isAuthenticated, user, tokens] = await Promise.all([
            authService.isAuthenticated(),
            secureStorage.getUserProfile(),
            secureStorage.getTokens(),
          ]);

          if (isAuthenticated && user && tokens) {
            set({
              authState: 'authenticated',
              user,
              tokens,
              isLoading: false,
            });
          } else {
            set({
              authState: 'unauthenticated',
              user: null,
              tokens: null,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('Auth store initialization failed:', error);
          set({
            authState: 'error',
            error: error instanceof Error ? error.message : 'Initialization failed',
            isLoading: false,
          });
        }
      },

      // Internal actions
      setAuthState: (authState: AuthState) => set({ authState }),
      setUser: (user: UserProfile | null) => set({ user }),
      setTokens: (tokens: JWTToken | null) => set({ tokens }),
      setError: (error: string | null) => set({ error }),
      setLoading: (isLoading: boolean) => set({ isLoading }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist non-sensitive data
      partialize: (state) => ({
        authState: state.authState,
        // Don't persist user or tokens - they're stored securely
      }),
      // Rehydrate logic
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Initialize the store after rehydration
          state.initialize();
        }
      },
    }
  )
);

// Selectors for better performance
export const useAuthState = () => useAuthStore((state) => state.authState);
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);

// Actions
export const useAuthActions = () => useAuthStore((state) => ({
  signIn: state.signIn,
  signOut: state.signOut,
  refreshTokens: state.refreshTokens,
  updateProfile: state.updateProfile,
  clearError: state.clearError,
  initialize: state.initialize,
}));

// Hook for complete auth state
export const useAuth = () => {
  const state = useAuthStore();
  return {
    // State
    authState: state.authState,
    user: state.user,
    error: state.error,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    hasValidToken: state.hasValidToken,
    
    // Actions
    signIn: state.signIn,
    signOut: state.signOut,
    refreshTokens: state.refreshTokens,
    updateProfile: state.updateProfile,
    clearError: state.clearError,
    initialize: state.initialize,
  };
};

export default useAuthStore;
