import React, { useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animation timing constants
const BOOK_FLIP_DURATION = 400; // Duration for book cover flip
const EXPAND_DURATION = 350; // Duration for expand to fullscreen
const FADE_DURATION = 200; // Duration for fade out at end

export interface BookCoverAnimationRef {
  startAnimation: () => void;
}

interface BookCoverAnimationProps {
  children: React.ReactNode;
  // Position and size of the card on screen
  cardPosition: { x: number; y: number; width: number; height: number };
  // Story cover image (rendered as book cover)
  coverContent: React.ReactNode;
  // Called when animation completes
  onAnimationComplete: () => void;
  // Style for the container
  style?: ViewStyle;
}

export const BookCoverAnimation = forwardRef<BookCoverAnimationRef, BookCoverAnimationProps>(
  ({ children, cardPosition, coverContent, onAnimationComplete, style }, ref) => {
    // Animation phase values
    const isAnimating = useSharedValue(false);
    
    // Book cover rotation (0 = closed, -180 = fully open)
    const coverRotateY = useSharedValue(0);
    
    // Scale for the card (starts at 1, expands to fill screen)
    const containerScale = useSharedValue(1);
    
    // Position translation to center of screen
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    
    // Opacity for final fade
    const opacity = useSharedValue(1);
    
    // Page reveal opacity (pages behind the cover)
    const pagesOpacity = useSharedValue(0);
    
    // Book spine shadow
    const spineShadow = useSharedValue(0);

    // Calculate target scale to fill most of the screen
    const targetScale = Math.min(
      (SCREEN_WIDTH * 0.8) / cardPosition.width,
      (SCREEN_HEIGHT * 0.7) / cardPosition.height
    );

    // Calculate translation to center
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2;
    const cardCenterX = cardPosition.x + cardPosition.width / 2;
    const cardCenterY = cardPosition.y + cardPosition.height / 2;
    const targetTranslateX = centerX - cardCenterX;
    const targetTranslateY = centerY - cardCenterY;

    const handleAnimationComplete = useCallback(() => {
      onAnimationComplete();
    }, [onAnimationComplete]);

    const startAnimation = useCallback(() => {
      if (isAnimating.value) return;
      isAnimating.value = true;

      // Phase 1: Move to center and start scaling
      translateX.value = withTiming(targetTranslateX, {
        duration: BOOK_FLIP_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      translateY.value = withTiming(targetTranslateY, {
        duration: BOOK_FLIP_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      containerScale.value = withTiming(targetScale * 0.6, {
        duration: BOOK_FLIP_DURATION,
        easing: Easing.out(Easing.cubic),
      });

      // Phase 2: Book cover flip animation (starts slightly after movement)
      coverRotateY.value = withDelay(
        100,
        withTiming(-180, {
          duration: BOOK_FLIP_DURATION + 100,
          easing: Easing.inOut(Easing.cubic),
        })
      );

      // Show pages as cover opens
      pagesOpacity.value = withDelay(
        BOOK_FLIP_DURATION / 2,
        withTiming(1, {
          duration: BOOK_FLIP_DURATION / 2,
          easing: Easing.out(Easing.cubic),
        })
      );

      // Spine shadow peaks during flip
      spineShadow.value = withSequence(
        withDelay(
          50,
          withTiming(1, { duration: BOOK_FLIP_DURATION / 2 })
        ),
        withTiming(0, { duration: BOOK_FLIP_DURATION / 2 })
      );

      // Phase 3: Expand to fullscreen after flip completes
      containerScale.value = withDelay(
        BOOK_FLIP_DURATION + 100,
        withTiming(targetScale, {
          duration: EXPAND_DURATION,
          easing: Easing.out(Easing.cubic),
        })
      );

      // Phase 4: Fade out and complete
      opacity.value = withDelay(
        BOOK_FLIP_DURATION + 100 + EXPAND_DURATION,
        withTiming(0, {
          duration: FADE_DURATION,
          easing: Easing.out(Easing.quad),
        }, () => {
          runOnJS(handleAnimationComplete)();
        })
      );
    }, [targetTranslateX, targetTranslateY, targetScale]);

    useImperativeHandle(ref, () => ({
      startAnimation,
    }));

    // Animated styles for container
    const containerAnimatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: containerScale.value },
      ],
      opacity: opacity.value,
    }));

    // Animated styles for book cover (the flipping part)
    const coverAnimatedStyle = useAnimatedStyle(() => {
      const rotateY = `${coverRotateY.value}deg`;
      // Hide back face when rotated past 90 degrees
      const backfaceVisible = coverRotateY.value > -90;
      
      return {
        transform: [
          { perspective: 1000 },
          { rotateY },
        ],
        backfaceVisibility: 'hidden',
        opacity: backfaceVisible ? 1 : 0,
      };
    });

    // Animated styles for pages (revealed behind cover)
    const pagesAnimatedStyle = useAnimatedStyle(() => ({
      opacity: pagesOpacity.value,
    }));

    return (
      <Animated.View style={[styles.container, containerAnimatedStyle, style]}>
        {/* Pages layer (behind cover) */}
        <Animated.View style={[styles.pagesLayer, pagesAnimatedStyle]}>
          {children}
        </Animated.View>
        
        {/* Book cover layer (flips open) */}
        <Animated.View style={[styles.coverLayer, coverAnimatedStyle]}>
          {coverContent}
        </Animated.View>
      </Animated.View>
    );
  }
);

BookCoverAnimation.displayName = 'BookCoverAnimation';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  pagesLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8F4E8', // Cream paper color
    borderRadius: 8,
  },
  coverLayer: {
    ...StyleSheet.absoluteFillObject,
    transformOrigin: 'left center',
    borderRadius: 8,
    overflow: 'hidden',
  },
});

