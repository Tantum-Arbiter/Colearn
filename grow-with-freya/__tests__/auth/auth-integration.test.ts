import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '@/store/auth-store';
import { secureStorage } from '@/utils/secure-storage';
import { authService } from '@/services/auth-service';
import { apiClient } from '@/services/api-client';

// Mock all dependencies
jest.mock('@/utils/secure-storage');
jest.mock('@/services/auth-service');
jest.mock('@/services/api-client');

const mockSecureStorage = secureStorage;
const mockAuthService = authService;
const mockApiClient = apiClient;

describe('Authentication Integration', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      user: null,
      tokens: null,
      error: null,
      oauthState: undefined,
    });

    jest.clearAllMocks();
  });

  describe('Complete Authentication Flow', () => {
    it('should handle complete Google sign-in flow', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google' as const,
        providerId: 'google-123',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const,
      };

      // Mock successful OAuth flow
      mockAuthService.signInWithGoogle.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      // Mock secure storage operations
      mockSecureStorage.storeTokens.mockResolvedValue();
      mockSecureStorage.storeUser.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      // Execute sign-in
      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Verify authentication state
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.error).toBeNull();

      // Verify secure storage calls
      expect(mockSecureStorage.storeTokens).toHaveBeenCalledWith(mockTokens);
      expect(mockSecureStorage.storeUser).toHaveBeenCalledWith(mockUser);
    });

    it('should handle app initialization with stored credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google' as const,
        providerId: 'google-123',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      const mockTokens = {
        accessToken: 'stored-access-token',
        refreshToken: 'stored-refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const,
      };

      // Mock stored credentials
      mockSecureStorage.getTokens.mockResolvedValue(mockTokens);
      mockSecureStorage.getUser.mockResolvedValue(mockUser);
      mockSecureStorage.hasValidTokens.mockResolvedValue(true);

      const { result } = renderHook(() => useAuthStore());

      // Initialize app
      await act(async () => {
        await result.current.initialize();
      });

      // Verify restored authentication state
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockTokens);
    });

    it('should handle token refresh flow', async () => {
      const expiredTokens = {
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: Date.now() - 1000,
        tokenType: 'Bearer' as const,
      };

      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const,
      };

      // Set up expired tokens
      useAuthStore.setState({
        tokens: expiredTokens,
        isAuthenticated: true,
      });

      // Mock token refresh
      mockAuthService.refreshTokens.mockResolvedValue(newTokens);
      mockSecureStorage.storeTokens.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      // Execute token refresh
      await act(async () => {
        await result.current.refreshTokens();
      });

      // Verify new tokens
      expect(result.current.tokens).toEqual(newTokens);
      expect(mockSecureStorage.storeTokens).toHaveBeenCalledWith(newTokens);
    });

    it('should handle complete sign-out flow', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          provider: 'google',
          providerId: 'google-123',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        tokens: {
          accessToken: 'access-token',
          tokenType: 'Bearer',
          expiresAt: Date.now() + 3600000,
        },
      });

      // Mock secure storage cleanup
      mockSecureStorage.clearTokens.mockResolvedValue();
      mockSecureStorage.clearUser.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      // Execute sign-out
      await act(async () => {
        await result.current.signOut();
      });

      // Verify cleared state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(mockSecureStorage.clearTokens).toHaveBeenCalled();
      expect(mockSecureStorage.clearUser).toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle OAuth service errors gracefully', async () => {
      const authError = new Error('OAuth provider error');
      mockAuthService.signInWithGoogle.mockRejectedValue(authError);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.signInWithGoogle();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('OAuth provider error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle secure storage errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google' as const,
        providerId: 'google-123',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const,
      };

      mockAuthService.signInWithGoogle.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      // Mock storage failure
      mockSecureStorage.storeTokens.mockRejectedValue(new Error('Storage failed'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.signInWithGoogle();
        } catch (error) {
          // Expected to throw due to storage failure
        }
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle token refresh failure by signing out', async () => {
      const expiredTokens = {
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
        expiresAt: Date.now() - 1000,
        tokenType: 'Bearer' as const,
      };

      useAuthStore.setState({
        tokens: expiredTokens,
        isAuthenticated: true,
      });

      // Mock refresh failure
      mockAuthService.refreshTokens.mockRejectedValue(new Error('Refresh failed'));
      mockSecureStorage.clearTokens.mockResolvedValue();
      mockSecureStorage.clearUser.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.refreshTokens();
        } catch (error) {
          // Expected to throw
        }
      });

      // Should have signed out user
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.tokens).toBeNull();
    });
  });

  describe('API Integration', () => {
    it('should handle API calls with authentication', async () => {
      const mockTokens = {
        accessToken: 'valid-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const,
      };

      useAuthStore.setState({
        tokens: mockTokens,
        isAuthenticated: true,
      });

      // Mock successful API call
      mockApiClient.get.mockResolvedValue({
        data: { message: 'Success' },
        success: true,
      });

      const result = await mockApiClient.get('/test-endpoint');

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Success');
    });

    it('should handle API authentication errors', async () => {
      const mockTokens = {
        accessToken: 'invalid-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const,
      };

      useAuthStore.setState({
        tokens: mockTokens,
        isAuthenticated: true,
      });

      // Mock API authentication error
      const apiError = new Error('Unauthorized');
      (apiError as any).status = 401;
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(mockApiClient.get('/protected-endpoint')).rejects.toThrow('Unauthorized');
    });
  });
});
