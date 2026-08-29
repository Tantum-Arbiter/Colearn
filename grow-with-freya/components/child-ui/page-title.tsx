import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { TYPE_ROLES, typeSize } from './tokens';

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
    >
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: TYPE_ROLES.pageTitle.weight,
    textAlign: 'center',
  },
});
