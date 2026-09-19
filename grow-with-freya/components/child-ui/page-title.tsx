import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { TYPE_ROLES, typeSize } from './tokens';

const TITLE_MIN_SCALE = 0.7;

interface PageTitleProps {
  title: string;
  testID?: string;
}

export function PageTitle({ title, testID = 'page-title' }: PageTitleProps) {
  const { isTablet, scaledFontSize } = useAccessibility();

  return (
    <Text
      testID={testID}
      accessibilityRole="header"
      style={[styles.title, { fontSize: scaledFontSize(typeSize('pageTitle', isTablet)) }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={TITLE_MIN_SCALE}
    >
      {title}
    </Text>
  );
}

/**
 * The title sits on the globe. It carries over the continents by size; the
 * shadow beneath is only soft -- a heavy one read as an outline.
 */
export const TITLE_SHADOW = {
  textShadowColor: 'rgba(4, 16, 47, 0.55)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 8,
} as const;

const styles = StyleSheet.create({
  title: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: TYPE_ROLES.pageTitle.weight,
    textAlign: 'center',
    ...TITLE_SHADOW,
  },
});
