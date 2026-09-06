import React, { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import { HOME_CARDS, HOME_CARD_TINTS, HOME_CARD_TYPE, HOME_JOURNEY_MOTION } from '@/constants/home-journey';
import { progressFraction } from '@/constants/home-scene';
import type { ChildHomeStory } from '@/types/child-home';
import { useArrowNudge } from './home-card';
import { HeroCardFrame } from './hero-card-frame';
import { CardProgressBar } from './card-progress-bar';
import { CardArrowButton } from './card-arrow-button';
import { Sparkle, StatIcon } from './stat-icons';

export interface ContinueCardProps {
  story?: ChildHomeStory;
  width: number;
  animated: boolean;
  onPress: () => void;
  testID?: string;
}

const CoverSparkle = memo(function CoverSparkle({ animated }: { animated: boolean }) {
  const sparkle = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      cancelAnimation(sparkle);
      sparkle.value = 0;
      return;
    }

    sparkle.value = withRepeat(
      withSequence(
        withDelay(
          HOME_JOURNEY_MOTION.sparkleEveryMs,
          withTiming(1, { duration: HOME_JOURNEY_MOTION.sparkleMs, easing: Easing.out(Easing.quad) })
        ),
        withTiming(0, { duration: HOME_JOURNEY_MOTION.sparkleMs * 1.4, easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(sparkle);
    };
  }, [animated, sparkle]);

  const style = useAnimatedStyle(() => ({
    opacity: sparkle.value,
    transform: [{ scale: 0.5 + 0.7 * sparkle.value }, { rotate: `${sparkle.value * 40}deg` }],
  }));

  return (
    <Animated.View testID="cover-sparkle" style={[styles.sparkle, style]} pointerEvents="none">
      <Sparkle size={16} colour="#FFF7D6" />
    </Animated.View>
  );
});

interface CardThumbnailProps {
  story?: ChildHomeStory;
  size: number;
  animated: boolean;
}

const CardThumbnail = memo(function CardThumbnail({ story, size, animated }: CardThumbnailProps) {
  return (
    <View style={[styles.cover, { width: size, height: size, borderRadius: HOME_CARDS.coverRadius }]}>
      <View style={[styles.coverClip, { borderRadius: HOME_CARDS.coverRadius - 1 }]}>
        {story?.coverImage ? (
          <Image testID="continue-cover" source={story.coverImage} style={styles.coverImage} contentFit="cover" transition={0} />
        ) : (
          <View testID="continue-cover-placeholder" style={styles.coverPlaceholder}>
            <StatIcon kind="book" size={Math.round(size * 0.55)} animated={animated} testID="continue-cover-glyph" />
          </View>
        )}
      </View>
      <CoverSparkle animated={animated} />
    </View>
  );
});

export const ContinueCard = memo(function ContinueCard({
  story,
  width,
  animated,
  onPress,
  testID = 'continue-card',
}: ContinueCardProps) {
  const { t } = useTranslation();
  const arrow = useArrowNudge();
  const [pressed, setPressed] = useState(false);
  const handlePressState = useCallback((isPressed: boolean) => setPressed(isPressed), []);
  const label = story ? t('home.resumeStory', { title: story.title }) : t('home.continueStart.title');
  const fraction = story ? progressFraction(story.currentPage - 1, story.totalPages) : 0;

  return (
    <HeroCardFrame
      testID={testID}
      width={width}
      onPress={onPress}
      onPressed={arrow.play}
      onPressStateChange={handlePressState}
      accessibilityLabel={label}
      accessibilityHint={story ? undefined : t('home.continueStart.hint')}
    >
      <View style={styles.row}>
        <CardThumbnail story={story} size={HOME_CARDS.coverSize} animated={animated} />

        <View style={styles.words}>
          {story ? (
            <View testID="continue-panel">
              <Text style={styles.eyebrow}>{t('home.continueTogether')}</Text>
              <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
                {story.title}
              </Text>
              <Text style={styles.body} numberOfLines={1}>{t('home.continueBody')}</Text>
              <View style={styles.progressRow}>
                <CardProgressBar fraction={fraction} testID="continue-progress" />
              </View>
              <Text style={styles.meta}>{t('home.pagePosition', { page: story.currentPage, total: story.totalPages })}</Text>
            </View>
          ) : (
            <View testID="continue-panel-empty">
              <Text style={styles.eyebrow}>{t('home.continueStart.eyebrow')}</Text>
              <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
                {t('home.continueStart.title')}
              </Text>
              <Text style={styles.body}>{t('home.continueStart.body')}</Text>
            </View>
          )}
        </View>

        <Animated.View testID="continue-arrow" style={[styles.arrow, arrow.style]}>
          <CardArrowButton size={HOME_CARDS.arrowSize} pressed={pressed} testID="continue-arrow" />
        </Animated.View>
      </View>
    </HeroCardFrame>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: HOME_CARDS.padding,
    paddingLeft: HOME_CARDS.padding + 2,
    paddingRight: HOME_CARDS.padding + 4,
  },
  cover: {
    overflow: 'visible',
    borderWidth: 1,
    borderColor: HOME_CARD_TINTS.coverEdge,
    shadowColor: '#04091F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  coverClip: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: HOME_CARD_TINTS.tileFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  words: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
  },
  eyebrow: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.eyebrow,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: HOME_CARD_TINTS.eyebrow,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.title,
    fontWeight: '800',
    lineHeight: HOME_CARD_TYPE.title + 4,
    color: HOME_CARD_TINTS.title,
    marginTop: 2,
  },
  body: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.body,
    fontWeight: '500',
    color: HOME_CARD_TINTS.body,
    marginTop: 2,
  },
  progressRow: {
    marginTop: 8,
  },
  meta: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.meta,
    fontWeight: '600',
    color: HOME_CARD_TINTS.muted,
    marginTop: 5,
  },
  arrow: {
    marginLeft: 2,
  },
});
