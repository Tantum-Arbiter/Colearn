import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolate } from 'react-native-reanimated';
import { Story, STORY_TAGS, getLocalizedText } from '@/types/story';
import { Fonts } from '@/constants/theme';
import type { SupportedLanguage } from '@/services/i18n';
import type { ReadingMode } from '@/contexts/story-transition-context';
import type { BookOrigin } from '@/hooks/use-book-opening';
import { voiceRecordingService, VoiceOver } from '@/services/voice-recording-service';
import { useAccessibility } from '@/hooks/use-accessibility';
import {
  STORY_GARDEN_MOTION,
  STORY_GARDEN_SCALE,
  MIN_TOUCH_TARGET,
  motionDuration,
} from '@/constants/story-garden-motion';

export interface FocusedBookProps {
  story: Story;
  language: SupportedLanguage;
  reduceMotion: boolean;
  origin?: BookOrigin | null;
  onChoose: (mode: ReadingMode, voiceOver: VoiceOver | null) => void;
  onRecordVoice: () => void;
  onPutBack: () => void;
}

export const FocusedBook = memo(function FocusedBook({
  story,
  language,
  reduceMotion,
  origin = null,
  onChoose,
  onRecordVoice,
  onPutBack,
}: FocusedBookProps) {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { contentMaxWidth } = useAccessibility();
  const [voiceOvers, setVoiceOvers] = useState<VoiceOver[]>([]);

  const displayTitle = getLocalizedText(story.localizedTitle, story.title, language);
  const premise = getLocalizedText(story.localizedDescription, story.description ?? '', language);

  const usableWidth = Math.min(windowWidth, contentMaxWidth);
  const coverWidth = Math.round(usableWidth * STORY_GARDEN_SCALE.focusedCoverWidthRatio);
  const coverHeight = coverWidth / STORY_GARDEN_SCALE.coverAspectRatio;

  const enter = useSharedValue(0);

  const lift = useMemo(() => {
    if (!origin || origin.width === 0) {
      return { translateX: 0, translateY: 0, scale: 1 };
    }

    const originCentreX = origin.x + origin.width / 2;
    const originCentreY = origin.y + origin.height / 2;

    return {
      translateX: originCentreX - windowWidth / 2,
      translateY: originCentreY - windowHeight / 2,
      scale: origin.width / coverWidth,
    };
  }, [origin, windowWidth, windowHeight, coverWidth]);

  useEffect(() => {
    enter.value = withTiming(1, {
      duration: motionDuration(STORY_GARDEN_MOTION.focusSettle, reduceMotion),
      easing: Easing.out(Easing.cubic),
    });
  }, [enter, reduceMotion]);

  useEffect(() => {
    let isMounted = true;

    voiceRecordingService
      .getVoiceOversForStory(story.id)
      .then((found) => {
        if (isMounted) {
          setVoiceOvers(found);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [story.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
  }));

  const bookLiftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(enter.value, [0, 1], [lift.translateX, 0]) },
      { translateY: interpolate(enter.value, [0, 1], [lift.translateY, 0]) },
      { scale: interpolate(enter.value, [0, 1], [lift.scale, 1]) },
    ],
  }));

  const familiarVoice = voiceOvers.length > 0 ? voiceOvers[0] : null;

  const handleReadTogether = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChoose('read', null);
  }, [onChoose]);

  const handleListen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChoose(familiarVoice ? 'narrate' : 'read', familiarVoice);
  }, [onChoose, familiarVoice]);

  const handleRecord = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRecordVoice();
  }, [onRecordVoice]);

  const handlePutBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPutBack();
  }, [onPutBack]);

  const listenLabel = familiarVoice
    ? t('storyGarden.listenTo', { name: familiarVoice.name })
    : t('storyGarden.listen');

  return (
    <Animated.View style={[styles.container, animatedStyle]} testID="focused-book">
      <Animated.View style={[styles.book, { width: coverWidth, height: coverHeight }, bookLiftStyle]}>
        <View style={styles.spine} />
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

      <Text style={styles.title} numberOfLines={2} testID="focused-book-title">
        {displayTitle}
      </Text>

      {premise ? (
        <Text style={styles.premise} numberOfLines={2} testID="focused-book-premise">
          {premise}
        </Text>
      ) : null}

      <Pressable
        onPress={handleReadTogether}
        accessibilityRole="button"
        accessibilityLabel={t('storyGarden.readTogether')}
        style={styles.primaryChoice}
        testID="focused-book-read-together"
      >
        <Text style={styles.primaryChoiceText}>{t('storyGarden.readTogether')}</Text>
      </Pressable>

      <Pressable
        onPress={handleListen}
        accessibilityRole="button"
        accessibilityLabel={listenLabel}
        style={styles.primaryChoice}
        testID="focused-book-listen"
      >
        <Text style={styles.primaryChoiceText}>{listenLabel}</Text>
      </Pressable>

      <Pressable
        onPress={handleRecord}
        accessibilityRole="button"
        accessibilityLabel={t('storyGarden.recordAVoice')}
        style={styles.subordinateChoice}
        testID="focused-book-record"
      >
        <Text style={styles.subordinateChoiceText}>{t('storyGarden.recordAVoice')}</Text>
      </Pressable>

      <Pressable
        onPress={handlePutBack}
        accessibilityRole="button"
        accessibilityLabel={t('storyGarden.putBack')}
        style={styles.putBack}
        testID="focused-book-put-back"
      >
        <Text style={styles.putBackText}>{t('storyGarden.putBack')}</Text>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  book: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 10,
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
    fontSize: 72,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 22,
  },
  premise: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.82,
    textAlign: 'center',
    marginTop: 8,
  },
  primaryChoice: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: 240,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    marginTop: 16,
  },
  primaryChoiceText: {
    fontFamily: Fonts.rounded,
    fontSize: 19,
    color: '#FFFFFF',
  },
  subordinateChoice: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 14,
  },
  subordinateChoiceText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.62,
  },
  putBack: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
  },
  putBackText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.75,
  },
});
