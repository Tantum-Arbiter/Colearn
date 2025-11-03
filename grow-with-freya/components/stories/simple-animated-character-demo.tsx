import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface SimpleAnimatedCharacterProps {
  isActive: boolean; // Whether the page is currently active
  onCharacterPress?: () => void;
}

/**
 * Simple proof-of-concept animated character using a placeholder character
 * This demonstrates the core animation concepts without requiring actual character assets
 * Uses a cute wombat emoji and styled placeholder to prove the animation system works
 */
export function SimpleAnimatedCharacterDemo({
  isActive,
  onCharacterPress
}: SimpleAnimatedCharacterProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Animation values for movement
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Get screen dimensions for responsive positioning
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const landscapeWidth = Math.max(screenWidth, screenHeight);
  const landscapeHeight = Math.min(screenWidth, screenHeight);

  // Character positioning (responsive)
  const characterWidth = landscapeWidth * 0.25; // 25% of screen width
  const characterHeight = landscapeHeight * 0.4; // 40% of screen height
  const startX = landscapeWidth * 0.1; // Start at 10% from left
  const endX = landscapeWidth * 0.65; // End at 65% from left
  const centerY = landscapeHeight * 0.3; // Vertically centered at 30%

  // Cleanup function
  const cleanup = () => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
    // Only update state if component is still mounted
    if (isMountedRef.current) {
      setIsAnimating(false);
    }
  };

  // Reset animation when page becomes inactive
  useEffect(() => {
    if (!isActive) {
      cleanup();
      // Reset to starting position
      translateX.value = 0;
      translateY.value = 0;
      scale.value = 1;
      opacity.value = 1;
    }
  }, [isActive]); // Only depend on isActive

  // Start animation when component becomes active
  useEffect(() => {
    if (isActive && !isAnimating) {
      startDemoAnimation();
    }
  }, [isActive]); // Only depend on isActive to avoid infinite loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []);

  const startDemoAnimation = () => {
    if (isAnimating || !isMountedRef.current) return;

    setIsAnimating(true);
    console.log('Starting simple character animation demo...');

    // 2-second delay before animation starts
    animationTimeoutRef.current = setTimeout(() => {
      if (!isActive || !isMountedRef.current) return;

      console.log('Demo animation starting now!');

      // Sequence of animations to demonstrate the system:
      // 1. Fade in and scale up (entrance)
      // 2. Move across screen (walk animation)
      // 3. Bounce at the end
      // 4. Scale down slightly (settle)

      // Phase 1: Entrance animation
      opacity.value = withTiming(1, { duration: 500 });
      scale.value = withSequence(
        withTiming(1.2, { duration: 300, easing: Easing.out(Easing.back(1.5)) }),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) })
      );

      // Phase 2: Movement across screen (starts after entrance)
      translateX.value = withDelay(
        800, // Wait for entrance to complete
        withTiming(endX - startX, {
          duration: 2500,
          easing: Easing.inOut(Easing.quad),
        })
      );

      // Phase 3: Bounce animation at destination
      translateY.value = withDelay(
        3300, // Start bounce near end of movement
        withSequence(
          withTiming(-30, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
          withTiming(-20, { duration: 200, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) })
        )
      );

      // Phase 4: Final settle animation
      scale.value = withDelay(
        4300, // After bounce completes
        withTiming(0.95, {
          duration: 400,
          easing: Easing.inOut(Easing.quad),
        })
      );

      // Mark animation as complete
      completionTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setIsAnimating(false);
          console.log('Demo animation sequence complete!');
        }
      }, 5000);

    }, 2000); // 2-second delay as specified
  };

  const handleCharacterPress = () => {
    console.log('Character pressed! Playing interaction animation...');
    
    // Simple press feedback animation
    scale.value = withSequence(
      withTiming(1.1, { duration: 100, easing: Easing.out(Easing.quad) }),
      withTiming(0.95, { duration: 150, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 100, easing: Easing.out(Easing.quad) })
    );

    // Call the optional callback
    onCharacterPress?.();
  };

  // Animated style combining all transformations
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View 
      style={[
        styles.characterContainer,
        {
          left: startX,
          top: centerY,
          width: characterWidth,
          height: characterHeight,
        },
        animatedStyle
      ]}
    >
      <Pressable
        onPress={handleCharacterPress}
        style={styles.pressableArea}
        accessibilityRole="button"
        accessibilityLabel="Animated character"
      >
        <View style={styles.placeholderCharacter}>
          <Text style={styles.placeholderText}>🐨</Text>
          <Text style={styles.placeholderLabel}>Demo</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  characterContainer: {
    position: 'absolute',
    zIndex: 2,
  },
  pressableArea: {
    width: '100%',
    height: '100%',
  },
  placeholderCharacter: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFE4B5', // Soft peach color
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF9A8B', // Soft coral border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  placeholderText: {
    fontSize: 40,
    textAlign: 'center',
  },
  placeholderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
    textAlign: 'center',
    marginTop: 4,
  },
});
