import { authService } from '@/services/auth-service';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

// Mock dependencies
jest.mock('expo-auth-session');
jest.mock('expo-apple-authentication');
jest.mock('expo-crypto');
jest.mock('expo-web-browser');

const mockAuthSession = AuthSession;
const mockAppleAuth = AppleAuthentication;
const mockCrypto = Crypto;

// Mock fetch globally
global.fetch = jest.fn();

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('signInWithGoogle', () => {
    it('should successfully sign in with Google', async () => {
      // Mock PKCE challenge
      const mockCodeChallenge = {
        codeChallenge: 'mock-code-challenge',
        codeVerifier: 'mock-code-verifier',
      };

      mockAuthSession.AuthRequest.createRandomCodeChallenge.mockResolvedValue(mockCodeChallenge);

      // Mock AuthRequest
      const mockRequest = {
        promptAsync: jest.fn().mockResolvedValue({
          type: 'success',
          params: { code: 'mock-auth-code' },
        }),
      };

      mockAuthSession.AuthRequest.mockImplementation(() => mockRequest as any);

      // Mock token exchange
      mockAuthSession.exchangeCodeAsync.mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        idToken: 'mock-id-token',
        expiresIn: 3600,
      });

      // Mock user info fetch
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'google-123',
            email: 'test@example.com',
            name: 'Test User',
            picture: 'https://example.com/avatar.jpg',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      const result = await authService.signInWithGoogle();

      expect(result.user).toEqual({
        id: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        provider: 'google',
        providerId: 'google-123',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      expect(result.tokens).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        idToken: 'mock-id-token',
        expiresAt: expect.any(Number),
        tokenType: 'Bearer',
      });
    });

    it('should handle Google sign-in cancellation', async () => {
      const mockCodeChallenge = {
        codeChallenge: 'mock-code-challenge',
        codeVerifier: 'mock-code-verifier',
      };

      mockAuthSession.AuthRequest.createRandomCodeChallenge.mockResolvedValue(mockCodeChallenge);

      const mockRequest = {
        promptAsync: jest.fn().mockResolvedValue({
          type: 'cancel',
        }),
      };

      mockAuthSession.AuthRequest.mockImplementation(() => mockRequest as any);

      await expect(authService.signInWithGoogle()).rejects.toThrow();
    });

    it('should handle network errors during user info fetch', async () => {
      const mockCodeChallenge = {
        codeChallenge: 'mock-code-challenge',
        codeVerifier: 'mock-code-verifier',
      };

      mockAuthSession.AuthRequest.createRandomCodeChallenge.mockResolvedValue(mockCodeChallenge);

      const mockRequest = {
        promptAsync: jest.fn().mockResolvedValue({
          type: 'success',
          params: { code: 'mock-auth-code' },
        }),
      };

      mockAuthSession.AuthRequest.mockImplementation(() => mockRequest as any);

      mockAuthSession.exchangeCodeAsync.mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      });

      // Mock failed user info fetch
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(authService.signInWithGoogle()).rejects.toThrow();
    });
  });

  describe('signInWithApple', () => {
    it('should successfully sign in with Apple', async () => {
      mockAppleAuth.isAvailableAsync.mockResolvedValue(true);
      
      mockCrypto.digestStringAsync.mockResolvedValue('mock-nonce-hash');

      mockAppleAuth.signInAsync.mockResolvedValue({
        user: 'apple-user-123',
        email: 'test@privaterelay.appleid.com',
        fullName: {
          givenName: 'Test',
          familyName: 'User',
        },
        identityToken: 'mock-identity-token',
        authorizationCode: 'mock-auth-code',
      });

      // Mock gateway authentication
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await authService.signInWithApple();

      expect(result.user).toEqual({
        id: 'apple-user-123',
        email: 'test@privaterelay.appleid.com',
        name: 'Test User',
        provider: 'apple',
        providerId: 'apple-user-123',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      expect(result.tokens).toEqual({
        accessToken: 'mock-identity-token',
        idToken: 'mock-identity-token',
        expiresAt: expect.any(Number),
        tokenType: 'Bearer',
      });
    });

    it('should handle Apple authentication unavailable', async () => {
      mockAppleAuth.isAvailableAsync.mockResolvedValue(false);

      await expect(authService.signInWithApple()).rejects.toThrow(
        'Apple Authentication is not available on this device'
      );
    });

    it('should handle missing identity token', async () => {
      mockAppleAuth.isAvailableAsync.mockResolvedValue(true);
      mockCrypto.digestStringAsync.mockResolvedValue('mock-nonce-hash');

      mockAppleAuth.signInAsync.mockResolvedValue({
        user: 'apple-user-123',
        identityToken: null, // Missing identity token
      });

      await expect(authService.signInWithApple()).rejects.toThrow(
        'Apple authentication failed - no identity token received'
      );
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          id_token: 'new-id-token',
          expires_in: 3600,
        }),
      });

      const result = await authService.refreshTokens('mock-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        idToken: 'new-id-token',
        expiresAt: expect.any(Number),
        tokenType: 'Bearer',
      });
    });

    it('should handle refresh token failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
      });

      await expect(authService.refreshTokens('invalid-refresh-token')).rejects.toThrow();
    });
  });

  describe('validateTokens', () => {
    it('should return valid for good tokens', async () => {
      const mockTokens = {
        accessToken: 'valid-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await authService.validateTokens(mockTokens);

      expect(result.isValid).toBe(true);
      expect(result.needsRefresh).toBe(false);
    });

    it('should return invalid for expired tokens', async () => {
      const mockTokens = {
        accessToken: 'expired-token',
        expiresAt: Date.now() - 1000,
        tokenType: 'Bearer' as const,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await authService.validateTokens(mockTokens);

      expect(result.isValid).toBe(false);
      expect(result.needsRefresh).toBe(false);
    });

    it('should handle network errors during validation', async () => {
      const mockTokens = {
        accessToken: 'some-token',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer' as const,
      };

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await authService.validateTokens(mockTokens);

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });
});
