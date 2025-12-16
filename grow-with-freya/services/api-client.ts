import { Platform } from 'react-native';
import { SecureStorage } from './secure-storage';

const GATEWAY_URL = process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://localhost:8080';

interface TokenPayload {
  exp: number;
  sub: string;
  email: string;
  provider: string;
  type: string;
}

export class ApiClient {
  private static isRefreshing = false;
  private static refreshPromise: Promise<void> | null = null;

  /**
   * Decode JWT token to get payload
   */
  private static decodeToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired or will expire soon (within 5 minutes)
   */
  private static isTokenExpired(token: string, bufferSeconds: number = 300): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return true;
    }
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const bufferTime = bufferSeconds * 1000;
    const isExpired = currentTime >= (expirationTime - bufferTime);

    return isExpired;
  }

  /**
   * Refresh access token if needed
   */
  private static async ensureValidToken(): Promise<string | null> {
    const accessToken = await SecureStorage.getAccessToken();

    // If no access token, return null (user needs to login)
    if (!accessToken) {
      return null;
    }

    // If token is still valid, return it
    if (!this.isTokenExpired(accessToken)) {
      return accessToken;
    }

    // Token is expired or expiring soon, refresh it
    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      const profile = await this.refreshPromise;
      // Sync profile data if available
      if (profile) {
        const { ProfileSyncService } = await import('./profile-sync-service');
        await ProfileSyncService.syncProfileData(profile);
      }
      return await SecureStorage.getAccessToken();
    }

    // Start refresh process
    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const profile = await this.refreshPromise;
      // Sync profile data if available
      if (profile) {
        const { ProfileSyncService } = await import('./profile-sync-service');
        await ProfileSyncService.syncProfileData(profile);
      }
      return await SecureStorage.getAccessToken();
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   * Returns profile data if available for automatic sync
   */
  private static async performTokenRefresh(): Promise<any> {
    const refreshToken = await SecureStorage.getRefreshToken();

    if (!refreshToken) {
      console.log('[ApiClient] No refresh token - login required');
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${GATEWAY_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Platform': Platform.OS,
          'X-Client-Version': '1.0.0',
          'X-Device-ID': 'device-id-here', // TODO: Get from device
          'User-Agent': `GrowWithFreya/1.0.0 (${Platform.OS === 'ios' ? 'iOS' : 'Android'})`,
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        console.log(`[ApiClient] Token refresh failed: ${response.status}`);
        await SecureStorage.clearAuthData();
        throw new Error('Token refresh failed - please login again');
      }

      const data = await response.json();

      // Store new tokens
      await SecureStorage.storeTokens(
        data.tokens.accessToken,
        data.tokens.refreshToken
      );

      // Return profile data if available (for automatic sync)
      return data.profile || null;
    } catch (error: any) {
      // Only clear auth for actual token issues, not network errors
      if (error.message?.includes('No refresh token') ||
          error.message?.includes('Token refresh failed')) {
        await SecureStorage.clearAuthData();
      }
      throw error;
    }
  }

  /**
   * Make an authenticated API request with automatic token refresh
   */
  static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Ensure we have a valid token
    const accessToken = await this.ensureValidToken();
    
    if (!accessToken) {
      throw new Error('Not authenticated - please login');
    }

    // Add authorization header
    const headers = {
      'Content-Type': 'application/json',
      'X-Client-Platform': Platform.OS,
      'X-Client-Version': '1.0.0',
      'X-Device-ID': 'device-id-here', // TODO: Get from device
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    };

    // Make the request
    const response = await fetch(`${GATEWAY_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // If we get a 401, try to refresh and retry once
    if (response.status === 401) {
      try {
        // Force refresh the token
        await this.performTokenRefresh();

        // Retry the request with new token
        const newAccessToken = await SecureStorage.getAccessToken();
        if (!newAccessToken) {
          throw new Error('Token refresh failed');
        }

        const retryResponse = await fetch(`${GATEWAY_URL}${endpoint}`, {
          ...options,
          headers: {
            ...headers,
            'Authorization': `Bearer ${newAccessToken}`,
          },
        });

        if (!retryResponse.ok) {
          throw new Error(`API request failed: ${retryResponse.status}`);
        }

        return await retryResponse.json();
      } catch (error: any) {
        // Only clear auth for actual auth failures, not network/other errors
        if (error.message?.includes('Token refresh failed') ||
            error.message?.includes('No refresh token')) {
          await SecureStorage.clearAuthData();
          throw new Error('Authentication failed - please login again');
        }
        // For other errors (network, etc), just throw without clearing auth
        throw error;
      }
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get user profile
   */
  static async getProfile(): Promise<{
    userId: string;
    nickname: string;
    avatarType: 'boy' | 'girl';
    avatarId: string;
    notifications: any;
    schedule: any;
    createdAt: string;
    updatedAt: string;
    version: number;
  }> {
    return this.request('/api/profile', {
      method: 'GET',
    });
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: {
    nickname: string;
    avatarType: 'boy' | 'girl';
    avatarId: string;
    notifications?: any;
    schedule?: any;
  }): Promise<{
    userId: string;
    nickname: string;
    avatarType: 'boy' | 'girl';
    avatarId: string;
    notifications: any;
    schedule: any;
    createdAt: string;
    updatedAt: string;
    version: number;
  }> {
    return this.request('/api/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Sync custom reminders to backend
   */
  static async syncReminders(reminders: any[]): Promise<void> {
    const profile = await this.getProfile();
    const schedule = profile.schedule || {};
    schedule.customReminders = reminders;

    // Preserve ALL existing profile fields when updating reminders
    await this.updateProfile({
      nickname: profile.nickname,
      avatarType: profile.avatarType,
      avatarId: profile.avatarId,
      notifications: profile.notifications || {}, // Preserve notifications
      schedule,
    });
  }

  /**
   * Get custom reminders from backend
   */
  static async getReminders(): Promise<any[]> {
    try {
      const profile = await this.getProfile();
      return profile.schedule?.customReminders || [];
    } catch (error: any) {
      // If profile doesn't exist (404), return empty array
      if (error.message?.includes('404')) {
        console.log('ℹ️ [ApiClient] No profile found - returning empty reminders');
        return [];
      }
      throw error;
    }
  }

  /**
   * Logout - clear all authentication data
   */
  static async logout(): Promise<void> {
    console.log('🔓 [ApiClient] Logging out - clearing all auth data');
    await SecureStorage.clearAuthData();
    console.log('✅ [ApiClient] Logout complete');
  }

  /**
   * Check if user has valid authentication
   */
  static async isAuthenticated(): Promise<boolean> {
    const accessToken = await SecureStorage.getAccessToken();
    const refreshToken = await SecureStorage.getRefreshToken();

    if (!accessToken || !refreshToken) {
      console.log('❌ [ApiClient] No tokens - not authenticated');
      return false;
    }

    // If access token is valid, we're authenticated
    if (!this.isTokenExpired(accessToken)) {
      console.log('✅ [ApiClient] Token valid - authenticated');
      return true;
    }

    // Try to refresh the token
    try {
      console.log('🔄 [ApiClient] Token expired - refreshing...');
      await this.ensureValidToken();
      console.log('✅ [ApiClient] Token refresh successful');
      return true;
    } catch (error) {
      console.log('❌ [ApiClient] Token refresh failed - login required');
      return false;
    }
  }

  /**
   * Logout - revoke tokens and clear local storage
   */
  static async logout(): Promise<void> {
    const refreshToken = await SecureStorage.getRefreshToken();

    if (refreshToken) {
      try {
        // Revoke tokens on backend
        await fetch(`${GATEWAY_URL}/auth/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error('Failed to revoke tokens on backend:', error);
        // Continue with local cleanup even if backend call fails
      }
    }

    // Clear local storage
    await SecureStorage.clearAuthData();
  }
}


