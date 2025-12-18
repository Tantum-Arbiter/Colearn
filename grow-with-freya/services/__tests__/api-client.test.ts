import { ApiClient } from '../api-client';
import { SecureStorage } from '../secure-storage';

// Mock SecureStorage
jest.mock('../secure-storage');

// Mock fetch
global.fetch = jest.fn();

describe('ApiClient', () => {
  const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInByb3ZpZGVyIjoiZ29vZ2xlIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6OTk5OTk5OTk5OX0.test';
  const mockExpiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInByb3ZpZGVyIjoiZ29vZ2xlIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6MTYwMDAwMDAwMH0.test';
  const mockRefreshToken = 'refresh-token-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (ApiClient as any).isRefreshing = false;
    (ApiClient as any).refreshPromise = null;
  });

  describe('isAuthenticated', () => {
    it('should return true when access token is valid', async () => {
      (SecureStorage.getAccessToken as jest.Mock).mockResolvedValue(mockAccessToken);
      (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue(mockRefreshToken);

      const result = await ApiClient.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when no tokens exist', async () => {
      (SecureStorage.getAccessToken as jest.Mock).mockResolvedValue(null);
      (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue(null);

      const result = await ApiClient.isAuthenticated();

      expect(result).toBe(false);
    });

    it('should attempt refresh when access token is expired', async () => {
      // Mock getAccessToken to return expired token for all calls until after refresh
      // isAuthenticated calls getAccessToken, then ensureValidToken calls it again
      // After refresh, getAccessToken should return the new valid token
      (SecureStorage.getAccessToken as jest.Mock)
        .mockResolvedValueOnce(mockExpiredToken)  // isAuthenticated check
        .mockResolvedValueOnce(mockExpiredToken)  // ensureValidToken check
        .mockResolvedValueOnce(mockAccessToken);  // after refresh
      (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue(mockRefreshToken);
      (SecureStorage.storeTokens as jest.Mock).mockResolvedValue(undefined);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          tokens: {
            accessToken: mockAccessToken,
            refreshToken: mockRefreshToken,
          },
        }),
      });

      const result = await ApiClient.isAuthenticated();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refreshToken: mockRefreshToken }),
        })
      );
    });

    it('should return false when refresh fails', async () => {
      (SecureStorage.getAccessToken as jest.Mock).mockResolvedValue(mockExpiredToken);
      (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue(mockRefreshToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await ApiClient.isAuthenticated();

      expect(result).toBe(false);
      expect(SecureStorage.clearAuthData).toHaveBeenCalled();
    });
  });

  describe('request', () => {
    it('should make authenticated request with valid token', async () => {
      (SecureStorage.getAccessToken as jest.Mock).mockResolvedValue(mockAccessToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      const result = await ApiClient.request('/api/test');

      expect(result).toEqual({ data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });

    it('should throw error when not authenticated', async () => {
      (SecureStorage.getAccessToken as jest.Mock).mockResolvedValue(null);

      await expect(ApiClient.request('/api/test')).rejects.toThrow('Not authenticated');
    });

    it('should refresh token and retry on 401 response', async () => {
      (SecureStorage.getAccessToken as jest.Mock)
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockAccessToken);
      (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue(mockRefreshToken);
      
      // First request returns 401
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        // Refresh token request succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            tokens: {
              accessToken: mockAccessToken,
              refreshToken: mockRefreshToken,
            },
          }),
        })
        // Retry request succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'test' }),
        });

      const result = await ApiClient.request('/api/test');

      expect(result).toEqual({ data: 'test' });
      expect(global.fetch).toHaveBeenCalledTimes(3); // Original + refresh + retry
    });

    it('should clear auth data when refresh fails on 401', async () => {
      (SecureStorage.getAccessToken as jest.Mock).mockResolvedValue(mockAccessToken);
      (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue(mockRefreshToken);
      
      // First request returns 401
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        // Refresh token request fails
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

      await expect(ApiClient.request('/api/test')).rejects.toThrow('Authentication failed');
      expect(SecureStorage.clearAuthData).toHaveBeenCalled();
    });

    it('should proactively refresh token when it expires soon', async () => {
      // Create a token that expires in 4 minutes (less than 5 minute buffer)
      const soonToExpireTime = Math.floor(Date.now() / 1000) + 240; // 4 minutes
      const soonToExpireToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
        sub: 'user-123',
        email: 'test@test.com',
        provider: 'google',
        type: 'access',
        exp: soonToExpireTime,
      }))}.test`;

      (SecureStorage.getAccessToken as jest.Mock)
        .mockResolvedValueOnce(soonToExpireToken)
        .mockResolvedValueOnce(mockAccessToken);
      (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue(mockRefreshToken);

      // Refresh token request
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            tokens: {
              accessToken: mockAccessToken,
              refreshToken: mockRefreshToken,
            },
          }),
        })
        // Actual API request
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'test' }),
        });

      const result = await ApiClient.request('/api/test');

      expect(result).toEqual({ data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        expect.any(Object)
      );
    });
  });

  describe('logout', () => {
    it('should revoke tokens on backend and clear local storage', async () => {
      (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue(mockRefreshToken);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await ApiClient.logout();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/revoke'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refreshToken: mockRefreshToken }),
        })
      );
      expect(SecureStorage.clearAuthData).toHaveBeenCalled();
    });

    it('should clear local storage even if backend revocation fails', async () => {
      (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue(mockRefreshToken);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await ApiClient.logout();

      expect(SecureStorage.clearAuthData).toHaveBeenCalled();
    });

    it('should clear local storage when no refresh token exists', async () => {
      (SecureStorage.getRefreshToken as jest.Mock).mockResolvedValue(null);

      await ApiClient.logout();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(SecureStorage.clearAuthData).toHaveBeenCalled();
    });
  });
});
