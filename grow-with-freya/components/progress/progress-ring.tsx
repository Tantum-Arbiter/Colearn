import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { ACCENT_GOLD, TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { ringFraction } from './progress-model';

const RING_SIZE = 132;
const RING_STROKE = 13;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const RING_TONES = ['#8E72F3', '#D48BE8', ACCENT_GOLD] as const;
const LAVENDER_TEXT = 'rgba(199, 186, 255, 0.95)';

const STAR_PATH = 'M 16 2 L 20 12 L 30 12 L 22 18 L 25 28 L 16 22 L 7 28 L 10 18 L 2 12 L 12 12 Z';

function arcSegments(fraction: number) {
  if (fraction <= 0) return [];
  const perTone = fraction / RING_TONES.length;
  return RING_TONES.map((tone, index) => ({
    tone,
    start: perTone * index,
    length: perTone,
  }));
}

const SleepyStar = () => (
  <View style={styles.starWrapper} pointerEvents="none" testID="progress-ring-star">
    <Svg width={54} height={44} viewBox="0 0 54 44">
      <Ellipse cx={30} cy={38} rx={20} ry={6} fill="rgba(255, 255, 255, 0.85)" />
      <Ellipse cx={16} cy={36} rx={12} ry={5} fill="rgba(255, 255, 255, 0.7)" />
      <Path d={STAR_PATH} fill={ACCENT_GOLD} transform="translate(11, 4)" />
      <Path
        d="M 22 18 Q 24 20 26 18 M 30 18 Q 32 20 34 18"
        stroke="#7A5A12"
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  </View>
);

interface ProgressRingProps {
  minutesThisWeek: number;
}

export function ProgressRing({ minutesThisWeek }: ProgressRingProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();
  const fraction = ringFraction(minutesThisWeek);

  return (
    <View style={styles.container} testID="progress-ring">
      <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="rgba(255, 255, 255, 0.14)"
          strokeWidth={RING_STROKE}
          fill="transparent"
        />
        {arcSegments(fraction).map((segment) => (
          <Circle
            key={segment.tone}
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={segment.tone}
            strokeWidth={RING_STROKE}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${segment.length * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={-segment.start * CIRCUMFERENCE}
          />
        ))}
      </Svg>
      <View style={styles.centre} pointerEvents="none">
        <Text testID="progress-ring-value" style={[styles.value, { fontSize: scaledFontSize(34) }]}>
          {minutesThisWeek}
        </Text>
        <Text style={[styles.caption, { fontSize: scaledFontSize(13) }]}>{t('progress.ringCaption')}</Text>
        <Text style={[styles.thisWeek, { fontSize: scaledFontSize(12) }]}>{t('progress.ringThisWeek')}</Text>
      </View>
      <SleepyStar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
  },
  ringSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  centre: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '800',
  },
  caption: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  thisWeek: {
    color: LAVENDER_TEXT,
    fontFamily: Fonts.primary,
    fontWeight: '600',
  },
  starWrapper: {
    position: 'absolute',
    left: -14,
    bottom: -6,
  },
});
