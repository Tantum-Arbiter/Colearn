import React, { memo, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
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
import type { BookOpeningPhase } from '@/hooks/use-book-opening';

export interface BookOpeningBridgeProps {
  story: Story;
  phase: BookOpeningPhase;
  showRotationEscape: boolean;
  isLandscape: boolean;
  reduceMotion: boolean;
  onTurnTheScreen: () => void;
  onReadThisWay: () => void;
}

function openingAngle(phase: BookOpeningPhase, reduceMotion: boolean): number {
  if (reduceMotion) {
    return 0;
  }

  if (phase === 'preOpen') {
    return STORY_GARDEN_SCALE.preOpenAngleDegrees;
  }

  if (phase === 'bridging') {
    return STORY_GARDEN_SCALE.preOpenAngleDegrees * 2;
  }

  if (phase === 'settling' || phase === 'open') {
    return 0;
  }

  return 0;
}

export const BookOpeningBridge = memo(function BookOpeningBridge({
  story,
  phase,
  showRotationEscape,
  isLandscape,
  reduceMotion,
  onTurnTheScreen,
  onReadThisWay,
}: BookOpeningBridgeProps) {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const shortEdge = Math.min(windowWidth, windowHeight);
  const coverWidth = Math.round(shortEdge * 0.82);
  const coverHeight = phase === 'settling' || phase === 'open'
    ? Math.round(coverWidth * 0.75)
    : coverWidth / STORY_GARDEN_SCALE.coverAspectRatio;

  const spread = useSharedValue(0);
  const angle = useSharedValue(0);

  useEffect(() => {
    const duration = phase === 'expanding'
      ? motionDuration(STORY_GARDEN_MOTION.coverExpansion, reduceMotion)
      : motionDuration(STORY_GARDEN_MOTION.landscapeSettle, reduceMotion);

    spread.value = withTiming(phase === 'settling' || phase === 'open' ? 1 : 0, {
      duration,
      easing: Easing.inOut(Easing.cubic),
    });

    angle.value = withTiming(openingAngle(phase, reduceMotion), {
      duration: motionDuration(STORY_GARDEN_MOTION.preOpen, reduceMotion) || 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [phase, reduceMotion, spread, angle]);

  const bookStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${-angle.value}deg` },
      { scale: 1 + spread.value * 0.06 },
    ],
  }));

  const handleTurn = useCallback(() => {
    onTurnTheScreen();
  }, [onTurnTheScreen]);

  const handleReadThisWay = useCallback(() => {
    onReadThisWay();
  }, [onReadThisWay]);

  const showCue = !isLandscape && (phase === 'preOpen' || phase === 'bridging');

  return (
    <View style={styles.container} testID="book-opening-bridge">
      <Animated.View
        style={[styles.book, { width: coverWidth, height: coverHeight }, bookStyle]}
        testID="book-opening-bridge-book"
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
      </Animated.View>

      {showCue && !showRotationEscape && (
        <View style={styles.cue} testID="book-opening-cue">
          <View style={styles.deviceSilhouette} />
          <Text style={styles.cueText}>{t('storyGarden.turnTheScreen')}</Text>
        </View>
      )}

      {showCue && showRotationEscape && (
        <View style={styles.escape} testID="book-opening-escape">
          <Pressable
            onPress={handleTurn}
            accessibilityRole="button"
            accessibilityLabel={t('storyGarden.turnTheScreenShort')}
            style={styles.escapeChoice}
            testID="book-opening-turn-screen"
          >
            <Text style={styles.escapeChoiceText}>{t('storyGarden.turnTheScreenShort')}</Text>
          </Pressable>

          <Pressable
            onPress={handleReadThisWay}
            accessibilityRole="button"
            accessibilityLabel={t('storyGarden.readThisWay')}
            style={styles.escapeChoice}
            testID="book-opening-read-this-way"
          >
            <Text style={styles.escapeChoiceText}>{t('storyGarden.readThisWay')}</Text>
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
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 18,
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
    fontSize: 72,
  },
  cue: {
    position: 'absolute',
    bottom: 64,
    alignItems: 'center',
  },
  deviceSilhouette: {
    width: 26,
    height: 40,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
  },
  cueText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  escape: {
    position: 'absolute',
    bottom: 56,
    alignItems: 'center',
  },
  escapeChoice: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 200,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 10,
  },
  escapeChoiceText: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    color: '#FFFFFF',
  },
});
