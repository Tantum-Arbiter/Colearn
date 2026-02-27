import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Story, STORY_TAGS, getLocalizedText } from '@/types/story';
import type { SupportedLanguage } from '@/services/i18n';
import { Fonts } from '@/constants/theme';
// All story images are loaded from local cache after batch sync - no authenticated fetching needed
import { Logger } from '@/utils/logger';

const log = Logger.create('BookCard');

interface BookCardProps {
  story: Story;
  onPress?: (story: Story) => void;
  index?: number; // For staggered animation
}

const { width: screenWidth } = Dimensions.get('window');
// Responsive card width with minimum and maximum constraints
const getCardWidth = () => {
  const availableWidth = screenWidth - 48; // Account for padding and gap
  const cardWidth = availableWidth / 2;

  // Ensure cards are not too small on large screens or too large on small screens
  return Math.max(140, Math.min(cardWidth, 200));
};
const cardWidth = getCardWidth();

export function BookCard({ story, onPress, index = 0 }: BookCardProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language as SupportedLanguage;
  const isPlaceholder = !story.isAvailable;
  const storyTag = story.category ? STORY_TAGS[story.category] : null;
  const storyTagLabel = storyTag ? t(storyTag.labelKey) : '';
  const displayTitle = getLocalizedText(story.localizedTitle, story.title, currentLanguage);

  // Animation values - temporarily disable animation for debugging
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const pressScale = useSharedValue(1);

  // Initialize card animation with staggered delay
  useEffect(() => {
    const delay = index * 100; // 100ms delay between each card
    const animationConfig = {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    };

    // Use setTimeout to ensure animation runs after component mount
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, animationConfig);
      scale.value = withTiming(1, animationConfig);
      translateY.value = withTiming(0, animationConfig);
    }, delay);

    // Fallback timer to ensure cards are visible even if animation fails
    const fallbackTimer = setTimeout(() => {
      if (opacity.value < 0.5) {
        log.warn(`Card ${index} (${story.title}) applying fallback visibility`);
        opacity.value = 1;
        scale.value = 1;
        translateY.value = 0;
      }
    }, delay + 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handlePress = () => {
    if (!isPlaceholder && onPress) {
      onPress(story);
    }
  };

  const handlePressIn = () => {
    if (!isPlaceholder) {
      pressScale.value = withTiming(0.95, { duration: 150 });
    }
  };

  const handlePressOut = () => {
    if (!isPlaceholder) {
      pressScale.value = withTiming(1, { duration: 150 });
    }
  };

  // Animated style with fallback
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * (isPlaceholder ? 0.6 : 1),
    transform: [
      { scale: scale.value * pressScale.value },
      { translateY: translateY.value }
    ],
  }), [opacity, scale, translateY, pressScale, isPlaceholder]);

  // Fallback style for when animations don't work
  const fallbackStyle = {
    opacity: 1,
    transform: [{ scale: 1 }, { translateY: 0 }],
  };

  return (
    <Animated.View
      testID={`book-card-${story.id}`}
      style={[
        animatedStyle,
        {
          backgroundColor: isPlaceholder ? 'red' : 'blue',
          margin: 2,
          minHeight: 200,
          minWidth: 150,
          borderWidth: 3,
          borderColor: isPlaceholder ? 'darkred' : 'darkblue'
        }
      ]}
    >
      <Pressable
        testID={`book-card-pressable-${story.id}`}
        style={[
          styles.card,
          {
            width: cardWidth,
            backgroundColor: isPlaceholder ? 'pink' : 'lightblue',
            minHeight: 180
          },
          isPlaceholder && styles.placeholderCard
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isPlaceholder}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
      >
      <LinearGradient
        colors={
          isPlaceholder 
            ? ['#F5F5F5', '#E8E8E8'] 
            : storyTag 
              ? [storyTag.color + '40', storyTag.color + '20']
              : ['#FFE4E1', '#FFF0F5']
        }
        style={styles.cardGradient}
      >
        {/* Book Cover / Placeholder Image */}
        <View style={[
          styles.imageContainer,
          isPlaceholder && styles.placeholderImageContainer
        ]}>
          {/* All images are loaded from local cache after batch sync */}
          {isPlaceholder ? (
            <Text style={styles.placeholderIcon}>📚</Text>
          ) : story.coverImage ? (
            <Image
              source={typeof story.coverImage === 'string' ? { uri: story.coverImage } : story.coverImage}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.storyEmoji}>{story.emoji}</Text>
          )}
        </View>

        {/* Title */}
        <Text
          testID={`book-card-title-${story.id}`}
          style={[
            styles.title,
            isPlaceholder && styles.placeholderTitle
          ]}
        >
          {displayTitle}
        </Text>

        {/* Tag (only for available stories) */}
        {!isPlaceholder && storyTag && (
          <View style={[styles.tagContainer, { backgroundColor: storyTag.color + '30' }]}>
            <Text style={styles.tagText}>
              {storyTag.emoji} {storyTagLabel}
            </Text>
          </View>
        )}

        {/* Duration indicator for available stories */}
        {!isPlaceholder && story.duration && (
          <Text style={styles.duration}>
            {story.duration} min
          </Text>
        )}
      </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12, // Reduced since we're using gap in parent
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 16,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  placeholderCard: {
    // Opacity handled by animation system
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholderImageContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  storyEmoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  placeholderIcon: {
    fontSize: 36,
    opacity: 0.4,
    textAlign: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Fonts.rounded,
    lineHeight: 20,
  },
  placeholderTitle: {
    color: '#95A5A6',
    fontWeight: '400',
  },
  tagContainer: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2C3E50',
    fontFamily: Fonts.rounded,
  },
  duration: {
    fontSize: 11,
    color: '#7F8C8D',
    textAlign: 'center',
    fontFamily: Fonts.rounded,
  },
});
