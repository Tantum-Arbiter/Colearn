/**
 * Utility functions for main menu component
 */

import { VISUAL_EFFECTS, getScreenDimensions } from './constants';

/**
 * Generates random star positions for the background
 * @param count - Number of stars to generate
 * @returns Array of star position objects
 */
// Simple seeded random number generator for tests
const seededRandom = (seed: number) => {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const generateStarPositions = (count: number = VISUAL_EFFECTS.STAR_COUNT) => {
  const { width: screenWidth, height: screenHeight } = getScreenDimensions();
  const stars = [];
  const starAreaHeight = screenHeight * VISUAL_EFFECTS.STAR_AREA_HEIGHT_RATIO;

  // Use deterministic positions in test environment
  const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

  for (let i = 0; i < count; i++) {
    const randomLeft = isTest ? seededRandom(i * 1.1) : Math.random();
    const randomTop = isTest ? seededRandom(i * 2.3) : Math.random();
    const randomOpacity = isTest ? seededRandom(i * 3.7) : Math.random();

    stars.push({
      id: i,
      left: randomLeft * (screenWidth - 20) + 10, // 10px margin from edges
      top: randomTop * starAreaHeight + 20, // 20px margin from top
      opacity: 0.3 + randomOpacity * 0.4, // Random opacity between 0.3-0.7
      size: VISUAL_EFFECTS.STAR_SIZE, // Add size property
    });
  }

  return stars;
};

/**
 * Swaps two items in an array
 * @param array - The array to modify
 * @param index1 - First index to swap
 * @param index2 - Second index to swap
 * @returns New array with swapped items
 */
export const swapArrayItems = <T>(array: T[], index1: number, index2: number): T[] => {
  if (index1 < 0 || index1 >= array.length || index2 < 0 || index2 >= array.length) {
    console.warn('Invalid indices for array swap:', { index1, index2, arrayLength: array.length });
    return [...array];
  }
  
  const newArray = [...array];
  [newArray[index1], newArray[index2]] = [newArray[index2], newArray[index1]];
  return newArray;
};

/**
 * Finds the index of a menu item by its icon identifier
 * @param menuItems - Array of menu items
 * @param iconToFind - Icon identifier to search for
 * @returns Index of the item, or -1 if not found
 */
export const findMenuItemIndex = (menuItems: any[], iconToFind: string): number => {
  return menuItems.findIndex(item => item.icon === iconToFind);
};

/**
 * Validates menu item data structure
 * @param item - Menu item to validate
 * @returns Boolean indicating if the item is valid
 */
export const isValidMenuItem = (item: any): boolean => {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.icon === 'string' &&
    typeof item.label === 'string' &&
    typeof item.destination === 'string' &&
    item.icon.length > 0 &&
    item.label.length > 0 &&
    item.destination.length > 0
  );
};

/**
 * Calculates responsive dimensions based on screen size
 * @param baseSize - Base size for standard screens
 * @param scaleFactor - Factor to scale by for larger screens
 * @returns Calculated size
 */
export const getResponsiveSize = (baseSize: number, scaleFactor: number = 1.2): number => {
  const { width: screenWidth } = getScreenDimensions();
  const isTablet = screenWidth >= 768;
  return isTablet ? baseSize * scaleFactor : baseSize;
};

/**
 * Debounces a function to prevent rapid successive calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttles a function to limit execution frequency
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Creates a safe area calculation for different device types
 * @param basePadding - Base padding value
 * @param safeAreaInsets - Safe area insets from device
 * @returns Calculated safe padding
 */
export const calculateSafePadding = (
  basePadding: number,
  safeAreaInsets: { top: number; bottom: number; left: number; right: number }
): { top: number; bottom: number; left: number; right: number } => {
  return {
    top: Math.max(basePadding, safeAreaInsets.top),
    bottom: Math.max(basePadding, safeAreaInsets.bottom),
    left: Math.max(basePadding, safeAreaInsets.left),
    right: Math.max(basePadding, safeAreaInsets.right),
  };
};

/**
 * Logs performance metrics for debugging
 * @param label - Label for the metric
 * @param startTime - Start time from performance.now()
 */
export const logPerformance = (label: string, startTime: number): void => {
  if (__DEV__) {
    const endTime = performance.now();
    console.log(`${label}: ${(endTime - startTime).toFixed(2)}ms`);
  }
};
