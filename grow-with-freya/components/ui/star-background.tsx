import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StarPosition {
  id: number;
  left: number;
  top: number;
  opacity: number;
}

// Generate random star positions
const generateStarPositions = (count: number = 15): StarPosition[] => {
  const stars: StarPosition[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      left: Math.random() * SCREEN_WIDTH,
      top: Math.random() * (SCREEN_HEIGHT * 0.6), // Only in top 60% of screen
      opacity: 0.3 + Math.random() * 0.4, // Random opacity between 0.3-0.7
    });
  }
  return stars;
};

interface StarBackgroundProps {
  starCount?: number;
  deferAnimation?: boolean; // Whether to defer animation start (for page transitions)
  deferDelay?: number; // Delay in ms before starting animation
}

export function StarBackground({ 
  starCount = 15, 
  deferAnimation = true,
  deferDelay = 600 
}: StarBackgroundProps) {
  const starOpacity = useSharedValue(0.4);
  const stars = useMemo(() => generateStarPositions(starCount), [starCount]);

  useEffect(() => {
    const startAnimation = () => {
      starOpacity.value = withRepeat(
        withTiming(0.8, { duration: 2000 }),
        -1,
        true
      );
    };

    if (deferAnimation) {
      const timeoutId = setTimeout(startAnimation, deferDelay);
      return () => clearTimeout(timeoutId);
    } else {
      startAnimation();
    }
  }, [deferAnimation, deferDelay, starOpacity]);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    opacity: starOpacity.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((star) => (
        <Animated.View
          key={`star-${star.id}`}
          style={[
            starAnimatedStyle,
            {
              position: 'absolute',
              width: 3,
              height: 3,
              backgroundColor: '#FFFFFF',
              borderRadius: 1.5,
              opacity: star.opacity,
              left: star.left,
              top: star.top,
            },
          ]}
        />
      ))}
    </View>
  );
}

