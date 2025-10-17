import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from './themed-text';
import { getSvgComponentFromSvg } from './main-menu/assets';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { VISUAL_EFFECTS } from './main-menu/constants';
import { generateStarPositions } from './main-menu/utils';

interface DefaultPageProps {
  icon: string;
  title: string;
  onBack: () => void;
}

// Map icon names from menu items to SVG component types
const mapIconNameToSvgType = (iconName: string): string => {
  switch (iconName) {
    case 'stories-icon':
      return 'stories';
    case 'sensory-icon':
      return 'sensory';
    case 'emotions-icon':
      return 'emotions';
    case 'bedtime-icon':
      return 'bedtime';
    case 'screentime-icon':
    case 'clock':
      return 'screentime';
    case 'brain':
      return 'sensory';
    case 'heart':
      return 'emotions';
    case 'moon':
      return 'bedtime';
    case 'gear':
      return 'stories'; // fallback for settings
    default:
      return 'stories'; // fallback
  }
};

// Content data for each page
const pageContent: { [key: string]: { emoji: string; message: string; subtitle: string; color: string } } = {
  'Stories': {
    emoji: '📚',
    message: 'Story Time!',
    subtitle: 'Magical tales and adventures await you here. Let your imagination soar!',
    color: '#FF6B6B'
  },
  'Sensory': {
    emoji: '🌟',
    message: 'Feel & Explore!',
    subtitle: 'Touch, see, hear, and discover the world around you through your senses.',
    color: '#4ECDC4'
  },
  'Emotions': {
    emoji: '😊',
    message: 'Happy Feelings!',
    subtitle: 'Learn about emotions and how to express your feelings in healthy ways.',
    color: '#45B7D1'
  },
  'Bedtime': {
    emoji: '🎵',
    message: 'Sweet Dreams!',
    subtitle: 'Gentle melodies and soothing sounds to help you drift off to sleep.',
    color: '#96CEB4'
  },
  'Screen Time': {
    emoji: '⏰',
    message: 'Time to Play!',
    subtitle: 'Balance your screen time with fun activities and healthy habits.',
    color: '#FFEAA7'
  }
};

export function DefaultPage({ icon, title, onBack }: DefaultPageProps) {
  const content = pageContent[title] || pageContent['Stories'];
  const svgType = mapIconNameToSvgType(icon);
  const SvgComponent = getSvgComponentFromSvg(svgType as any);

  // Star animation for background (matching main menu)
  const starRotation = useSharedValue(0);

  // Generate stars (matching main menu)
  const stars = useMemo(() => generateStarPositions(), []);

  // Start star rotation animation on mount
  useEffect(() => {
    starRotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  return (
    <LinearGradient
      colors={['#4ECDC4', '#3B82F6', '#1E3A8A']}
      style={styles.container}
    >
      {/* Starry background (matching main menu) */}
      {stars.map((star) => (
        <Animated.View
          key={`star-${star.id}`}
          style={[
            styles.star,
            starAnimatedStyle,
            {
              left: star.left,
              top: star.top,
              opacity: star.opacity,
            }
          ]}
        />
      ))}
      {/* Back button */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </Pressable>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <ThemedText style={styles.title}>{title}</ThemedText>

        {/* SVG Icon */}
        <View style={styles.iconContainer}>
          <SvgComponent width={120} height={120} />
        </View>

        {/* Large emoji */}
        <ThemedText style={styles.emoji}>{content.emoji}</ThemedText>

        <ThemedText style={[styles.message, { color: content.color }]}>
          {content.message}
        </ThemedText>

        <ThemedText style={styles.subtitle}>
          {content.subtitle}
        </ThemedText>

        {/* Fun interactive element */}
        <Pressable style={[styles.actionButton, { backgroundColor: content.color }]} onPress={() => {}}>
          <ThemedText style={styles.actionButtonText}>Coming Soon!</ThemedText>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  star: {
    position: 'absolute',
    width: VISUAL_EFFECTS.STAR_SIZE,
    height: VISUAL_EFFECTS.STAR_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: VISUAL_EFFECTS.STAR_BORDER_RADIUS,
    opacity: VISUAL_EFFECTS.STAR_BASE_OPACITY,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 60,
    textAlign: 'center',
    marginBottom: 15,
  },
  message: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  actionButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
