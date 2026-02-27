import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useAppStore } from '@/store/app-store';

// Max content width for tablet layouts to prevent stretching
export const TABLET_CONTENT_MAX_WIDTH = 500;

export interface AccessibilityScale {
  textSizeScale: number;
  scaledFontSize: (baseSize: number) => number;
  scaledButtonSize: (baseSize: number) => number;
  scaledPadding: (basePadding: number) => number;
  isTablet: boolean;
  contentMaxWidth: number; // Use this to constrain content width on tablets

  // Pre-calculated common sizes for convenience
  fontSizes: {
    tiny: number;
    small: number;
    body: number;
    subtitle: number;
    title: number;
    largeTitle: number;
  };

  buttonSizes: {
    small: number;
    medium: number;
    large: number;
  };
}

// Text size scale options: 0.85, 1.0, 1.15, 1.3
// Use labelKey for i18n translation - components should use t(option.labelKey)
export const TEXT_SIZE_OPTIONS = [
  { labelKey: 'common.small', value: 0.85 },
  { labelKey: 'common.default', value: 1.0 },
  { labelKey: 'common.large', value: 1.15 },
  { labelKey: 'common.extraLarge', value: 1.3 },
];

export function useAccessibility(): AccessibilityScale {
  const textSizeScale = useAppStore((state) => state.textSizeScale);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Use the SHORTER dimension to detect tablet - this is consistent regardless of orientation
  // A phone in landscape still has a short dimension < 768, while tablets have short dimension >= 768
  const shortDimension = Math.min(screenWidth, screenHeight);
  const isTablet = shortDimension >= 768;

  return useMemo(() => {
    // Apply tablet scale multiplier on top of user preference
    const tabletMultiplier = isTablet ? 1.15 : 1.0;
    const effectiveScale = textSizeScale * tabletMultiplier;

    const scaledFontSize = (baseSize: number): number => {
      return Math.round(baseSize * effectiveScale);
    };

    const scaledButtonSize = (baseSize: number): number => {
      // Button sizes scale slightly less aggressively than text
      const buttonScale = 1 + (textSizeScale - 1) * 0.6;
      const effectiveButtonScale = buttonScale * tabletMultiplier;
      return Math.round(baseSize * effectiveButtonScale);
    };

    const scaledPadding = (basePadding: number): number => {
      // Padding scales even less to maintain layout proportions
      const paddingScale = 1 + (textSizeScale - 1) * 0.4;
      return Math.round(basePadding * paddingScale * (isTablet ? 1.1 : 1.0));
    };

    // Pre-calculate common font sizes
    const fontSizes = {
      tiny: scaledFontSize(12),
      small: scaledFontSize(14),
      body: scaledFontSize(16),
      subtitle: scaledFontSize(18),
      title: scaledFontSize(24),
      largeTitle: scaledFontSize(34),
    };

    // Pre-calculate button sizes (touch target minimums)
    const buttonSizes = {
      small: scaledButtonSize(36),
      medium: scaledButtonSize(44),
      large: scaledButtonSize(56),
    };

    return {
      textSizeScale,
      scaledFontSize,
      scaledButtonSize,
      scaledPadding,
      isTablet,
      contentMaxWidth: isTablet ? TABLET_CONTENT_MAX_WIDTH : screenWidth,
      fontSizes,
      buttonSizes,
    };
  }, [textSizeScale, isTablet, screenWidth]);
}

// Helper to determine tablet at module level for non-hook contexts
function getIsTablet(): boolean {
  // This is a fallback for non-hook contexts - uses initial dimensions
  // For reactive updates, always use the useAccessibility hook
  const { Dimensions } = require('react-native');
  const { width, height } = Dimensions.get('window');
  // Use the SHORTER dimension to detect tablet - consistent regardless of orientation
  const shortDimension = Math.min(width, height);
  return shortDimension >= 768;
}

// Export a utility function for getting scaled size without the hook
// (useful in StyleSheet.create which runs outside components)
export function getBaseScaledSize(baseSize: number, scale: number): number {
  const tabletMultiplier = getIsTablet() ? 1.15 : 1.0;
  return Math.round(baseSize * scale * tabletMultiplier);
}

