import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient } from './api-client';
import { Logger } from '@/utils/logger';

const log = Logger.create('VersionManager');

const STORAGE_KEYS = {
  CONTENT_VERSION: '@content_version',
};

export interface ContentVersion {
  stories: number;
  assets: number;
  lastUpdated: string;
}

export interface VersionCheckResult {
  needsStorySync: boolean;
  needsAssetSync: boolean;
  localVersion: ContentVersion | null;
  serverVersion: ContentVersion | null;
}

interface ServerVersionResponse {
  id: string;           // Always "current"
  version: number;      // Story version - incremented on any story change
  assetVersion: number; // Asset version - incremented on any asset change
  lastUpdated: number;  // Epoch milliseconds
  storyChecksums: Record<string, string>;  // storyId -> SHA-256 checksum
  totalStories: number;
}

export class VersionManager {

  static async getLocalVersion(): Promise<ContentVersion | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CONTENT_VERSION);
      if (!data) {
        log.debug('No local version found');
        return null;
      }
      return JSON.parse(data);
    } catch (error) {
      log.error('Error reading local version:', error);
      return null;
    }
  }

  static async saveLocalVersion(version: ContentVersion): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CONTENT_VERSION, JSON.stringify(version));
      log.debug('Saved local version:', version);
    } catch (error) {
      log.error('Error saving local version:', error);
      throw error;
    }
  }

  static async getServerVersion(): Promise<ContentVersion | null> {
    try {
      // Use short timeout for version check - this is just a quick check
      // If server is slow/unreachable, we should fail fast and use cached content
      const VERSION_CHECK_TIMEOUT_MS = 5000; // 5 seconds

      const response = await ApiClient.request<ServerVersionResponse>(
        '/api/stories/version',
        { method: 'GET' },
        VERSION_CHECK_TIMEOUT_MS
      );

      // Map server response to our ContentVersion format
      // Now properly uses separate story and asset versions
      const version: ContentVersion = {
        stories: response.version,
        assets: response.assetVersion ?? response.version, // Fallback for backwards compatibility
        lastUpdated: new Date(response.lastUpdated).toISOString(),
      };

      log.debug('Server version:', version);
      return version;
    } catch (error) {
      log.warn('Failed to get server version (offline?):', error);
      return null;
    }
  }

  static async checkVersions(): Promise<VersionCheckResult> {
    const localVersion = await this.getLocalVersion();
    const serverVersion = await this.getServerVersion();

    // If we can't reach server, no sync possible
    if (!serverVersion) {
      log.debug('Server unreachable - no sync needed');
      return {
        needsStorySync: false,
        needsAssetSync: false,
        localVersion,
        serverVersion: null,
      };
    }

    // If no local version, full sync needed
    if (!localVersion) {
      log.debug('No local version - full sync needed');
      return {
        needsStorySync: true,
        needsAssetSync: true,
        localVersion: null,
        serverVersion,
      };
    }

    // Compare versions
    const needsStorySync = serverVersion.stories > localVersion.stories;
    const needsAssetSync = serverVersion.assets > localVersion.assets;

    log.debug(`Version check: stories ${localVersion.stories} -> ${serverVersion.stories}, assets ${localVersion.assets} -> ${serverVersion.assets}`);
    log.debug(`Sync needed: stories=${needsStorySync}, assets=${needsAssetSync}`);

    return {
      needsStorySync,
      needsAssetSync,
      localVersion,
      serverVersion,
    };
  }

  static async updateLocalVersion(updates: Partial<ContentVersion>): Promise<void> {
    const current = await this.getLocalVersion() || {
      stories: 0,
      assets: 0,
      lastUpdated: new Date().toISOString(),
    };

    const updated: ContentVersion = {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    await this.saveLocalVersion(updated);
  }

  static async clearLocalVersion(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CONTENT_VERSION);
      log.debug('Cleared local version');
    } catch (error) {
      log.error('Error clearing local version:', error);
    }
  }
}

