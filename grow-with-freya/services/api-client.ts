import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { SecureStorage } from './secure-storage';
import { DeviceInfoService } from './device-info-service';
import { reportSessionLapse } from './session-lapse';
import { Logger } from '@/utils/logger';

const log = Logger.create('API');

export class ApiError extends Error {
  constructor(readonly status: number, readonly body: unknown) {
    super(`API request failed: ${status}`);
    this.name = 'ApiError';
  }
}

async function failure(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null);
  return new ApiError(response.status, body);
}

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
      log.error('Failed to decode token:', error);
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
      await this.refreshPromise;
      return await SecureStorage.getAccessToken();
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      await this.refreshPromise;
      return await SecureStorage.getAccessToken();
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private static async performTokenRefresh(): Promise<any> {
    const refreshToken = await SecureStorage.getRefreshToken();

    if (!refreshToken) {
      log.warn('No refresh token - login required');
      await SecureStorage.clearAuthData();
      reportSessionLapse();
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
        log.warn(`Token refresh failed: ${response.status}`);
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
        log.warn(`Token refresh timeout after ${TOKEN_REFRESH_TIMEOUT_MS}ms`);
        throw new Error('Token refresh timeout - please try again');
      }
      if (error.message?.includes('No refresh token') ||
          error.message?.includes('Token refresh failed')) {
        await SecureStorage.clearAuthData();
        reportSessionLapse();
      }
      throw error;
    }
  }

  static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
    { deviceHeaders = true }: { deviceHeaders?: boolean } = {}
  ): Promise<T> {
    const accessToken = await this.ensureValidToken();

    if (!accessToken) {
      throw new Error('Not authenticated - please login');
    }
    const headers = {
      'Content-Type': 'application/json',
      ...(deviceHeaders ? DeviceInfoService.getDeviceHeaders() : {}),
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const requestStartTime = Date.now();
    const method = options.method || 'GET';

    log.debug(`${method} ${endpoint}`);

    try {
      const response = await fetch(`${GATEWAY_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const durationMs = Date.now() - requestStartTime;
      log.debug(`${response.status} in ${durationMs}ms`);

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
              throw await failure(retryResponse);
            }

            return retryResponse.status === 204 ? (undefined as T) : await retryResponse.json();
          } finally {
            clearTimeout(retryTimeoutId);
          }
        } catch (error: any) {
          if (error.message?.includes('Token refresh failed') ||
              error.message?.includes('No refresh token')) {
            await SecureStorage.clearAuthData();
            reportSessionLapse();
            throw new Error('Authentication failed - please login again');
          }
          throw error;
        }
      }

      if (!response.ok) {
        throw await failure(response);
      }

      return response.status === 204 ? (undefined as T) : await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - requestStartTime;
      if (error.name === 'AbortError') {
        log.warn(`Timeout after ${durationMs}ms: ${endpoint}`);
        throw new Error(`Request timeout after ${timeoutMs}ms: ${endpoint}`);
      }
      log.warn(`Failed after ${durationMs}ms: ${error.message || error}`);
      throw error;
    }
  }

  static async refreshToken(): Promise<void> {
    try {
      await this.performTokenRefresh();
    } catch (error) {
      log.error('Failed to refresh token:', error);
      throw error;
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    const accessToken = await SecureStorage.getAccessToken();
    const refreshToken = await SecureStorage.getRefreshToken();

    if (!accessToken || !refreshToken) {
      log.debug('No tokens - not authenticated');
      return false;
    }
    if (!this.isTokenExpired(accessToken)) {
      return true;
    }

    try {
      log.debug('Token expired - refreshing...');
      await this.ensureValidToken();
      log.debug('Token refreshed');
      return true;
    } catch {
      log.warn('Token refresh failed - login required');
      return false;
    }
  }

  static async deleteAccount(): Promise<{ status: string; message: string }> {
    return this.request('/api/account', { method: 'DELETE' });
  }

  static async logout(): Promise<void> {
    const refreshToken = await SecureStorage.getRefreshToken();
    await SecureStorage.clearAuthData();
    if (refreshToken) {
      fetch(`${GATEWAY_URL}/auth/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      }).catch((error) => log.error('Failed to revoke tokens:', error));
    }
  }

}
