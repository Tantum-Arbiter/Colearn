import React, { useEffect, useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { getScreenDimensions, LAYOUT } from './constants';

// Fun objects a child can easily identify - whimsical everyday objects
const FLOATING_EMOJIS = [
  '🛸', // UFO
  '👟', // Shoe
  '🧸', // Teddy bear
  '🎈', // Balloon
  '🎸', // Guitar
  '🪁', // Kite
  '🧢', // Cap
  '🍪', // Cookie
  '🧩', // Puzzle piece
  '🪑', // Chair
];

// Get responsive size based on screen width
const getResponsiveEmojiSize = (): number => {
  const { width } = getScreenDimensions();
  // Base size 20 for phones, scale up for tablets
  const isTablet = width >= 768;
  return isTablet ? 28 : 20;
};

interface FloatingObjectProps {
  emoji: string;
  startDelay: number;
  topPosition: number; // 0-1 percentage from top
  duration: number;
  startOffset: number; // Additional offset for start position variety
  rotation: number; // Random rotation in degrees
}

const FloatingObject: React.FC<FloatingObjectProps> = ({
  emoji,
  startDelay,
  topPosition,
  duration,
  startOffset,
  rotation,
}) => {
  const { width: screenWidth, height: screenHeight } = getScreenDimensions();
  // Start from off-screen right, exit to off-screen left
  const startPosition = screenWidth + 50 + startOffset;
  const exitPosition = -100;
  const translateX = useSharedValue(startPosition);
  const emojiSize = getResponsiveEmojiSize();

  useEffect(() => {
    const createAnimation = () => {
      return withRepeat(
        withSequence(
          withTiming(startPosition, { duration: 0 }),
          withTiming(exitPosition, { duration, easing: Easing.linear })
        ),
        -1,
        false
      );
    };

    if (startDelay > 0) {
      translateX.value = withDelay(startDelay, createAnimation());
    } else {
      translateX.value = createAnimation();
    }

    return () => {
      cancelAnimation(translateX);
    };
  }, [translateX, startDelay, duration, startPosition, exitPosition]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const containerStyle = useMemo(() => ({
    top: screenHeight * topPosition,
  }), [screenHeight, topPosition]);

  return (
    <Animated.View
      style={[styles.floatingObject, animatedStyle, containerStyle]}
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
    >
      <Text style={[styles.emoji, { fontSize: emojiSize, transform: [{ rotate: `${rotation}deg` }] }]}>{emoji}</Text>
    </Animated.View>
  );
};

// Generate a random rotation between -45 and 45 degrees
const getRandomRotation = () => Math.floor(Math.random() * 90) - 45;

// Generate a set of floating objects with varied properties
export const useFloatingObjects = () => {
  return useMemo(() => {
    // Pick 3 random emojis for variety each session
    const shuffled = [...FLOATING_EMOJIS].sort(() => Math.random() - 0.5);
    const selectedEmojis = shuffled.slice(0, 3);

    return [
      { emoji: selectedEmojis[0], startDelay: 0, topPosition: 0.08, duration: 45000, startOffset: -50, rotation: getRandomRotation() },
      { emoji: selectedEmojis[1], startDelay: 12000, topPosition: 0.12, duration: 55000, startOffset: -100, rotation: getRandomRotation() },
      { emoji: selectedEmojis[2], startDelay: 25000, topPosition: 0.10, duration: 50000, startOffset: -150, rotation: getRandomRotation() },
    ];
  }, []);
};

export const FloatingObjects: React.FC = () => {
  const objects = useFloatingObjects();

  return (
    <>
      {objects.map((obj, index) => (
        <FloatingObject
          key={`floating-obj-${index}`}
          emoji={obj.emoji}
          startDelay={obj.startDelay}
          topPosition={obj.topPosition}
          duration={obj.duration}
          startOffset={obj.startOffset}
          rotation={obj.rotation}
        />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  floatingObject: {
    position: 'absolute',
    zIndex: LAYOUT.Z_INDEX.ROCKETS, // Higher than moon (BEAR = 1) to overlay it
  },
  emoji: {
    opacity: 0.7,
  },
});

export default FloatingObjects;

