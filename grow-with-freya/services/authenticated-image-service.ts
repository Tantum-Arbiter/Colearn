import { ApiClient } from './api-client';
import * as FileSystem from 'expo-file-system/legacy';

interface SignedUrlResponse {
  path: string;
  signedUrl: string;
}

// Minimum valid image file size in bytes (100 bytes - a valid image should be larger)
const MIN_VALID_FILE_SIZE = 100;

// WebP magic bytes for validation
const WEBP_MAGIC = 'RIFF';
const WEBP_MAGIC_OFFSET_4 = 'WEBP';

/**
 * Service for downloading and caching images that require authentication
 * Downloads images with auth token and caches them locally
 * Includes file validation to prevent corrupted images from being served
 * Uses in-memory cache for instant subsequent lookups (same performance as local images)
 */
export class AuthenticatedImageService {
  private static readonly CACHE_DIR = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}story-images/`;

  // In-memory cache of verified cached paths for instant lookup
  // Key: remote URL, Value: local cached path
  private static memoryCache: Map<string, string> = new Map();

  // Track in-flight requests to prevent duplicate concurrent downloads
  // Key: remote URL, Value: promise that resolves to cached path or null
  private static inFlightRequests: Map<string, Promise<string | null>> = new Map();

  /**
   * Get a cached URI instantly from memory if available (synchronous check)
   * Returns null if not in memory cache - caller should then use getImageUri
   */
  static getMemoryCachedUri(remoteUrl: string): string | null {
    const cached = this.memoryCache.get(remoteUrl);
    if (cached) {
      // Don't log every hit to reduce noise
      return cached;
    }
    return null;
  }

  /**
   * Pre-populate the memory cache with known cached paths
   * Called after prefetching cover images for instant subsequent display
   */
  static populateMemoryCache(urlToPathMap: Map<string, string>): void {
    let count = 0;
    urlToPathMap.forEach((localPath, remoteUrl) => {
      this.memoryCache.set(remoteUrl, localPath);
      count++;
    });
    console.log(`[AuthImageService] Memory cache populated with ${count} entries for instant lookup`);
  }

  /**
   * Get a cached image URI with authentication
   * Downloads and caches the image if not already cached
   * Uses request deduplication to prevent duplicate concurrent downloads
   */
  static async getImageUri(remoteUrl: string): Promise<string | null> {
    // First check memory cache for instant return (no async/await)
    const memoryCached = this.memoryCache.get(remoteUrl);
    if (memoryCached) {
      return memoryCached;
    }

    // For non-authenticated URLs, return as-is
    if (!remoteUrl.includes('api.colearnwithfreya.co.uk')) {
      return remoteUrl;
    }

    // Check if there's already an in-flight request for this URL
    const existingRequest = this.inFlightRequests.get(remoteUrl);
    if (existingRequest) {
      console.log(`[AuthImageService] Waiting for in-flight request: ${remoteUrl.split('/').pop()}`);
      return existingRequest;
    }

    // Create and track the new request
    const requestPromise = this.fetchAndCacheImage(remoteUrl);
    this.inFlightRequests.set(remoteUrl, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up in-flight request tracking
      this.inFlightRequests.delete(remoteUrl);
    }
  }

  /**
   * Internal method to actually fetch and cache an image
   */
  private static async fetchAndCacheImage(remoteUrl: string): Promise<string | null> {
    try {

      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!dirInfo.exists) {
        console.log(`[AuthImageService] Creating cache directory: ${this.CACHE_DIR}`);
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      }

      // Generate cache filename from URL
      const cacheFilename = this.getCacheFilename(remoteUrl);
      const cachedPath = `${this.CACHE_DIR}${cacheFilename}`;

      // Check if image is already cached AND valid
      const isValid = await this.validateCachedFile(cachedPath);
      if (isValid) {
        console.log(`[AuthImageService] Using validated cached image: ${cacheFilename}`);
        // Add to memory cache for instant subsequent lookups
        this.memoryCache.set(remoteUrl, cachedPath);
        return cachedPath;
      }

      // Check if file exists at all (even if it failed strict validation)
      // We'll use this as a fallback if we can't authenticate
      const fileInfo = await FileSystem.getInfoAsync(cachedPath);
      const hasAnyCache = fileInfo.exists;

      // Extract asset path from URL
      // URL format: https://api.colearnwithfreya.co.uk/assets/stories/...
      // We need to extract: stories/...
      const assetPath = this.extractAssetPath(remoteUrl);
      if (!assetPath) {
        console.warn(`[AuthImageService] Could not extract asset path from URL: ${remoteUrl}`);
        // If we have any cached file, use it as fallback
        if (hasAnyCache) {
          console.log(`[AuthImageService] Using unvalidated cache as fallback: ${cacheFilename}`);
          return cachedPath;
        }
        return null;
      }

      // Get signed URL from backend
      let signedUrlResponse: SignedUrlResponse | null = null;
      try {
        signedUrlResponse = await ApiClient.request<SignedUrlResponse>(
          `/api/assets/url?path=${encodeURIComponent(assetPath)}`
        );
      } catch (apiCallError) {
        // If auth fails and we have a cached file, use it instead of erroring
        if (hasAnyCache) {
          console.log(`[AuthImageService] Auth failed but using cached file: ${cacheFilename}`);
          return cachedPath;
        }
        // Only log error if we have no fallback
        console.warn(`[AuthImageService] Cannot load image (not authenticated, no cache): ${cacheFilename}`);
        return null;
      }

      if (!signedUrlResponse || !signedUrlResponse.signedUrl) {
        // If no signed URL but we have cache, use it
        if (hasAnyCache) {
          console.log(`[AuthImageService] No signed URL but using cached file: ${cacheFilename}`);
          return cachedPath;
        }
        console.warn(`[AuthImageService] No signed URL returned for: ${assetPath}`);
        return null;
      }

      console.log(`[AuthImageService] Got signed URL, downloading image`);

      // Download using the signed URL (no auth needed, URL is pre-signed)
      const downloadResult = await FileSystem.downloadAsync(
        signedUrlResponse.signedUrl,
        cachedPath
      );

      console.log(`[AuthImageService] Download result status: ${downloadResult.status}`);

      if (downloadResult.status === 200) {
        // Validate the downloaded file
        const isValid = await this.validateCachedFile(cachedPath);
        if (isValid) {
          console.log(`[AuthImageService] Image cached and validated: ${cacheFilename}`);
          // Add to memory cache for instant subsequent lookups
          this.memoryCache.set(remoteUrl, cachedPath);
          return cachedPath;
        } else {
          console.error(`[AuthImageService] Downloaded file failed validation, deleting: ${cachedPath}`);
          await this.deleteFile(cachedPath);
          return null;
        }
      } else if (downloadResult.status === 404) {
        // File not found - try alternative filenames
        console.warn(`[AuthImageService] File not found (404): ${assetPath}`);
        return await this.tryAlternativePaths(remoteUrl, cachedPath, cacheFilename);
      } else {
        console.error(`[AuthImageService] Download failed with status ${downloadResult.status}`);
        return null;
      }
    } catch (error) {
      console.error(`[AuthImageService] FATAL ERROR in getImageUri:`, error);
      console.error(`[AuthImageService] Error stack:`, error instanceof Error ? error.stack : 'no stack');
      return null;
    }
  }

  /**
   * Try alternative file paths if the original doesn't exist
   * Handles cases where cover.webp might be thumbnail.webp, etc.
   */
  private static async tryAlternativePaths(
    remoteUrl: string,
    cachedPath: string,
    _cacheFilename: string
  ): Promise<string | null> {
    // Generate alternative paths to try (deduplicated)
    const alternativesSet = new Set([
      remoteUrl.replace('/cover.webp', '/thumbnail.webp'),
      remoteUrl.replace('/thumbnail.webp', '/cover.webp'),
      remoteUrl.replace('/cover/cover.webp', '/cover/thumbnail.webp'),
      remoteUrl.replace('/cover/thumbnail.webp', '/cover/cover.webp'),
    ]);

    // Remove original URL from alternatives
    alternativesSet.delete(remoteUrl);
    const alternatives = Array.from(alternativesSet);

    if (alternatives.length === 0) {
      console.warn(`[AuthImageService] No alternative paths available for: ${remoteUrl}`);
      return null;
    }

    for (const altUrl of alternatives) {
      try {
        const altAssetPath = this.extractAssetPath(altUrl);
        if (!altAssetPath) continue;

        const signedUrlResponse = await ApiClient.request<SignedUrlResponse>(
          `/api/assets/url?path=${encodeURIComponent(altAssetPath)}`
        );

        if (!signedUrlResponse?.signedUrl) continue;

        const downloadResult = await FileSystem.downloadAsync(
          signedUrlResponse.signedUrl,
          cachedPath
        );

        if (downloadResult.status === 200) {
          console.log(`[AuthImageService] Downloaded via alternative path: ${altAssetPath}`);
          // Add to memory cache for instant subsequent lookups
          this.memoryCache.set(remoteUrl, cachedPath);
          return cachedPath;
        }
      } catch {
        // Silently continue to next alternative
        continue;
      }
    }

    // Only log once when all alternatives fail (not for each attempt)
    console.warn(`[AuthImageService] Asset not available: ${this.extractAssetPath(remoteUrl)}`);
    return null;
  }

  /**
   * Extract asset path from full URL
   * URL format: https://api.colearnwithfreya.co.uk/assets/stories/...
   * Returns: stories/... (removes the /assets/ prefix)
   */
  private static extractAssetPath(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      // Remove leading slash
      let path = pathname.startsWith('/') ? pathname.substring(1) : pathname;

      // Remove /assets/ prefix if present
      // URL format: /assets/stories/... -> stories/...
      if (path.startsWith('assets/')) {
        path = path.substring('assets/'.length);
      }

      console.log(`[AuthImageService] Extracted path from URL: ${path}`);
      return path || null;
    } catch (error) {
      console.error(`[AuthImageService] Error parsing URL: ${url}`, error);
      return null;
    }
  }

  /**
   * Generate a cache filename from URL
   * Backend uses unique descriptive filenames like:
   * - squirrel-snowman-cover.webp
   * - squirrel-snowman-page-1-bg.webp
   * Just extract the filename directly from the URL
   */
  private static getCacheFilename(url: string): string {
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];

    // Remove any query parameters
    const cleanFilename = filename.split('?')[0];

    console.log(`[AuthImageService] Cache filename: ${cleanFilename} (from ${url})`);
    return cleanFilename || `image-${this.hashCode(url)}.webp`;
  }

  /**
   * Simple hash function for URLs
   */
  private static hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Download and cache an asset from a signed URL
   * Used by AssetSyncService for prefetching
   * Also populates the memory cache for instant subsequent lookups
   */
  static async downloadAndCacheAsset(signedUrl: string, assetPath: string, remoteUrl?: string): Promise<string> {
    try {
      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      }

      // Generate cache filename from asset path
      const cacheFilename = this.getCacheFilename(assetPath);
      const cachedPath = `${this.CACHE_DIR}${cacheFilename}`;

      // Check if already cached
      const cachedInfo = await FileSystem.getInfoAsync(cachedPath);
      if (cachedInfo.exists) {
        console.log(`[AuthImageService] Asset already cached: ${assetPath}`);
        // Add to memory cache if remoteUrl provided
        if (remoteUrl) {
          this.memoryCache.set(remoteUrl, cachedPath);
        }
        return cachedPath;
      }

      // Download the asset
      console.log(`[AuthImageService] Downloading asset: ${assetPath}`);
      const downloadResult = await FileSystem.downloadAsync(signedUrl, cachedPath);

      if (downloadResult.status === 200) {
        console.log(`[AuthImageService] Asset cached successfully: ${assetPath}`);
        // Add to memory cache if remoteUrl provided for instant subsequent lookups
        if (remoteUrl) {
          this.memoryCache.set(remoteUrl, cachedPath);
        }
        return cachedPath;
      } else {
        console.error(`[AuthImageService] Download failed with status ${downloadResult.status}`);
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }
    } catch (error) {
      console.error(`[AuthImageService] Error downloading asset ${assetPath}:`, error);
      throw error;
    }
  }

  /**
   * Clear the image cache (both file system and memory)
   */
  static async clearCache(): Promise<void> {
    try {
      // Clear memory cache first
      const memoryCacheSize = this.memoryCache.size;
      this.memoryCache.clear();
      console.log(`[AuthImageService] Memory cache cleared (${memoryCacheSize} entries)`);

      // Clear file system cache
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.CACHE_DIR);
        console.log('[AuthImageService] File cache cleared');
      }
    } catch (error) {
      console.error('[AuthImageService] Error clearing cache:', error);
    }
  }

  /**
   * Validate a cached file to ensure it's not corrupted
   * Checks: file exists, minimum size, and optionally image header magic bytes
   */
  private static async validateCachedFile(filePath: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);

      if (!fileInfo.exists) {
        console.log(`[AuthImageService] Validation failed: file does not exist`);
        return false;
      }

      const size = (fileInfo as any).size || 0;
      if (size < MIN_VALID_FILE_SIZE) {
        console.log(`[AuthImageService] Validation failed: file too small (${size} bytes)`);
        return false;
      }

      // Read first few bytes to verify it's a valid image
      // WebP files start with "RIFF" followed by 4 bytes of size, then "WEBP"
      try {
        const base64Content = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64,
          length: 12,
          position: 0
        });

        // Decode base64 to check magic bytes
        const bytes = atob(base64Content);
        const header = bytes.substring(0, 4);
        const webpMarker = bytes.substring(8, 12);

        // Check for WebP format
        if (filePath.endsWith('.webp')) {
          if (header !== WEBP_MAGIC || webpMarker !== WEBP_MAGIC_OFFSET_4) {
            console.log(`[AuthImageService] Validation failed: invalid WebP header (got: ${header}...${webpMarker})`);
            return false;
          }
        }
        // For other formats, just check that we could read the file

      } catch (readError) {
        // If we can't read the file, it might be corrupted
        console.log(`[AuthImageService] Validation failed: could not read file header`, readError);
        return false;
      }

      console.log(`[AuthImageService] File validated successfully: ${filePath.split('/').pop()}`);
      return true;
    } catch (error) {
      console.error(`[AuthImageService] Error validating file:`, error);
      return false;
    }
  }

  /**
   * Delete a file from the cache
   */
  private static async deleteFile(filePath: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
        console.log(`[AuthImageService] Deleted file: ${filePath.split('/').pop()}`);
      }
    } catch (error) {
      console.error(`[AuthImageService] Error deleting file:`, error);
    }
  }

  /**
   * Invalidate a specific cached image by URL
   * Call this when an image fails to render to force re-download on next request
   */
  static async invalidateCache(remoteUrl: string): Promise<void> {
    try {
      // Remove from memory cache
      this.memoryCache.delete(remoteUrl);

      const cacheFilename = this.getCacheFilename(remoteUrl);
      const cachedPath = `${this.CACHE_DIR}${cacheFilename}`;
      await this.deleteFile(cachedPath);
      console.log(`[AuthImageService] Invalidated cache for: ${remoteUrl}`);
    } catch (error) {
      console.error(`[AuthImageService] Error invalidating cache:`, error);
    }
  }

  /**
   * Invalidate all cached images for a list of URLs
   * Used when a story is updated to ensure fresh images are downloaded
   */
  static async invalidateCacheForUrls(urls: string[]): Promise<void> {
    console.log(`[AuthImageService] Invalidating cache for ${urls.length} URLs`);

    for (const url of urls) {
      if (url) {
        await this.invalidateCache(url);
      }
    }

    console.log(`[AuthImageService] Cache invalidation complete for ${urls.length} URLs`);
  }
}

