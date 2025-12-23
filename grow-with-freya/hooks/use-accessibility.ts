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
export const TEXT_SIZE_OPTIONS = [
  { label: 'Small', value: 0.85 },
  { label: 'Default', value: 1.0 },
  { label: 'Large', value: 1.15 },
  { label: 'X Large', value: 1.3 },
];

export function useAccessibility(): AccessibilityScale {
  const textSizeScale = useAppStore((state) => state.textSizeScale);
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;

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
  const { width } = Dimensions.get('window');
  return width >= 768;
}

// Export a utility function for getting scaled size without the hook
// (useful in StyleSheet.create which runs outside components)
export function getBaseScaledSize(baseSize: number, scale: number): number {
  const tabletMultiplier = getIsTablet() ? 1.15 : 1.0;
  return Math.round(baseSize * scale * tabletMultiplier);
}

