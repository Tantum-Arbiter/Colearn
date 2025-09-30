/**
 * MenuIcon component - Individual menu icon with animations and interactions
 */

import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useThrottle, useSafeAnimation } from './performance-utils';

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
  // Animation values
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const glow = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const selectionScale = useSharedValue(1);
  const selectionGlow = useSharedValue(0);

  // Performance optimizations
  const { startAnimation, endAnimation } = useSafeAnimation(`menu-icon-${icon}`);

  // Selection celebration animation effect
  React.useEffect(() => {
    if (triggerSelectionAnimation && status === 'animated_interactive') {
      console.log('Triggering selection animation for:', label);

      const { scaleAnimation, glowAnimation } = createSelectionAnimation(
        selectionScale, 
        selectionGlow
      );
      
      selectionScale.value = scaleAnimation;
      selectionGlow.value = glowAnimation;
    }
  }, [triggerSelectionAnimation, status, label, selectionScale, selectionGlow]);

  // Main animation effects for active icons
  React.useEffect(() => {
    if (status === 'animated_interactive') {
      scale.value = createIconPulseAnimation(scale, isLarge);
      glow.value = createGlowAnimation(glow);
      shimmer.value = createShimmerAnimation(shimmer);
    }
  }, [status, isLarge, scale, glow, shimmer]);

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

  // Performance-optimized press handler
  const handlePressInternal = useCallback(() => {
    try {
      if (!startAnimation()) {
        // Skip if too many animations are running
        return;
      }

      // Remove debug logging in production
      const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
      if (isDev) {
        console.log('MenuIcon press:', label);
      }

      // Press animation feedback
      scale.value = createPressAnimation(scale, isLarge);

      // Glow burst for inactive icons
      if (status === 'inactive') {
        const originalGlow = glow.value;
        glow.value = createGlowBurstAnimation(glow, originalGlow);
      }

      // Haptic feedback (throttled to prevent excessive vibration)
      if (status === 'animated_interactive') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      onPress();

      // End animation after a delay
      setTimeout(() => endAnimation(), 300);
    } catch (error) {
      console.error('Error in MenuIcon handlePress:', error);
      endAnimation();
    }
  }, [label, status, isLarge, scale, glow, onPress, startAnimation, endAnimation]);

  // Throttled version to prevent rapid-fire presses
  const handlePress = useThrottle(handlePressInternal, 100);

  // Calculate icon size based on state
  const iconSize = isLarge 
    ? LAYOUT.ICON_SIZE_LARGE 
    : (status === 'animated_interactive' ? LAYOUT.ICON_SIZE_MEDIUM : LAYOUT.ICON_SIZE_SMALL);

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
      >
        {/* Shining star overlay for active icon */}
        {status === 'animated_interactive' && (
          <Animated.View style={[menuIconStyles.shimmerOverlay, shimmerStyle]}>
            <ThemedText style={menuIconStyles.starEmoji}>✨</ThemedText>
          </Animated.View>
        )}

        {(() => {
          const svgType = getIconSvgType(icon);
          const SvgComponent = getSvgComponentFromSvg(svgType);
          return (
            <SvgComponent
              width={iconSize}
              height={iconSize}
              opacity={1}
            />
          );
        })()}

      </Pressable>

      {/* Only show text label for selected/glowing icon (rendered outside the circle for proper centering) */}
      {status === 'animated_interactive' && (
        <ThemedText style={[
          menuIconStyles.label,
          isLarge && menuIconStyles.largeLabel,
        ]}>
          {label}
        </ThemedText>
      )}
    </Animated.View>
  );
});
