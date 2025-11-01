import { Image } from 'react-native';

/**
 * Critical images that should be preloaded immediately when the app starts
 * These images are essential for smooth user experience
 * Force Metro bundler cache refresh
 */
const CRITICAL_IMAGES = [
  require('../assets/images/ui-elements/bear-bottom-screen.webp'),
  require('../assets/images/ui-elements/bear-top-screen.webp'),
  require('../assets/images/ui-elements/moon-top-screen.webp'),
  require('../assets/images/ui-elements/moon-bottom-screen.webp'),
  // Add other critical images here as needed
];

/**
 * Secondary images that can be preloaded after critical images
 * These improve performance but aren't essential for initial load
 */
const SECONDARY_IMAGES: any[] = [
  // Add secondary images here - avoid large images during startup
];

/**
 * Onboarding images - only preloaded when onboarding starts
 * Separated to avoid impacting app startup performance
 */
const ONBOARDING_IMAGES = [
  require('../assets/images/illustrations/welcome-family.png'),
  require('../assets/images/illustrations/screen-time-family.png'),
  require('../assets/images/illustrations/tina-bruno-characters.png'),
  require('../assets/images/illustrations/voice-recording.png'),
  require('../assets/images/illustrations/research-backed.png'),
];

interface PreloadResult {
  success: boolean;
  errors: Error[];
  loadedCount: number;
  totalCount: number;
}

/**
 * Preload a single image asset
 */
async function preloadImage(source: any): Promise<void> {
  try {
    // For bundled assets (require), they're already available
    // But we can still ensure they're in memory
    if (typeof source === 'number') {
      // Bundled asset - already available
      return Promise.resolve();
    }

    // For URI-based images
    if (typeof source === 'object' && source.uri) {
      await Image.prefetch(source.uri);
      return;
    }

    // Try to resolve asset source and prefetch
    const resolved = Image.resolveAssetSource(source);
    if (resolved && resolved.uri) {
      await Image.prefetch(resolved.uri);
    }
  } catch (error) {
    console.warn('Failed to preload image:', source, error);
    throw error;
  }
}

/**
 * Preload critical images that are essential for app performance
 * This should be called during app initialization
 */
export async function preloadCriticalImages(): Promise<PreloadResult> {
  const errors: Error[] = [];
  let loadedCount = 0;

  console.log('Starting critical image preload...');
  const startTime = Date.now();

  const preloadPromises = CRITICAL_IMAGES.map(async (source) => {
    try {
      await preloadImage(source);
      loadedCount++;
      console.log(`Preloaded critical image: ${JSON.stringify(source)}`);
    } catch (error) {
      errors.push(error as Error);
      console.warn(`Failed to preload critical image: ${JSON.stringify(source)}`, error);
    }
  });

  await Promise.allSettled(preloadPromises);

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`Critical image preload completed in ${duration}ms. Loaded: ${loadedCount}/${CRITICAL_IMAGES.length}`);

  return {
    success: errors.length === 0,
    errors,
    loadedCount,
    totalCount: CRITICAL_IMAGES.length,
  };
}

/**
 * Preload secondary images in the background
 * This can be called after the app has loaded to improve performance
 */
export async function preloadSecondaryImages(): Promise<PreloadResult> {
  const errors: Error[] = [];
  let loadedCount = 0;

  if (SECONDARY_IMAGES.length === 0) {
    return {
      success: true,
      errors: [],
      loadedCount: 0,
      totalCount: 0,
    };
  }

  console.log('Starting secondary image preload...');
  const startTime = Date.now();

  const preloadPromises = SECONDARY_IMAGES.map(async (source) => {
    try {
      await preloadImage(source);
      loadedCount++;
      console.log(`Preloaded secondary image: ${JSON.stringify(source)}`);
    } catch (error) {
      errors.push(error as Error);
      console.warn(`Failed to preload secondary image: ${JSON.stringify(source)}`, error);
    }
  });

  await Promise.allSettled(preloadPromises);

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`Secondary image preload completed in ${duration}ms. Loaded: ${loadedCount}/${SECONDARY_IMAGES.length}`);

  return {
    success: errors.length === 0,
    errors,
    loadedCount,
    totalCount: SECONDARY_IMAGES.length,
  };
}

/**
 * Preload onboarding images when onboarding starts
 * Separated from startup preloading to avoid performance impact
 */
export async function preloadOnboardingImages(): Promise<PreloadResult> {
  const errors: Error[] = [];
  let loadedCount = 0;

  if (ONBOARDING_IMAGES.length === 0) {
    return {
      success: true,
      errors: [],
      loadedCount: 0,
      totalCount: 0,
    };
  }

  console.log('Starting onboarding image preload...');
  const startTime = Date.now();

  const preloadPromises = ONBOARDING_IMAGES.map(async (source) => {
    try {
      await preloadImage(source);
      loadedCount++;
      console.log(`Preloaded onboarding image: ${JSON.stringify(source)}`);
    } catch (error) {
      errors.push(error as Error);
      console.warn(`Failed to preload onboarding image: ${JSON.stringify(source)}`, error);
    }
  });

  await Promise.allSettled(preloadPromises);

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`Onboarding image preload completed in ${duration}ms. Loaded: ${loadedCount}/${ONBOARDING_IMAGES.length}`);

  return {
    success: errors.length === 0,
    errors,
    loadedCount,
    totalCount: ONBOARDING_IMAGES.length,
  };
}

/**
 * Preload all images (critical first, then secondary)
 */
export async function preloadAllImages(): Promise<{
  critical: PreloadResult;
  secondary: PreloadResult;
}> {
  const critical = await preloadCriticalImages();
  const secondary = await preloadSecondaryImages();

  return { critical, secondary };
}

/**
 * Clear image cache (useful for development/testing)
 */
export function clearImageCache(): void {
  // React Native doesn't provide a direct way to clear image cache
  // This is mainly for development purposes
  console.log('Image cache clear requested (not implemented in React Native)');
}

/**
 * Get preload statistics
 */
export function getPreloadStats(): {
  criticalCount: number;
  secondaryCount: number;
  totalCount: number;
} {
  return {
    criticalCount: CRITICAL_IMAGES.length,
    secondaryCount: SECONDARY_IMAGES.length,
    totalCount: CRITICAL_IMAGES.length + SECONDARY_IMAGES.length,
  };
}
