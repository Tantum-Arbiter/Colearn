import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { EmotionCardProps } from '@/types/emotion';
import { getThemeIcon, getThemeNameKey, getThemeName, getThemeImage } from '@/data/emotion-themes';
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
  const { t } = useTranslation();
  // Accessibility scaling
  const { scaledFontSize } = useAccessibility();

  // Animation values - matching MainMenuEntrance fade style
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1); // Start at 1 for pure fade effect
  const translateY = useSharedValue(0); // No translate for pure fade
  const pressScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const rotateZ = useSharedValue(0);

  // Size configurations - imageSize for bear theme images (nearly fills card)
  // emojiFontSize is larger than fontSize for emoji theme to make emojis more prominent
  const sizeConfig = {
    tiny: { width: 80, height: 90, fontSize: 28, emojiFontSize: 34, titleSize: 12, imageSize: 75 },
    small: { width: 120, height: 140, fontSize: 40, emojiFontSize: 48, titleSize: 16, imageSize: 115 },
    medium: { width: 150, height: 180, fontSize: 50, emojiFontSize: 60, titleSize: 18, imageSize: 145 },
    large: { width: 200, height: 240, fontSize: 70, emojiFontSize: 85, titleSize: 24, imageSize: 195 }
  };

  const config = sizeConfig[size];

  // Get image source for image-based themes (like bear)
  const themeImage = getThemeImage(emotion.id, theme);

  // Entrance animation - matching MainMenuEntrance fade style
  useEffect(() => {
    const timer = setTimeout(() => {
      // Pure fade animation like MainMenuEntrance (400ms, Easing.out(Easing.cubic))
      opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    }, animationDelay);

    return () => clearTimeout(timer);
  }, [animationDelay, opacity]);

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
          {/* Theme Icon or Image - centered */}
          {themeImage ? (
            <Image
              source={themeImage}
              style={[styles.emotionImage, { width: config.imageSize, height: config.imageSize }]}
              resizeMode="contain"
            />
          ) : (
            <ThemedText style={[styles.emoji, { fontSize: scaledFontSize(config.emojiFontSize), marginTop: 16 }]}>
              {getThemeIcon(emotion.id, theme)}
            </ThemedText>
          )}

          {/* Themed emotion name */}
          <ThemedText style={[styles.emotionName, { fontSize: scaledFontSize(config.titleSize) }]}>
            {getThemeNameKey(emotion.id, theme) ? t(getThemeNameKey(emotion.id, theme)!) : getThemeName(emotion.id, theme)}
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
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  emoji: {
    textAlign: 'center',
    flex: 1,
    textAlignVertical: 'center',
    lineHeight: undefined, // Reset line height to prevent clipping
    includeFontPadding: false, // Android: remove extra padding
  },
  emotionName: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flexShrink: 0,
  },
  emotionImage: {
    flex: 1,
    borderRadius: 8,
  },
});
