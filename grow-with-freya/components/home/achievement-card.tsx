import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import {
  HOME_CARDS,
  HOME_CARD_TINTS,
  HOME_CARD_TYPE,
  HOME_JOURNEY_MOTION,
  MILESTONE_STARS,
  litStars,
  remainingToNext,
} from '@/constants/home-journey';
import type { ChildHomeNextAchievement } from '@/types/child-home';
import { HomeCard, useArrowNudge } from './home-card';
import { GoldStar, Sparkle } from './stat-icons';

const ICON_FALLBACK = 'star' as const;

type IoniconName = keyof typeof Ionicons.glyphMap;

function iconName(icon: string): IoniconName {
  const glyphs: Record<string, unknown> | undefined = Ionicons.glyphMap;

  if (!glyphs) {
    return icon as IoniconName;
  }

  return icon in glyphs ? (icon as IoniconName) : ICON_FALLBACK;
}

interface MilestoneStarProps {
  index: number;
  lit: boolean;
  animated: boolean;
  size: number;
}

const MilestoneStar = memo(function MilestoneStar({ index, lit, animated, size }: MilestoneStarProps) {
  const glow = useSharedValue(lit && animated ? 0 : 1);

  useEffect(() => {
    if (!lit || !animated) {
      cancelAnimation(glow);
      glow.value = 1;
      return;
    }

    glow.value = 0;
    glow.value = withDelay(
      HOME_JOURNEY_MOTION.starDelayMs + index * HOME_JOURNEY_MOTION.starStaggerMs,
      withTiming(1, { duration: HOME_JOURNEY_MOTION.starRiseMs, easing: Easing.out(Easing.back(1.8)) })
    );

    return () => {
      cancelAnimation(glow);
    };
  }, [animated, glow, index, lit]);

  const style = useAnimatedStyle(() => ({
    opacity: lit ? 0.35 + 0.65 * glow.value : 1,
    transform: [{ scale: lit ? 0.7 + 0.3 * glow.value : 1 }],
  }));

  return (
    <Animated.View testID={lit ? 'milestone-star-lit' : 'milestone-star-unlit'} style={[styles.star, style]}>
      <GoldStar size={size} colour={lit ? HOME_CARD_TINTS.starLit : HOME_CARD_TINTS.starUnlit} />
    </Animated.View>
  );
});

interface MedallionProps {
  artwork?: ImageSourcePropType;
  icon?: string;
  size: number;
  animated?: boolean;
  celebrate?: boolean;
  testID?: string;
}

function useShine(celebrate: boolean, animated: boolean) {
  const shine = useSharedValue(0);
  const played = useRef(false);

  useEffect(() => {
    if (!celebrate || played.current) {
      return;
    }

    played.current = true;

    if (!animated) {
      return;
    }

    shine.value = withDelay(
      HOME_JOURNEY_MOTION.shineDelayMs,
      withSequence(
        withTiming(1, { duration: HOME_JOURNEY_MOTION.shineMs * 0.45, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: HOME_JOURNEY_MOTION.shineMs * 0.55, easing: Easing.inOut(Easing.quad) })
      )
    );
  }, [animated, celebrate, shine]);

  return shine;
}

const Medallion = memo(function Medallion({
  artwork,
  icon,
  size,
  animated = false,
  celebrate = false,
  testID = 'achievement-medallion',
}: MedallionProps) {
  const shine = useShine(celebrate, animated);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (HOME_JOURNEY_MOTION.shineScale - 1) * shine.value }],
  }));

  const glintStyle = useAnimatedStyle(() => ({
    opacity: 0.9 * shine.value,
    transform: [{ scale: 0.4 + 0.9 * shine.value }, { rotate: `${shine.value * 45}deg` }],
  }));

  const glint = Math.round(size * 0.42);

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View testID={testID} style={[styles.medallion, { width: size, height: size, borderRadius: size / 2 }, ringStyle]}>
        <LinearGradient colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)']} style={StyleSheet.absoluteFill} />
        {artwork ? (
          <Image testID={`${testID}-artwork`} source={artwork} style={styles.medallionArt} contentFit="contain" transition={0} />
        ) : (
          <Ionicons
            testID={`${testID}-icon`}
            name={icon ? iconName(icon) : ICON_FALLBACK}
            size={Math.round(size * 0.46)}
            color={HOME_CARD_TINTS.gold}
          />
        )}
      </Animated.View>
      <Animated.View
        testID={`${testID}-glint`}
        style={[styles.glint, { left: size * 0.16 - glint / 2, top: size * 0.14 - glint / 2 }, glintStyle]}
        pointerEvents="none"
      >
        <Sparkle size={glint} colour="#FFFFFF" testID={`${testID}-glint-sparkle`} />
      </Animated.View>
    </View>
  );
});

export interface AchievementCardProps {
  next?: ChildHomeNextAchievement;
  width: number;
  animated: boolean;
  celebrate: boolean;
  onPress: () => void;
  /** The tablet's side-by-side pairing with the continue-learning card --
   *  a smaller medallion and stars, and the stars/CTA stacked rather than
   *  spread across a row that no longer has the width for both. */
  compact?: boolean;
  testID?: string;
}

export const AchievementCard = memo(function AchievementCard({
  next,
  width,
  animated,
  celebrate,
  onPress,
  compact = false,
  testID = 'achievement-card',
}: AchievementCardProps) {
  const { t } = useTranslation();
  const arrow = useArrowNudge();
  const lit = next ? litStars(next.current, next.required) : 0;
  const remaining = next ? remainingToNext(next.current, next.required) : 0;
  const unit = next?.unit ?? 'stories';
  const starSize = compact ? 12 : 16;

  return (
    <HomeCard
      testID={testID}
      width={width}
      onPress={onPress}
      onPressed={arrow.play}
      accessibilityLabel={t('home.milestone.eyebrow')}
      accessibilityHint={t('home.achievements.hint')}
    >
      {compact ? (
        <View style={styles.columnCompact}>
          <View style={styles.topRowCompact}>
            <Medallion
              testID="next-medallion"
              artwork={next?.artwork}
              icon="rocket"
              size={HOME_CARDS.pairedMedallion}
              animated={animated}
              celebrate={celebrate}
            />
            {next ? (
              <View testID="milestone-stars" style={styles.starsCompact}>
                {Array.from({ length: MILESTONE_STARS }, (_, index) => (
                  <MilestoneStar key={index} index={index} lit={index < lit} animated={animated} size={starSize} />
                ))}
              </View>
            ) : null}
          </View>
          <Text style={styles.eyebrowCompact} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {t('home.milestone.eyebrow')}
          </Text>
          {next ? (
            <View testID="achievement-next">
              <Text
                style={[styles.nextTitle, styles.nextTitleCompact]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {next.title}
              </Text>
              <Text style={[styles.body, styles.bodyCompact]} numberOfLines={1}>
                {t(`home.milestone.remaining.${unit}`, { count: remaining })}
              </Text>
            </View>
          ) : (
            <Text testID="achievement-all-done" style={[styles.body, styles.bodyCompact]} numberOfLines={2}>
              {t('home.milestone.allDone')}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.inner}>
          <View style={styles.row}>
            <Medallion
              testID="next-medallion"
              artwork={next?.artwork}
              icon="rocket"
              size={HOME_CARDS.medallion}
              animated={animated}
              celebrate={celebrate}
            />
            <View style={styles.words}>
              <Text style={styles.eyebrow} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {t('home.milestone.eyebrow')}
              </Text>
              {next ? (
                <View testID="achievement-next">
                  <Text style={styles.nextTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                    {next.title}
                  </Text>
                  <Text style={styles.body} numberOfLines={1}>
                    {t(`home.milestone.remaining.${unit}`, { count: remaining })}
                  </Text>
                  <View style={styles.line}>
                    <View testID="milestone-stars" style={styles.stars}>
                      {Array.from({ length: MILESTONE_STARS }, (_, index) => (
                        <MilestoneStar key={index} index={index} lit={index < lit} animated={animated} size={starSize} />
                      ))}
                    </View>
                    <Animated.View testID="achievement-cta" style={arrow.style}>
                      <Text style={styles.ctaText}>{t('home.achievements.cta')} →</Text>
                    </Animated.View>
                  </View>
                </View>
              ) : (
                <View>
                  <Text testID="achievement-all-done" style={styles.body} numberOfLines={2}>
                    {t('home.milestone.allDone')}
                  </Text>
                  <Animated.View testID="achievement-cta" style={[styles.ctaAlone, arrow.style]}>
                    <Text style={styles.ctaText}>{t('home.achievements.cta')} →</Text>
                  </Animated.View>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </HomeCard>
  );
});

const styles = StyleSheet.create({
  inner: {
    padding: HOME_CARDS.padding,
  },
  // Mirrors the continue-learning card's compact shape exactly -- icon (and
  // here, the stars) on a top row, the words running full width underneath
  // -- so the two paired tiles read as one matching design, not two
  // different card layouts squeezed into the same box.
  columnCompact: {
    minHeight: HOME_CARDS.pairedHeight,
    justifyContent: 'center',
    padding: HOME_CARDS.padding,
  },
  topRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glint: {
    position: 'absolute',
  },
  medallion: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: HOME_CARD_TINTS.medallionRing,
    backgroundColor: HOME_CARD_TINTS.medallionFill,
  },
  medallionArt: {
    width: '78%',
    height: '78%',
  },
  words: {
    flex: 1,
    marginLeft: 14,
  },
  body: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.body,
    fontWeight: '500',
    color: HOME_CARD_TINTS.body,
    marginTop: 1,
  },
  bodyCompact: {
    fontSize: HOME_CARD_TYPE.pairedBody,
  },
  eyebrow: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.eyebrow,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: HOME_CARD_TINTS.eyebrow,
  },
  eyebrowCompact: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.pairedEyebrow,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: HOME_CARD_TINTS.eyebrow,
  },
  nextTitle: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.achievementTitle,
    fontWeight: '800',
    color: HOME_CARD_TINTS.title,
    marginTop: 1,
  },
  nextTitleCompact: {
    fontSize: HOME_CARD_TYPE.pairedTitle,
  },
  stars: {
    flexDirection: 'row',
    marginTop: 5,
    marginRight: 8,
  },
  starsCompact: {
    flexDirection: 'row',
  },
  star: {
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaAlone: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  ctaText: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_CARD_TYPE.cta,
    fontWeight: '700',
    color: HOME_CARD_TINTS.gold,
  },
});
