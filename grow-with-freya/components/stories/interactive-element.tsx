/**
 * InteractiveElement - Renders interactive props on story pages
 * 
 * Features:
 * - Subtle pulsing glow to indicate interactivity
 * - Tap to reveal/hide prop image with smooth transition
 * - Positioned using normalized coordinates (0-1)
 */

import React, { useState, useEffect } from 'react';
import { Pressable, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { InteractiveElement as InteractiveElementType } from '@/types/story';

interface InteractiveElementProps {
  element: InteractiveElementType;
  containerWidth: number;
  containerHeight: number;
  storyId: string;
  isTablet: boolean;
  tabletScale?: number;
}

// Animation constants (similar to main menu glow)
const GLOW_DURATION = 1200;
const GLOW_MIN_OPACITY = 0.4;
const GLOW_MAX_OPACITY = 0.9;
const GLOW_COLOR = '#FFD700'; // Golden glow
const TRANSITION_DURATION = 400;
const INDICATOR_SIZE = 60; // Circular indicator size in pixels
const PULSE_SCALE_MIN = 0.9;
const PULSE_SCALE_MAX = 1.15;

// Phone content area - defines the visible safe zone within the design canvas
// Normalized coordinates (0-1) in story data are relative to this content area
// Based on Photoshop template: Canvas 2732×2048, Phone safe area X:68 Y:498 W:2594 H:1142
const PHONE_CONTENT_AREA = {
  // Normalized offsets (percentage of screen)
  offsetX: 68 / 2732,       // 0.0249 - 2.5% from left
  offsetY: 498 / 2048,      // 0.243 - 24.3% from top
  // Normalized dimensions (percentage of screen)
  widthRatio: 2594 / 2732,  // 0.949 - 94.9% of width
  heightRatio: 1142 / 2048, // 0.558 - 55.8% of height
};

export const InteractiveElementComponent: React.FC<InteractiveElementProps> = ({
  element,
  containerWidth,
  containerHeight,
  storyId,
  isTablet,
  tabletScale = 1,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);

  // Animation values
  const glowOpacity = useSharedValue(GLOW_MIN_OPACITY);
  const indicatorScale = useSharedValue(PULSE_SCALE_MIN);
  const propOpacity = useSharedValue(0);
  const propScale = useSharedValue(0.95);

  // Calculate pixel positions from normalized coordinates
  // On tablets: account for "contain" letterboxing + 1.35 scale from center
  // On phones: apply content area offset and scaling
  const calculatePosition = (normalizedX: number, normalizedY: number, normalizedW: number, normalizedH: number) => {
    if (isTablet) {
      // Tablet: Image uses resizeMode="contain" then scale 1.35 from center
      // Normalized coords are based on 2048x1536 (4:3) canvas from Photoshop
      const scale = tabletScale;
      const imageAspectRatio = 2048 / 1536; // 4:3 = 1.333
      const screenAspectRatio = containerWidth / containerHeight;

      // Calculate how the image fits with "contain" (before 1.35 scale)
      let imageDisplayWidth: number;
      let imageDisplayHeight: number;
      let imageOffsetX: number;
      let imageOffsetY: number;

      if (screenAspectRatio > imageAspectRatio) {
        // Screen is wider than image - letterbox on sides (black bars left/right)
        imageDisplayHeight = containerHeight;
        imageDisplayWidth = containerHeight * imageAspectRatio;
        imageOffsetX = (containerWidth - imageDisplayWidth) / 2;
        imageOffsetY = 0;
      } else {
        // Screen is taller than image - letterbox on top/bottom
        imageDisplayWidth = containerWidth;
        imageDisplayHeight = containerWidth / imageAspectRatio;
        imageOffsetX = 0;
        imageOffsetY = (containerHeight - imageDisplayHeight) / 2;
      }

      // Position within the contained image area (before scale)
      const origLeft = imageOffsetX + (normalizedX * imageDisplayWidth);
      const origTop = imageOffsetY + (normalizedY * imageDisplayHeight);
      const origWidth = normalizedW * imageDisplayWidth;
      const origHeight = normalizedH * imageDisplayHeight;

      // Now apply 1.35 scale from screen center (matching the background transform)
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;
      const scaledLeft = centerX + (origLeft - centerX) * scale;
      const scaledTop = centerY + (origTop - centerY) * scale;
      const scaledWidth = origWidth * scale;
      const scaledHeight = origHeight * scale;

      return {
        left: scaledLeft,
        top: scaledTop,
        width: scaledWidth,
        height: scaledHeight,
      };
    } else {
      // Phone: position within content area (with offset and scaling)
      const contentWidth = containerWidth * PHONE_CONTENT_AREA.widthRatio;
      const contentHeight = containerHeight * PHONE_CONTENT_AREA.heightRatio;
      const offsetX = containerWidth * PHONE_CONTENT_AREA.offsetX;
      const offsetY = containerHeight * PHONE_CONTENT_AREA.offsetY;

      return {
        left: offsetX + (normalizedX * contentWidth),
        top: offsetY + (normalizedY * contentHeight),
        width: normalizedW * contentWidth,
        height: normalizedH * contentHeight,
      };
    }
  };

  const { left, top, width, height } = calculatePosition(
    element.position.x,
    element.position.y,
    element.size.width,
    element.size.height
  );

  // Hit area (use custom or same as element)
  const hitArea = element.hitArea || { ...element.position, ...element.size };
  const hitPos = calculatePosition(hitArea.x, hitArea.y, hitArea.width, hitArea.height);
  const hitLeft = hitPos.left;
  const hitTop = hitPos.top;
  const hitWidth = hitPos.width;
  const hitHeight = hitPos.height;

  // Start pulsing glow and scale animation when not revealed
  useEffect(() => {
    if (!isRevealed) {
      // Pulsing opacity
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(GLOW_MAX_OPACITY, {
            duration: GLOW_DURATION,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(GLOW_MIN_OPACITY, {
            duration: GLOW_DURATION,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1, // Infinite repeat
        false
      );
      // Pulsing scale (like main menu icons)
      indicatorScale.value = withRepeat(
        withSequence(
          withTiming(PULSE_SCALE_MAX, {
            duration: GLOW_DURATION,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(PULSE_SCALE_MIN, {
            duration: GLOW_DURATION,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );
    } else {
      // Stop animations when revealed
      cancelAnimation(glowOpacity);
      cancelAnimation(indicatorScale);
      glowOpacity.value = withTiming(0, { duration: 200 });
      indicatorScale.value = withTiming(0.8, { duration: 200 });
    }

    return () => {
      cancelAnimation(glowOpacity);
      cancelAnimation(indicatorScale);
    };
  }, [isRevealed, glowOpacity, indicatorScale]);

  // Handle tap
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (isRevealed) {
      // Hide prop
      propOpacity.value = withTiming(0, {
        duration: TRANSITION_DURATION,
        easing: Easing.out(Easing.ease),
      });
      propScale.value = withTiming(0.95, {
        duration: TRANSITION_DURATION,
        easing: Easing.out(Easing.ease),
      });
      setIsRevealed(false);
    } else {
      // Reveal prop
      propOpacity.value = withTiming(1, {
        duration: TRANSITION_DURATION,
        easing: Easing.out(Easing.ease),
      });
      propScale.value = withTiming(1, {
        duration: TRANSITION_DURATION,
        easing: Easing.out(Easing.back(1.2)),
      });
      setIsRevealed(true);
    }
  };

  // Animated styles
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: indicatorScale.value }],
  }));

  const propStyle = useAnimatedStyle(() => ({
    opacity: propOpacity.value,
    transform: [{ scale: propScale.value }],
  }));

  // Resolve image source
  const imageSource = typeof element.image === 'string'
    ? { uri: element.image }
    : element.image;

  return (
    <>
      {/* Hit area / Pressable zone with glow indicator */}
      <Pressable
        onPress={handlePress}
        style={[
          styles.hitArea,
          {
            left: hitLeft,
            top: hitTop,
            width: hitWidth,
            height: hitHeight,
          },
        ]}
      >
        {/* Circular glow indicator - centered and smaller (like main menu buttons) */}
        {!isRevealed && (
          <Animated.View
            style={[
              styles.glowIndicator,
              glowStyle,
              {
                width: INDICATOR_SIZE,
                height: INDICATOR_SIZE,
                borderRadius: INDICATOR_SIZE / 2,
                shadowColor: GLOW_COLOR,
                backgroundColor: `${GLOW_COLOR}50`,
              },
            ]}
          />
        )}
      </Pressable>

      {/* Prop image overlay (positioned absolutely) */}
      <Animated.View
        style={[
          styles.propContainer,
          propStyle,
          {
            left,
            top,
            width,
            height,
          },
        ]}
        pointerEvents="none" // Let touches pass through to hit area
      >
        <Image
          source={imageSource}
          style={styles.propImage}
          resizeMode="contain"
        />
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  hitArea: {
    position: 'absolute',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowIndicator: {
    // Size and borderRadius now set dynamically in component
    borderWidth: 0,
    // Pure glow effect - no border stroke
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 15,
  },
  propContainer: {
    position: 'absolute',
    zIndex: 5,
  },
  propImage: {
    width: '100%',
    height: '100%',
  },
});

