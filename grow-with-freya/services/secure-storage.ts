/**
 * Secure Storage Service
 * Enterprise-grade secure storage using Expo SecureStore with encryption
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { JWTToken, UserProfile, DeviceInfo } from '../types/auth';

// Storage Keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_PROFILE: 'auth_user_profile',
  DEVICE_ID: 'device_id',
  SESSION_ID: 'session_id',
  BIOMETRIC_KEY: 'biometric_key',
  ENCRYPTION_KEY: 'encryption_key',
} as const;

// Storage Options
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: false, // Set to true for biometric protection
  authenticationPrompt: 'Authenticate to access your account',
  keychainService: 'com.growwithfreya.app.keychain',
  touchID: true,
  showModal: true,
};

// Biometric Options (for sensitive data)
const BIOMETRIC_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  authenticationPrompt: 'Authenticate to access your secure data',
  keychainService: 'com.growwithfreya.app.biometric',
  touchID: true,
  faceID: true,
  showModal: true,
};

class SecureStorageService {
  private static instance: SecureStorageService;
  private encryptionKey: string | null = null;

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  /**
   * Initialize the secure storage service
   */
  async initialize(): Promise<void> {
    try {
      // Generate or retrieve encryption key
      await this.initializeEncryptionKey();
      
      // Generate device ID if not exists
      await this.initializeDeviceId();
      
      console.log('SecureStorageService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SecureStorageService:', error);
      throw error;
    }
  }

  /**
   * Store JWT tokens securely
   */
  async storeTokens(tokens: JWTToken): Promise<void> {
    try {
      const encryptedAccessToken = await this.encrypt(tokens.accessToken);
      const encryptedRefreshToken = await this.encrypt(tokens.refreshToken);
      
      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, encryptedAccessToken, SECURE_OPTIONS),
        SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, encryptedRefreshToken, BIOMETRIC_OPTIONS),
      ]);
      
      console.log('Tokens stored securely');
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw error;
    }
  }

  /**
   * Retrieve JWT tokens
   */
  async getTokens(): Promise<JWTToken | null> {
    try {
      const [encryptedAccessToken, encryptedRefreshToken] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN, SECURE_OPTIONS),
        SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN, BIOMETRIC_OPTIONS),
      ]);

      if (!encryptedAccessToken || !encryptedRefreshToken) {
        return null;
      }

      const accessToken = await this.decrypt(encryptedAccessToken);
      const refreshToken = await this.decrypt(encryptedRefreshToken);

      // Parse JWT to get expiration
      const payload = this.parseJWT(accessToken);
      
      return {
        accessToken,
        refreshToken,
        expiresAt: payload.exp * 1000, // Convert to milliseconds
        tokenType: 'Bearer',
        scope: payload.scope || [],
      };
    } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      return null;
    }
  }

  /**
   * Store user profile
   */
  async storeUserProfile(profile: UserProfile): Promise<void> {
    try {
      const encryptedProfile = await this.encrypt(JSON.stringify(profile));
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_PROFILE, encryptedProfile, SECURE_OPTIONS);
      console.log('User profile stored securely');
    } catch (error) {
      console.error('Failed to store user profile:', error);
      throw error;
    }
  }

  /**
   * Retrieve user profile
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const encryptedProfile = await SecureStore.getItemAsync(STORAGE_KEYS.USER_PROFILE, SECURE_OPTIONS);
      
      if (!encryptedProfile) {
        return null;
      }

      const profileJson = await this.decrypt(encryptedProfile);
      return JSON.parse(profileJson) as UserProfile;
    } catch (error) {
      console.error('Failed to retrieve user profile:', error);
      return null;
    }
  }

  /**
   * Get device ID
   */
  async getDeviceId(): Promise<string> {
    try {
      let deviceId = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_ID, SECURE_OPTIONS);
      
      if (!deviceId) {
        deviceId = await this.generateDeviceId();
        await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_ID, deviceId, SECURE_OPTIONS);
      }
      
      return deviceId;
    } catch (error) {
      console.error('Failed to get device ID:', error);
      throw error;
    }
  }

  /**
   * Store session ID
   */
  async storeSessionId(sessionId: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.SESSION_ID, sessionId, SECURE_OPTIONS);
    } catch (error) {
      console.error('Failed to store session ID:', error);
      throw error;
    }
  }

  /**
   * Get session ID
   */
  async getSessionId(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.SESSION_ID, SECURE_OPTIONS);
    } catch (error) {
      console.error('Failed to get session ID:', error);
      return null;
    }
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
        SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
        SecureStore.deleteItemAsync(STORAGE_KEYS.USER_PROFILE),
        SecureStore.deleteItemAsync(STORAGE_KEYS.SESSION_ID),
        // Keep device ID for analytics
      ]);
      
      console.log('All secure data cleared');
    } catch (error) {
      console.error('Failed to clear secure data:', error);
      throw error;
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      return await SecureStore.isAvailableAsync();
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
      return false;
    }
  }

  // Private Methods

  private async initializeEncryptionKey(): Promise<void> {
    try {
      let key = await SecureStore.getItemAsync(STORAGE_KEYS.ENCRYPTION_KEY, SECURE_OPTIONS);
      
      if (!key) {
        key = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${Date.now()}-${Math.random()}-${await this.getDeviceId()}`,
          { encoding: Crypto.CryptoEncoding.HEX }
        );
        await SecureStore.setItemAsync(STORAGE_KEYS.ENCRYPTION_KEY, key, SECURE_OPTIONS);
      }
      
      this.encryptionKey = key;
    } catch (error) {
      console.error('Failed to initialize encryption key:', error);
      throw error;
    }
  }

  private async initializeDeviceId(): Promise<void> {
    const deviceId = await this.getDeviceId();
    console.log('Device ID initialized:', deviceId.substring(0, 8) + '...');
  }

  private async generateDeviceId(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    const timestamp = Date.now().toString();
    const platform = Platform.OS;
    
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${platform}-${timestamp}-${randomBytes.join('')}`,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
  }

  private async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    
    // Simple XOR encryption (in production, use proper AES encryption)
    const key = this.encryptionKey;
    let encrypted = '';
    
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return Buffer.from(encrypted, 'binary').toString('base64');
  }

  private async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    
    const key = this.encryptionKey;
    const encrypted = Buffer.from(encryptedData, 'base64').toString('binary');
    let decrypted = '';
    
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(
        encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return decrypted;
  }

  private parseJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to parse JWT:', error);
      return {};
    }
  }
}

export default SecureStorageService;
