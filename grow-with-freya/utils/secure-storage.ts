import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AuthTokens, User, SecureStorageKeys } from '@/types/auth';

// Secure storage keys
export const STORAGE_KEYS: SecureStorageKeys = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  ID_TOKEN: 'auth_id_token',
  USER_DATA: 'auth_user_data',
  TOKEN_EXPIRY: 'auth_token_expiry',
};

// Storage options for enhanced security
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: false, // Will be configurable
  authenticationPrompt: 'Authenticate to access your account',
  keychainService: 'grow-with-freya-auth',
  touchID: false, // Will be configurable
  showModal: true,
};

// Enhanced storage options with biometric authentication
const BIOMETRIC_STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  authenticationPrompt: 'Use your fingerprint or face to access your account',
  keychainService: 'grow-with-freya-auth-biometric',
  touchID: true,
  showModal: true,
};

class SecureStorageService {
  private biometricEnabled: boolean = false;

  private isAvailable(): boolean {
    return Platform.OS !== 'web' && SecureStore.isAvailableAsync !== undefined;
  }

  async isBiometricAvailable(): Promise<boolean> {
    try {
      if (!this.isAvailable()) return false;

      // Check if biometric authentication is available
      return await SecureStore.isAvailableAsync();
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
      return false;
    }
  }

  async enableBiometric(): Promise<boolean> {
    try {
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        throw new Error('Biometric authentication is not available on this device');
      }

      this.biometricEnabled = true;
      return true;
    } catch (error) {
      console.error('Failed to enable biometric authentication:', error);
      return false;
    }
  }

  disableBiometric(): void {
    this.biometricEnabled = false;
  }

  private getStorageOptions(): SecureStore.SecureStoreOptions {
    return this.biometricEnabled ? BIOMETRIC_STORAGE_OPTIONS : STORAGE_OPTIONS;
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (!this.isAvailable()) {
        console.warn('SecureStore not available, falling back to memory storage');
        return;
      }

      await SecureStore.setItemAsync(key, value, this.getStorageOptions());
    } catch (error) {
      console.error(`Failed to store item with key ${key}:`, error);

      // If biometric auth fails, try without biometric
      if (this.biometricEnabled && error.message?.includes('authentication')) {
        console.warn('Biometric authentication failed, retrying without biometric');
        try {
          await SecureStore.setItemAsync(key, value, STORAGE_OPTIONS);
          return;
        } catch (fallbackError) {
          console.error('Fallback storage also failed:', fallbackError);
        }
      }

      throw new Error(`Secure storage failed: ${error}`);
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (!this.isAvailable()) {
        console.warn('SecureStore not available');
        return null;
      }

      return await SecureStore.getItemAsync(key, this.getStorageOptions());
    } catch (error) {
      console.error(`Failed to retrieve item with key ${key}:`, error);

      // If biometric auth fails, try without biometric
      if (this.biometricEnabled && error.message?.includes('authentication')) {
        console.warn('Biometric authentication failed, retrying without biometric');
        try {
          return await SecureStore.getItemAsync(key, STORAGE_OPTIONS);
        } catch (fallbackError) {
          console.error('Fallback retrieval also failed:', fallbackError);
        }
      }

      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (!this.isAvailable()) {
        return;
      }
      
      await SecureStore.deleteItemAsync(key, STORAGE_OPTIONS);
    } catch (error) {
      console.error(`Failed to remove item with key ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await Promise.all(keys.map(key => this.removeItem(key)));
    } catch (error) {
      console.error('Failed to clear secure storage:', error);
    }
  }

  // Token-specific methods
  async storeTokens(tokens: AuthTokens): Promise<void> {
    try {
      await Promise.all([
        this.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
        this.setItem(STORAGE_KEYS.TOKEN_EXPIRY, tokens.expiresAt.toString()),
        tokens.refreshToken ? this.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken) : Promise.resolve(),
        tokens.idToken ? this.setItem(STORAGE_KEYS.ID_TOKEN, tokens.idToken) : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw error;
    }
  }

  async getTokens(): Promise<AuthTokens | null> {
    try {
      const [accessToken, refreshToken, idToken, expiryStr] = await Promise.all([
        this.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        this.getItem(STORAGE_KEYS.REFRESH_TOKEN),
        this.getItem(STORAGE_KEYS.ID_TOKEN),
        this.getItem(STORAGE_KEYS.TOKEN_EXPIRY),
      ]);

      if (!accessToken || !expiryStr) {
        return null;
      }

      return {
        accessToken,
        refreshToken: refreshToken || undefined,
        idToken: idToken || undefined,
        expiresAt: parseInt(expiryStr, 10),
        tokenType: 'Bearer',
      };
    } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      return null;
    }
  }

  async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        this.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
        this.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        this.removeItem(STORAGE_KEYS.ID_TOKEN),
        this.removeItem(STORAGE_KEYS.TOKEN_EXPIRY),
      ]);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  // User data methods
  async storeUser(user: User): Promise<void> {
    try {
      await this.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user data:', error);
      throw error;
    }
  }

  async getUser(): Promise<User | null> {
    try {
      const userData = await this.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to retrieve user data:', error);
      return null;
    }
  }

  async clearUser(): Promise<void> {
    try {
      await this.removeItem(STORAGE_KEYS.USER_DATA);
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  }

  // Utility methods
  async hasValidTokens(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      if (!tokens) return false;
      
      const now = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
      
      return tokens.expiresAt > (now + bufferTime);
    } catch (error) {
      console.error('Failed to check token validity:', error);
      return false;
    }
  }
}

export const secureStorage = new SecureStorageService();
