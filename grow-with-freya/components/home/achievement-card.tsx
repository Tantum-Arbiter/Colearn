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
import { GoldButton } from '@/components/child-ui/gold-button';
import { Fonts } from '@/constants/theme';
import {
  HOME_CARDS,
  HOME_CARD_TINTS,
  HOME_CARD_TYPE,
  HOME_JOURNEY_MOTION,
  JOURNEY_CARD,
  JOURNEY_CARD_TINTS,
  JOURNEY_CARD_TYPE,
  MILESTONE_STARS,
  journeyArtWidth,
  journeyScale,
  journeyWordsWidth,
  litStars,
  remainingToNext,
} from '@/constants/home-journey';
import { HERO_CARD } from '@/constants/home-sky';
import { PLAN_STEP_ICON } from '@/constants/learning-plan';
import type { ChildHomeJourneyStep, ChildHomeNextAchievement } from '@/types/child-home';
import { HomeCard, useArrowNudge } from './home-card';
import { GoldStar, Sparkle } from './stat-icons';

const ICON_FALLBACK = 'star' as const;
const JOURNEY_ISLAND = require('@/assets/images/home-journey/journey-island.webp');

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

interface JourneyStepTokenProps {
  step: ChildHomeJourneyStep;
  linked: boolean;
  scale: number;
}

const JourneyStepToken = memo(function JourneyStepToken({ step, linked, scale }: JourneyStepTokenProps) {
  const open = step.state === 'open';
  const done = step.state === 'done';
  const warm = open || done;
  const size = (open ? JOURNEY_CARD.step.open : JOURNEY_CARD.step.rest) * scale;
  const thick = JOURNEY_CARD.step.linkThick * scale;
  const id = `journey-step-${step.day}`;
  const face = open ? JOURNEY_CARD_TINTS.stepOpen : done ? JOURNEY_CARD_TINTS.stepDone : JOURNEY_CARD_TINTS.stepLocked;
  const ring = open ? JOURNEY_CARD_TINTS.stepOpenRing : done ? JOURNEY_CARD_TINTS.stepDoneRing : JOURNEY_CARD_TINTS.stepLockedRing;
  const ink = open ? JOURNEY_CARD_TINTS.stepOpenInk : done ? JOURNEY_CARD_TINTS.stepDoneInk : JOURNEY_CARD_TINTS.stepLockedInk;
  const icon = open ? PLAN_STEP_ICON[step.kind] : done ? 'checkmark' : 'lock-closed';

  return (
    <>
      <View testID={id} style={{ width: size, height: size }}>
        {open ? (
          <View
            testID={`${id}-glow`}
            style={[
              styles.stepGlow,
              {
                borderRadius: size / 2,
                shadowOpacity: JOURNEY_CARD.step.glow.opacity,
                shadowRadius: JOURNEY_CARD.step.glow.radius * scale,
              },
            ]}
          />
        ) : null}
        <LinearGradient
          testID={`${id}-face`}
          colors={[face[0], face[1]]}
          style={[styles.stepFace, { borderRadius: size / 2, borderWidth: JOURNEY_CARD.step.ring, borderColor: ring }]}
        >
          <Ionicons
            testID={`${id}-icon`}
            name={icon}
            size={(open ? JOURNEY_CARD.step.openIcon : JOURNEY_CARD.step.restIcon) * scale}
            color={ink}
          />
        </LinearGradient>
      </View>
      {linked ? (
        <View testID={`journey-step-link-${step.day}`} style={[styles.stepLink, { width: JOURNEY_CARD.step.gap * scale }]}>
          {JOURNEY_CARD.step.link.map((length, index) => (
            <View
              key={index}
              testID="journey-step-dash"
              style={{
                width: length * scale,
                height: thick,
                borderRadius: thick / 2,
                backgroundColor: warm ? JOURNEY_CARD_TINTS.stepLinkWarm : JOURNEY_CARD_TINTS.stepLinkCool,
              }}
            />
          ))}
        </View>
      ) : null}
    </>
  );
});

interface JourneyStepsProps {
  steps: readonly ChildHomeJourneyStep[];
  scale: number;
}

const JourneySteps = memo(function JourneySteps({ steps, scale }: JourneyStepsProps) {
  return (
    <View
      testID="journey-steps"
      style={[styles.steps, { height: JOURNEY_CARD.step.open * scale, marginTop: JOURNEY_CARD.step.top * scale }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {steps.map((step, index) => (
        <JourneyStepToken key={step.id} step={step} linked={index < steps.length - 1} scale={scale} />
      ))}
    </View>
  );
});

interface JourneyGlintProps {
  right: number;
  top: number;
  size: number;
  animated: boolean;
  celebrate: boolean;
}

const JourneyGlint = memo(function JourneyGlint({ right, top, size, animated, celebrate }: JourneyGlintProps) {
  const shine = useShine(celebrate, animated);

  const style = useAnimatedStyle(() => ({
    opacity: 0.9 * shine.value,
    transform: [{ scale: 0.4 + 0.9 * shine.value }, { rotate: `${shine.value * 45}deg` }],
  }));

  return (
    <Animated.View testID="journey-glint" style={[styles.glint, { right, top }, style]} pointerEvents="none">
      <Sparkle size={size} colour="#FFFFFF" testID="journey-glint-sparkle" />
    </Animated.View>
  );
});

interface JourneyBackdropProps {
  innerHeight: number;
  scale: number;
  animated: boolean;
  celebrate: boolean;
}

const JourneyBackdrop = memo(function JourneyBackdrop({ innerHeight, scale, animated, celebrate }: JourneyBackdropProps) {
  const artWidth = journeyArtWidth(innerHeight);
  const reach = JOURNEY_CARD.edgeGlowReach * scale;
  const gleam = JOURNEY_CARD.cornerGleamSize * scale;
  const glint = JOURNEY_CARD.glint.size * scale;

  return (
    <>
      <LinearGradient
        testID="journey-corner-gleam"
        colors={[...JOURNEY_CARD.cornerGleam]}
        locations={[...JOURNEY_CARD.cornerGleamStops]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.75, y: 0.75 }}
        style={[styles.edgeGlow, { left: 0, top: 0, width: gleam, height: gleam }]}
        pointerEvents="none"
      />
      <LinearGradient
        testID="journey-edge-glow-left"
        colors={[...JOURNEY_CARD.edgeGlow]}
        locations={[...JOURNEY_CARD.edgeGlowStops]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.edgeGlow, { left: 0, top: 0, bottom: 0, width: reach }]}
        pointerEvents="none"
      />
      <LinearGradient
        testID="journey-edge-glow-top"
        colors={[...JOURNEY_CARD.edgeGlow]}
        locations={[...JOURNEY_CARD.edgeGlowStops]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.edgeGlow, { top: 0, left: 0, right: 0, height: reach }]}
        pointerEvents="none"
      />
      <LinearGradient
        testID="journey-edge-glow-bottom"
        colors={[...JOURNEY_CARD.edgeGlow]}
        locations={[...JOURNEY_CARD.edgeGlowStops]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={[styles.edgeGlow, { bottom: 0, left: 0, right: 0, height: reach }]}
        pointerEvents="none"
      />
      <Image
        testID="journey-island"
        source={JOURNEY_ISLAND}
        style={[styles.island, { width: artWidth, height: innerHeight }]}
        contentFit="cover"
        transition={0}
      />
      <JourneyGlint
        right={artWidth * (1 - JOURNEY_CARD.glint.across) - glint / 2}
        top={innerHeight * JOURNEY_CARD.glint.down - glint / 2}
        size={glint}
        animated={animated}
        celebrate={celebrate}
      />
    </>
  );
});

export interface AchievementCardProps {
  next?: ChildHomeNextAchievement;
  steps?: readonly ChildHomeJourneyStep[];
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
  steps,
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
  const scale = journeyScale(width);
  const innerHeight = JOURNEY_CARD.height * scale - HERO_CARD.strokeWidth * 2;
  const wordsWidth = journeyWordsWidth(width, innerHeight, JOURNEY_CARD.wordsReach, scale);
  const eyebrowWidth = journeyWordsWidth(width, innerHeight, JOURNEY_CARD.eyebrowReach, scale);

  return (
    <HomeCard
      testID={testID}
      width={width}
      onPress={onPress}
      onPressed={arrow.play}
      accessibilityLabel={t('home.milestone.eyebrow')}
      accessibilityHint={t('home.achievements.hint')}
      fill={compact ? undefined : JOURNEY_CARD.fill}
      backdrop={
        compact ? undefined : (
          <JourneyBackdrop innerHeight={innerHeight} scale={scale} animated={animated} celebrate={celebrate} />
        )
      }
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
                  <MilestoneStar key={index} index={index} lit={index < lit} animated={animated} size={12} />
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
        <View
          testID="journey-words"
          style={{ height: innerHeight, paddingLeft: JOURNEY_CARD.inset * scale, paddingTop: JOURNEY_CARD.top * scale }}
        >
          <Text
            style={[
              styles.journeyEyebrow,
              {
                maxWidth: eyebrowWidth,
                fontSize: JOURNEY_CARD_TYPE.eyebrow * scale,
                letterSpacing: JOURNEY_CARD_TYPE.eyebrowTracking * scale,
                marginLeft: JOURNEY_CARD_TYPE.eyebrowIndent * scale,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {t('home.milestone.eyebrow')}
          </Text>
          {next ? (
            <View testID="achievement-next">
              <Text
                style={[
                  styles.journeyTitle,
                  {
                    maxWidth: wordsWidth,
                    fontSize: JOURNEY_CARD_TYPE.title * scale,
                    letterSpacing: JOURNEY_CARD_TYPE.titleTracking * scale,
                    marginTop: JOURNEY_CARD_TYPE.titleTop * scale,
                    marginLeft: JOURNEY_CARD_TYPE.titleIndent * scale,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {next.title}
              </Text>
              <Text
                style={[
                  styles.journeyBody,
                  {
                    maxWidth: wordsWidth,
                    fontSize: JOURNEY_CARD_TYPE.body * scale,
                    marginTop: JOURNEY_CARD_TYPE.bodyTop * scale,
                    marginLeft: JOURNEY_CARD_TYPE.bodyIndent * scale,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {t(`home.milestone.remaining.${unit}`, { count: remaining })}
              </Text>
            </View>
          ) : (
            <Text
              testID="achievement-all-done"
              style={[
                styles.journeyBody,
                {
                  maxWidth: wordsWidth,
                  fontSize: JOURNEY_CARD_TYPE.body * scale,
                  marginTop: JOURNEY_CARD_TYPE.titleTop * scale,
                  marginLeft: JOURNEY_CARD_TYPE.bodyIndent * scale,
                },
              ]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {t('home.milestone.allDone')}
            </Text>
          )}
          {steps && steps.length > 0 ? <JourneySteps steps={steps} scale={scale} /> : null}
          <Animated.View
            testID="achievement-cta"
            pointerEvents="none"
            style={[
              styles.journeyButton,
              { left: (JOURNEY_CARD.inset - JOURNEY_CARD.button.outdent) * scale, bottom: JOURNEY_CARD.buttonFoot * scale },
              arrow.style,
            ]}
          >
            <GoldButton
              testID="journey-explore"
              label={t('home.achievements.cta')}
              icon="arrow-forward"
              iconPosition="trailing"
              balanced={false}
              height={JOURNEY_CARD.button.height * scale}
              fontSize={JOURNEY_CARD.button.fontSize * scale}
              iconSize={JOURNEY_CARD.button.iconSize * scale}
              paddingHorizontal={JOURNEY_CARD.button.paddingHorizontal * scale}
              gap={JOURNEY_CARD.button.gap * scale}
              glow={{ opacity: JOURNEY_CARD.button.glow.opacity, radius: JOURNEY_CARD.button.glow.radius * scale }}
              onPress={onPress}
            />
          </Animated.View>
        </View>
      )}
    </HomeCard>
  );
});

const styles = StyleSheet.create({
  journeyEyebrow: {
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: JOURNEY_CARD_TINTS.eyebrow,
  },
  journeyTitle: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: JOURNEY_CARD_TINTS.title,
  },
  journeyBody: {
    fontFamily: Fonts.rounded,
    fontWeight: '500',
    color: JOURNEY_CARD_TINTS.body,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: JOURNEY_CARD_TINTS.stepGlow,
    shadowColor: JOURNEY_CARD_TINTS.stepGlow,
    shadowOffset: { width: 0, height: 0 },
  },
  stepFace: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  journeyButton: {
    position: 'absolute',
  },
  edgeGlow: {
    position: 'absolute',
  },
  island: {
    position: 'absolute',
    right: 0,
    top: 0,
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
  starsCompact: {
    flexDirection: 'row',
  },
  star: {
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
