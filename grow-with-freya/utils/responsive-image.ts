/**
 * Utility functions for handling responsive images in story books
 * Optimized for 2732x2048px source images with smart cropping
 */

import { Dimensions, Platform } from 'react-native';

// Standard image dimensions from Photoshop
export const SOURCE_IMAGE_DIMENSIONS = {
  width: 2732,
  height: 2048,
  aspectRatio: 2732 / 2048, // ~1.33 (4:3 ratio)
};

/**
 * Get device category for responsive image handling
 * Note: Story book reader uses landscape orientation
 */
export function getDeviceCategory() {
  const { width, height } = Dimensions.get('window');
  const isTablet = Math.min(width, height) >= 768; // iPad and larger

  // All devices use landscape orientation in story mode
  const landscapeWidth = Math.max(width, height);
  const landscapeHeight = Math.min(width, height);

  if (isTablet) {
    // iPad Pro 12.9" and similar large tablets
    if (landscapeWidth >= 1366) {
      return {
        category: 'large-tablet',
        cropStrategy: 'full',
        maxImageWidth: landscapeWidth * 0.7, // 70% width for image area
        maxImageHeight: landscapeHeight * 0.9,
        orientation: 'landscape',
      };
    }

    // Standard tablets (iPad, Android tablets)
    return {
      category: 'tablet',
      cropStrategy: 'slight-crop',
      maxImageWidth: landscapeWidth * 0.65, // 70% width for image area
      maxImageHeight: landscapeHeight * 0.85,
      orientation: 'landscape',
    };
  } else {
    // Phones in landscape mode
    // Large phones in landscape
    if (landscapeWidth >= 844) {
      return {
        category: 'large-phone',
        cropStrategy: 'bottom-crop',
        maxImageWidth: landscapeWidth * 0.6, // 70% width for image area
        maxImageHeight: landscapeHeight * 0.8,
        orientation: 'landscape',
      };
    }

    // Standard phones in landscape
    return {
      category: 'phone',
      cropStrategy: 'bottom-crop',
      maxImageWidth: landscapeWidth * 0.55, // 70% width for image area
      maxImageHeight: landscapeHeight * 0.75,
      orientation: 'landscape',
    };
  }
}

/**
 * Get image style properties based on device and crop strategy
 */
export function getResponsiveImageStyle() {
  const deviceInfo = getDeviceCategory();

  // For tablets: show entire image with letterboxing
  if (deviceInfo.category === 'large-tablet' || deviceInfo.category === 'tablet') {
    return {
      resizeMode: 'contain' as const, // Show entire image on tablets
    };
  }

  // For phones: crop from bottom of the 2732x2048 image
  return {
    resizeMode: 'cover' as const, // Crop to fit screen
    // The image will be positioned to show the bottom portion
    // This is handled by the ImageBackground component's imageStyle prop
  };
}

/**
 * Get character image positioning based on device size
 */
export function getCharacterImageStyle() {
  const deviceInfo = getDeviceCategory();
  
  const baseStyle = {
    position: 'absolute' as const,
    zIndex: 2,
  };
  
  switch (deviceInfo.category) {
    case 'large-tablet':
      return {
        ...baseStyle,
        width: '35%',
        height: '55%',
        bottom: '25%',
        right: '15%',
      };
      
    case 'tablet':
      return {
        ...baseStyle,
        width: '40%',
        height: '60%',
        bottom: '20%',
        right: '10%',
      };
      
    case 'large-phone':
      return {
        ...baseStyle,
        width: '45%',
        height: '65%',
        bottom: '15%',
        right: '8%',
      };
      
    case 'phone':
    default:
      return {
        ...baseStyle,
        width: '50%',
        height: '70%',
        bottom: '10%',
        right: '5%',
      };
  }
}

/**
 * Get optimal WebP quality settings for different device categories
 */
export function getOptimalImageQuality() {
  const deviceInfo = getDeviceCategory();
  
  switch (deviceInfo.category) {
    case 'large-tablet':
      return {
        backgroundQuality: 88, // Highest quality for large screens
        characterQuality: 92,
        recommendedFileSize: '350-450KB',
      };
      
    case 'tablet':
      return {
        backgroundQuality: 85,
        characterQuality: 90,
        recommendedFileSize: '300-400KB',
      };
      
    case 'large-phone':
      return {
        backgroundQuality: 82,
        characterQuality: 88,
        recommendedFileSize: '250-350KB',
      };
      
    case 'phone':
    default:
      return {
        backgroundQuality: 80,
        characterQuality: 85,
        recommendedFileSize: '200-300KB',
      };
  }
}

/**
 * Calculate if image should be preloaded based on device capabilities
 */
export function shouldPreloadImages() {
  const deviceInfo = getDeviceCategory();
  
  // Preload more aggressively on tablets, conservatively on phones
  switch (deviceInfo.category) {
    case 'large-tablet':
    case 'tablet':
      return {
        preloadNext: 2, // Preload next 2 pages
        preloadPrevious: 1, // Keep previous 1 page
        maxCacheSize: 8, // Cache up to 8 images
      };
      
    case 'large-phone':
      return {
        preloadNext: 1,
        preloadPrevious: 1,
        maxCacheSize: 4,
      };
      
    case 'phone':
    default:
      return {
        preloadNext: 1,
        preloadPrevious: 0,
        maxCacheSize: 3,
      };
  }
}

/**
 * Get image positioning style for background images
 * This handles the bottom-crop behavior for phones
 */
export function getBackgroundImageStyle() {
  const deviceInfo = getDeviceCategory();

  // For tablets: center the image (full display)
  if (deviceInfo.category === 'large-tablet' || deviceInfo.category === 'tablet') {
    return {
      // No special positioning needed - 'contain' mode will center automatically
    };
  }

  // For phones: position image to show bottom portion
  // The 2732x2048 source image needs to be cropped to show the bottom ~75%
  // This simulates cropping from the bottom by positioning the image upward
  return {
    top: '-25%', // Move image up to show bottom portion
  };
}
