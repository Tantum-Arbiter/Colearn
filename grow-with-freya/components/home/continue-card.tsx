import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
import { ArrowMark, HomeCard, useArrowNudge } from './home-card';
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

export const ContinueCard = memo(function ContinueCard({
  story,
  width,
  animated,
  onPress,
  testID = 'continue-card',
}: ContinueCardProps) {
  const { t } = useTranslation();
  const arrow = useArrowNudge();
  const cover = HOME_CARDS.coverSize;
  const label = story ? t('home.resumeStory', { title: story.title }) : t('home.continueStart.title');
  const fraction = story ? progressFraction(story.currentPage - 1, story.totalPages) : 0;

  return (
    <HomeCard
      testID={testID}
      width={width}
      emphasis
      onPress={onPress}
      onPressed={arrow.play}
      accessibilityLabel={label}
      accessibilityHint={story ? undefined : t('home.continueStart.hint')}
    >
      <View style={styles.row}>
        <View style={[styles.cover, { width: cover, height: cover, borderRadius: HOME_CARDS.coverRadius }]}>
          {story?.coverImage ? (
            <Image testID="continue-cover" source={story.coverImage} style={styles.coverImage} contentFit="cover" transition={0} />
          ) : (
            <View testID="continue-cover-placeholder" style={styles.coverPlaceholder}>
              <StatIcon kind="book" size={Math.round(cover * 0.55)} animated={animated} testID="continue-cover-glyph" />
            </View>
          )}
          <CoverSparkle animated={animated} />
        </View>

        <View style={styles.words}>
          {story ? (
            <View testID="continue-panel">
              <Text style={styles.eyebrow}>{t('home.continueTogether')}</Text>
              <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {story.title}
              </Text>
              <Text style={styles.body} numberOfLines={1}>{t('home.continueBody')}</Text>
              <View style={styles.progressRow}>
                <View style={styles.track}>
                  <LinearGradient
                    testID="continue-progress-fill"
                    colors={[HOME_CARD_TINTS.progressFrom, HOME_CARD_TINTS.progressTo]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]}
                  />
                </View>
                <Text style={styles.meta}>{t('home.pagePosition', { page: story.currentPage, total: story.totalPages })}</Text>
              </View>
            </View>
          ) : (
            <View testID="continue-panel-empty">
              <Text style={styles.eyebrow}>{t('home.continueStart.eyebrow')}</Text>
              <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {t('home.continueStart.title')}
              </Text>
              <Text style={styles.body}>{t('home.continueStart.body')}</Text>
            </View>
          )}
        </View>

        <Animated.View testID="continue-arrow" style={arrow.style}>
          <ArrowMark size={HOME_CARDS.arrowSize} />
        </Animated.View>
      </View>
    </HomeCard>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: HOME_CARDS.padding,
  },
  cover: {
    overflow: 'visible',
    borderWidth: 1,
    borderColor: HOME_CARD_TINTS.coverEdge,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: HOME_CARDS.coverRadius - 1,
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: HOME_CARDS.coverRadius - 1,
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
    marginRight: 10,
  },
  eyebrow: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.eyebrow,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: HOME_CARD_TINTS.eyebrow,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.title,
    fontWeight: '800',
    lineHeight: HOME_CARD_TYPE.title + 4,
    color: HOME_CARD_TINTS.title,
    marginTop: 1,
  },
  body: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.body,
    fontWeight: '500',
    color: HOME_CARD_TINTS.body,
    marginTop: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: HOME_CARD_TINTS.progressTrack,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  meta: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.meta,
    fontWeight: '600',
    color: HOME_CARD_TINTS.muted,
    marginLeft: 10,
  },
});
