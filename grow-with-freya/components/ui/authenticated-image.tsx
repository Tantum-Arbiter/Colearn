import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  const loadImage = useCallback(async (forceRefresh: boolean = false) => {
    try {
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
  }, [uri]);

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
    retryCountRef.current = 0;
    loadImage(false);

    return () => {
      isMountedRef.current = false;
    };
  }, [uri, loadImage]);

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
      onError={() => {
        // Don't log the error object as it's often null and not helpful
        console.warn(`[AuthenticatedImage] Image render failed for: ${cachedUri.split('/').pop()}`);
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

