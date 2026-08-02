import React, { memo, useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Story, STORY_TAGS } from '@/types/story';
import { Fonts } from '@/constants/theme';
import {
  STORY_GARDEN_MOTION,
  STORY_GARDEN_SCALE,
  MIN_TOUCH_TARGET,
  motionDuration,
} from '@/constants/story-garden-motion';

export type BookClosingStage = 'breath' | 'closing' | 'choices';

export interface BookClosingProps {
  story: Story;
  reduceMotion: boolean;
  onReadAgain: () => void;
  onPutItBack: () => void;
}

export const BookClosing = memo(function BookClosing({
  story,
  reduceMotion,
  onReadAgain,
  onPutItBack,
}: BookClosingProps) {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [stage, setStage] = useState<BookClosingStage>('breath');

  const shortEdge = Math.min(windowWidth, windowHeight);
  const coverWidth = Math.round(shortEdge * 0.55);
  const coverHeight = coverWidth / STORY_GARDEN_SCALE.coverAspectRatio;

  const shrink = useSharedValue(1.25);

  useEffect(() => {
    const breath = motionDuration(STORY_GARDEN_MOTION.closingBreath, reduceMotion);
    const close = motionDuration(STORY_GARDEN_MOTION.bookClose, reduceMotion);

    const toClosing = setTimeout(() => setStage('closing'), breath);
    const toChoices = setTimeout(() => setStage('choices'), breath + close);

    return () => {
      clearTimeout(toClosing);
      clearTimeout(toChoices);
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (stage === 'breath') {
      return;
    }

    shrink.value = withTiming(1, {
      duration: motionDuration(STORY_GARDEN_MOTION.bookClose, reduceMotion),
      easing: Easing.inOut(Easing.cubic),
    });
  }, [stage, reduceMotion, shrink]);

  const bookStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shrink.value }],
  }));

  const handleReadAgain = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReadAgain();
  }, [onReadAgain]);

  const handlePutItBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPutItBack();
  }, [onPutItBack]);

  return (
    <View style={styles.container} testID="book-closing">
      <Animated.View
        style={[styles.book, { width: coverWidth, height: coverHeight }, bookStyle]}
        testID="book-closing-book"
      >
        {story.coverImage ? (
          <Image
            source={typeof story.coverImage === 'string' ? { uri: story.coverImage } : story.coverImage}
            style={styles.cover}
            contentFit="cover"
            transition={0}
            cachePolicy="memory-disk"
            recyclingKey={story.id}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderEmoji}>{STORY_TAGS[story.category]?.emoji}</Text>
          </View>
        )}
        <View style={styles.completionRibbon} testID="book-closing-ribbon" />
      </Animated.View>

      {stage === 'choices' && (
        <View style={styles.choices} testID="book-closing-choices">
          <Pressable
            onPress={handleReadAgain}
            accessibilityRole="button"
            accessibilityLabel={t('storyGarden.readAgain')}
            style={styles.choice}
            testID="book-closing-read-again"
          >
            <Text style={styles.choiceText}>{t('storyGarden.readAgain')}</Text>
          </Pressable>

          <Pressable
            onPress={handlePutItBack}
            accessibilityRole="button"
            accessibilityLabel={t('storyGarden.putItBack')}
            style={styles.choice}
            testID="book-closing-put-it-back"
          >
            <Text style={styles.choiceText}>{t('storyGarden.putItBack')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  book: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.42,
    shadowRadius: 22,
    elevation: 14,
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
    fontSize: 64,
  },
  completionRibbon: {
    position: 'absolute',
    top: 0,
    right: 22,
    width: 16,
    height: 52,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#E4645A',
    zIndex: 3,
  },
  choices: {
    marginTop: 34,
    alignItems: 'center',
  },
  choice: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 220,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    marginTop: 12,
  },
  choiceText: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    color: '#FFFFFF',
  },
});
