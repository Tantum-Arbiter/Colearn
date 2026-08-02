import React, { memo, useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Story, STORY_TAGS, getLocalizedText } from '@/types/story';
import { Fonts } from '@/constants/theme';
import type { SupportedLanguage } from '@/services/i18n';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  STORY_GARDEN_MOTION,
  STORY_GARDEN_SCALE,
  motionDuration,
} from '@/constants/story-garden-motion';

export interface ShelfBookProps {
  story: Story;
  width: number;
  isCentred: boolean;
  isBookmarked: boolean;
  language: SupportedLanguage;
  onPress: (story: Story, bookRef: React.RefObject<View | null>) => void;
  testID?: string;
}

export const ShelfBook = memo(function ShelfBook({
  story,
  width,
  isCentred,
  isBookmarked,
  language,
  onPress,
  testID,
}: ShelfBookProps) {
  const bookRef = useRef<View>(null);
  const reduceMotion = useReducedMotion();
  const displayTitle = getLocalizedText(story.localizedTitle, story.title, language);

  const height = width / STORY_GARDEN_SCALE.coverAspectRatio;

  const scale = useSharedValue(isCentred ? STORY_GARDEN_SCALE.shelfCentredBook : 1);
  const opacity = useSharedValue(isCentred ? 1 : STORY_GARDEN_SCALE.shelfNeighbourOpacity);
  const press = useSharedValue(1);

  useEffect(() => {
    const duration = motionDuration(STORY_GARDEN_MOTION.shelfSnapSettle, reduceMotion);
    const easing = Easing.out(Easing.cubic);

    scale.value = withTiming(
      isCentred ? STORY_GARDEN_SCALE.shelfCentredBook : STORY_GARDEN_SCALE.shelfNeighbourBook,
      { duration, easing }
    );
    opacity.value = withTiming(isCentred ? 1 : STORY_GARDEN_SCALE.shelfNeighbourOpacity, {
      duration,
      easing,
    });
  }, [isCentred, reduceMotion, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value * press.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (reduceMotion) {
      return;
    }
    press.value = withTiming(STORY_GARDEN_SCALE.touchCompression, {
      duration: STORY_GARDEN_MOTION.touchAcknowledgement.duration,
      easing: Easing.out(Easing.quad),
    });
  }, [press, reduceMotion]);

  const handlePressOut = useCallback(() => {
    press.value = withTiming(1, {
      duration: STORY_GARDEN_MOTION.touchAcknowledgement.duration,
      easing: Easing.out(Easing.quad),
    });
  }, [press]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(story, bookRef);
  }, [onPress, story]);

  return (
    <Animated.View ref={bookRef} collapsable={false} style={animatedStyle} testID={testID}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={displayTitle}
        testID={`shelf-book-${story.id}`}
        style={styles.pressable}
      >
        <View style={[styles.book, { width, height }]}>
          <View style={styles.spine} />
          {story.coverImage ? (
            <Image
              source={typeof story.coverImage === 'string' ? { uri: story.coverImage } : story.coverImage}
              style={styles.cover}
              contentFit="cover"
              transition={0}
              cachePolicy="memory-disk"
              recyclingKey={story.id}
              testID={`shelf-book-cover-${story.id}`}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderEmoji}>{STORY_TAGS[story.category]?.emoji}</Text>
            </View>
          )}

          {isBookmarked && <View style={styles.ribbon} testID={`shelf-book-ribbon-${story.id}`} />}
        </View>

        {isCentred && (
          <View style={[styles.titleContainer, { width }]}>
            <Text style={styles.title} numberOfLines={2} testID={`shelf-book-title-${story.id}`}>
              {displayTitle}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
  },
  book: {
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    zIndex: 2,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  placeholderEmoji: {
    fontSize: 52,
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    right: 18,
    width: 14,
    height: 46,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    backgroundColor: '#E4645A',
    zIndex: 3,
  },
  titleContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    lineHeight: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
