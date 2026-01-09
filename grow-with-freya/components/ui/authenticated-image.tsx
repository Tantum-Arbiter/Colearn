import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ImageStyle, StyleProp } from 'react-native';
import { Image as ExpoImage, ImageContentFit } from 'expo-image';
import { AuthenticatedImageService } from '@/services/authenticated-image-service';
import { Logger } from '@/utils/logger';

const log = Logger.create('AuthenticatedImage');

interface AuthenticatedImageProps {
  uri: string;
  fallbackEmoji?: string;
  showLoadingIndicator?: boolean;
  loadingIndicatorColor?: string;
  onLoad?: () => void;
  onError?: (error: unknown) => void;
  maxRetries?: number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  allowDownscaling?: boolean;
  transition?: number;
}

// Maximum retry attempts for loading an image
const DEFAULT_MAX_RETRIES = 2;

/**
 * Component for loading images that require authentication
 * Automatically downloads and caches images with auth token
 * Uses memory cache for instant display (same performance as local images)
 * Includes retry logic for corrupted cache files
 */
export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  uri,
  fallbackEmoji = '📖',
  showLoadingIndicator = false,
  loadingIndicatorColor = '#666',
  style,
  onLoad,
  onError,
  maxRetries = DEFAULT_MAX_RETRIES,
  resizeMode = 'cover',
  allowDownscaling = true,
  transition = 0,
}) => {
  // Check memory cache synchronously for instant display
  // This runs during render (not in useEffect) so it's available on first paint
  const memoryCachedUri = AuthenticatedImageService.getMemoryCachedUri(uri);

  // Use a ref to track the previous URI to detect changes
  const prevUriRef = useRef(uri);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  // Initialize state - if we have memory cache, use it immediately
  const [cachedUri, setCachedUri] = useState<string | null>(memoryCachedUri);
  const [isLoading, setIsLoading] = useState(!memoryCachedUri);
  const [hasError, setHasError] = useState(false);

  // Handle URI changes - only reset if URI actually changed
  // This avoids unnecessary state updates on remount with same URI
  if (prevUriRef.current !== uri) {
    prevUriRef.current = uri;
    retryCountRef.current = 0;

    if (memoryCachedUri) {
      // New URI but we have it cached - update synchronously during render
      if (cachedUri !== memoryCachedUri) {
        setCachedUri(memoryCachedUri);
        setIsLoading(false);
        setHasError(false);
      }
    } else {
      // New URI with no cache - need to load
      if (cachedUri !== null || !isLoading) {
        setCachedUri(null);
        setIsLoading(true);
        setHasError(false);
      }
    }
  }

  const loadImage = useCallback(async (forceRefresh: boolean = false) => {
    try {
      // Skip if we already have the cached URI from memory
      if (cachedUri && !forceRefresh) {
        return;
      }

      if (!isMountedRef.current) return;

      setIsLoading(true);
      setHasError(false);

      // If forcing refresh, invalidate the cache first
      if (forceRefresh) {
        await AuthenticatedImageService.invalidateCache(uri);
      }

      const localUri = await AuthenticatedImageService.getImageUri(uri);

      if (!isMountedRef.current) return;

      if (localUri) {
        setCachedUri(localUri);
      } else {
        const err = new Error('Failed to get image URI - service returned null');
        log.error(err.message);
        setHasError(true);
        onError?.(err);
      }
      setIsLoading(false);
    } catch (error) {
      log.error('Error loading image:', error);
      if (isMountedRef.current) {
        setHasError(true);
        setIsLoading(false);
        onError?.(error);
      }
    }
  }, [uri, cachedUri, onError]);

  // Handle image render errors - retry with cache invalidation
  const handleRenderError = useCallback(async (error?: unknown) => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;
      log.warn(`Image render failed, retrying (attempt ${retryCountRef.current}/${maxRetries})`);
      await loadImage(true); // Force refresh
    } else {
      log.error('Max retries exceeded, showing fallback');
      setHasError(true);
      onError?.(error);
    }
  }, [loadImage, maxRetries, onError]);

  useEffect(() => {
    isMountedRef.current = true;

    // Skip async loading if we already have the URI from memory cache
    if (!memoryCachedUri) {
      loadImage(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [uri, loadImage, memoryCachedUri]);

  // Show loading indicator
  if (isLoading && showLoadingIndicator) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={loadingIndicatorColor} />
      </View>
    );
  }

  // Show fallback emoji on error (after all retries exhausted)
  if (hasError) {
    return (
      <View style={[style, styles.fallbackContainer]}>
        <Text style={styles.fallbackEmoji}>{fallbackEmoji}</Text>
      </View>
    );
  }

  // Still loading without indicator - render solid background placeholder to prevent flash
  if (!cachedUri) {
    return <View style={[style, { backgroundColor: '#e8e8e8' }]} />;
  }

  // Map resizeMode to expo-image contentFit
  const contentFitMap: Record<string, ImageContentFit> = {
    cover: 'cover',
    contain: 'contain',
    stretch: 'fill',
    center: 'none',
  };

  return (
    <ExpoImage
      source={{ uri: cachedUri }}
      style={style}
      contentFit={contentFitMap[resizeMode] || 'cover'}
      transition={transition}
      cachePolicy="memory-disk"
      priority="high" // High priority for crisp rendering during animations
      allowDownscaling={allowDownscaling} // Prevent pixelation during scale animations
      onLoad={() => {
        retryCountRef.current = 0; // Reset retry count on success
        if (onLoad) {
          onLoad();
        }
      }}
      onError={(error) => {
        // Log detailed error info for debugging
        log.error(`Image render failed for URI: ${cachedUri}`);
        log.error('Error details:', error);
        handleRenderError(error);
      }}
    />
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  fallbackEmoji: {
    fontSize: 40,
  },
});

