import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { getLocalizedText } from '@/types/story';
import type { SupportedLanguage } from '@/services/i18n';
import { NIGHT_DEEP, NIGHT_VOID, TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { CHILD_UI_MOTION, CHILD_UI_SCALE, motionDuration } from '@/constants/child-ui-motion';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  FEATURED_ASPECT_RATIO,
  RADIUS_LARGE,
  SPACE_4,
  TYPE_ROLES,
  typeSize,
} from '@/components/child-ui/tokens';
import { CatalogueStory } from './catalogue-story';
import { StoryPlayButton } from './story-play-button';
import { BookFrame } from './book-frame';

const TITLE_INSET = 24;
const TITLE_WASH_GRADIENT = ['rgba(4, 16, 47, 0.55)', 'rgba(4, 16, 47, 0.0)'] as const;

export interface StoryOpenHandler {
  (story: CatalogueStory, ref: React.RefObject<View | null>): void;
}

interface FeaturedStoryCardProps {
  story: CatalogueStory;
  /** The width the book is given on the shelf. */
  width: number;
  language: SupportedLanguage;
  onOpen: StoryOpenHandler;
  hidden?: boolean;
  testID?: string;
}

export function FeaturedStoryCard({ story, width, language, onOpen, hidden = false, testID = 'featured-story-card' }: FeaturedStoryCardProps) {
  const { isTablet, scaledFontSize } = useAccessibility();
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<View>(null);
  const pressScale = useSharedValue(1);
  const title = getLocalizedText(story.title, story.title.en, language);
  const height = Math.round(width / FEATURED_ASPECT_RATIO);

  const duration = motionDuration(CHILD_UI_MOTION.cardTap, reduceMotion);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(CHILD_UI_SCALE.cardPressed, { duration, easing: Easing.out(Easing.ease) });
  }, [pressScale, duration]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withTiming(1, { duration, easing: Easing.out(Easing.ease) });
  }, [pressScale, duration]);

  const handleOpen = useCallback(() => {
    onOpen(story, cardRef);
  }, [onOpen, story]);

  return (
    <Animated.View ref={cardRef} collapsable={false} style={[animatedStyle, hidden && styles.hidden]}>
      <BookFrame width={width} height={height} radius={RADIUS_LARGE} testID={`${testID}-book`}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={handleOpen}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
      >
        {story.coverArtwork ? (
          <Image
            source={typeof story.coverArtwork === 'string' ? { uri: story.coverArtwork } : story.coverArtwork}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
        )}

        <LinearGradient
          colors={TITLE_WASH_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.titleWash}
          pointerEvents="none"
        />

        <Text
          testID="featured-story-title"
          style={[styles.title, { fontSize: scaledFontSize(typeSize('featuredTitle', isTablet)) }]}
          numberOfLines={2}
        >
          {title}
        </Text>

        <View style={styles.playButton}>
          <StoryPlayButton variant="featured" onPress={handleOpen} accessibilityLabel={title} />
        </View>
      </Pressable>
      </BookFrame>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: NIGHT_DEEP,
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: NIGHT_VOID,
  },
  titleWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '65%',
  },
  title: {
    position: 'absolute',
    top: TITLE_INSET,
    left: TITLE_INSET,
    right: '38%',
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: TYPE_ROLES.featuredTitle.weight,
  },
  playButton: {
    position: 'absolute',
    top: SPACE_4,
    right: SPACE_4,
  },
});
