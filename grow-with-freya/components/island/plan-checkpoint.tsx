import React, { memo, useCallback, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { SPACE_1 } from '@/components/child-ui/tokens';
import { artPoint, type IslandLayout } from '@/constants/island-scene';
import { CHECKPOINT_SHAPE, checkpointLabelTop } from '@/constants/island-trail';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import type { PlanStepView } from '@/hooks/use-learning-plan';
import type { PlanStepKind } from '@/types/learning-plan';

export const CHECKPOINT_DIAMETER_PHONE = 56;
export const CHECKPOINT_DIAMETER_TABLET = 68;

export const CHECKPOINT_TINTS = {
  number: '#FFFFFF',
  cool: ['#1C47A0', '#3B79D6', '#64AAF7'],
  open: ['#FFF4A3', '#FFE14A', '#FBD12A'],
  done: ['#F2B04A', '#E8992F', '#D7802C'],
  coolRing: '#E3F1FF',
  warmRing: '#FFF3D2',
  coolBadge: '#11307F',
  warmBadge: '#744A14',
  lock: '#FFFFFF',
  keyhole: '#13358F',
  page: '#FFFDF5',
  cover: '#D9531E',
  glow: '#FFE45A',
  aura: '#8CC8FF',
  labelCool: '#C3DBF8',
  labelWarm: '#FFF1D2',
  ink: '#14246A',
  inkWarm: '#2A1C0A',
  shadow: '#0B1A4A',
} as const;

const KIND_ICON: Record<Exclude<PlanStepKind, 'story'>, ComponentProps<typeof Ionicons>['name']> = {
  words: 'text',
  numbers: 'calculator',
  feelings: 'happy',
  music: 'musical-notes',
};

const RING_OF_DIAMETER = 0.035;
const BOOK_OF_DIAMETER = 0.52;
const ICON_OF_DIAMETER = 0.44;
const TICK_OF_DIAMETER = 0.5;
const LOCK_RISE = 0.04;
const GLOW_OF_DIAMETER = 2.5;
const GLOW_STOPS = [
  { offset: 0, opacity: 1 },
  { offset: 0.42, opacity: 1 },
  { offset: 0.62, opacity: 0.75 },
  { offset: 0.82, opacity: 0.32 },
  { offset: 1, opacity: 0 },
] as const;
const AURA_OF_DIAMETER = 1.45;
const AURA_STOPS = [
  { offset: 0, opacity: 0.9 },
  { offset: 0.66, opacity: 0.75 },
  { offset: 0.82, opacity: 0.28 },
  { offset: 1, opacity: 0 },
] as const;
const DISC_STOPS = [0, 0.55, 1] as const;
const GLOW_BREATH = 0.08;
const LABEL_EDGE = 8;

export interface PlanCheckpointProps {
  view: PlanStepView;
  layout: IslandLayout;
  screenWidth: number;
  onPress: (view: PlanStepView) => void;
  pulse?: SharedValue<number>;
  labelFloor?: number;
}

function guessedWidth(words: string, fontSize: number): number {
  return Math.round(words.length * fontSize * 0.56 + 28);
}

interface HaloProps {
  id: string;
  size: number;
  colour: string;
  stops: readonly { offset: number; opacity: number }[];
}

function Halo({ id, size, colour, stops }: HaloProps) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          {stops.map((stop) => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={colour} stopOpacity={stop.opacity} />
          ))}
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

interface ArtProps {
  artID: string;
  size: number;
  centre: { x: number; y: number };
}

function Padlock({ artID, size, centre }: ArtProps) {
  const width = size;
  const height = (size * 30) / 24;

  return (
    <Svg
      testID={artID}
      width={width}
      height={height}
      viewBox="0 0 24 30"
      style={[styles.placed, { left: centre.x - width / 2, top: centre.y - height / 2, width, height }]}
    >
      <Path d="M6.5 13 V9.5 a5.5 5.5 0 0 1 11 0 V13" fill="none" stroke={CHECKPOINT_TINTS.lock} strokeWidth={3.2} strokeLinecap="round" />
      <Rect x={2} y={12} width={20} height={17} rx={4.5} fill={CHECKPOINT_TINTS.lock} />
      <Circle cx={12} cy={19.5} r={2.4} fill={CHECKPOINT_TINTS.keyhole} />
      <Rect x={11} y={20} width={2} height={5} rx={1} fill={CHECKPOINT_TINTS.keyhole} />
    </Svg>
  );
}

function OpenBook({ artID, size, centre }: ArtProps) {
  const width = size;
  const height = (size * 30) / 40;

  return (
    <Svg
      testID={artID}
      width={width}
      height={height}
      viewBox="0 0 40 30"
      style={[styles.placed, { left: centre.x - width / 2, top: centre.y - height / 2, width, height }]}
    >
      <Path
        d="M2 8 Q2 6 4 6 L18 7 Q20 7.5 20 9 Q20 7.5 22 7 L36 6 Q38 6 38 8 L38 26 Q38 27.4 36.5 27.4 L22 27.6 Q20 28 20 29.5 Q20 28 18 27.6 L3.5 27.4 Q2 27.4 2 26 Z"
        fill={CHECKPOINT_TINTS.cover}
      />
      <Path d="M5 4 Q12.5 2.8 19.4 6 L19.4 25.4 Q12.5 22.6 5 23.6 Z" fill={CHECKPOINT_TINTS.page} />
      <Path d="M35 4 Q27.5 2.8 20.6 6 L20.6 25.4 Q27.5 22.6 35 23.6 Z" fill={CHECKPOINT_TINTS.page} />
    </Svg>
  );
}

export const PlanCheckpoint = memo(function PlanCheckpoint({
  view,
  layout,
  screenWidth,
  onPress,
  pulse,
  labelFloor = Number.POSITIVE_INFINITY,
}: PlanCheckpointProps) {
  const { t } = useTranslation();
  const { isTablet, scaledFontSize } = useAccessibility();
  const diameter = isTablet ? CHECKPOINT_DIAMETER_TABLET : CHECKPOINT_DIAMETER_PHONE;
  const centre = artPoint(view.point.x, view.point.y, layout);
  const open = view.state === 'open';
  const done = view.state === 'done';
  const warm = open || done;
  const place = t(view.step.placeKey);
  const labelSize = scaledFontSize(isTablet ? 13 : 11);
  const [labelSizeSeen, setLabelSizeSeen] = useState({
    width: guessedWidth(place, labelSize),
    height: Math.round(labelSize * 1.25 + 2 * SPACE_1),
  });
  const labelWidth = labelSizeSeen.width;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) setLabelSizeSeen({ width: Math.round(width), height: Math.round(height) });
  }, []);

  const handlePress = useCallback(() => {
    if (!open) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(view);
  }, [onPress, open, view]);

  const breathe = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + GLOW_BREATH * (0.5 - 0.5 * Math.cos(2 * Math.PI * (pulse?.value ?? 0))) }],
  }));

  const day = view.step.day;
  const radius = diameter / 2;
  const ring = Math.max(2, Math.round(diameter * RING_OF_DIAMETER));
  const inner = diameter - ring * 2;
  const face = open ? CHECKPOINT_TINTS.open : done ? CHECKPOINT_TINTS.done : CHECKPOINT_TINTS.cool;
  const badge = Math.round(diameter * CHECKPOINT_SHAPE.badge);
  const glowSize = Math.round(diameter * GLOW_OF_DIAMETER);
  const auraSize = Math.round(diameter * AURA_OF_DIAMETER);
  const middle = { x: radius, y: radius };
  const lockMiddle = { x: radius, y: radius - diameter * LOCK_RISE };
  const labelLeft = Math.min(Math.max(centre.x - labelWidth / 2, LABEL_EDGE), screenWidth - LABEL_EDGE - labelWidth);
  const labelTop = checkpointLabelTop(centre.y, diameter, labelSizeSeen.height, labelFloor).top;

  return (
    <>
      <Pressable
        testID={`plan-checkpoint-${day}`}
        accessibilityRole="button"
        accessibilityLabel={t('plan.a11y.checkpoint', { day, place, state: t(`plan.states.${view.state}`) })}
        accessibilityState={{ disabled: !open }}
        disabled={!open}
        onPress={handlePress}
        style={[styles.marker, { left: centre.x - radius, top: centre.y - radius, width: diameter, height: diameter }]}
      >
        {open ? (
          <Animated.View
            testID={`plan-checkpoint-${day}-glow`}
            pointerEvents="none"
            style={[
              styles.placed,
              { left: (diameter - glowSize) / 2, top: (diameter - glowSize) / 2, width: glowSize, height: glowSize },
              breathe,
            ]}
          >
            <Halo id={`plan-glow-${day}`} size={glowSize} colour={CHECKPOINT_TINTS.glow} stops={GLOW_STOPS} />
          </Animated.View>
        ) : !done ? (
          <View
            testID={`plan-checkpoint-${day}-aura`}
            pointerEvents="none"
            style={[styles.placed, { left: (diameter - auraSize) / 2, top: (diameter - auraSize) / 2, width: auraSize, height: auraSize }]}
          >
            <Halo id={`plan-aura-${day}`} size={auraSize} colour={CHECKPOINT_TINTS.aura} stops={AURA_STOPS} />
          </View>
        ) : null}

        <View
          testID={`plan-checkpoint-${day}-disc`}
          style={[
            styles.disc,
            {
              width: diameter,
              height: diameter,
              borderRadius: radius,
              borderWidth: ring,
              borderColor: warm ? CHECKPOINT_TINTS.warmRing : CHECKPOINT_TINTS.coolRing,
            },
          ]}
        >
          <Svg width={inner} height={inner}>
            <Defs>
              <RadialGradient id={`plan-disc-${day}`} cx="50%" cy="50%" r="50%">
                {face.map((colour, index) => (
                  <Stop key={colour} offset={DISC_STOPS[index]} stopColor={colour} />
                ))}
              </RadialGradient>
            </Defs>
            <Circle cx={inner / 2} cy={inner / 2} r={inner / 2} fill={`url(#plan-disc-${day})`} />
          </Svg>
        </View>

        {open ? (
          view.step.kind === 'story' ? (
            <OpenBook artID={`plan-checkpoint-${day}-icon`} size={diameter * BOOK_OF_DIAMETER} centre={middle} />
          ) : (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.middle]}>
              <Ionicons
                testID={`plan-checkpoint-${day}-icon`}
                name={KIND_ICON[view.step.kind]}
                size={Math.round(diameter * ICON_OF_DIAMETER)}
                color={CHECKPOINT_TINTS.cover}
              />
            </View>
          )
        ) : done ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.middle]}>
            <Ionicons
              testID={`plan-checkpoint-${day}-done`}
              name="checkmark"
              size={Math.round(diameter * TICK_OF_DIAMETER)}
              color={CHECKPOINT_TINTS.number}
            />
          </View>
        ) : (
          <Padlock artID={`plan-checkpoint-${day}-lock`} size={diameter * CHECKPOINT_SHAPE.lockWidth} centre={lockMiddle} />
        )}

        <View
          testID={`plan-checkpoint-${day}-badge`}
          pointerEvents="none"
          style={[
            styles.badge,
            {
              width: badge,
              height: badge,
              borderRadius: badge / 2,
              left: radius - badge / 2,
              top: -diameter * CHECKPOINT_SHAPE.badgeRise - badge / 2,
              borderWidth: Math.max(1.5, Math.round(badge * 0.08)),
              backgroundColor: warm ? CHECKPOINT_TINTS.warmBadge : CHECKPOINT_TINTS.coolBadge,
              borderColor: warm ? CHECKPOINT_TINTS.warmRing : CHECKPOINT_TINTS.coolRing,
            },
          ]}
        >
          <Text
            testID={`plan-checkpoint-${day}-number`}
            allowFontScaling={false}
            style={[styles.number, { fontSize: Math.round(badge * 0.56), lineHeight: Math.round(badge * 0.7) }]}
          >
            {String(day)}
          </Text>
        </View>
      </Pressable>
      <View
        testID={`plan-checkpoint-${day}-label`}
        pointerEvents="none"
        onLayout={handleLayout}
        style={[
          styles.label,
          {
            left: labelLeft,
            top: labelTop,
            backgroundColor: warm ? CHECKPOINT_TINTS.labelWarm : CHECKPOINT_TINTS.labelCool,
          },
        ]}
      >
        <Text
          style={[styles.labelText, { fontSize: labelSize, color: warm ? CHECKPOINT_TINTS.inkWarm : CHECKPOINT_TINTS.ink }]}
          numberOfLines={1}
        >
          {place}
        </Text>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placed: {
    position: 'absolute',
  },
  middle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CHECKPOINT_TINTS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    color: CHECKPOINT_TINTS.number,
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  label: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: SPACE_1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    shadowColor: CHECKPOINT_TINTS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  labelText: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
  },
});
