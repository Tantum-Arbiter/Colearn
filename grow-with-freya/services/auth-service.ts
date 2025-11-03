/**
 * Authentication Service
 * Enterprise-grade OAuth authentication with Google/Apple Sign-In
 */

import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import {
  OAuthProvider,
  OAuthResponse,
  AuthRequest,
  AuthResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  UserProfile,
  JWTToken,
  DeviceInfo,
} from '../types/auth';
import SecureStorageService from './secure-storage';
import APIClient from './api-client';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

// OAuth Configuration
const OAUTH_CONFIG = {
  google: {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  },
  apple: {
    clientId: process.env.EXPO_PUBLIC_APPLE_CLIENT_ID || 'com.growwithfreya.app',
    scopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
  },
};

class AuthenticationService {
  private static instance: AuthenticationService;
  private secureStorage: SecureStorageService;
  private apiClient: APIClient;
  private googleRequest: Google.GoogleAuthRequest | null = null;

  static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  constructor() {
    this.secureStorage = SecureStorageService.getInstance();
    this.apiClient = APIClient.getInstance();
  }

  /**
   * Initialize authentication service
   */
  async initialize(): Promise<void> {
    try {
      await this.secureStorage.initialize();
      
      // Initialize Google Auth Request
      if (Platform.OS !== 'web') {
        const [request] = Google.useAuthRequest({
          iosClientId: OAUTH_CONFIG.google.iosClientId,
          androidClientId: OAUTH_CONFIG.google.androidClientId,
          webClientId: OAUTH_CONFIG.google.webClientId,
          scopes: OAUTH_CONFIG.google.scopes,
        });
        this.googleRequest = request;
      }
      
      console.log('AuthenticationService initialized');
    } catch (error) {
      console.error('Failed to initialize AuthenticationService:', error);
      throw error;
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<AuthResponse> {
    try {
      console.log('Starting Google Sign-In...');
      
      if (Platform.OS === 'web') {
        return await this.signInWithGoogleWeb();
      }
      
      if (!this.googleRequest) {
        throw new Error('Google auth request not initialized');
      }

      const result = await AuthSession.promptAsync(this.googleRequest);
      
      if (result.type !== 'success') {
        throw new Error('Google Sign-In was cancelled or failed');
      }

      // Get user info from Google
      const userInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${result.authentication?.accessToken}`
      );
      const userInfo = await userInfoResponse.json();

      const oauthResponse: OAuthResponse = {
        provider: 'google',
        providerId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        idToken: result.authentication?.idToken || '',
        accessToken: result.authentication?.accessToken,
      };

      return await this.authenticateWithBackend(oauthResponse);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  }

  /**
   * Sign in with Apple
   */
  async signInWithApple(): Promise<AuthResponse> {
    try {
      console.log('Starting Apple Sign-In...');
      
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign-In is not available on this device');
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: OAUTH_CONFIG.apple.scopes,
      });

      if (!credential.identityToken) {
        throw new Error('Apple Sign-In failed to return identity token');
      }

      const oauthResponse: OAuthResponse = {
        provider: 'apple',
        providerId: credential.user,
        email: credential.email || '',
        name: credential.fullName ? `${credential.fullName.givenName} ${credential.fullName.familyName}` : '',
        idToken: credential.identityToken,
      };

      return await this.authenticateWithBackend(oauthResponse);
    } catch (error) {
      console.error('Apple Sign-In failed:', error);
      throw error;
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(): Promise<TokenRefreshResponse> {
    try {
      const tokens = await this.secureStorage.getTokens();
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const request: TokenRefreshRequest = {
        refreshToken: tokens.refreshToken,
      };

      const response = await this.apiClient.post<TokenRefreshResponse>('/auth/refresh', request);
      
      if (response.success && response.tokens) {
        await this.secureStorage.storeTokens(response.tokens);
      }

      return response;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    try {
      // Revoke tokens on backend
      try {
        await this.apiClient.post('/auth/revoke', {});
      } catch (error) {
        console.warn('Failed to revoke tokens on backend:', error);
      }

      // Clear local storage
      await this.secureStorage.clearAll();
      
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      return await this.secureStorage.getUserProfile();
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const tokens = await this.secureStorage.getTokens();
      if (!tokens) return false;

      // Check if token is expired
      if (Date.now() >= tokens.expiresAt) {
        console.log('Token expired, attempting refresh...');
        try {
          const refreshResult = await this.refreshTokens();
          return refreshResult.success;
        } catch (error) {
          console.error('Token refresh failed:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Authentication check failed:', error);
      return false;
    }
  }

  /**
   * Get valid access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) return null;

      const tokens = await this.secureStorage.getTokens();
      return tokens?.accessToken || null;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  // Private Methods

  private async signInWithGoogleWeb(): Promise<AuthResponse> {
    // Web-specific Google Sign-In implementation
    throw new Error('Web Google Sign-In not implemented yet');
  }

  private async authenticateWithBackend(oauthResponse: OAuthResponse): Promise<AuthResponse> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const nonce = await this.generateNonce();

      const authRequest: AuthRequest = {
        provider: oauthResponse.provider,
        idToken: oauthResponse.idToken,
        clientId: this.getClientId(oauthResponse.provider),
        nonce,
      };

      const response = await this.apiClient.post<AuthResponse>('/auth/authenticate', {
        ...authRequest,
        deviceInfo,
        userInfo: {
          email: oauthResponse.email,
          name: oauthResponse.name,
          picture: oauthResponse.picture,
          providerId: oauthResponse.providerId,
        },
      });

      if (response.success && response.tokens && response.user) {
        // Store tokens and user profile
        await Promise.all([
          this.secureStorage.storeTokens(response.tokens),
          this.secureStorage.storeUserProfile(response.user),
        ]);

        console.log('Authentication successful');
      }

      return response;
    } catch (error) {
      console.error('Backend authentication failed:', error);
      throw error;
    }
  }

  private async getDeviceInfo(): Promise<DeviceInfo> {
    const deviceId = await this.secureStorage.getDeviceId();
    
    return {
      deviceId,
      platform: Platform.OS as 'ios' | 'android' | 'web',
      osVersion: Platform.Version.toString(),
      appVersion: '1.0.0', // Get from app config
      deviceModel: Platform.constants?.systemName || 'Unknown',
      isEmulator: __DEV__, // Simplified check
    };
  }

  private async generateNonce(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      randomBytes.join(''),
      { encoding: Crypto.CryptoEncoding.HEX }
    );
  }

  private getClientId(provider: OAuthProvider): string {
    switch (provider) {
      case 'google':
        if (Platform.OS === 'ios') return OAUTH_CONFIG.google.iosClientId || '';
        if (Platform.OS === 'android') return OAUTH_CONFIG.google.androidClientId || '';
        return OAUTH_CONFIG.google.webClientId || '';
      case 'apple':
        return OAUTH_CONFIG.apple.clientId;
      default:
        throw new Error(`Unknown OAuth provider: ${provider}`);
    }
  }
}

export default AuthenticationService;
