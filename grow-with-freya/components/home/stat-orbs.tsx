import React, { memo, useEffect, type ReactNode, type Ref, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient as SvgLinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { Fonts } from '@/constants/theme';
import {
  STAT_ORB,
  STAT_ORB_TINTS,
  statOrbDiameter,
  statOrbFloatDelay,
  statOrbRowHeight,
  statOrbRowWidth,
  type StatOrbKind,
} from '@/constants/stat-orbs';
import { STAT_PILL } from '@/constants/stat-pill';
import type { ChildHomeStory } from '@/types/child-home';
import { STAT_ORB_ART, STAT_ORB_FRONT } from './stat-orb-art';
import { starPoints } from './stat-icons';

export const StatOrbBookmark = memo(function StatOrbBookmark({ diameter, inviting = false }: { diameter: number; inviting?: boolean }) {
  const place = inviting ? STAT_ORB.bookmark.inviting : STAT_ORB.bookmark;
  const width = diameter * place.width;
  const height = width * STAT_ORB.bookmark.aspect;

  return (
    <View
      testID="stat-orb-continue-bookmark"
      pointerEvents="none"
      style={{ position: 'absolute', width, height, top: diameter * place.top, left: (diameter - width) / 2 }}
    >
      <Svg width={width} height={height} viewBox="0 0 100 125">
        <Defs>
          <SvgLinearGradient id="stat-orb-bookmark-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={STAT_ORB_TINTS.bookmark[0]} />
            <Stop offset="1" stopColor={STAT_ORB_TINTS.bookmark[1]} />
          </SvgLinearGradient>
        </Defs>
        <Ellipse cx={50} cy={118} rx={34} ry={5} fill={STAT_ORB_TINTS.bookmarkShadow} />
        <Path
          d="M14,12 Q14,5 21,5 L79,5 Q86,5 86,12 L86,108 L50,86 L14,108 Z"
          fill="url(#stat-orb-bookmark-fill)"
          stroke={STAT_ORB_TINTS.bookmarkEdge}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <Rect x={22} y={13} width={8} height={76} rx={4} fill={STAT_ORB_TINTS.bookmarkShine} />
        <Polygon points={starPoints(50, 46, 19, 8)} fill={STAT_ORB_TINTS.bookmarkStar} />
      </Svg>
    </View>
  );
});

export const StatOrbCover = memo(function StatOrbCover({
  diameter,
  source,
  testID = 'stat-orb-continue-cover',
}: {
  diameter: number;
  source: ImageSource | number;
  testID?: string;
}) {
  const size = diameter * STAT_ORB.cover.size;
  const art = diameter * STAT_ORB.artScale;

  return (
    <>
      <View
        testID={`${testID}-frame`}
        pointerEvents="none"
        style={[
          styles.coverFrame,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            left: (diameter - size) / 2,
            top: diameter * STAT_ORB.cover.centre - size / 2,
          },
        ]}
      >
        <Image testID={testID} source={source} contentFit="cover" transition={0} style={{ width: size, height: size }} />
        <LinearGradient
          testID={`${testID}-shade`}
          colors={STAT_ORB_TINTS.coverShade}
          locations={[0.4, 0.95]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <Image
        testID={`${testID}-front`}
        source={STAT_ORB_FRONT}
        contentFit="contain"
        transition={0}
        pointerEvents="none"
        style={{ position: 'absolute', width: art, height: art, left: (diameter - art) / 2, top: (diameter - art) / 2 }}
      />
      <StatOrbBookmark diameter={diameter} />
    </>
  );
});

export interface StatOrbFaceProps {
  kind: StatOrbKind;
  diameter: number;
  lit: boolean;
  number?: string;
  unit?: string;
  invitation?: string;
  caption?: string;
  onArtShown?: () => void;
  children?: ReactNode;
}

export const StatOrbFace = memo(function StatOrbFace({
  kind,
  diameter,
  lit,
  number,
  unit,
  invitation,
  caption,
  onArtShown,
  children,
}: StatOrbFaceProps) {
  const art = diameter * STAT_ORB.artScale;
  const spill = (art - diameter) / 2;

  return (
    <>
      <Image
        testID={`stat-orb-${kind}-art`}
        source={STAT_ORB_ART[kind]}
        contentFit="contain"
        transition={0}
        onDisplay={onArtShown}
        style={{ position: 'absolute', width: art, height: art, left: -spill, top: -spill, opacity: lit ? 1 : STAT_ORB.restingOpacity }}
      />

      {invitation !== undefined ? (
        <View style={[styles.words, { top: diameter * STAT_ORB.invite.top }]}>
          <Text
            style={[styles.invite, { fontSize: diameter * STAT_ORB.invite.size, maxWidth: diameter * STAT_ORB.invite.width }]}
            numberOfLines={2}
            maxFontSizeMultiplier={1}
          >
            {invitation}
          </Text>
        </View>
      ) : number !== undefined ? (
        <View style={[styles.words, { top: diameter * STAT_ORB.words.top }]}>
          <Text
            style={[styles.number, { fontSize: diameter * STAT_ORB.number.size, maxWidth: diameter * STAT_ORB.number.width }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1}
          >
            {number}
          </Text>
          {unit === undefined ? null : (
            <Text
              style={[
                styles.label,
                {
                  fontSize: diameter * STAT_ORB.label.size,
                  maxWidth: diameter * STAT_ORB.label.width,
                  marginTop: -diameter * STAT_ORB.label.tuck,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1}
            >
              {unit}
            </Text>
          )}
        </View>
      ) : null}
      {children}
      {caption !== undefined ? (
        <View style={[styles.words, { top: diameter * STAT_ORB.caption.top }]}>
          <Text
            style={[styles.label, { fontSize: diameter * STAT_ORB.label.size, maxWidth: diameter * STAT_ORB.label.width }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1}
          >
            {caption}
          </Text>
        </View>
      ) : null}
    </>
  );
});

interface StatOrbProps extends StatOrbFaceProps {
  index: number;
  animated: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
  covered: boolean;
  beneath: boolean;
  carried: boolean;
  onPress?: () => void;
  orbRef?: Ref<View>;
}

const StatOrb = memo(function StatOrb({
  kind,
  diameter,
  index,
  lit,
  animated,
  number,
  unit,
  invitation,
  caption,
  accessibilityLabel,
  accessibilityHint,
  covered,
  beneath,
  carried,
  onPress,
  orbRef,
  children,
}: StatOrbProps) {
  const float = useSharedValue(0);
  const cover = useSharedValue(1);
  const floats = animated && lit;
  const rise = diameter * STAT_ORB.float.rise;
  const fades = covered && !beneath;

  useEffect(() => {
    if (!floats) {
      cancelAnimation(float);
      float.value = 0;
      return;
    }

    float.value = withDelay(
      statOrbFloatDelay(index),
      withRepeat(withTiming(1, { duration: STAT_ORB.float.ms / 2, easing: Easing.inOut(Easing.sin) }), -1, true)
    );

    return () => {
      cancelAnimation(float);
    };
  }, [floats, index, float]);

  useEffect(() => {
    cover.value = withTiming(fades ? 0 : 1, { duration: STAT_PILL.coverMs });
  }, [fades, cover]);

  const floatStyle = useAnimatedStyle(() => ({
    opacity: cover.value,
    transform: [{ translateY: -rise * float.value }, { scale: 1 + (STAT_ORB.float.scale - 1) * float.value }],
  }));

  const testID = `stat-orb-${kind}`;
  const frame = { width: diameter, height: diameter, opacity: beneath && carried ? 0 : 1 };

  const body = (
    <Animated.View style={[{ width: diameter, height: diameter }, floatStyle]}>
      <StatOrbFace kind={kind} diameter={diameter} lit={lit} number={number} unit={unit} invitation={invitation} caption={caption}>
        {children}
      </StatOrbFace>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        ref={orbRef}
        collapsable={false}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ expanded: covered && beneath }}
        onPress={onPress}
        style={frame}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View
      ref={orbRef}
      collapsable={false}
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      style={frame}
    >
      {body}
    </View>
  );
});

export interface StatOrbsProps {
  streakDays: number;
  story?: ChildHomeStory;
  tally?: { unlocked: number; remaining: number };
  contentWidth: number;
  animated: boolean;
  onOpen?: (kind: StatOrbKind) => void;
  onExplore?: () => void;
  covered?: boolean;
  coverKind?: StatOrbKind;
  carried?: boolean;
  rowRef?: RefObject<View | null>;
  storyRef?: Ref<View>;
  streakRef?: Ref<View>;
  badgesRef?: Ref<View>;
}

export const StatOrbs = memo(function StatOrbs({
  streakDays,
  story,
  tally,
  contentWidth,
  animated,
  onOpen,
  onExplore,
  covered = false,
  coverKind,
  carried = false,
  rowRef,
  storyRef,
  streakRef,
  badgesRef,
}: StatOrbsProps) {
  const { t } = useTranslation();
  const diameter = statOrbDiameter(contentWidth);
  const count = tally ? 3 : 2;
  const burning = streakDays > 0;
  const hint = t('home.continueMore');

  return (
    <View
      ref={rowRef}
      collapsable={false}
      testID="stat-orbs"
      pointerEvents={covered ? 'none' : 'box-none'}
      accessibilityElementsHidden={covered}
      importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
      style={[
        styles.row,
        {
          width: statOrbRowWidth(diameter, count),
          height: statOrbRowHeight(diameter),
          paddingTop: diameter * STAT_ORB.headroom,
        },
      ]}
    >
      <StatOrb
        kind="streak"
        diameter={diameter}
        index={0}
        lit={burning}
        animated={animated}
        number={burning ? String(streakDays) : undefined}
        unit={burning ? t('home.streak.unit', { count: streakDays }) : undefined}
        invitation={burning ? undefined : t('home.streak.start')}
        accessibilityLabel={burning ? t('home.streak.days', { count: streakDays }) : t('home.streak.start')}
        accessibilityHint={hint}
        covered={covered}
        beneath={coverKind === 'streak'}
        carried={carried}
        onPress={onOpen ? () => onOpen('streak') : undefined}
        orbRef={streakRef}
      />
      <StatOrb
        kind="continue"
        diameter={diameter}
        index={1}
        lit={story !== undefined}
        animated={animated}
        accessibilityLabel={story ? t('home.resumeStory', { title: story.title }) : t('home.statOrb.readToBookmark')}
        accessibilityHint={story ? hint : undefined}
        caption={story ? t('home.statOrb.continue') : undefined}
        invitation={story ? undefined : t('home.statOrb.readToBookmark')}
        covered={covered}
        beneath={coverKind === 'continue'}
        carried={carried}
        onPress={story ? (onOpen ? () => onOpen('continue') : undefined) : onExplore}
        orbRef={storyRef}
      >
        {story?.coverImage ? (
          <StatOrbCover diameter={diameter} source={story.coverImage as ImageSource | number} />
        ) : (
          <StatOrbBookmark diameter={diameter} inviting={!story} />
        )}
      </StatOrb>
      {tally ? (
        <StatOrb
          kind="badges"
          diameter={diameter}
          index={2}
          lit={tally.unlocked > 0}
          animated={animated}
          number={String(tally.unlocked)}
          unit={tally.unlocked > 0 ? t('home.statOrb.achieved') : undefined}
          accessibilityLabel={t('home.achievementTally.label', { unlocked: tally.unlocked, remaining: tally.remaining })}
          accessibilityHint={hint}
          covered={covered}
          beneath={coverKind === 'badges'}
          carried={carried}
          onPress={onOpen ? () => onOpen('badges') : undefined}
          orbRef={badgesRef}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  coverFrame: {
    position: 'absolute',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  words: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  number: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: STAT_ORB_TINTS.ink,
    textAlign: 'center',
    textShadowColor: STAT_ORB_TINTS.shade,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  label: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: STAT_ORB_TINTS.ink,
    textAlign: 'center',
    textShadowColor: STAT_ORB_TINTS.shade,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  invite: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: STAT_ORB_TINTS.ink,
    textAlign: 'center',
    textShadowColor: STAT_ORB_TINTS.shade,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
