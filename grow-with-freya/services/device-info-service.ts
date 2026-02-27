import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEVICE_ID_KEY = 'device_unique_id';

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

export class DeviceInfoService {
  private static deviceId: string | null = null;
  private static isInitialized = false;

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

  static getDeviceId(): string {
    if (!this.deviceId) {
      console.warn('DeviceInfoService not initialized, returning placeholder');
      return 'not-initialized';
    }
    return this.deviceId;
  }

  static getDeviceType(): string {
    if (!Device.deviceType) {
      return 'unknown';
    }

    switch (Device.deviceType) {
      case Device.DeviceType.PHONE:
        return 'mobile';
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

  static getPlatform(): string {
    return Platform.OS;
  }

  static getAppVersion(): string {
    // expoConfig is the primary source in modern Expo
    if (Constants.expoConfig?.version) {
      return Constants.expoConfig.version;
    }
    // Fallback for older Expo versions - use type assertion for legacy manifest
    const manifest = Constants.manifest as Record<string, unknown> | null;
    if (manifest?.version && typeof manifest.version === 'string') {
      return manifest.version;
    }
    // manifest2 fallback for EAS builds
    const manifest2Version = Constants.manifest2?.extra?.expoClient?.version;
    if (manifest2Version) {
      return manifest2Version;
    }
    return '1.1.0';
  }

  static getOsVersion(): string {
    return Device.osVersion || 'Unknown';
  }

  static getBrand(): string {
    return Device.brand || 'Unknown';
  }

  static getManufacturer(): string {
    return Device.manufacturer || 'Unknown';
  }

  static getDeviceHeaders(): Record<string, string> {
    const headers = {
      'X-Device-ID': this.getDeviceId(),
      'X-Device-Type': this.getDeviceType(),
      'X-Client-Platform': this.getPlatform(),
      'X-Client-Version': this.getAppVersion(),  // Server requires X-Client-Version
      'X-App-Version': this.getAppVersion(),     // Also send X-App-Version for backwards compatibility
      'X-OS-Version': this.getOsVersion(),
      'X-Device-Brand': this.getBrand(),
      'X-Device-Manufacturer': this.getManufacturer(),
    };
    return headers;
  }
}

