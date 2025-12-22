import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { EmotionCardProps } from '@/types/emotion';
import { getThemeIcon, getThemeName } from '@/data/emotion-themes';
import * as Haptics from 'expo-haptics';
import { useAccessibility } from '@/hooks/use-accessibility';

export function EmotionCard({
  emotion,
  isSelected = false,
  isRevealed = false,
  onPress,
  animationDelay = 0,
  size = 'medium',
  theme = 'emoji'
}: EmotionCardProps) {
  // Accessibility scaling
  const { scaledFontSize } = useAccessibility();

  // Animation values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(20);
  const pressScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const rotateZ = useSharedValue(0);

  // Size configurations
  const sizeConfig = {
    tiny: { width: 80, height: 90, fontSize: 28, titleSize: 12 },
    small: { width: 120, height: 140, fontSize: 40, titleSize: 16 },
    medium: { width: 150, height: 180, fontSize: 50, titleSize: 18 },
    large: { width: 200, height: 240, fontSize: 70, titleSize: 24 }
  };

  const config = sizeConfig[size];

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      translateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
    }, animationDelay);

    return () => clearTimeout(timer);
  }, [animationDelay, opacity, scale, translateY]);

  // Selection animation
  useEffect(() => {
    if (isSelected) {
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0.7, { duration: 300 }),
        withTiming(1, { duration: 300 })
      );
      rotateZ.value = withSequence(
        withTiming(-2, { duration: 100 }),
        withTiming(2, { duration: 200 }),
        withTiming(0, { duration: 100 })
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
      rotateZ.value = withTiming(0, { duration: 300 });
    }
  }, [isSelected, glowOpacity, rotateZ]);

  const handlePress = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Press animation
    pressScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    // Call the onPress callback
    onPress(emotion);
  };

  // Animated styles
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value * pressScale.value },
      { translateY: translateY.value },
      { rotateZ: `${rotateZ.value}deg` }
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const getGradientColors = (): [string, string, ...string[]] => {
    const baseColor = emotion.color;
    const lightColor = baseColor + '40'; // 25% opacity
    const darkColor = baseColor + '80';  // 50% opacity

    return isSelected
      ? [baseColor, darkColor, baseColor] as [string, string, string]
      : [lightColor, darkColor] as [string, string];
  };

  return (
    <Animated.View style={[styles.container, cardAnimatedStyle]}>
      {/* Glow effect for selection */}
      {isSelected && (
        <Animated.View 
          style={[
            styles.glowEffect, 
            glowAnimatedStyle,
            {
              width: config.width + 20,
              height: config.height + 20,
              borderRadius: 25,
              backgroundColor: emotion.color + '30',
            }
          ]} 
        />
      )}
      
      <Pressable
        testID="emotion-card-pressable"
        style={[styles.card, { width: config.width, height: config.height }]}
        onPress={handlePress}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
      >
        <LinearGradient
          colors={getGradientColors()}
          style={[styles.cardGradient, { borderRadius: 20 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Theme Icon - centered */}
          <ThemedText style={[styles.emoji, { fontSize: scaledFontSize(config.fontSize) }]}>
            {getThemeIcon(emotion.id, theme)}
          </ThemedText>

          {/* Themed emotion name */}
          <ThemedText style={[styles.emotionName, { fontSize: scaledFontSize(config.titleSize) }]}>
            {getThemeName(emotion.id, theme)}
          </ThemedText>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
  },
  glowEffect: {
    position: 'absolute',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emoji: {
    textAlign: 'center',
    marginBottom: 12,
    flex: 1,
    textAlignVertical: 'center',
    lineHeight: undefined, // Reset line height to prevent clipping
    includeFontPadding: false, // Android: remove extra padding
  },
  emotionName: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
