import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import type { ImageSource } from 'expo-image';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Fonts } from '@/constants/theme';
import { STAT_ORB, STAT_ORB_ORDER, type StatOrbKind } from '@/constants/stat-orbs';
import { STAT_PILL, STAT_PILL_TINTS, statPillFrame, type StatPillRow } from '@/constants/stat-pill';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { BadgeArtwork } from '@/components/progress/badge-artwork';
import type { ChildHomeAchievementTally, ChildHomeNextAchievement, ChildHomeStory } from '@/types/child-home';
import { StatOrbBookmark, StatOrbCover, StatOrbFace } from './stat-orbs';
import { COVER_ASPECT_RATIO } from '@/components/child-ui/tokens';

export interface StatPillProps {
  kind: StatOrbKind;
  row: StatPillRow | null;
  open: boolean;
  diameter: number;
  width: number;
  streakDays: number;
  bestStreakDays: number;
  story?: ChildHomeStory;
  tally?: ChildHomeAchievementTally;
  next?: ChildHomeNextAchievement;
  onPress: () => void;
  onClose: () => void;
  onFolded: () => void;
  onDrawn?: () => void;
  onOpenBook?: (from: BookRect) => void;
}

export interface BookRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Measurable {
  measureInWindow: (done: (x: number, y: number, width: number, height: number) => void) => void;
}

export function measureStatPillRow(
  row: Measurable | null,
  layer: Measurable | null,
  fallback: StatPillRow,
  done: (row: StatPillRow) => void
): void {
  if (typeof row?.measureInWindow !== 'function' || typeof layer?.measureInWindow !== 'function') {
    done(fallback);
    return;
  }
  layer.measureInWindow((layerX, layerY) => {
    row.measureInWindow((x, y, width) => done({ x: x - layerX, y: y - layerY, width }));
  });
}

interface PillWords {
  eyebrow: string;
  title: string;
  tag?: string;
  hint?: string;
}

function Chevron({ size, back }: { size: number; back: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={back ? 'M15.5 4.5 L8 12 L15.5 19.5' : 'M8.5 4.5 L16 12 L8.5 19.5'}
        stroke={STAT_PILL_TINTS.chevron}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export const StatPill = memo(function StatPill({
  kind,
  row,
  open,
  diameter,
  width,
  streakDays,
  bestStreakDays,
  story,
  tally,
  next,
  onPress,
  onClose,
  onFolded,
  onDrawn,
  onOpenBook,
}: StatPillProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [drawn, setDrawn] = useState(open);
  const bar = diameter * STAT_PILL.barHeight;
  const frame = row ? statPillFrame(row, STAT_ORB_ORDER.indexOf(kind), diameter, width) : null;
  const placed = frame !== null;
  const pillWidth = frame?.width ?? 0;
  const start = frame ? frame.from - frame.left : 0;
  const left = useSharedValue(start);
  const right = useSharedValue(start + diameter);
  const height = useSharedValue(diameter);
  const presence = useSharedValue(0);
  const content = useSharedValue(0);
  const wasOpen = useRef(false);
  const cover = kind === 'continue' ? story?.coverImage : undefined;
  const ready = kind === 'continue' ? story !== undefined : kind === 'badges' ? tally !== undefined : true;

  const folded = useCallback(() => {
    setDrawn(false);
    onFolded();
  }, [onFolded]);
  const carried = useCallback(() => onDrawn?.(), [onDrawn]);
  const orbPress = useRef<View | null>(null);

  useEffect(() => {
    if (!placed) return;
    const quick = { duration: STAT_PILL.reducedMs };

    if (open) {
      if (!wasOpen.current) {
        left.value = start;
        right.value = start + diameter;
        height.value = diameter;
        presence.value = 0;
        content.value = 0;
        wasOpen.current = true;
        setDrawn(true);
      }
      const opened = (finished?: boolean) => {
        'worklet';
        if (finished) runOnJS(carried)();
      };
      presence.value = withTiming(1, { duration: STAT_PILL.appearMs });
      left.value = reduceMotion ? withTiming(0, quick, opened) : withSpring(0, STAT_PILL.jelly.edges, opened);
      right.value = reduceMotion ? withTiming(pillWidth, quick) : withSpring(pillWidth, STAT_PILL.jelly.edges);
      height.value = reduceMotion
        ? withTiming(bar, quick)
        : withSequence(
            withTiming(diameter * STAT_PILL.squash, { duration: STAT_PILL.squashMs }),
            withSpring(bar, STAT_PILL.jelly.height)
          );
      content.value = withDelay(reduceMotion ? 0 : STAT_PILL.contentDelayMs, withTiming(1, { duration: STAT_PILL.contentInMs }));
      return;
    }

    if (!wasOpen.current) return;
    wasOpen.current = false;
    content.value = withTiming(0, { duration: STAT_PILL.contentOutMs });
    left.value = reduceMotion ? withTiming(start, quick) : withSpring(start, STAT_PILL.jelly.fold);
    right.value = reduceMotion ? withTiming(start + diameter, quick) : withSpring(start + diameter, STAT_PILL.jelly.fold);
    height.value = reduceMotion ? withTiming(diameter, quick) : withSpring(diameter, STAT_PILL.jelly.fold);
    presence.value = withDelay(
      reduceMotion ? 0 : STAT_PILL.foldSettleMs,
      withTiming(0, { duration: STAT_PILL.vanishMs }, (finished) => {
        if (finished) runOnJS(folded)();
      })
    );
  }, [placed, open, pillWidth, start, diameter, bar, reduceMotion, left, right, height, presence, content, folded, carried]);

  const go = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const barStyle = useAnimatedStyle(() => ({
    opacity: presence.value,
    left: left.value,
    width: right.value - left.value,
    height: height.value,
    top: -height.value / 2,
    borderRadius: height.value / 2,
  }));
  const roundStyle = useAnimatedStyle(() => ({ borderRadius: height.value / 2 }));
  const orbStyle = useAnimatedStyle(() => ({ left: left.value }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: content.value }));

  if (!drawn || !frame || !ready) return null;

  const words: PillWords =
    kind === 'streak'
      ? {
          eyebrow: t('home.statPill.streak'),
          title: streakDays > 0 ? t('home.statPill.days', { count: streakDays }) : t('home.streak.start'),
          tag: bestStreakDays > 0 ? t('home.statPill.best', { count: bestStreakDays }) : undefined,
          hint: t('common.close'),
        }
      : kind === 'continue' && story
        ? {
            eyebrow: t('home.continueReading'),
            title: story.title,
            tag: t('home.statPill.pages', { page: story.currentPage, total: story.totalPages }),
          }
        : {
            eyebrow: t('home.statPill.achievements'),
            title: next ? t('home.statPill.next', { title: next.title }) : t('home.milestone.allDone'),
            hint: t('home.statPill.toBadge'),
          };
  const medallion = kind === 'badges' ? next?.artwork : undefined;
  const label = [words.eyebrow, words.title, words.tag].filter((part): part is string => part !== undefined).join(', ');
  const panelHeight = bar * STAT_PILL.panel.height;
  const panelLeft = diameter + bar * STAT_PILL.panel.gap;
  const chevronSlot = bar * STAT_PILL.chevron.slot;
  const tagHeight = bar * STAT_PILL.tag.height;
  const edge = STAT_PILL_TINTS.edges[kind];
  const closes = kind === 'streak';
  const coverSize = diameter * STAT_ORB.cover.size;
  const coverInset = (diameter - coverSize) / 2;
  const opensBook = kind === 'continue' && onOpenBook !== undefined;
  const bookHeight = coverSize / COVER_ASPECT_RATIO;
  const openBook = () => {
    if (!onOpenBook) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const orb = orbPress.current;
    if (typeof orb?.measureInWindow !== 'function') {
      onOpenBook({ x: frame.left + coverInset, y: frame.centreY - bookHeight / 2, width: coverSize, height: bookHeight });
      return;
    }
    orb.measureInWindow((x, y) =>
      onOpenBook({ x: x + coverInset, y: y + diameter / 2 - bookHeight / 2, width: coverSize, height: bookHeight })
    );
  };

  return (
    <View testID="stat-pill-layer" pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {open ? (
        <Pressable
          testID="stat-pill-backdrop"
          accessible={false}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        />
      ) : null}

      <View
        testID="stat-pill-anchor"
        pointerEvents={open ? 'box-none' : 'none'}
        style={[styles.anchor, { left: frame.left, top: frame.centreY }]}
      >
        <Animated.View testID="stat-pill-jelly" pointerEvents="none" style={[styles.jelly, barStyle]}>
          <Animated.View
            testID="stat-pill-glow"
            style={[styles.glow, { backgroundColor: STAT_PILL_TINTS.fill[1], shadowColor: edge.glow }, roundStyle]}
          />
          <Animated.View testID="stat-pill-clip" style={[styles.clip, roundStyle]}>
            <LinearGradient colors={STAT_PILL_TINTS.fill} locations={STAT_PILL_TINTS.fillStops} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={STAT_PILL_TINTS.gloss} style={[styles.gloss, { height: bar * 0.42 }]} />
            {STAT_PILL.innerGlow.map((band, index) => (
              <Animated.View
                key={band}
                testID={`stat-pill-inner-glow-${index}`}
                style={[styles.fill, { borderWidth: band, borderColor: edge.inner }, roundStyle]}
              />
            ))}
          </Animated.View>
          <Animated.View testID="stat-pill-rim" pointerEvents="none" style={[styles.fill, styles.rim, { borderColor: edge.rim }, roundStyle]} />
        </Animated.View>

        <Animated.View
          testID="stat-pill-content"
          pointerEvents={open ? 'box-none' : 'none'}
          style={[styles.content, { width: frame.width, height: bar, top: -bar / 2 }, contentStyle]}
        >
          <Pressable
            testID="stat-pill"
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={opensBook && story ? t('home.statPill.openBook', { title: story.title }) : words.hint}
            onPress={closes ? onClose : opensBook ? openBook : go}
            style={[styles.fill, styles.press, { paddingLeft: panelLeft }]}
          >
            <View
              style={[
                styles.panel,
                {
                  height: panelHeight,
                  borderRadius: bar * STAT_PILL.panel.radius,
                  paddingHorizontal: bar * STAT_PILL.panel.padding,
                },
              ]}
            >
              <View style={styles.words}>
                <Text style={[styles.eyebrow, { fontSize: bar * STAT_PILL.eyebrow }]} numberOfLines={1} maxFontSizeMultiplier={1}>
                  {words.eyebrow}
                </Text>
                <View style={styles.titleRow}>
                  <Text
                    style={[styles.title, { fontSize: bar * STAT_PILL.title }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={STAT_PILL.titleShrink}
                    maxFontSizeMultiplier={1}
                  >
                    {words.title}
                  </Text>
                  {words.tag !== undefined ? (
                    <View
                      testID="stat-pill-tag"
                      style={[
                        styles.tag,
                        {
                          height: tagHeight,
                          borderRadius: tagHeight / 2,
                          paddingHorizontal: bar * STAT_PILL.tag.padding,
                          marginLeft: bar * STAT_PILL.tag.gap,
                        },
                      ]}
                    >
                      <Text style={[styles.tagText, { fontSize: bar * STAT_PILL.tag.size }]} numberOfLines={1} maxFontSizeMultiplier={1}>
                        {words.tag}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {medallion ? (
                <View testID="stat-pill-medallion" style={{ marginLeft: bar * STAT_PILL.tag.gap }}>
                  <BadgeArtwork artwork={medallion} status="in_progress" size={bar * STAT_PILL.medallion} />
                </View>
              ) : null}
            </View>
            <View style={[styles.chevron, { width: chevronSlot }]}>
              <Chevron size={bar * STAT_PILL.chevron.size} back={closes} />
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.orb, { width: diameter, height: diameter, top: -diameter / 2 }, orbStyle]}>
          <Pressable
            ref={orbPress}
            testID="stat-pill-orb"
            accessibilityRole="button"
            accessibilityLabel={opensBook && story ? t('home.statPill.openBook', { title: story.title }) : t('common.close')}
            onPress={opensBook ? openBook : onClose}
            style={{ width: diameter, height: diameter }}
          >
            {kind === 'continue' ? (
              <StatOrbFace kind="continue" diameter={diameter} lit onArtShown={onDrawn}>
                {cover !== undefined ? (
                  <StatOrbCover diameter={diameter} source={cover as ImageSource | number} testID="stat-pill-cover" />
                ) : (
                  <StatOrbBookmark diameter={diameter} />
                )}
              </StatOrbFace>
            ) : kind === 'streak' ? (
              <StatOrbFace
                kind="streak"
                diameter={diameter}
                lit={streakDays > 0}
                number={streakDays > 0 ? String(streakDays) : undefined}
                onArtShown={onDrawn}
              />
            ) : (
              <StatOrbFace
                kind="badges"
                diameter={diameter}
                lit={(tally?.unlocked ?? 0) > 0}
                number={String(tally?.unlocked ?? 0)}
                onArtShown={onDrawn}
              />
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    backgroundColor: STAT_PILL_TINTS.backdrop,
  },
  anchor: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  jelly: {
    position: 'absolute',
  },
  glow: {
    position: 'absolute',
    top: STAT_PILL.glowTuck,
    left: STAT_PILL.glowTuck,
    right: STAT_PILL.glowTuck,
    bottom: STAT_PILL.glowTuck,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: STAT_PILL.glow,
    elevation: 8,
  },
  clip: {
    flex: 1,
    overflow: 'hidden',
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  rim: {
    borderWidth: STAT_PILL.rim,
  },
  content: {
    position: 'absolute',
    left: 0,
  },
  press: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  panel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: STAT_PILL_TINTS.panel,
    borderWidth: 1,
    borderColor: STAT_PILL_TINTS.panelEdge,
  },
  words: {
    flex: 1,
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: STAT_PILL_TINTS.eyebrow,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flexShrink: 1,
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: STAT_PILL_TINTS.title,
    textShadowColor: STAT_PILL_TINTS.shade,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tag: {
    justifyContent: 'center',
    backgroundColor: STAT_PILL_TINTS.tag,
    borderWidth: 1,
    borderColor: STAT_PILL_TINTS.tagEdge,
  },
  tagText: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: STAT_PILL_TINTS.tagText,
  },
  chevron: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    position: 'absolute',
  },
});
