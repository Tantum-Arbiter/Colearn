import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT_GOLD, TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { SPACE_2, TYPE_ROLES, typeSize } from './tokens';

interface SectionHeadingProps {
  label: string;
  testID?: string;
}

export function SectionHeading({ label, testID = 'section-heading' }: SectionHeadingProps) {
  const { isTablet, scaledFontSize } = useAccessibility();

  return (
    <View testID={testID} style={styles.row}>
      <Ionicons name="star" size={isTablet ? 24 : 20} color={ACCENT_GOLD} />
      <Text
        accessibilityRole="header"
        style={[styles.label, { fontSize: scaledFontSize(typeSize('sectionHeading', isTablet)) }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_2,
  },
  label: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: TYPE_ROLES.sectionHeading.weight,
    flexShrink: 1,
  },
});
