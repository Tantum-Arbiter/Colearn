import { Dimensions } from 'react-native';
import { CharacterPosition } from '@/types/story';

interface DeviceInfo {
  width: number;
  height: number;
  isTablet: boolean;
  category: 'phone' | 'large-phone' | 'tablet' | 'large-tablet';
}

/**
 * Get device information for responsive positioning
 */
export function getDeviceInfo(): DeviceInfo {
  const { width, height } = Dimensions.get('window');
  const isTablet = Math.min(width, height) >= 768;
  
  // Use landscape dimensions for story mode
  const landscapeWidth = Math.max(width, height);
  const landscapeHeight = Math.min(width, height);
  
  let category: DeviceInfo['category'] = 'phone';
  
  if (isTablet) {
    category = landscapeWidth >= 1024 ? 'large-tablet' : 'tablet';
  } else {
    category = landscapeWidth >= 414 ? 'large-phone' : 'phone';
  }
  
  return {
    width: landscapeWidth,
    height: landscapeHeight,
    isTablet,
    category,
  };
}

/**
 * Convert position value to pixels
 */
export function convertToPixels(
  value: number | string,
  dimension: 'width' | 'height',
  deviceInfo?: DeviceInfo
): number {
  const device = deviceInfo || getDeviceInfo();
  const screenDimension = dimension === 'width' ? device.width : device.height;
  
  if (typeof value === 'string') {
    if (value.endsWith('%')) {
      const percentage = parseFloat(value) / 100;
      return screenDimension * percentage;
    }
    if (value.endsWith('px')) {
      return parseFloat(value);
    }
    return parseFloat(value);
  }
  
  return value;
}

/**
 * Get responsive character position styles
 */
export function getCharacterPositionStyle(
  position: CharacterPosition,
  deviceInfo?: DeviceInfo
) {
  const device = deviceInfo || getDeviceInfo();
  
  return {
    position: 'absolute' as const,
    left: convertToPixels(position.x, 'width', device),
    top: convertToPixels(position.y, 'height', device),
    width: convertToPixels(position.width, 'width', device),
    height: convertToPixels(position.height, 'height', device),
    zIndex: position.zIndex || 2,
  };
}

/**
 * Create responsive position based on device category
 */
export function createResponsivePosition(
  basePosition: {
    x: number | string;
    y: number | string;
    width: number | string;
    height: number | string;
  },
  deviceOverrides?: {
    tablet?: Partial<typeof basePosition>;
    largeTablet?: Partial<typeof basePosition>;
    largePhone?: Partial<typeof basePosition>;
  }
): CharacterPosition {
  const device = getDeviceInfo();
  
  let finalPosition = { ...basePosition };
  
  // Apply device-specific overrides
  if (deviceOverrides) {
    switch (device.category) {
      case 'large-tablet':
        if (deviceOverrides.largeTablet) {
          finalPosition = { ...finalPosition, ...deviceOverrides.largeTablet };
        }
        break;
      case 'tablet':
        if (deviceOverrides.tablet) {
          finalPosition = { ...finalPosition, ...deviceOverrides.tablet };
        }
        break;
      case 'large-phone':
        if (deviceOverrides.largePhone) {
          finalPosition = { ...finalPosition, ...deviceOverrides.largePhone };
        }
        break;
    }
  }
  
  return {
    x: finalPosition.x,
    y: finalPosition.y,
    width: finalPosition.width,
    height: finalPosition.height,
    zIndex: 2,
  };
}

/**
 * Predefined character positions for common use cases
 */
export const PRESET_POSITIONS = {
  // Character positioned on the right side (traditional storybook style)
  rightSide: createResponsivePosition(
    { x: '60%', y: '20%', width: '35%', height: '60%' },
    {
      tablet: { x: '65%', y: '15%', width: '30%', height: '65%' },
      largeTablet: { x: '70%', y: '10%', width: '25%', height: '70%' },
    }
  ),
  
  // Character positioned on the left side
  leftSide: createResponsivePosition(
    { x: '5%', y: '20%', width: '35%', height: '60%' },
    {
      tablet: { x: '5%', y: '15%', width: '30%', height: '65%' },
      largeTablet: { x: '5%', y: '10%', width: '25%', height: '70%' },
    }
  ),
  
  // Character centered
  center: createResponsivePosition(
    { x: '32.5%', y: '25%', width: '35%', height: '50%' },
    {
      tablet: { x: '35%', y: '20%', width: '30%', height: '55%' },
      largeTablet: { x: '37.5%', y: '15%', width: '25%', height: '60%' },
    }
  ),
  
  // Small character in corner
  topRightCorner: createResponsivePosition(
    { x: '75%', y: '5%', width: '20%', height: '25%' },
    {
      tablet: { x: '80%', y: '5%', width: '15%', height: '20%' },
      largeTablet: { x: '82%', y: '5%', width: '13%', height: '18%' },
    }
  ),
  
  // Character at bottom center (like a narrator)
  bottomCenter: createResponsivePosition(
    { x: '40%', y: '70%', width: '20%', height: '25%' },
    {
      tablet: { x: '42.5%', y: '70%', width: '15%', height: '25%' },
      largeTablet: { x: '45%', y: '70%', width: '10%', height: '25%' },
    }
  ),
};

/**
 * Validate character position values
 */
export function validateCharacterPosition(position: CharacterPosition): boolean {
  const device = getDeviceInfo();
  
  try {
    const left = convertToPixels(position.x, 'width', device);
    const top = convertToPixels(position.y, 'height', device);
    const width = convertToPixels(position.width, 'width', device);
    const height = convertToPixels(position.height, 'height', device);
    
    // Check if position is within screen bounds
    if (left < 0 || top < 0) return false;
    if (left + width > device.width) return false;
    if (top + height > device.height) return false;
    
    // Check for reasonable size constraints
    if (width < 10 || height < 10) return false;
    if (width > device.width || height > device.height) return false;
    
    return true;
  } catch (error) {
    console.warn('Invalid character position:', position, error);
    return false;
  }
}

/**
 * Get safe area adjustments for character positioning
 */
export function getSafeAreaAdjustments() {
  const device = getDeviceInfo();
  
  // Approximate safe area insets for landscape mode
  const safeAreaInsets = {
    top: device.isTablet ? 0 : 44, // Status bar height in landscape
    bottom: device.isTablet ? 0 : 21, // Home indicator height
    left: device.isTablet ? 0 : 44, // Notch/Dynamic Island area
    right: device.isTablet ? 0 : 44, // Notch/Dynamic Island area
  };
  
  return {
    safeWidth: device.width - safeAreaInsets.left - safeAreaInsets.right,
    safeHeight: device.height - safeAreaInsets.top - safeAreaInsets.bottom,
    insets: safeAreaInsets,
  };
}

/**
 * Adjust character position to avoid safe areas
 */
export function adjustPositionForSafeArea(position: CharacterPosition): CharacterPosition {
  const safeArea = getSafeAreaAdjustments();
  const device = getDeviceInfo();
  
  // Only adjust for phones in landscape mode
  if (device.isTablet) {
    return position;
  }
  
  const left = convertToPixels(position.x, 'width', device);
  const top = convertToPixels(position.y, 'height', device);
  const width = convertToPixels(position.width, 'width', device);
  const height = convertToPixels(position.height, 'height', device);
  
  // Adjust if character overlaps with safe areas
  let adjustedLeft = left;
  let adjustedTop = top;
  
  if (left < safeArea.insets.left) {
    adjustedLeft = safeArea.insets.left;
  }
  
  if (top < safeArea.insets.top) {
    adjustedTop = safeArea.insets.top;
  }
  
  if (left + width > device.width - safeArea.insets.right) {
    adjustedLeft = device.width - safeArea.insets.right - width;
  }
  
  if (top + height > device.height - safeArea.insets.bottom) {
    adjustedTop = device.height - safeArea.insets.bottom - height;
  }
  
  return {
    ...position,
    x: adjustedLeft,
    y: adjustedTop,
  };
}
