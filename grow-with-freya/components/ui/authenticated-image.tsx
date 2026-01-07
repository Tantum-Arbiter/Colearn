import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Image, ImageProps, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { AuthenticatedImageService } from '@/services/authenticated-image-service';

interface AuthenticatedImageProps extends Omit<ImageProps, 'source' | 'onLoad'> {
  uri: string;
  fallbackEmoji?: string;
  showLoadingIndicator?: boolean;
  loadingIndicatorColor?: string;
  onLoad?: () => void;
  maxRetries?: number;
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
  onError,
  onLoad,
  maxRetries = DEFAULT_MAX_RETRIES,
  ...props
}) => {
  // Check memory cache synchronously for instant display
  const memoryCachedUri = useMemo(() => {
    const cached = AuthenticatedImageService.getMemoryCachedUri(uri);
    console.log(`[AuthenticatedImage] Memory cache check for: ${uri.split('/').pop()} -> ${cached ? 'HIT' : 'MISS'}`);
    return cached;
  }, [uri]);

  const [cachedUri, setCachedUri] = useState<string | null>(memoryCachedUri);
  const [isLoading, setIsLoading] = useState(!memoryCachedUri);
  const [hasError, setHasError] = useState(false);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  // Reset state when uri changes - this is critical for page transitions
  // Without this, the old cachedUri would persist when navigating between pages
  useEffect(() => {
    setCachedUri(memoryCachedUri);
    setIsLoading(!memoryCachedUri);
    setHasError(false);
    retryCountRef.current = 0;
  }, [uri, memoryCachedUri]);

  const loadImage = useCallback(async (forceRefresh: boolean = false) => {
    try {
      // Skip if we already have the cached URI from memory
      if (cachedUri && !forceRefresh) {
        console.log(`[AuthenticatedImage] ⚡ Already have cached URI, skipping load`);
        return;
      }

      console.log(`[AuthenticatedImage] Loading image (retry: ${retryCountRef.current}, forceRefresh: ${forceRefresh}):`, uri);

      if (!isMountedRef.current) return;

      setIsLoading(true);
      setHasError(false);

      // If forcing refresh, invalidate the cache first
      if (forceRefresh) {
        console.log('[AuthenticatedImage] Invalidating cache before retry...');
        await AuthenticatedImageService.invalidateCache(uri);
      }

      const localUri = await AuthenticatedImageService.getImageUri(uri);

      if (!isMountedRef.current) return;

      if (localUri) {
        console.log('[AuthenticatedImage] Image loaded successfully:', localUri.split('/').pop());
        setCachedUri(localUri);
      } else {
        console.error('[AuthenticatedImage] Failed to get image URI - service returned null');
        setHasError(true);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('[AuthenticatedImage] Error loading image:', error);
      if (isMountedRef.current) {
        setHasError(true);
        setIsLoading(false);
      }
    }
  }, [uri, cachedUri]);

  // Handle image render errors - retry with cache invalidation
  const handleRenderError = useCallback(async () => {
    console.error(`[AuthenticatedImage] Image render failed, retry count: ${retryCountRef.current}/${maxRetries}`);

    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;
      console.log(`[AuthenticatedImage] Retrying with cache invalidation (attempt ${retryCountRef.current})`);
      await loadImage(true); // Force refresh
    } else {
      console.error('[AuthenticatedImage] Max retries exceeded, showing fallback');
      setHasError(true);
    }
  }, [loadImage, maxRetries]);

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
    console.log('[AuthenticatedImage] Showing fallback emoji after error');
    return (
      <View style={[style, styles.fallbackContainer]}>
        <Text style={styles.fallbackEmoji}>{fallbackEmoji}</Text>
      </View>
    );
  }

  // Still loading without indicator
  if (!cachedUri) {
    return null;
  }

  // Log the exact URI being used (helps debug file:// path issues)
  console.log(`[AuthenticatedImage] Rendering with URI: ${cachedUri}`);

  return (
    <Image
      {...props}
      source={{ uri: cachedUri }}
      style={style}
      onLoad={() => {
        console.log('[AuthenticatedImage] Image rendered successfully');
        retryCountRef.current = 0; // Reset retry count on success
        if (onLoad) {
          onLoad();
        }
      }}
      onError={(error) => {
        // Log detailed error info for debugging
        console.error(`[AuthenticatedImage] Image render failed for URI: ${cachedUri}`);
        console.error(`[AuthenticatedImage] Error details:`, error?.nativeEvent);
        handleRenderError();
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

