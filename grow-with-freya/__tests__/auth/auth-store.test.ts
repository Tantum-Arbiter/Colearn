import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '@/store/auth-store';
import { secureStorage } from '@/utils/secure-storage';
import { authService } from '@/services/auth-service';

// Mock dependencies
jest.mock('@/utils/secure-storage');
jest.mock('@/services/auth-service');

const mockSecureStorage = secureStorage;
const mockAuthService = authService;

describe('AuthStore', () => {
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

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with stored tokens and user', async () => {
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const,
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google' as const,
        providerId: 'google-123',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      mockSecureStorage.getTokens.mockResolvedValue(mockTokens);
      mockSecureStorage.getUser.mockResolvedValue(mockUser);
      mockSecureStorage.hasValidTokens.mockResolvedValue(true);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.tokens).toEqual(mockTokens);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle expired tokens by attempting refresh', async () => {
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: Date.now() - 1000, // Expired
        tokenType: 'Bearer' as const,
      };

      mockSecureStorage.getTokens.mockResolvedValue(mockTokens);
      mockSecureStorage.getUser.mockResolvedValue(null);
      mockSecureStorage.hasValidTokens.mockResolvedValue(false);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.refreshTokens).toHaveBeenCalled;
    });

    it('should handle no stored authentication', async () => {
      mockSecureStorage.getTokens.mockResolvedValue(null);
      mockSecureStorage.getUser.mockResolvedValue(null);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
    });
  });

  describe('signInWithGoogle', () => {
    it('should successfully sign in with Google', async () => {
      const mockResult = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          provider: 'google' as const,
          providerId: 'google-123',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        tokens: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresAt: Date.now() + 3600000,
          tokenType: 'Bearer' as const,
        },
      };

      mockAuthService.signInWithGoogle.mockResolvedValue(mockResult);
      mockSecureStorage.storeTokens.mockResolvedValue();
      mockSecureStorage.storeUser.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockResult.user);
      expect(result.current.tokens).toEqual(mockResult.tokens);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle Google sign-in failure', async () => {
      const mockError = new Error('Google sign-in failed');
      mockAuthService.signInWithGoogle.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.signInWithGoogle();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Google sign-in failed');
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
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
          accessToken: 'mock-access-token',
          tokenType: 'Bearer',
          expiresAt: Date.now() + 3600000,
        },
      });

      mockSecureStorage.clearTokens.mockResolvedValue();
      mockSecureStorage.clearUser.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
      expect(result.current.error).toBeNull();
      expect(mockSecureStorage.clearTokens).toHaveBeenCalled();
      expect(mockSecureStorage.clearUser).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens', async () => {
      const currentTokens = {
        accessToken: 'old-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000,
        tokenType: 'Bearer' as const,
      };

      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const,
      };

      useAuthStore.setState({ tokens: currentTokens });

      mockAuthService.refreshTokens.mockResolvedValue(newTokens);
      mockSecureStorage.storeTokens.mockResolvedValue();

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.refreshTokens();
      });

      expect(result.current.tokens).toEqual(newTokens);
      expect(mockSecureStorage.storeTokens).toHaveBeenCalledWith(newTokens);
    });

    it('should sign out user if refresh fails', async () => {
      const currentTokens = {
        accessToken: 'old-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000,
        tokenType: 'Bearer' as const,
      };

      useAuthStore.setState({ 
        tokens: currentTokens,
        isAuthenticated: true,
      });

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

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.tokens).toBeNull();
    });
  });

  describe('validateTokens', () => {
    it('should return true for valid tokens', async () => {
      const validTokens = {
        accessToken: 'valid-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const,
      };

      useAuthStore.setState({ tokens: validTokens });
      mockSecureStorage.hasValidTokens.mockResolvedValue(true);

      const { result } = renderHook(() => useAuthStore());

      let isValid: boolean;
      await act(async () => {
        isValid = await result.current.validateTokens();
      });

      expect(isValid!).toBe(true);
    });

    it('should return false for invalid tokens', async () => {
      useAuthStore.setState({ tokens: null });

      const { result } = renderHook(() => useAuthStore());

      let isValid: boolean;
      await act(async () => {
        isValid = await result.current.validateTokens();
      });

      expect(isValid!).toBe(false);
    });
  });
});
