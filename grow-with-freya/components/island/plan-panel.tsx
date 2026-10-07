import React, { memo, useCallback, useState, type ComponentProps, type Ref } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { GoldButton } from '@/components/child-ui/gold-button';
import { contentMargin } from '@/components/child-ui/tokens';
import { Sparkle } from '@/components/home/stat-icons';
import { previewable } from '@/constants/learning-plan';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import type { PlanStepView } from '@/hooks/use-learning-plan';
import type { PlanSkill, PlanStepKind } from '@/types/learning-plan';

export const PLAN_CARD = {
  maxWidth: 820,
  bottomGap: 10,
  radius: 22,
  stroke: 1.5,
  paddingPhone: 12,
  paddingTablet: 18,
  phoneHeight: 198,
  tabletHeight: 190,
  thumbPhone: { width: 78, height: 91 },
  thumbTablet: { width: 128, height: 150 },
  startPhone: { height: 38, font: 15, icon: 15, padding: 16 },
  startTablet: { height: 50, font: 17, icon: 17, padding: 22 },
} as const;

export const PLAN_CARD_TINTS = {
  fill: ['#133169', '#07235B', '#021C52'],
  edge: ['#8CBCEB', '#4A70B6', '#23427E'],
  depth: '#020B26',
  step: '#B4C8E8',
  domain: '#7CC4FF',
  title: '#FFFFFF',
  aim: '#D6DEF2',
  chipEdge: 'rgba(140, 172, 228, 0.42)',
  chipFill: 'rgba(255, 255, 255, 0.04)',
  chipInk: '#DCE5F7',
  link: '#5AB2FF',
  star: 'rgba(206, 219, 246, 0.72)',
  dot: 'rgba(206, 219, 246, 0.5)',
  coverEdge: 'rgba(255, 255, 255, 0.22)',
  doneTile: 'rgba(255, 255, 255, 0.08)',
  gold: '#FFD76B',
} as const;

type CardStar = { readonly x: number; readonly y: number; readonly size: number; readonly sparkle: boolean };

export const PLAN_CARD_STARS: { readonly tablet: readonly CardStar[]; readonly phone: readonly CardStar[] } = {
  tablet: [
    { x: 0.93, y: 0.15, size: 16, sparkle: true },
    { x: 0.74, y: 0.27, size: 11, sparkle: true },
    { x: 0.75, y: 0.78, size: 6, sparkle: true },
    { x: 0.41, y: 0.07, size: 2, sparkle: false },
    { x: 0.57, y: 0.05, size: 1.5, sparkle: false },
    { x: 0.69, y: 0.11, size: 1.5, sparkle: false },
    { x: 0.63, y: 0.46, size: 1.5, sparkle: false },
    { x: 0.86, y: 0.6, size: 2, sparkle: false },
    { x: 0.97, y: 0.44, size: 1.5, sparkle: false },
    { x: 0.31, y: 0.93, size: 1.5, sparkle: false },
    { x: 0.53, y: 0.95, size: 2, sparkle: false },
    { x: 0.84, y: 0.92, size: 1.5, sparkle: false },
  ],
  phone: [
    { x: 0.93, y: 0.11, size: 15, sparkle: true },
    { x: 0.86, y: 0.22, size: 10, sparkle: true },
    { x: 0.96, y: 0.6, size: 6, sparkle: true },
    { x: 0.43, y: 0.04, size: 2, sparkle: false },
    { x: 0.62, y: 0.05, size: 1.5, sparkle: false },
    { x: 0.79, y: 0.07, size: 1.5, sparkle: false },
    { x: 0.97, y: 0.42, size: 1.5, sparkle: false },
    { x: 0.91, y: 0.72, size: 2, sparkle: false },
    { x: 0.3, y: 0.98, size: 1.5, sparkle: false },
    { x: 0.56, y: 0.98, size: 2, sparkle: false },
    { x: 0.8, y: 0.97, size: 1.5, sparkle: false },
  ],
};

export const SKILL_ICON: Record<PlanSkill, ComponentProps<typeof Ionicons>['name']> = {
  listening: 'headset-outline',
  vocabulary: 'book-outline',
  letters: 'text-outline',
  counting: 'apps-outline',
  numbers: 'calculator-outline',
  feelings: 'happy-outline',
  confidence: 'star-outline',
  rhythm: 'musical-notes-outline',
  patience: 'hourglass-outline',
};

const KIND_TILE: Record<PlanStepKind, readonly [string, string]> = {
  story: ['#5E6CF6', '#4652E2'],
  words: ['#2EC4B6', '#1B9C8F'],
  numbers: ['#F59E0B', '#D97706'],
  feelings: ['#F472B6', '#DB2777'],
  music: ['#A78BFA', '#7C3AED'],
};

const KIND_ICON: Record<PlanStepKind, ComponentProps<typeof Ionicons>['name']> = {
  story: 'book',
  words: 'text',
  numbers: 'calculator',
  feelings: 'happy',
  music: 'musical-notes',
};

export interface PlanCardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function planCardTop(screenHeight: number, bottomInset: number, cardHeight: number): number {
  return screenHeight - bottomInset - PLAN_CARD.bottomGap - cardHeight;
}

export interface PlanPanelProps {
  current: PlanStepView | null;
  total: number;
  doneCount: number;
  bottomInset: number;
  screenWidth: number;
  screenHeight: number;
  onStart: (view: PlanStepView) => void;
  onPreview?: (view: PlanStepView, from: PlanCardRect) => void;
  onHeight?: (height: number) => void;
  cardRef?: Ref<View>;
}

const CardStars = memo(function CardStars({ stars }: { stars: readonly CardStar[] }) {
  return (
    <View testID="plan-card-stars" pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((star, index) => (
        <View
          key={index}
          testID={`plan-card-star-${index}`}
          style={[
            styles.star,
            {
              left: `${Math.round(star.x * 100)}%`,
              top: `${Math.round(star.y * 100)}%`,
              marginLeft: -star.size / 2,
              marginTop: -star.size / 2,
              width: star.size,
              height: star.size,
            },
            !star.sparkle && { borderRadius: star.size / 2, backgroundColor: PLAN_CARD_TINTS.dot },
          ]}
        >
          {star.sparkle ? <Sparkle size={star.size} colour={PLAN_CARD_TINTS.star} testID={`plan-card-sparkle-${index}`} /> : null}
        </View>
      ))}
    </View>
  );
});

export const PlanPanel = memo(function PlanPanel({
  current,
  total,
  doneCount,
  bottomInset,
  screenWidth,
  screenHeight,
  onStart,
  onPreview,
  onHeight,
  cardRef,
}: PlanPanelProps) {
  const { t } = useTranslation();
  const { isTablet, scaledFontSize } = useAccessibility();
  const margin = contentMargin(isTablet);
  const cardWidth = Math.min(screenWidth - margin * 2, PLAN_CARD.maxWidth);
  const cardLeft = (screenWidth - cardWidth) / 2;
  const padding = isTablet ? PLAN_CARD.paddingTablet : PLAN_CARD.paddingPhone;
  const thumb = isTablet ? PLAN_CARD.thumbTablet : PLAN_CARD.thumbPhone;
  const start = isTablet ? PLAN_CARD.startTablet : PLAN_CARD.startPhone;
  const [cardHeight, setCardHeight] = useState<number>(isTablet ? PLAN_CARD.tabletHeight : PLAN_CARD.phoneHeight);
  const [thumbFrame, setThumbFrame] = useState<PlanCardRect>({ x: 0, y: 0, width: thumb.width, height: thumb.height });
  const showing = current;
  const open = showing?.state === 'open';
  const canPreview = Boolean(open && showing?.launch && previewable(showing.launch) && onPreview);

  const handleCardLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = Math.round(event.nativeEvent.layout.height);
      if (height <= 0) return;
      setCardHeight(height);
      onHeight?.(height);
    },
    [onHeight]
  );

  const handleThumbLayout = useCallback((event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setThumbFrame({ x, y, width, height });
  }, []);

  const pressStart = useCallback(() => {
    if (!showing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onStart(showing);
  }, [onStart, showing]);

  const pressPreview = useCallback(() => {
    if (!showing || !onPreview) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const inset = PLAN_CARD.stroke + padding;
    onPreview(showing, {
      x: cardLeft + inset + thumbFrame.x,
      y: planCardTop(screenHeight, bottomInset, cardHeight) + inset + thumbFrame.y,
      width: thumbFrame.width,
      height: thumbFrame.height,
    });
  }, [bottomInset, cardHeight, cardLeft, onPreview, padding, screenHeight, showing, thumbFrame]);

  const type = {
    step: scaledFontSize(isTablet ? 14 : 12),
    title: scaledFontSize(isTablet ? 30 : 20),
    subtitle: scaledFontSize(isTablet ? 17 : 14),
    aim: scaledFontSize(isTablet ? 15 : 13),
    chip: scaledFontSize(isTablet ? 13 : 11),
  };

  const thumbnail = (
    <View
      testID="plan-panel-thumb"
      onLayout={handleThumbLayout}
      style={[styles.thumb, { width: thumb.width, height: thumb.height }]}
    >
      {!showing ? (
        <View style={[StyleSheet.absoluteFill, styles.tile, styles.doneTile]}>
          <Ionicons name="sparkles" size={Math.round(thumb.width * 0.45)} color={PLAN_CARD_TINTS.gold} />
        </View>
      ) : showing.picture ? (
        <Image testID="plan-panel-cover" source={showing.picture} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} alt="" />
      ) : (
        <LinearGradient colors={[...KIND_TILE[showing.step.kind]]} style={[StyleSheet.absoluteFill, styles.tile]}>
          <Ionicons
            testID="plan-panel-kind"
            name={KIND_ICON[showing.step.kind]}
            size={Math.round(thumb.width * 0.45)}
            color={PLAN_CARD_TINTS.title}
          />
        </LinearGradient>
      )}
    </View>
  );

  const words = showing ? (
    <View style={styles.words}>
      <Text testID="plan-panel-step" style={[styles.step, { fontSize: type.step }]} numberOfLines={1}>
        {t('plan.stepOf', { day: showing.step.day, total })}
        {'  ·  '}
        <Text testID="plan-panel-domain" style={[styles.domain, { color: PLAN_CARD_TINTS.domain }]}>
          {t(showing.step.domainKey)}
        </Text>
      </Text>
      <Text
        testID="plan-panel-title"
        accessibilityRole="header"
        style={[styles.title, { fontSize: type.title, lineHeight: Math.round(type.title * 1.18) }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {t(showing.step.placeKey)}
      </Text>
      <Text testID="plan-panel-subtitle" style={[styles.subtitle, { fontSize: type.subtitle }]} numberOfLines={1}>
        {showing.title}
      </Text>
      <Text
        testID="plan-panel-aim"
        style={[styles.aim, { fontSize: type.aim, lineHeight: Math.round(type.aim * (isTablet ? 1.3 : 1.22)) }]}
        numberOfLines={2}
      >
        {t(showing.step.aimKey)}
      </Text>
    </View>
  ) : (
    <View testID="plan-panel-done" style={styles.words}>
      <Text testID="plan-panel-title" accessibilityRole="header" style={[styles.title, { fontSize: type.title }]}>
        {t('plan.weekDone')}
      </Text>
      <Text style={[styles.aim, { fontSize: type.aim }]}>{t('plan.weekDoneBody', { done: doneCount, total })}</Text>
    </View>
  );

  const chips = showing ? (
    <View style={[styles.chips, isTablet ? styles.chipsUnderWords : styles.chipsBelow]}>
      <View testID="plan-chip-minutes" style={styles.chip}>
        <Ionicons name="time-outline" size={type.chip + 3} color={PLAN_CARD_TINTS.chipInk} />
        <Text style={[styles.chipText, { fontSize: type.chip }]}>
          {t('plan.minutes', { from: showing.step.minutes[0], to: showing.step.minutes[1] })}
        </Text>
      </View>
      {showing.step.skills.map((skill) => (
        <View key={skill} testID={`plan-chip-${skill}`} style={styles.chip}>
          <Ionicons name={SKILL_ICON[skill]} size={type.chip + 3} color={PLAN_CARD_TINTS.chipInk} />
          <Text style={[styles.chipText, { fontSize: type.chip }]}>{t(`plan.skills.${skill}`)}</Text>
        </View>
      ))}
    </View>
  ) : null;

  const preview = canPreview ? (
    <Pressable
      testID="plan-preview"
      accessibilityRole="link"
      accessibilityHint={showing?.title}
      hitSlop={10}
      onPress={pressPreview}
      style={({ pressed }) => [styles.preview, pressed && styles.pressed]}
    >
      <Text testID="plan-preview-label" style={[styles.previewText, { fontSize: scaledFontSize(isTablet ? 17 : 15) }]}>
        {t('plan.preview')}
      </Text>
      <Ionicons name="chevron-forward" size={isTablet ? 18 : 16} color={PLAN_CARD_TINTS.link} />
    </Pressable>
  ) : null;

  const actions = showing ? (
    <View testID="plan-actions" style={isTablet ? styles.actionsBeside : styles.actionsBelow}>
      {open ? (
        <>
          <GoldButton
            testID="plan-start"
            label={t('plan.start')}
            icon="play"
            balanced={false}
            height={start.height}
            fontSize={start.font}
            iconSize={start.icon}
            paddingHorizontal={start.padding}
            accessibilityLabel={`${t('plan.start')}, ${showing.title}`}
            onPress={pressStart}
            style={isTablet ? undefined : styles.startPhone}
          />
          {preview}
        </>
      ) : (
        <View testID="plan-panel-moon" style={isTablet ? styles.moonBeside : styles.moonBelow}>
          <Ionicons name="moon" size={isTablet ? 22 : 18} color={PLAN_CARD_TINTS.gold} />
          <Text style={[styles.moonText, { fontSize: scaledFontSize(isTablet ? 14 : 13) }]} numberOfLines={2}>
            {t('plan.opensTomorrow')}
          </Text>
        </View>
      )}
    </View>
  ) : null;

  return (
    <View
      testID="plan-panel"
      pointerEvents="box-none"
      style={[styles.float, { width: cardWidth, left: cardLeft, bottom: bottomInset + PLAN_CARD.bottomGap }]}
    >
      <View
        ref={cardRef}
        collapsable={false}
        testID="plan-panel-card"
        onLayout={handleCardLayout}
        style={[styles.depth, { borderRadius: PLAN_CARD.radius }]}
      >
        <LinearGradient
          testID="plan-card-edge"
          colors={[...PLAN_CARD_TINTS.edge]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[styles.edge, { borderRadius: PLAN_CARD.radius, padding: PLAN_CARD.stroke }]}
        >
          <View style={[styles.surface, { borderRadius: PLAN_CARD.radius - PLAN_CARD.stroke }]}>
            <LinearGradient testID="plan-card-fill" colors={[...PLAN_CARD_TINTS.fill]} style={StyleSheet.absoluteFill} />
            <CardStars stars={isTablet ? PLAN_CARD_STARS.tablet : PLAN_CARD_STARS.phone} />
            <View style={{ padding }}>
              <View testID="plan-panel-row" style={styles.row}>
                {thumbnail}
                <View style={styles.middle}>
                  {words}
                  {isTablet ? chips : null}
                </View>
                {isTablet ? actions : null}
              </View>
              {!isTablet ? chips : null}
              {!isTablet ? actions : null}
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  float: {
    position: 'absolute',
  },
  depth: {
    shadowColor: PLAN_CARD_TINTS.depth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  edge: {
    overflow: 'hidden',
  },
  surface: {
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PLAN_CARD_TINTS.coverEdge,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTile: {
    backgroundColor: PLAN_CARD_TINTS.doneTile,
  },
  middle: {
    flex: 1,
    marginLeft: 14,
  },
  words: {
    gap: 1,
  },
  step: {
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    color: PLAN_CARD_TINTS.step,
  },
  domain: {
    fontWeight: '700',
  },
  title: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: PLAN_CARD_TINTS.title,
  },
  subtitle: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: PLAN_CARD_TINTS.title,
  },
  aim: {
    fontFamily: Fonts.rounded,
    fontWeight: '500',
    color: PLAN_CARD_TINTS.aim,
    marginTop: 3,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chipsUnderWords: {
    marginTop: 10,
    gap: 10,
  },
  chipsBelow: {
    marginTop: 7,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PLAN_CARD_TINTS.chipEdge,
    backgroundColor: PLAN_CARD_TINTS.chipFill,
  },
  chipText: {
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    color: PLAN_CARD_TINTS.chipInk,
  },
  actionsBeside: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginLeft: 16,
    maxWidth: 220,
  },
  actionsBelow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 7,
  },
  startPhone: {
    flex: 1,
    alignSelf: 'stretch',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  previewText: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: PLAN_CARD_TINTS.link,
    textDecorationLine: 'underline',
  },
  moonBeside: {
    alignItems: 'center',
    gap: 6,
  },
  moonBelow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: PLAN_CARD.startPhone.height,
  },
  moonText: {
    flexShrink: 1,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: PLAN_CARD_TINTS.aim,
    textAlign: 'center',
  },
});
