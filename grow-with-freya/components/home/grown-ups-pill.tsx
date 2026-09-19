import React, { memo } from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { MENU_CORNER_BUTTON, cornerButtonStyles } from '@/components/ui/music-control';

export interface GrownUpsPillProps {
  onPress: () => void;
  testID?: string;
}

const ICON_SIZE = 22;
const LABEL_SIZE = 15;

export const GrownUpsPill = memo(function GrownUpsPill({ onPress, testID = 'grown-ups-pill' }: GrownUpsPillProps) {
  const { t } = useTranslation();
  const { scaledButtonSize, scaledFontSize } = useAccessibility();
  const height = scaledButtonSize(MENU_CORNER_BUTTON.diameter);
  const label = t('home.grownUps');

  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <View
        testID={`${testID}-disc`}
        style={[
          cornerButtonStyles.disc,
          styles.pill,
          {
            height,
            borderRadius: height / 2,
            paddingHorizontal: height / 3,
            backgroundColor: MENU_CORNER_BUTTON.fill,
            borderColor: MENU_CORNER_BUTTON.edge,
          },
        ]}
      >
        <Ionicons
          testID={`${testID}-icon`}
          name="settings"
          size={scaledButtonSize(ICON_SIZE)}
          color="#FFFFFF"
          style={styles.outlined}
        />
        <Text style={[styles.label, styles.outlined, { fontSize: scaledFontSize(LABEL_SIZE) }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  outlined: {
    textShadowColor: MENU_CORNER_BUTTON.iconOutline,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1,
  },
});
