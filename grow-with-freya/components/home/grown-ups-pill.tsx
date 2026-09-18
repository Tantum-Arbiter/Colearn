import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { HOME_SCENE_TYPE, HOME_THEMES, type TimeOfDay } from '@/constants/home-scene';

export interface GrownUpsPillProps {
  timeOfDay: TimeOfDay;
  onPress: () => void;
  testID?: string;
}

export const GrownUpsPill = memo(function GrownUpsPill({
  timeOfDay,
  onPress,
  testID = 'grown-ups-pill',
}: GrownUpsPillProps) {
  const { t } = useTranslation();
  const theme = HOME_THEMES[timeOfDay];
  const label = t('home.grownUps');

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.pill, { backgroundColor: theme.chromeFill, borderColor: theme.chromeEdge }]}
    >
      <View style={styles.icon}>
        <Ionicons name="person" size={16} color={theme.chromeInk} />
      </View>
      <Text style={[styles.label, { color: theme.chromeInk }]}>{label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontFamily: Fonts.rounded,
    fontSize: HOME_SCENE_TYPE.grownUps,
    fontWeight: '700',
  },
});
