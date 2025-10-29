import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthState, AuthActions, User, AuthTokens, AuthError } from '@/types/auth';
import { secureStorage } from '@/utils/secure-storage';

interface AuthStore extends AuthState, AuthActions {}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      user: null,
      tokens: null,
      error: null,
      oauthState: undefined,

      // Initialize authentication state from secure storage
      initialize: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const [storedTokens, storedUser] = await Promise.all([
            secureStorage.getTokens(),
            secureStorage.getUser(),
          ]);

          if (storedTokens && storedUser) {
            // Check if tokens are still valid
            const isValid = await secureStorage.hasValidTokens();
            
            if (isValid) {
              set({
                isAuthenticated: true,
                user: storedUser,
                tokens: storedTokens,
                isInitialized: true,
                isLoading: false,
              });
              return;
            } else {
              // Tokens expired, try to refresh
              await get().refreshTokens();
              return;
            }
          }

          // No valid authentication found
          set({
            isAuthenticated: false,
            user: null,
            tokens: null,
            isInitialized: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          set({
            isAuthenticated: false,
            user: null,
            tokens: null,
            error: 'Failed to initialize authentication',
            isInitialized: true,
            isLoading: false,
          });
        }
      },

      // Google Sign-In (implementation will be in OAuth service)
      signInWithGoogle: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // This will be implemented in the OAuth service layer
          const { authService } = await import('@/services/auth-service');
          const result = await authService.signInWithGoogle();
          
          await Promise.all([
            secureStorage.storeTokens(result.tokens),
            secureStorage.storeUser(result.user),
          ]);

          set({
            isAuthenticated: true,
            user: result.user,
            tokens: result.tokens,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error('Google sign-in failed:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Google sign-in failed',
          });
          throw error;
        }
      },

      // Apple Sign-In (implementation will be in OAuth service)
      signInWithApple: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // This will be implemented in the OAuth service layer
          const { authService } = await import('@/services/auth-service');
          const result = await authService.signInWithApple();
          
          await Promise.all([
            secureStorage.storeTokens(result.tokens),
            secureStorage.storeUser(result.user),
          ]);

          set({
            isAuthenticated: true,
            user: result.user,
            tokens: result.tokens,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error('Apple sign-in failed:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Apple sign-in failed',
          });
          throw error;
        }
      },

      // Sign out
      signOut: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // Clear secure storage
          await Promise.all([
            secureStorage.clearTokens(),
            secureStorage.clearUser(),
          ]);

          // Reset state
          set({
            isAuthenticated: false,
            user: null,
            tokens: null,
            isLoading: false,
            error: null,
            oauthState: undefined,
          });
        } catch (error) {
          console.error('Sign out failed:', error);
          set({
            isLoading: false,
            error: 'Failed to sign out',
          });
        }
      },

      // Refresh tokens
      refreshTokens: async () => {
        try {
          const currentTokens = get().tokens;
          if (!currentTokens?.refreshToken) {
            throw new Error('No refresh token available');
          }

          // This will be implemented in the OAuth service layer
          const { authService } = await import('@/services/auth-service');
          const newTokens = await authService.refreshTokens(currentTokens.refreshToken);
          
          await secureStorage.storeTokens(newTokens);
          
          set({
            tokens: newTokens,
            error: null,
          });
        } catch (error) {
          console.error('Token refresh failed:', error);
          
          // If refresh fails, sign out the user
          await get().signOut();
          throw error;
        }
      },

      // Validate tokens
      validateTokens: async () => {
        try {
          const tokens = get().tokens;
          if (!tokens) return false;

          const isValid = await secureStorage.hasValidTokens();
          
          if (!isValid && tokens.refreshToken) {
            try {
              await get().refreshTokens();
              return true;
            } catch {
              return false;
            }
          }
          
          return isValid;
        } catch (error) {
          console.error('Token validation failed:', error);
          return false;
        }
      },

      // State management helpers
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      updateUser: (userUpdate: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userUpdate };
          set({ user: updatedUser });
          
          // Update secure storage
          secureStorage.storeUser(updatedUser).catch(error => {
            console.error('Failed to update user in secure storage:', error);
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist non-sensitive data
      partialize: (state) => ({
        isInitialized: state.isInitialized,
        // Don't persist sensitive data like tokens or user data
        // These are stored in secure storage instead
      }),
    }
  )
);
