import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT_PRIMARY, TEXT_SECONDARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { SPACE_1 } from '@/components/child-ui/tokens';

interface ActivityMetricProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: number;
  testID?: string;
}

export function ActivityMetric({ icon, iconColor, label, value, testID }: ActivityMetricProps) {
  const { scaledFontSize } = useAccessibility();

  return (
    <View style={styles.metric} testID={testID} accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text style={[styles.label, { fontSize: scaledFontSize(11) }]} numberOfLines={2}>
        {label}
      </Text>
      <Text testID={testID ? `${testID}-value` : undefined} style={[styles.value, { fontSize: scaledFontSize(22) }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: SPACE_1,
  },
  label: {
    color: TEXT_SECONDARY,
    fontFamily: Fonts.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  value: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: '800',
  },
});
