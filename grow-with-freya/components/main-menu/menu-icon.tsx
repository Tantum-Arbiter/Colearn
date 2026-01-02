/**
 * MenuIcon component - Individual menu icon with animations and interactions
 */

import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  cancelAnimation as cancelReanimatedAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '../themed-text';
import { getIconSvgType, getSvgComponentFromSvg } from './assets';
import {
  createIconPulseAnimation,
  createGlowAnimation,
  createShimmerAnimation,
  createSelectionAnimation,
  createPressAnimation,
  createGlowBurstAnimation
} from './animations';
import { LAYOUT, VISUAL_EFFECTS, IconStatus } from './constants';
import { menuIconStyles } from './styles';
import { useAccessibility } from '@/hooks/use-accessibility';

export interface MenuIconProps {
  icon: string;
  label: string;
  status: IconStatus;
  onPress: () => void;
  onLongPress?: () => void;
  isLarge?: boolean;
  triggerSelectionAnimation?: boolean;
  testID?: string;
}

export const MenuIcon = React.memo(function MenuIcon({
  icon,
  label,
  status,
  onPress,
  isLarge = false,
  triggerSelectionAnimation = false,
  testID
}: MenuIconProps) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const glow = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const selectionScale = useSharedValue(1);
  const selectionGlow = useSharedValue(0);

  const { scaledFontSize } = useAccessibility();

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (triggerSelectionAnimation && status === 'animated_interactive') {
      // Debug logging disabled for performance

      try {
        cancelReanimatedAnimation(selectionScale);
        cancelReanimatedAnimation(selectionGlow);
      } catch (error) {
        console.warn('Could not cancel selection animations:', error);
      }

      // Reset to base values before starting new animation
      selectionScale.value = 1;
      selectionGlow.value = 0;

      // Start new selection animation
      const { scaleAnimation, glowAnimation } = createSelectionAnimation(
        selectionScale,
        selectionGlow
      );

      selectionScale.value = scaleAnimation;
      selectionGlow.value = glowAnimation;
    }
  }, [triggerSelectionAnimation, status, label]); // Removed useSharedValue objects from deps to prevent infinite re-renders

  // Main animation effects for active icons
  React.useEffect(() => {
    if (status === 'animated_interactive') {
      try {
        cancelReanimatedAnimation(scale);
        cancelReanimatedAnimation(glow);
        cancelReanimatedAnimation(shimmer);
      } catch (error) {
        console.warn('Could not cancel existing animations:', error);
      }

      // Now start fresh infinite animations
      scale.value = createIconPulseAnimation(scale, isLarge);
      glow.value = createGlowAnimation(glow);
      shimmer.value = createShimmerAnimation(shimmer);
    }

    return () => {
      if (status === 'animated_interactive') {
        // Cancel running animations first (safe for test environment)
        try {
          cancelReanimatedAnimation(scale);
          cancelReanimatedAnimation(glow);
          cancelReanimatedAnimation(shimmer);
        } catch (error) {
          console.warn('Could not cancel animations:', error);
        }

        scale.value = isLarge ? 1.05 : 1;
        glow.value = 0;
        shimmer.value = 0;
      }
    };
  }, [status, isLarge]); // Removed useSharedValue objects from deps to prevent infinite re-renders

  useEffect(() => {
    return () => {
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      try {
        cancelReanimatedAnimation(scale);
        cancelReanimatedAnimation(glow);
        cancelReanimatedAnimation(shimmer);
        cancelReanimatedAnimation(selectionScale);
        cancelReanimatedAnimation(selectionGlow);
        cancelReanimatedAnimation(rotation);
      } catch (error) {
        console.warn('Could not cancel animations:', error);
      }
      scale.value = isLarge ? 1.05 : 1;
      glow.value = 0;
      shimmer.value = 0;
      selectionScale.value = 1;
      selectionGlow.value = 0;
      rotation.value = 0;
    };
  }, [isLarge, scale, glow, shimmer, selectionScale, selectionGlow, rotation]);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * selectionScale.value },
      { rotate: `${rotation.value}deg` }
    ],
  }));

  const glowStyle = useAnimatedStyle(() => {
    const { 
      GLOW_BASE_OPACITY, 
      GLOW_INACTIVE_OPACITY, 
      GLOW_MULTIPLIER, 
      GLOW_INACTIVE_MULTIPLIER,
      GLOW_BASE_RADIUS,
      GLOW_INACTIVE_RADIUS,
      GLOW_RADIUS_MULTIPLIER,
      GLOW_RADIUS_INACTIVE_MULTIPLIER,
      SELECTION_GLOW_OPACITY,
      SELECTION_GLOW_RADIUS,
      GLOW_COLOR
    } = VISUAL_EFFECTS;

    // Base glow calculation
    const baseOpacity = status === 'animated_interactive'
      ? GLOW_BASE_OPACITY + (glow.value * GLOW_MULTIPLIER)
      : GLOW_INACTIVE_OPACITY + (glow.value * GLOW_INACTIVE_MULTIPLIER);

    const baseRadius = status === 'animated_interactive'
      ? GLOW_BASE_RADIUS + (glow.value * GLOW_RADIUS_MULTIPLIER)
      : GLOW_INACTIVE_RADIUS + (glow.value * GLOW_RADIUS_INACTIVE_MULTIPLIER);

    // Selection glow enhancement
    const selectionOpacity = selectionGlow.value * SELECTION_GLOW_OPACITY;
    const selectionRadius = selectionGlow.value * SELECTION_GLOW_RADIUS;

    return {
      shadowOpacity: Math.min(baseOpacity + selectionOpacity, 1),
      shadowRadius: baseRadius + selectionRadius,
      shadowColor: GLOW_COLOR,
    };
  });

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: status === 'animated_interactive' 
      ? VISUAL_EFFECTS.SHIMMER_BASE_OPACITY + (shimmer.value * VISUAL_EFFECTS.SHIMMER_MULTIPLIER) 
      : 0,
  }));

  const handleAnimations = useCallback(() => {
    try {
      // This prevents animation accumulation during rapid button presses
      try {
        cancelReanimatedAnimation(scale);
        if (status === 'inactive') {
          cancelReanimatedAnimation(glow);
        }
      } catch (error) {
        console.warn('Could not cancel press animations:', error);
      }

      // Press animation feedback
      scale.value = createPressAnimation(scale, isLarge);

      // Glow burst for inactive icons
      if (status === 'inactive') {
        const originalGlow = glow.value;
        glow.value = createGlowBurstAnimation(glow, originalGlow);
      }
    } catch (error) {
      console.error('Error in MenuIcon animations:', error);
    }
  }, [status, isLarge, scale, glow]);

  // Core functionality handler (not throttled)
  const handleCorePress = useCallback(() => {
    try {
      // Remove debug logging in production
      const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
      if (isDev) {
        console.log('MenuIcon press:', label);
      }

      onPress();
    } catch (error) {
      console.error('Error in MenuIcon core press:', error);
    }
  }, [label, onPress]);

  const handleAnimationsThrottled = handleAnimations;

  const handlePress = useCallback(() => {
    handleCorePress();

    // Haptic feedback
    try {
      const hapticStyle = status === 'animated_interactive'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light;
      Haptics.impactAsync(hapticStyle);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }

    // Visual animations 
    handleAnimationsThrottled();
  }, [handleCorePress, handleAnimationsThrottled]);

  // Memoize SVG component to prevent re-creation on every render
  const SvgComponent = useMemo(() => {
    const svgType = getIconSvgType(icon);
    return getSvgComponentFromSvg(svgType);
  }, [icon]);

  // Memoize icon size calculation
  const memoizedIconSize = useMemo(() => {
    return isLarge
      ? LAYOUT.ICON_SIZE_LARGE
      : (status === 'animated_interactive' ? LAYOUT.ICON_SIZE_MEDIUM : LAYOUT.ICON_SIZE_SMALL);
  }, [isLarge, status]);

  return (
    <Animated.View style={[menuIconStyles.container, animatedStyle, glowStyle]}>
      <Pressable
        style={({ pressed }) => [
          menuIconStyles.icon,
          isLarge && menuIconStyles.largeIcon,
          status === 'inactive' && menuIconStyles.iconInactive,
          pressed && menuIconStyles.iconPressed,
        ]}
        onPress={handlePress}
        testID={testID}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${label} button`}
      >
        {/* Shining star overlay for active icon */}
        {status === 'animated_interactive' && (
          <Animated.View style={[menuIconStyles.shimmerOverlay, shimmerStyle]}>
            <ThemedText style={menuIconStyles.starEmoji}>✨</ThemedText>
          </Animated.View>
        )}

        <SvgComponent
          width={memoizedIconSize}
          height={memoizedIconSize}
          opacity={1}
        />

      </Pressable>

      {/* Only show text label for selected/glowing icon (rendered outside the circle for proper centering) */}
      {status === 'animated_interactive' && (
        <ThemedText style={[
          menuIconStyles.label,
          isLarge && menuIconStyles.largeLabel,
          { fontSize: scaledFontSize(isLarge ? 16 : 14) },
        ]}>
          {label}
        </ThemedText>
      )}
    </Animated.View>
  );
});
