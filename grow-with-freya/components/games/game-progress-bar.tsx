/**
 * GameProgressBar
 *
 * Displays a horizontal row of dots showing game progress (completed vs total).
 * Filled dots use a pastel colour; unfilled dots are semi-transparent.
 * Includes a compact "N / M" text label.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';

interface GameProgressBarProps {
  /** Number of items completed so far */
  completed: number;
  /** Total items in the round */
  total: number;
  /** Optional colour for filled dots (default: mint green) */
  filledColor?: string;
}

export function GameProgressBar({
  completed,
  total,
  filledColor = '#4ADE80',
}: GameProgressBarProps) {
  const { scaledFontSize } = useAccessibility();

  return (
    <View style={styles.container}>
      <View style={styles.dotsRow} testID="progress-dots-row">
        {Array.from({ length: total }, (_, i) => {
          const isFilled = i < completed;
          return (
            <View
              key={i}
              testID={isFilled ? `progress-dot-filled-${i}` : `progress-dot-unfilled-${i}`}
              style={[
                styles.dot,
                isFilled
                  ? { backgroundColor: filledColor }
                  : styles.dotUnfilled,
              ]}
            />
          );
        })}
      </View>
      <Text style={[styles.label, { fontSize: scaledFontSize(13) }]} testID="progress-label">
        {completed} / {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotUnfilled: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  label: {
    fontFamily: Fonts.rounded,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
});
