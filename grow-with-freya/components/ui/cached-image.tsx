import React, { useState, useEffect } from 'react';
import { Image, ImageProps, ImageSourcePropType, View, ActivityIndicator } from 'react-native';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  source: ImageSourcePropType;
  fallbackSource?: ImageSourcePropType;
  showLoadingIndicator?: boolean;
  loadingIndicatorColor?: string;
  preload?: boolean;
  instantDisplay?: boolean;
}

/**
 * CachedImage component that aggressively caches images for instant display
 * Optimized for performance-critical images like the bear image
 */
export const CachedImage: React.FC<CachedImageProps> = ({
  source,
  fallbackSource,
  showLoadingIndicator = false,
  loadingIndicatorColor = '#666',
  preload = true,
  instantDisplay = true,
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (preload && typeof source === 'object' && 'uri' in source && source.uri) {
      setIsLoading(true);
      Image.prefetch(source.uri)
        .then(() => {
          setIsLoaded(true);
          setIsLoading(false);
        })
        .catch(() => {
          setHasError(true);
          setIsLoading(false);
        });
    } else {
      // For bundled assets (require), they're immediately available
      setIsLoaded(true);
    }
  }, [source, preload]);

  const handleLoad = () => {
    setIsLoaded(true);
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const imageSource = hasError && fallbackSource ? fallbackSource : source;

  if (showLoadingIndicator && isLoading && !isLoaded) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={loadingIndicatorColor} />
      </View>
    );
  }

  return (
    <Image
      {...props}
      source={imageSource}
      style={style}
      onLoad={handleLoad}
      onError={handleError}
      fadeDuration={instantDisplay ? 0 : props.fadeDuration || 200}
      // Optimize for performance
      resizeMethod="resize"
      loadingIndicatorSource={undefined}
      progressiveRenderingEnabled={false}
    />
  );
};

/**
 * Specialized component for the bear image with optimal caching
 */
export const CachedBearImage: React.FC<{ style?: any }> = ({ style }) => {
  return (
    <CachedImage
      source={require('@/assets/images/ui-elements/bear-bottom-screen.png')}
      style={[
        {
          width: 286,
          height: 286,
          opacity: 0.8,
        },
        style,
      ]}
      resizeMode="contain"
      preload={true}
      instantDisplay={true}
    />
  );
};
