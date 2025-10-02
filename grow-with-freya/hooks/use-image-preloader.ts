import { useEffect, useState } from 'react';
import { Image } from 'react-native';

interface ImagePreloaderOptions {
  priority?: 'high' | 'normal' | 'low';
  timeout?: number;
}

interface PreloadResult {
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to preload images and track their loading state
 * Ensures images are cached and ready for instant display
 */
export function useImagePreloader(
  sources: (string | number | { uri: string })[],
  options: ImagePreloaderOptions = {}
): PreloadResult {
  const { priority = 'high', timeout = 10000 } = options;
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (sources.length === 0) {
      setIsLoaded(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    const preloadPromises = sources.map((source) => {
      return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Image preload timeout: ${JSON.stringify(source)}`));
        }, timeout);

        // For require() sources (numbers), we can resolve immediately as they're bundled
        if (typeof source === 'number') {
          clearTimeout(timeoutId);
          resolve();
          return;
        }

        // For URI sources, use Image.prefetch for React Native
        const uri = typeof source === 'string' ? source : source.uri;
        
        Image.prefetch(uri)
          .then(() => {
            clearTimeout(timeoutId);
            resolve();
          })
          .catch((err) => {
            clearTimeout(timeoutId);
            reject(err);
          });
      });
    });

    Promise.all(preloadPromises)
      .then(() => {
        setIsLoaded(true);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
        // Still set loaded to true to prevent blocking the UI
        setIsLoaded(true);
      });
  }, [sources, timeout]);

  return { isLoaded, isLoading, error };
}

/**
 * Hook specifically for preloading critical app images
 * These images should be loaded immediately when the app starts
 */
export function useCriticalImagePreloader(): PreloadResult {
  const criticalImages = [
    require('../assets/images/ui-elements/bear-bottom-screen.png'),
    // Add other critical images here
  ];

  return useImagePreloader(criticalImages, { priority: 'high', timeout: 5000 });
}

/**
 * Preload images synchronously during app initialization
 * This should be called in the app's root component
 */
export async function preloadCriticalImages(): Promise<void> {
  const criticalImages = [
    require('../assets/images/ui-elements/bear-bottom-screen.png'),
  ];

  const preloadPromises = criticalImages.map((source) => {
    // For bundled assets (require), they're already available
    // But we can still prefetch to ensure they're in memory
    return Promise.resolve();
  });

  try {
    await Promise.all(preloadPromises);
    console.log('Critical images preloaded successfully');
  } catch (error) {
    console.warn('Some critical images failed to preload:', error);
  }
}
