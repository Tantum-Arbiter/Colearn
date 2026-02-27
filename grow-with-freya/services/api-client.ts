import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { SecureStorage } from './secure-storage';
import { DeviceInfoService } from './device-info-service';
import { Logger } from '@/utils/logger';

const log = Logger.create('ApiClient');

const extra = Constants.expoConfig?.extra || {};
const GATEWAY_URL = extra.gatewayUrl || process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://localhost:8080';

const DEFAULT_TIMEOUT_MS = 30000;
const TOKEN_REFRESH_TIMEOUT_MS = 10000;

interface TokenPayload {
  exp: number;
  sub: string;
  email: string;
  provider: string;
  type: string;
}

export class ApiClient {
  private static isRefreshing = false;
  private static refreshPromise: Promise<any> | null = null;

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

  private static async ensureValidToken(): Promise<string | null> {
    const accessToken = await SecureStorage.getAccessToken();
    if (!accessToken) {
      return null;
    }
    if (!this.isTokenExpired(accessToken)) {
      return accessToken;
    }
    if (this.isRefreshing && this.refreshPromise) {
      const profile = await this.refreshPromise;
      if (profile) {
        const { ProfileSyncService } = await import('./profile-sync-service');
        await ProfileSyncService.syncProfileData(profile);
      }
      return await SecureStorage.getAccessToken();
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const profile = await this.refreshPromise;
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

  private static async performTokenRefresh(): Promise<any> {
    const refreshToken = await SecureStorage.getRefreshToken();

    if (!refreshToken) {
      console.log('[ApiClient] No refresh token - login required');
      throw new Error('No refresh token available');
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TOKEN_REFRESH_TIMEOUT_MS);

    try {
      const response = await fetch(`${GATEWAY_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...DeviceInfoService.getDeviceHeaders(),
          'User-Agent': `GrowWithFreya/${DeviceInfoService.getAppVersion()} (${Platform.OS === 'ios' ? 'iOS' : 'Android'})`,
        },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`[ApiClient] Token refresh failed: ${response.status}`);
        await SecureStorage.clearAuthData();
        throw new Error('Token refresh failed - please login again');
      }

      const data = await response.json();
      await SecureStorage.storeTokens(
        data.tokens.accessToken,
        data.tokens.refreshToken
      );
      return data.profile || null;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.log(`[ApiClient] Token refresh timeout after ${TOKEN_REFRESH_TIMEOUT_MS}ms`);
        throw new Error('Token refresh timeout - please try again');
      }
      if (error.message?.includes('No refresh token') ||
          error.message?.includes('Token refresh failed')) {
        await SecureStorage.clearAuthData();
      }
      throw error;
    }
  }

  static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<T> {
    const accessToken = await this.ensureValidToken();

    if (!accessToken) {
      throw new Error('Not authenticated - please login');
    }
    const headers = {
      'Content-Type': 'application/json',
      ...DeviceInfoService.getDeviceHeaders(),
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const requestStartTime = Date.now();
    const method = options.method || 'GET';

    log.debug(`[API Request] ${method} ${endpoint}`);

    try {
      const response = await fetch(`${GATEWAY_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const durationMs = Date.now() - requestStartTime;
      log.debug(`[API Response] ${response.status} in ${durationMs}ms`);

      if (response.status === 401) {
        try {
          await this.performTokenRefresh();
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), timeoutMs);

          try {
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
              signal: retryController.signal,
            });
            clearTimeout(retryTimeoutId);

            if (!retryResponse.ok) {
              throw new Error(`API request failed: ${retryResponse.status}`);
            }

            return await retryResponse.json();
          } finally {
            clearTimeout(retryTimeoutId);
          }
        } catch (error: any) {
          if (error.message?.includes('Token refresh failed') ||
              error.message?.includes('No refresh token')) {
            await SecureStorage.clearAuthData();
            throw new Error('Authentication failed - please login again');
          }
          throw error;
        }
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - requestStartTime;
      if (error.name === 'AbortError') {
        log.warn(`[API Timeout] TIMEOUT after ${durationMs}ms: ${endpoint}`);
        throw new Error(`Request timeout after ${timeoutMs}ms: ${endpoint}`);
      }
      log.warn(`[API Error] FAILED after ${durationMs}ms: ${error.message || error}`);
      throw error;
    }
  }

  static async refreshToken(): Promise<void> {
    try {
      await this.performTokenRefresh();
    } catch (error) {
      console.error('[ApiClient] Failed to refresh token:', error);
      throw error;
    }
  }

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

  static async syncReminders(reminders: any[]): Promise<void> {
    let profile;
    try {
      profile = await this.getProfile();
    } catch (error: any) {
      if (error.message?.includes('404')) {
        console.log('[ApiClient] No profile found - creating new profile with reminders');
        await this.updateProfile({
          nickname: 'User',
          avatarType: 'boy',
          avatarId: 'default',
          schedule: { customReminders: reminders },
        });
        return;
      }
      throw error;
    }

    const schedule = profile.schedule || {};
    schedule.customReminders = reminders;
    await this.updateProfile({
      nickname: profile.nickname,
      avatarType: profile.avatarType,
      avatarId: profile.avatarId,
      notifications: profile.notifications || {},
      schedule,
    });
  }

  static async getReminders(): Promise<any[]> {
    try {
      const profile = await this.getProfile();
      return profile.schedule?.customReminders || [];
    } catch (error: any) {
      if (error.message?.includes('404')) {
        console.log('[ApiClient] No profile found - returning empty reminders');
        return [];
      }
      throw error;
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    const accessToken = await SecureStorage.getAccessToken();
    const refreshToken = await SecureStorage.getRefreshToken();

    if (!accessToken || !refreshToken) {
      console.log('[ApiClient] No tokens - not authenticated');
      return false;
    }
    if (!this.isTokenExpired(accessToken)) {
      console.log('[ApiClient] Token valid - authenticated');
      return true;
    }

    try {
      console.log('[ApiClient] Token expired - refreshing...');
      await this.ensureValidToken();
      console.log('[ApiClient] Token refresh successful');
      return true;
    } catch (error) {
      console.log('[ApiClient] Token refresh failed - login required');
      return false;
    }
  }

  static async logout(): Promise<void> {
    const refreshToken = await SecureStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await fetch(`${GATEWAY_URL}/auth/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error('Failed to revoke tokens on backend:', error);
      }
    }
    await SecureStorage.clearAuthData();
  }

  static async getBatchSignedUrls(paths: string[]): Promise<{
    urls: Array<{ path: string; signedUrl: string; expiresAt: number }>;
    failed: string[];
  }> {
    return this.request('/api/assets/batch-urls', {
      method: 'POST',
      body: JSON.stringify({ paths }),
    });
  }

  static async getDeltaContent(
    clientVersion: number,
    storyChecksums: Record<string, string>
  ): Promise<{
    serverVersion: number;
    assetVersion: number;
    stories: any[];
    deletedStoryIds: string[];
    storyChecksums: Record<string, string>;
    totalStories: number;
    updatedCount: number;
    lastUpdated: number;
  }> {
    return this.request('/api/stories/delta', {
      method: 'POST',
      body: JSON.stringify({
        clientVersion,
        storyChecksums,
      }),
    });
  }

  static async getContentVersion(): Promise<{
    id: string;
    version: number;
    assetVersion: number;
    lastUpdated: number;
    storyChecksums: Record<string, string>;
    totalStories: number;
  }> {
    return this.request('/api/stories/version', { method: 'GET' }, 5000);
  }
}
