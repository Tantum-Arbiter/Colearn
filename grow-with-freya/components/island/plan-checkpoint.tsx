import React, { memo, useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { SPACE_1, SPACE_2 } from '@/components/child-ui/tokens';
import { artPoint, type IslandLayout } from '@/constants/island-scene';
import { checkpointLabelTop } from '@/constants/island-trail';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import type { PlanStepView } from '@/hooks/use-learning-plan';

export const CHECKPOINT_DIAMETER_PHONE = 56;
export const CHECKPOINT_DIAMETER_TABLET = 68;

export const CHECKPOINT_TINTS = {
  ring: '#FFFFFF',
  number: '#FFFFFF',
  warm: ['#D98330', '#EDA43F'],
  warmRim: 'rgba(255, 214, 140, 0.6)',
  warmShade: 'rgba(122, 58, 0, 0.35)',
  cool: ['#869ED6', '#95ACE0'],
  coolRim: 'rgba(222, 231, 255, 0.55)',
  coolShade: 'rgba(36, 56, 128, 0.35)',
  glow: '#FFE45A',
  badge: '#20367F',
  labelWarm: 'rgba(252, 239, 202, 0.95)',
  labelCool: 'rgba(214, 226, 246, 0.94)',
  ink: '#1C2F6E',
  shadow: '#0B1A4A',
} as const;

const RING_OF_DIAMETER = 0.075;
const NUMBER_OF_DIAMETER = 0.5;
const TICK_OF_DIAMETER = 0.55;
const BADGE_OF_DIAMETER = 0.48;
const BADGE_AT = { x: 1.03, y: 0.71 } as const;
const GLOW_OF_DIAMETER = 2.5;
const GLOW_STOPS = [
  { offset: 0, opacity: 1 },
  { offset: 0.42, opacity: 1 },
  { offset: 0.62, opacity: 0.75 },
  { offset: 0.82, opacity: 0.32 },
  { offset: 1, opacity: 0 },
] as const;
const GLOW_BREATH = 0.08;
const LABEL_EDGE = 8;

export function checkpointReachBelow(diameter: number): number {
  const radius = diameter / 2;
  return Math.max(radius, radius * BADGE_AT.y + (diameter * BADGE_OF_DIAMETER) / 2);
}

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
  const labelSize = scaledFontSize(isTablet ? 14 : 12);
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

  const ring = Math.round(diameter * RING_OF_DIAMETER);
  const glowSize = Math.round(diameter * GLOW_OF_DIAMETER);
  const badge = Math.round(diameter * BADGE_OF_DIAMETER);
  const radius = diameter / 2;
  const labelLeft = Math.min(Math.max(centre.x - labelWidth / 2, LABEL_EDGE), screenWidth - LABEL_EDGE - labelWidth);
  const labelTop = checkpointLabelTop(centre.y, radius, labelSizeSeen.height, labelFloor).top;
  const day = view.step.day;

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
              styles.glow,
              { left: (diameter - glowSize) / 2, top: (diameter - glowSize) / 2, width: glowSize, height: glowSize },
              breathe,
            ]}
          >
            <Svg width={glowSize} height={glowSize}>
              <Defs>
                <RadialGradient id={`plan-glow-${day}`} cx="50%" cy="50%" r="50%">
                  {GLOW_STOPS.map((stop) => (
                    <Stop key={stop.offset} offset={stop.offset} stopColor={CHECKPOINT_TINTS.glow} stopOpacity={stop.opacity} />
                  ))}
                </RadialGradient>
              </Defs>
              <Circle cx={glowSize / 2} cy={glowSize / 2} r={glowSize / 2} fill={`url(#plan-glow-${day})`} />
            </Svg>
          </Animated.View>
        ) : null}

        <View style={[styles.shadow, { width: diameter, height: diameter, borderRadius: radius }]}>
          <View
            testID={`plan-checkpoint-${day}-disc`}
            style={[
              styles.disc,
              { borderRadius: radius, borderWidth: ring, borderColor: CHECKPOINT_TINTS.ring },
            ]}
          >
            <LinearGradient
              colors={[...(warm ? CHECKPOINT_TINTS.warm : CHECKPOINT_TINTS.cool)]}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: radius, borderWidth: 2, borderColor: warm ? CHECKPOINT_TINTS.warmRim : CHECKPOINT_TINTS.coolRim },
              ]}
            />
            {done ? (
              <Ionicons
                testID={`plan-checkpoint-${day}-done`}
                name="checkmark"
                size={Math.round(diameter * TICK_OF_DIAMETER)}
                color={CHECKPOINT_TINTS.number}
              />
            ) : (
              <Text
                testID={`plan-checkpoint-${day}-number`}
                allowFontScaling={false}
                style={[
                  styles.number,
                  {
                    fontSize: Math.round(diameter * NUMBER_OF_DIAMETER),
                    lineHeight: Math.round(diameter * NUMBER_OF_DIAMETER * 1.15),
                    textShadowColor: warm ? CHECKPOINT_TINTS.warmShade : CHECKPOINT_TINTS.coolShade,
                  },
                ]}
              >
                {String(day)}
              </Text>
            )}
          </View>
        </View>

        {!open && !done ? (
          <View
            testID={`plan-checkpoint-${day}-lock`}
            pointerEvents="none"
            style={[
              styles.badge,
              {
                width: badge,
                height: badge,
                borderRadius: badge / 2,
                left: radius + radius * BADGE_AT.x - badge / 2,
                top: radius + radius * BADGE_AT.y - badge / 2,
              },
            ]}
          >
            <Ionicons name="lock-closed" size={Math.round(badge * 0.52)} color={CHECKPOINT_TINTS.number} />
          </View>
        ) : null}
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
        <Text style={[styles.labelText, { fontSize: labelSize }]} numberOfLines={1}>
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
  glow: {
    position: 'absolute',
  },
  shadow: {
    shadowColor: CHECKPOINT_TINTS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 4,
  },
  disc: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    color: CHECKPOINT_TINTS.number,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CHECKPOINT_TINTS.badge,
    borderWidth: 2,
    borderColor: CHECKPOINT_TINTS.ring,
  },
  label: {
    position: 'absolute',
    paddingHorizontal: SPACE_2 + SPACE_1,
    paddingVertical: SPACE_1,
    borderRadius: 13,
    alignItems: 'center',
  },
  labelText: {
    color: CHECKPOINT_TINTS.ink,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
});
