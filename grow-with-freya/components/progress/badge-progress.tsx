import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ACCENT_GOLD, ACCENT_PURPLE, TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';

const PILL_HEIGHT = 24;

interface BadgeProgressProps {
  current: number;
  target: number;
  earned: boolean;
  testID?: string;
}

export function BadgeProgress({ current, target, earned, testID = 'badge-progress' }: BadgeProgressProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();
  const fraction = target > 0 ? Math.min(1, current / target) : 0;

  return (
    <View style={styles.pill} testID={testID}>
      <View
        testID={`${testID}-fill`}
        style={[
          styles.fill,
          {
            width: `${Math.round(fraction * 100)}%`,
            backgroundColor: earned ? ACCENT_GOLD : ACCENT_PURPLE,
          },
        ]}
      />
      <Text style={[styles.count, { fontSize: scaledFontSize(11) }]}>
        {t('progress.count', { current, target })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: 'rgba(4, 16, 47, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(190, 215, 255, 0.3)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    opacity: 0.55,
  },
  count: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
});
