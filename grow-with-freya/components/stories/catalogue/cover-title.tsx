import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TEXT_PRIMARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { SPACE_3, TYPE_ROLES, typeSize } from '@/components/child-ui/tokens';

/**
 * The title a book wears on its cover wherever it is shown -- on the shelf,
 * and at its seat while the phone is asked to turn -- so the book a child
 * tapped is the book they see waiting. A wash of night carries in from the
 * left so the words read over any artwork.
 */
export const TITLE_WASH_GRADIENT = ['rgba(4, 16, 47, 0.62)', 'rgba(4, 16, 47, 0.0)'] as const;

interface CoverTitleProps {
  title: string;
  testID?: string;
}

export function CoverTitle({ title, testID = 'story-cover-title' }: CoverTitleProps) {
  const { isTablet, scaledFontSize } = useAccessibility();

  return (
    <>
      <LinearGradient
        colors={TITLE_WASH_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.wash}
        pointerEvents="none"
      />
      <Text
        testID={testID}
        style={[styles.title, { fontSize: scaledFontSize(typeSize('cardTitle', isTablet)) }]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '70%',
  },
  title: {
    position: 'absolute',
    top: SPACE_3,
    left: SPACE_3,
    right: '32%',
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: TYPE_ROLES.cardTitle.weight,
  },
});
