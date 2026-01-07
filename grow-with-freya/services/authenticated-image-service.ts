import { SecureStorage } from './secure-storage';
import { ApiClient } from './api-client';
import * as FileSystem from 'expo-file-system/legacy';

interface SignedUrlResponse {
  path: string;
  signedUrl: string;
}

/**
 * Service for downloading and caching images that require authentication
 * Downloads images with auth token and caches them locally
 */
export class AuthenticatedImageService {
  private static readonly CACHE_DIR = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}story-images/`;

  /**
   * Get a cached image URI with authentication
   * Downloads and caches the image if not already cached
   */
  static async getImageUri(remoteUrl: string): Promise<string | null> {
    console.log(`[AuthImageService] ===== getImageUri START =====`);
    console.log(`[AuthImageService] CACHE_DIR: ${this.CACHE_DIR}`);
    console.log(`[AuthImageService] cacheDirectory: ${FileSystem.cacheDirectory}`);
    console.log(`[AuthImageService] documentDirectory: ${FileSystem.documentDirectory}`);
    try {
      console.log(`[AuthImageService] getImageUri called with: ${remoteUrl}`);
      console.log(`[AuthImageService] URL includes api.colearnwithfreya.co.uk: ${remoteUrl.includes('api.colearnwithfreya.co.uk')}`);

      // For non-authenticated URLs, return as-is
      if (!remoteUrl.includes('api.colearnwithfreya.co.uk')) {
        console.log(`[AuthImageService] Non-CMS URL, returning as-is: ${remoteUrl}`);
        return remoteUrl;
      }

      console.log(`[AuthImageService] CMS URL detected, proceeding with auth download`);

      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!dirInfo.exists) {
        console.log(`[AuthImageService] Creating cache directory: ${this.CACHE_DIR}`);
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      }

      // Generate cache filename from URL
      const cacheFilename = this.getCacheFilename(remoteUrl);
      const cachedPath = `${this.CACHE_DIR}${cacheFilename}`;

      // Check if image is already cached
      const cachedInfo = await FileSystem.getInfoAsync(cachedPath);
      if (cachedInfo.exists) {
        console.log(`[AuthImageService] Using cached image: ${cacheFilename}`);
        return cachedPath;
      }

      // Extract asset path from URL
      // URL format: https://api.colearnwithfreya.co.uk/assets/stories/...
      // We need to extract: stories/...
      const assetPath = this.extractAssetPath(remoteUrl);
      if (!assetPath) {
        console.warn(`[AuthImageService] Could not extract asset path from URL: ${remoteUrl}`);
        return null;
      }

      console.log(`[AuthImageService] Extracted asset path: ${assetPath}`);

      // Get signed URL from backend
      console.log(`[AuthImageService] Requesting signed URL for asset: ${assetPath}`);
      let signedUrlResponse: SignedUrlResponse | null = null;
      try {
        signedUrlResponse = await ApiClient.request<SignedUrlResponse>(
          `/api/assets/url?path=${encodeURIComponent(assetPath)}`
        );
        console.log(`[AuthImageService] Signed URL response:`, signedUrlResponse);
      } catch (apiCallError) {
        console.error(`[AuthImageService] API call failed:`, apiCallError);
        console.error(`[AuthImageService] Error message:`, apiCallError instanceof Error ? apiCallError.message : String(apiCallError));
        return null;
      }

      if (!signedUrlResponse || !signedUrlResponse.signedUrl) {
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
        console.log(`[AuthImageService] Image cached successfully: ${cacheFilename}`);
        // Verify file exists before returning
        const fileInfo = await FileSystem.getInfoAsync(cachedPath);
        console.log(`[AuthImageService] File exists check: ${fileInfo.exists}, size: ${fileInfo.exists ? (fileInfo as any).size : 'N/A'}`);
        if (!fileInfo.exists) {
          console.error(`[AuthImageService] File was not actually created at: ${cachedPath}`);
          return null;
        }
        return cachedPath;
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
    cacheFilename: string
  ): Promise<string | null> {
    console.log(`[AuthImageService] Trying alternative paths for: ${remoteUrl}`);

    // Generate alternative paths to try
    const alternatives = [
      remoteUrl.replace('/cover.webp', '/thumbnail.webp'),
      remoteUrl.replace('/thumbnail.webp', '/cover.webp'),
      remoteUrl.replace('/cover/cover.webp', '/cover/thumbnail.webp'),
      remoteUrl.replace('/cover/thumbnail.webp', '/cover/cover.webp'),
    ];

    for (const altUrl of alternatives) {
      if (altUrl === remoteUrl) continue; // Skip if same as original

      try {
        console.log(`[AuthImageService] Trying alternative: ${altUrl}`);
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
          console.log(`[AuthImageService] Successfully downloaded alternative: ${altUrl}`);
          return cachedPath;
        }
      } catch (error) {
        console.warn(`[AuthImageService] Alternative path failed:`, error);
        continue;
      }
    }

    console.error(`[AuthImageService] All alternative paths failed for: ${remoteUrl}`);
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
   * Uses hash of full URL to avoid collisions when multiple images have same filename
   */
  private static getCacheFilename(url: string): string {
    // Always use hash of full URL to avoid collisions
    // e.g., story1/cover/cover.webp and story2/cover/cover.webp would both be "cover.webp"
    // but we need them to be different files
    const hash = this.hashCode(url);
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '.webp';

    return `image-${hash}${ext}`;
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
   */
  static async downloadAndCacheAsset(signedUrl: string, assetPath: string): Promise<string> {
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
        return cachedPath;
      }

      // Download the asset
      console.log(`[AuthImageService] Downloading asset: ${assetPath}`);
      const downloadResult = await FileSystem.downloadAsync(signedUrl, cachedPath);

      if (downloadResult.status === 200) {
        console.log(`[AuthImageService] Asset cached successfully: ${assetPath}`);
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
   * Clear the image cache
   */
  static async clearCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.CACHE_DIR);
        console.log('[AuthImageService] Cache cleared');
      }
    } catch (error) {
      console.error('[AuthImageService] Error clearing cache:', error);
    }
  }
}

