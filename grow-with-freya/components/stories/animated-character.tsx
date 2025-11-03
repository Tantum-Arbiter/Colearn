import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { AnimatedCharacter, CharacterAnimation, CharacterMovement } from '@/types/story';
import { getResponsiveSize } from '@/utils/responsive-image';

interface AnimatedCharacterComponentProps {
  character: AnimatedCharacter;
  isActive: boolean; // Whether the page is currently active
  onAnimationComplete?: () => void;
  onCharacterPress?: (characterId: string) => void;
}

export const AnimatedCharacterComponent: React.FC<AnimatedCharacterComponentProps> = ({
  character,
  isActive,
  onAnimationComplete,
  onCharacterPress,
}) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [currentAnimation, setCurrentAnimation] = useState<CharacterAnimation | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values for movement
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Get default animation
  const defaultAnim = character.animations.find(
    anim => anim.name === character.defaultAnimation
  ) || character.animations[0];

  // Initialize animation when component mounts or becomes active
  useEffect(() => {
    if (isActive && defaultAnim && !isAnimating) {
      startAnimation(defaultAnim);
    }

    return () => {
      cleanup();
    };
  }, [isActive, defaultAnim]);

  // Cleanup function
  const cleanup = () => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
    setIsAnimating(false);
    setCurrentFrameIndex(0);
  };

  // Reset animation when page changes
  useEffect(() => {
    if (!isActive) {
      cleanup();
      // Reset position values
      translateX.value = 0;
      translateY.value = 0;
      scale.value = 1;
      rotation.value = 0;
      opacity.value = 1;
    }
  }, [isActive]);

  const startAnimation = (animation: CharacterAnimation) => {
    if (isAnimating) return;

    setCurrentAnimation(animation);
    setIsAnimating(true);
    setCurrentFrameIndex(0);

    const startDelay = animation.startDelay || 2000; // Default 2 second delay

    // Start animation after delay
    animationTimeoutRef.current = setTimeout(() => {
      playFrameAnimation(animation);
    }, startDelay);
  };

  const playFrameAnimation = (animation: CharacterAnimation) => {
    const frameDuration = animation.duration / animation.frames.length;
    let frameIndex = 0;

    const playNextFrame = () => {
      if (!isActive || !isAnimating) return;

      setCurrentFrameIndex(frameIndex);
      frameIndex++;

      if (frameIndex >= animation.frames.length) {
        if (animation.loop) {
          frameIndex = 0; // Reset for loop
        } else {
          // Animation complete, start movements if any
          setIsAnimating(false);
          if (character.movements && character.movements.length > 0) {
            startMovements();
          } else {
            onAnimationComplete?.();
          }
          return;
        }
      }

      frameIntervalRef.current = setTimeout(playNextFrame, frameDuration);
    };

    playNextFrame();
  };

  const startMovements = () => {
    if (!character.movements || character.movements.length === 0) {
      onAnimationComplete?.();
      return;
    }

    let movementIndex = 0;

    const executeNextMovement = () => {
      if (movementIndex >= character.movements!.length) {
        onAnimationComplete?.();
        return;
      }

      const movement = character.movements![movementIndex];
      executeMovement(movement, () => {
        movementIndex++;
        executeNextMovement();
      });
    };

    executeNextMovement();
  };

  const executeMovement = (movement: CharacterMovement, onComplete: () => void) => {
    const config = {
      duration: movement.duration,
      easing: getEasingFunction(movement.easing || 'ease-out'),
    };

    switch (movement.type) {
      case 'translate':
        if (movement.direction === 'left') {
          translateX.value = withTiming(translateX.value - (movement.distance || 50), config, runOnJS(onComplete));
        } else if (movement.direction === 'right') {
          translateX.value = withTiming(translateX.value + (movement.distance || 50), config, runOnJS(onComplete));
        } else if (movement.direction === 'up') {
          translateY.value = withTiming(translateY.value - (movement.distance || 50), config, runOnJS(onComplete));
        } else if (movement.direction === 'down') {
          translateY.value = withTiming(translateY.value + (movement.distance || 50), config, runOnJS(onComplete));
        }
        break;
      case 'scale':
        scale.value = withTiming(movement.distance || 1.2, config, runOnJS(onComplete));
        break;
      case 'rotate':
        rotation.value = withTiming(movement.distance || 360, config, runOnJS(onComplete));
        break;
      default:
        onComplete();
    }
  };

  const getEasingFunction = (easing: string) => {
    switch (easing) {
      case 'linear': return Easing.linear;
      case 'ease-in': return Easing.in(Easing.quad);
      case 'ease-out': return Easing.out(Easing.quad);
      case 'ease-in-out': return Easing.inOut(Easing.quad);
      default: return Easing.out(Easing.quad);
    }
  };

  const handleCharacterPress = async () => {
    if (!character.isInteractive) return;

    // Play audio if available
    if (character.audioSource) {
      try {
        if (sound) {
          await sound.unloadAsync();
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: character.audioSource },
          { shouldPlay: true, volume: 0.8 }
        );
        setSound(newSound);
      } catch (error) {
        console.warn('Failed to play character audio:', error);
      }
    }

    // Trigger callback
    onCharacterPress?.(character.id);
  };

  // Get current frame image
  const getCurrentFrameImage = () => {
    if (!currentAnimation || currentAnimation.frames.length === 0) {
      return null;
    }
    return currentAnimation.frames[currentFrameIndex];
  };

  // Convert position values to responsive styles
  const getPositionStyle = () => {
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    
    const getPixelValue = (value: number | string, dimension: 'width' | 'height') => {
      if (typeof value === 'string' && value.endsWith('%')) {
        const percentage = parseFloat(value) / 100;
        return dimension === 'width' ? screenWidth * percentage : screenHeight * percentage;
      }
      return typeof value === 'number' ? value : parseFloat(value);
    };

    return {
      position: 'absolute' as const,
      left: getPixelValue(character.position.x, 'width'),
      top: getPixelValue(character.position.y, 'height'),
      width: getPixelValue(character.position.width, 'width'),
      height: getPixelValue(character.position.height, 'height'),
      zIndex: character.position.zIndex || 2,
    };
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const currentFrameImage = getCurrentFrameImage();

  if (!currentFrameImage) {
    return null;
  }

  return (
    <Animated.View style={[getPositionStyle(), animatedStyle]}>
      <Pressable
        onPress={handleCharacterPress}
        disabled={!character.isInteractive}
        style={styles.characterContainer}
      >
        <Image
          source={{ uri: currentFrameImage }}
          style={styles.characterImage}
          resizeMode="contain"
        />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  characterContainer: {
    width: '100%',
    height: '100%',
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },
});
