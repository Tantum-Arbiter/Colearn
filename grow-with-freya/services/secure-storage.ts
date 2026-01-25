import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export class SecureStorage {
  private static readonly ACCESS_TOKEN_KEY = 'auth_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'auth_refresh_token';
  private static readonly USER_DATA_KEY = 'auth_user_data';

  static async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await Promise.all([
        SecureStore.setItemAsync(this.ACCESS_TOKEN_KEY, accessToken),
        SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, refreshToken),
      ]);
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw new Error('Token storage failed');
    }
  }

  static async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve access token:', error);
      return null;
    }
  }

  static async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error);
      return null;
    }
  }

  static async storeUserData(userData: {
    id: string;
    email: string;
    name: string;
    provider: string;
  }): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.USER_DATA_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to store user data:', error);
      throw new Error('User data storage failed');
    }
  }

  static async getUserData(): Promise<{
    id: string;
    email: string;
    name: string;
    provider: string;
  } | null> {
    try {
      const data = await SecureStore.getItemAsync(this.USER_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to retrieve user data:', error);
      return null;
    }
  }

  static async clearAuthData(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(this.ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(this.REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(this.USER_DATA_KEY),
      ]);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
      throw new Error('Failed to clear authentication data');
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      return accessToken !== null;
    } catch (error) {
      console.error('Failed to check authentication status:', error);
      return false;
    }
  }
}

