import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Story } from '../types/story';
import { Logger } from '@/utils/logger';

const log = Logger.create('CacheManager');

const STORAGE_KEYS = {
  STORY_CACHE: '@story_cache',
  STORY_METADATA: '@story_cache_metadata',
  ASSET_METADATA: '@asset_cache_metadata',
  ASSET_CHECKSUMS: '@asset_checksums', // Map of assetPath -> expected checksum
};

const CACHE_DIR = `${FileSystem.documentDirectory}content_cache/`;
const ASSETS_DIR = `${CACHE_DIR}assets/`;

export interface CacheMetadata {
  version: number;
  lastUpdated: string;
  totalSize: number;
  itemCount: number;
}

export interface AssetCacheEntry {
  path: string;
  localUri: string;
  checksum: string;
  size: number;
  cachedAt: string;
}

export class CacheManager {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure cache directories exist
      const cacheInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!cacheInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        log.debug('Created cache directory');
      }

      const assetsInfo = await FileSystem.getInfoAsync(ASSETS_DIR);
      if (!assetsInfo.exists) {
        await FileSystem.makeDirectoryAsync(ASSETS_DIR, { intermediates: true });
        log.debug('Created assets directory');
      }

      this.initialized = true;
      log.debug('Cache manager initialized');
    } catch (error) {
      log.error('Failed to initialize cache:', error);
      throw error;
    }
  }

  private static MIN_FREE_SPACE_BYTES = 50 * 1024 * 1024; // 50 MB

  static async getFreeDiskSpace(): Promise<number | null> {
    try {
      const info = await FileSystem.getFreeDiskStorageAsync();
      return info;
    } catch (error) {
      log.warn('Unable to get free disk space:', error);
      return null;
    }
  }

  static async hasEnoughDiskSpace(requiredBytes: number): Promise<boolean | null> {
    const freeSpace = await this.getFreeDiskSpace();
    if (freeSpace === null) {
      return null; // Unable to determine
    }
    // Need required bytes plus minimum buffer
    return freeSpace >= (requiredBytes + this.MIN_FREE_SPACE_BYTES);
  }

  static async checkDiskSpaceForSync(estimatedBytes: number): Promise<void> {
    const freeSpace = await this.getFreeDiskSpace();
    if (freeSpace === null) {
      log.warn('Unable to check disk space - proceeding with sync anyway');
      return;
    }

    const requiredSpace = estimatedBytes + this.MIN_FREE_SPACE_BYTES;
    const freeSpaceMB = Math.round(freeSpace / (1024 * 1024));
    const requiredMB = Math.round(requiredSpace / (1024 * 1024));

    if (freeSpace < requiredSpace) {
      const shortageBytes = requiredSpace - freeSpace;
      const shortageMB = Math.round(shortageBytes / (1024 * 1024));
      throw new Error(
        `Insufficient disk space: ${freeSpaceMB}MB available, need ${requiredMB}MB. ` +
        `Please free up at least ${shortageMB}MB.`
      );
    }

    // Warn if space is getting low (less than 100MB after download)
    const remainingAfter = freeSpace - requiredSpace;
    if (remainingAfter < 100 * 1024 * 1024) {
      log.warn(`Low disk space warning: Only ${Math.round(remainingAfter / (1024 * 1024))}MB will remain after sync`);
    }
  }

  private static readonly WEBP_MAGIC = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
  private static readonly PNG_MAGIC = [0x89, 0x50, 0x4E, 0x47];  // "\x89PNG"
  private static readonly JPEG_MAGIC = [0xFF, 0xD8, 0xFF];        // JPEG SOI marker

  static async validateCachedFile(localUri: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const info = await FileSystem.getInfoAsync(localUri);
      if (!info.exists) {
        return { valid: false, reason: 'File does not exist' };
      }

      // Only validate image files
      const ext = localUri.split('.').pop()?.toLowerCase();
      if (!ext || !['webp', 'png', 'jpg', 'jpeg'].includes(ext)) {
        return { valid: true }; // Skip non-image files
      }

      // Read first 12 bytes to check magic numbers
      const content = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
        length: 12,
        position: 0,
      });

      // Decode base64 to bytes
      const bytes = Uint8Array.from(atob(content), c => c.charCodeAt(0));

      if (ext === 'webp') {
        // WebP starts with "RIFF" and has "WEBP" at offset 8
        const isRiff = this.matchesMagic(bytes, this.WEBP_MAGIC);
        const isWebp = bytes.length >= 12 &&
          bytes[8] === 0x57 && bytes[9] === 0x45 &&
          bytes[10] === 0x42 && bytes[11] === 0x50; // "WEBP"

        if (!isRiff || !isWebp) {
          const header = String.fromCharCode(...bytes.slice(0, 4));
          return { valid: false, reason: `Invalid WebP header: ${header}` };
        }
      } else if (ext === 'png') {
        if (!this.matchesMagic(bytes, this.PNG_MAGIC)) {
          return { valid: false, reason: 'Invalid PNG header' };
        }
      } else if (ext === 'jpg' || ext === 'jpeg') {
        if (!this.matchesMagic(bytes, this.JPEG_MAGIC)) {
          return { valid: false, reason: 'Invalid JPEG header' };
        }
      }

      return { valid: true };
    } catch (error) {
      log.warn(`Error validating cached file ${localUri}:`, error);
      return { valid: false, reason: `Validation error: ${error}` };
    }
  }

  private static matchesMagic(bytes: Uint8Array, magic: number[]): boolean {
    if (bytes.length < magic.length) return false;
    for (let i = 0; i < magic.length; i++) {
      if (bytes[i] !== magic[i]) return false;
    }
    return true;
  }

  static async validateAndCleanCache(): Promise<{ scanned: number; removed: number; errors: string[] }> {
    const result = { scanned: 0, removed: 0, errors: [] as string[] };

    try {
      await this.initialize();

      const assetsInfo = await FileSystem.getInfoAsync(ASSETS_DIR);
      if (!assetsInfo.exists) {
        log.debug('No assets directory to validate');
        return result;
      }

      // Get all files recursively
      const files = await this.getAllFilesRecursive(ASSETS_DIR);
      result.scanned = files.length;

      log.info(`[Cache Validation] Scanning ${files.length} cached files...`);

      for (const filePath of files) {
        const validation = await this.validateCachedFile(filePath);
        if (!validation.valid) {
          log.warn(`[Cache Validation] Corrupted file detected: ${filePath} - ${validation.reason}`);
          result.errors.push(`${filePath}: ${validation.reason}`);

          try {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
            result.removed++;
            log.info(`[Cache Validation] Removed corrupted file: ${filePath}`);
          } catch (deleteError) {
            log.error(`[Cache Validation] Failed to delete corrupted file: ${filePath}`, deleteError);
          }
        }
      }

      if (result.removed > 0) {
        log.warn(`[Cache Validation] Removed ${result.removed}/${result.scanned} corrupted files`);
      } else {
        log.info(`[Cache Validation] All ${result.scanned} files valid`);
      }

      return result;
    } catch (error) {
      log.error('[Cache Validation] Error during cache validation:', error);
      return result;
    }
  }

  private static async getAllFilesRecursive(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await FileSystem.readDirectoryAsync(dir);

      for (const entry of entries) {
        const fullPath = `${dir}${entry}`;
        const info = await FileSystem.getInfoAsync(fullPath);

        if (info.isDirectory) {
          const subFiles = await this.getAllFilesRecursive(`${fullPath}/`);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      log.warn(`Error reading directory ${dir}:`, error);
    }

    return files;
  }

  // Use StoryLoader.getStories() for display - this returns raw data for sync
  static async getStories(): Promise<Story[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.STORY_CACHE);
      if (!data) {
        log.debug('No stories in cache');
        return [];
      }
      const stories: Story[] = JSON.parse(data);
      log.debug(`Retrieved ${stories.length} stories from cache`);
      return stories;
    } catch (error) {
      log.error('Error reading stories from cache:', error);
      return [];
    }
  }

  static async getStoriesWithResolvedUrls(): Promise<Story[]> {
    const stories = await this.getStories();
    const resolvedStories = await Promise.all(
      stories.map(story => this.resolveStoryAssetUrls(story))
    );
    log.debug(`Resolved URLs for ${resolvedStories.length} stories`);
    return resolvedStories;
  }

  private static async resolveStoryAssetUrls(story: Story): Promise<Story> {
    const resolved = { ...story };

    // Resolve cover image
    if (typeof resolved.coverImage === 'string') {
      resolved.coverImage = await this.resolveAssetUrl(resolved.coverImage);
    }

    // Resolve page images
    if (resolved.pages) {
      resolved.pages = await Promise.all(
        resolved.pages.map(async (page) => {
          const resolvedPage = { ...page };

          // Resolve background image
          if (typeof resolvedPage.backgroundImage === 'string') {
            resolvedPage.backgroundImage = await this.resolveAssetUrl(resolvedPage.backgroundImage);
          }

          // Resolve character image
          if (typeof resolvedPage.characterImage === 'string') {
            resolvedPage.characterImage = await this.resolveAssetUrl(resolvedPage.characterImage);
          }

          // Resolve interactive element images
          if (resolvedPage.interactiveElements) {
            resolvedPage.interactiveElements = await Promise.all(
              resolvedPage.interactiveElements.map(async (element) => {
                if (typeof element.image === 'string') {
                  return { ...element, image: await this.resolveAssetUrl(element.image) };
                }
                return element;
              })
            );
          }

          return resolvedPage;
        })
      );
    }

    return resolved;
  }

  private static async resolveAssetUrl(url: string): Promise<string> {
    if (!url) return url;

    // Already a local file path
    if (url.startsWith('file://')) {
      return url;
    }

    // Extract asset path from URL
    let assetPath = url;

    // Handle full API URLs: https://api.../api/assets/stories/...
    if (url.includes('/api/assets/')) {
      const match = url.match(/\/api\/assets\/(.+)/);
      if (match) {
        assetPath = match[1];
      }
    }
    // Handle paths that start with "assets/"
    else if (url.startsWith('assets/')) {
      assetPath = url.substring(7); // Remove "assets/" prefix
    }
    // Handle paths that start with "stories/"
    else if (url.startsWith('stories/')) {
      assetPath = url;
    }
    // Not a recognized asset path format
    else if (url.startsWith('http://') || url.startsWith('https://')) {
      // Unknown URL format, return as-is
      return url;
    }

    // Build local path and check if file exists
    const localPath = `${ASSETS_DIR}${assetPath}`;

    try {
      const info = await FileSystem.getInfoAsync(localPath);
      if (info.exists) {
        return localPath;
      }
    } catch {
      // File doesn't exist or error checking
    }

    // Not cached, return original URL
    return url;
  }

  static async getStory(storyId: string): Promise<Story | null> {
    const stories = await this.getStories();
    return stories.find(s => s.id === storyId) || null;
  }

  static async saveStories(stories: Story[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STORY_CACHE, JSON.stringify(stories));
      
      // Update metadata
      const metadata: CacheMetadata = {
        version: Date.now(),
        lastUpdated: new Date().toISOString(),
        totalSize: JSON.stringify(stories).length,
        itemCount: stories.length,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.STORY_METADATA, JSON.stringify(metadata));
      
      log.debug(`Saved ${stories.length} stories to cache`);
    } catch (error) {
      log.error('Error saving stories to cache:', error);
      throw error;
    }
  }

  static async updateStories(updatedStories: Story[]): Promise<void> {
    const existing = await this.getStories();
    const existingMap = new Map(existing.map(s => [s.id, s]));
    
    // Merge updates
    for (const story of updatedStories) {
      existingMap.set(story.id, story);
    }
    
    await this.saveStories(Array.from(existingMap.values()));
  }

  static async removeStories(storyIds: string[]): Promise<void> {
    const existing = await this.getStories();
    const idsToRemove = new Set(storyIds);
    const remaining = existing.filter(s => !idsToRemove.has(s.id));
    await this.saveStories(remaining);
    log.debug(`Removed ${storyIds.length} stories from cache`);
  }

  static async getStoryMetadata(): Promise<CacheMetadata | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.STORY_METADATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      log.error('Error reading story metadata:', error);
      return null;
    }
  }

  static async getAssetUri(assetPath: string): Promise<string | null> {
    await this.initialize();

    const localPath = this.getLocalAssetPath(assetPath);
    const info = await FileSystem.getInfoAsync(localPath);

    if (info.exists) {
      return localPath;
    }
    return null;
  }

  static async saveAsset(assetPath: string, data: string, checksum?: string): Promise<string> {
    await this.initialize();

    const localPath = this.getLocalAssetPath(assetPath);

    // Ensure parent directory exists
    const parentDir = localPath.substring(0, localPath.lastIndexOf('/'));
    const parentInfo = await FileSystem.getInfoAsync(parentDir);
    if (!parentInfo.exists) {
      await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
    }

    await FileSystem.writeAsStringAsync(localPath, data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    log.debug(`Cached asset: ${assetPath}`);
    return localPath;
  }

  static async downloadAndCacheAsset(
    url: string,
    assetPath: string,
    checksum?: string
  ): Promise<string> {
    await this.initialize();

    const localPath = this.getLocalAssetPath(assetPath);

    // Ensure parent directory exists
    const parentDir = localPath.substring(0, localPath.lastIndexOf('/'));
    const parentInfo = await FileSystem.getInfoAsync(parentDir);
    if (!parentInfo.exists) {
      await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
    }

    // Download the file
    const downloadResult = await FileSystem.downloadAsync(url, localPath);

    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download asset: ${downloadResult.status}`);
    }

    log.debug(`Downloaded and cached asset: ${assetPath}`);
    return localPath;
  }

  static async hasAsset(assetPath: string): Promise<boolean> {
    const uri = await this.getAssetUri(assetPath);
    return uri !== null;
  }

  static async removeAsset(assetPath: string): Promise<void> {
    const localPath = this.getLocalAssetPath(assetPath);
    const info = await FileSystem.getInfoAsync(localPath);

    if (info.exists) {
      await FileSystem.deleteAsync(localPath);
      log.debug(`Removed cached asset: ${assetPath}`);
    }
  }

  // Strips "assets/" prefix since ASSETS_DIR already contains it
  private static getLocalAssetPath(assetPath: string): string {
    // Strip leading slashes
    let normalizedPath = assetPath.replace(/^\/+/, '');

    // Strip "assets/" prefix if present (CMS paths include this)
    if (normalizedPath.startsWith('assets/')) {
      normalizedPath = normalizedPath.substring(7);
    }

    return `${ASSETS_DIR}${normalizedPath}`;
  }

  static async getCacheSize(): Promise<number> {
    await this.initialize();

    try {
      const info = await FileSystem.getInfoAsync(CACHE_DIR);
      return info.exists && 'size' in info ? info.size || 0 : 0;
    } catch (error) {
      log.error('Error getting cache size:', error);
      return 0;
    }
  }

  static async clearAll(): Promise<void> {
    try {
      // Clear AsyncStorage items
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.STORY_CACHE,
        STORAGE_KEYS.STORY_METADATA,
        STORAGE_KEYS.ASSET_METADATA,
      ]);

      // Clear file system cache
      const info = await FileSystem.getInfoAsync(CACHE_DIR);
      if (info.exists) {
        await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      }

      this.initialized = false;
      log.debug('Cleared all cache');
    } catch (error) {
      log.error('Error clearing cache:', error);
      throw error;
    }
  }

  static async getStats(): Promise<{
    storyCount: number;
    cacheSize: number;
    lastUpdated: string | null;
  }> {
    const stories = await this.getStories();
    const metadata = await this.getStoryMetadata();
    const size = await this.getCacheSize();

    return {
      storyCount: stories.length,
      cacheSize: size,
      lastUpdated: metadata?.lastUpdated || null,
    };
  }

  static async getCacheMetadata(): Promise<{
    storyVersion: number;
    assetVersion: number;
    storyCount: number;
    assetCount: number;
    totalSizeBytes: number;
    lastUpdated: string | null;
    storyChecksums: Record<string, string>;
  }> {
    const storyMetadata = await this.getStoryMetadata();
    const stories = await this.getStories();
    const checksums = await this.getAssetChecksums();
    const size = await this.getCacheSize();

    // Build story checksums map
    const storyChecksums: Record<string, string> = {};
    for (const story of stories) {
      if (story.checksum) {
        storyChecksums[story.id] = story.checksum;
      }
    }

    return {
      storyVersion: storyMetadata?.version || 0,
      assetVersion: 0, // Asset version tracked separately by VersionManager
      storyCount: stories.length,
      assetCount: Object.keys(checksums).length,
      totalSizeBytes: size,
      lastUpdated: storyMetadata?.lastUpdated || null,
      storyChecksums,
    };
  }

  static async checkAssetsExist(assetPaths: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    // Check in parallel for better performance
    const checks = await Promise.all(
      assetPaths.map(async (path) => {
        const exists = await this.hasAsset(path);
        return { path, exists };
      })
    );

    for (const { path, exists } of checks) {
      results.set(path, exists);
    }

    return results;
  }

  static async getCachedAssetPaths(): Promise<string[]> {
    await this.initialize();

    try {
      const files = await this.getAllFilesRecursive(ASSETS_DIR);
      // Convert absolute paths to relative asset paths
      return files.map(file => file.replace(ASSETS_DIR, ''));
    } catch (error) {
      log.error('Error getting cached asset paths:', error);
      return [];
    }
  }

  static async batchSaveStories(stories: Story[]): Promise<void> {
    if (stories.length === 0) return;

    const existing = await this.getStories();
    const existingMap = new Map(existing.map(s => [s.id, s]));

    // Merge all updates
    for (const story of stories) {
      existingMap.set(story.id, story);
    }

    // Save all at once
    await this.saveStories(Array.from(existingMap.values()));
    log.info(`Batch saved ${stories.length} stories`);
  }

  static async setAssetChecksum(assetPath: string, checksum: string): Promise<void> {
    try {
      const checksums = await this.getAssetChecksums();
      checksums[assetPath] = checksum;
      await AsyncStorage.setItem(STORAGE_KEYS.ASSET_CHECKSUMS, JSON.stringify(checksums));
    } catch (error) {
      log.warn('Failed to store asset checksum:', error);
    }
  }

  private static async getAssetChecksums(): Promise<Record<string, string>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ASSET_CHECKSUMS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      log.warn('Failed to read asset checksums:', error);
      return {};
    }
  }

  // Validates file exists and has non-zero size
  static async validateAssetIntegrity(assetPath: string): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const localPath = this.getLocalAssetPath(assetPath);

    try {
      const info = await FileSystem.getInfoAsync(localPath);

      if (!info.exists) {
        return { valid: false, reason: 'File does not exist' };
      }

      // Check if file has content (non-zero size)
      if ('size' in info && info.size === 0) {
        return { valid: false, reason: 'File is empty (0 bytes)' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: `Error checking file: ${error}` };
    }
  }

  static async validateAllAssets(): Promise<{
    totalAssets: number;
    validAssets: number;
    corruptedAssets: string[];
  }> {
    await this.initialize();

    const corruptedAssets: string[] = [];
    let totalAssets = 0;
    let validAssets = 0;

    try {
      // Get all asset paths from stories
      const stories = await this.getStories();
      const assetPaths: string[] = [];

      for (const story of stories) {
        // Cover image (can be string path for CMS stories)
        if (story.coverImage && typeof story.coverImage === 'string') {
          assetPaths.push(story.coverImage);
        }
        if (story.pages) {
          for (const page of story.pages) {
            if (page.backgroundImage) assetPaths.push(page.backgroundImage);
            if (page.characterImage) assetPaths.push(page.characterImage);
            // Interactive element images (props that can be tapped to reveal)
            if (page.interactiveElements) {
              for (const element of page.interactiveElements) {
                if (element.image && typeof element.image === 'string') {
                  assetPaths.push(element.image);
                }
              }
            }
          }
        }
      }

      totalAssets = assetPaths.length;

      for (const assetPath of assetPaths) {
        const result = await this.validateAssetIntegrity(assetPath);
        if (result.valid) {
          validAssets++;
        } else {
          corruptedAssets.push(assetPath);
          log.warn(`Corrupted asset: ${assetPath} - ${result.reason}`);
        }
      }
    } catch (error) {
      log.error('Error validating assets:', error);
    }

    return { totalAssets, validAssets, corruptedAssets };
  }

  static async removeCorruptedAssets(assetPaths: string[]): Promise<number> {
    let removed = 0;

    for (const assetPath of assetPaths) {
      try {
        await this.removeAsset(assetPath);
        removed++;
      } catch (error) {
        log.warn(`Failed to remove corrupted asset: ${assetPath}`, error);
      }
    }

    log.info(`Removed ${removed} corrupted assets from cache`);
    return removed;
  }
}

