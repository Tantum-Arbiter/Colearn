import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEVICE_ID_KEY = 'device_unique_id';

/**
 * COPPA-Compliant Device Information Service
 *
 * This service collects ONLY the minimum device data required for:
 * - Session management (anonymous device ID)
 * - UX optimization (phone vs tablet)
 * - App functionality (platform)
 * - Debugging (app version, OS version, brand, manufacturer)
 *
 * We do NOT collect:
 * - Device model name (fingerprinting risk)
 * - Device name (often contains user's real name)
 * - Location, advertising IDs, or any PII
 */

/**
 * Generate a UUID v4 without external dependencies
 * Uses crypto.getRandomValues when available, falls back to Math.random
 */
function generateUUID(): string {
  // Use crypto.getRandomValues if available (React Native supports this)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Set version (4) and variant (8, 9, a, or b)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  // Fallback to Math.random (less secure but works everywhere)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Device information service for collecting device metadata
 * Used for session tracking and analytics
 */
export class DeviceInfoService {
  private static deviceId: string | null = null;
  private static isInitialized = false;

  /**
   * Initialize the device info service
   * Should be called early in app startup
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      this.deviceId = await this.getOrCreateDeviceId();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize DeviceInfoService:', error);
      // Generate a fallback device ID if secure store fails
      this.deviceId = `fallback-${generateUUID()}`;
      this.isInitialized = true;
    }
  }

  /**
   * Get or create a persistent device ID
   * Stored in SecureStore so it survives app reinstalls on iOS
   */
  private static async getOrCreateDeviceId(): Promise<string> {
    try {
      const existingId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (existingId) {
        return existingId;
      }

      // Generate new UUID for this device
      const newId = generateUUID();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, newId);
      return newId;
    } catch (error) {
      console.error('Failed to get/create device ID:', error);
      throw error;
    }
  }

  /**
   * Get the device ID (must call initialize first)
   */
  static getDeviceId(): string {
    if (!this.deviceId) {
      console.warn('DeviceInfoService not initialized, returning placeholder');
      return 'not-initialized';
    }
    return this.deviceId;
  }

  /**
   * Get device type: phone, tablet, desktop, tv, or unknown
   */
  static getDeviceType(): string {
    if (!Device.deviceType) {
      return 'unknown';
    }

    switch (Device.deviceType) {
      case Device.DeviceType.PHONE:
        return 'phone';
      case Device.DeviceType.TABLET:
        return 'tablet';
      case Device.DeviceType.DESKTOP:
        return 'desktop';
      case Device.DeviceType.TV:
        return 'tv';
      default:
        return 'unknown';
    }
  }

  /**
   * Get platform: ios, android, or web
   */
  static getPlatform(): string {
    return Platform.OS;
  }

  /**
   * Get app version from Constants
   * Tries multiple sources for compatibility with different Expo environments
   */
  static getAppVersion(): string {
    return Constants.expoConfig?.version
      || Constants.manifest?.version
      || Constants.manifest2?.extra?.expoClient?.version
      || '1.0.1';
  }

  /**
   * Get OS version (useful for debugging compatibility issues)
   */
  static getOsVersion(): string {
    return Device.osVersion || 'Unknown';
  }

  /**
   * Get device brand (e.g., "Apple", "Samsung")
   * Useful for debugging device-specific issues
   */
  static getBrand(): string {
    return Device.brand || 'Unknown';
  }

  /**
   * Get device manufacturer (e.g., "Apple", "Samsung")
   * Useful for debugging device-specific issues
   */
  static getManufacturer(): string {
    return Device.manufacturer || 'Unknown';
  }

  /**
   * Get all device info as an object for API headers
   * Only includes COPPA-compliant, non-PII data
   */
  static getDeviceHeaders(): Record<string, string> {
    return {
      'X-Device-ID': this.getDeviceId(),
      'X-Device-Type': this.getDeviceType(),
      'X-Client-Platform': this.getPlatform(),
      'X-App-Version': this.getAppVersion(),
      'X-OS-Version': this.getOsVersion(),
      'X-Device-Brand': this.getBrand(),
      'X-Device-Manufacturer': this.getManufacturer(),
    };
  }
}

