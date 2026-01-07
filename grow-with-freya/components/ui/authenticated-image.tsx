import React, { useState, useEffect } from 'react';
import { Image, ImageProps, View, ActivityIndicator } from 'react-native';
import { AuthenticatedImageService } from '@/services/authenticated-image-service';

interface AuthenticatedImageProps extends Omit<ImageProps, 'source' | 'onLoad'> {
  uri: string;
  fallbackEmoji?: string;
  showLoadingIndicator?: boolean;
  loadingIndicatorColor?: string;
  onLoad?: () => void;
}

/**
 * Component for loading images that require authentication
 * Automatically downloads and caches images with auth token
 */
export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  uri,
  fallbackEmoji,
  showLoadingIndicator = false,
  loadingIndicatorColor = '#666',
  style,
  onError,
  onLoad,
  ...props
}) => {
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  console.log('[AuthenticatedImage] ===== COMPONENT MOUNTED =====');
  console.log('[AuthenticatedImage] Component rendered with uri:', uri);
  console.log('[AuthenticatedImage] Current state - cachedUri:', cachedUri, 'isLoading:', isLoading, 'hasError:', hasError);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      try {
        console.log('[AuthenticatedImage] Starting to load image:', uri);
        setIsLoading(true);
        setHasError(false);

        console.log('[AuthenticatedImage] Calling AuthenticatedImageService.getImageUri...');
        console.log('[AuthenticatedImage] AuthenticatedImageService class:', AuthenticatedImageService);
        console.log('[AuthenticatedImage] AuthenticatedImageService.getImageUri:', AuthenticatedImageService.getImageUri);
        let localUri: string | null = null;
        try {
          localUri = await AuthenticatedImageService.getImageUri(uri);
          console.log('[AuthenticatedImage] AuthenticatedImageService returned:', localUri);
        } catch (serviceError) {
          console.error('[AuthenticatedImage] Service threw error:', serviceError);
          console.error('[AuthenticatedImage] Service error message:', serviceError instanceof Error ? serviceError.message : String(serviceError));
          throw serviceError;
        }

        if (isMounted) {
          if (localUri) {
            console.log('[AuthenticatedImage] Image loaded successfully:', localUri);
            setCachedUri(localUri);
            if (onLoad) {
              onLoad();
            }
          } else {
            console.error('[AuthenticatedImage] Failed to get image URI - service returned null');
            setHasError(true);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[AuthenticatedImage] Error loading image:', error);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [uri, onLoad]);

  if (isLoading && showLoadingIndicator) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={loadingIndicatorColor} />
      </View>
    );
  }

  if (hasError) {
    console.log('[AuthenticatedImage] hasError is true, calling onError and returning null');
    if (onError) {
      onError({ nativeEvent: { error: 'Failed to load authenticated image' } } as any);
    }
    return null;
  }

  if (!cachedUri) {
    console.log('[AuthenticatedImage] cachedUri is null, returning null');
    return null;
  }

  console.log('[AuthenticatedImage] Rendering Image with cachedUri:', cachedUri);

  return (
    <Image
      {...props}
      source={{ uri: cachedUri }}
      style={style}
      onLoad={() => {
        console.log('[AuthenticatedImage] Image rendered from cache');
        if (onLoad) {
          onLoad();
        }
      }}
      onError={(error) => {
        console.error('[AuthenticatedImage] Image render error:', error);
        console.error('[AuthenticatedImage] cachedUri was:', cachedUri);
        setHasError(true);
        if (onError) {
          onError(error);
        }
      }}
    />
  );
};

