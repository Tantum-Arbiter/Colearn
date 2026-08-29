import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ACCENT_GOLD, TEXT_SECONDARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { SPACE_1, TYPE_ROLES, typeSize } from './tokens';

export interface NavigationItemProps {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  selectedIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function NavigationItem({ id, icon, selectedIcon, label, selected, onSelect }: NavigationItemProps) {
  const { isTablet, scaledFontSize } = useAccessibility();
  const color = selected ? ACCENT_GOLD : TEXT_SECONDARY;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(id);
  }, [id, onSelect]);

  return (
    <Pressable
      testID={`navigation-item-${id}`}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={styles.item}
    >
      <Ionicons name={selected ? selectedIcon : icon} size={isTablet ? 28 : 24} color={color} />
      <Text
        style={[styles.label, { color, fontSize: scaledFontSize(typeSize('navLabel', isTablet)) }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACE_1,
  },
  label: {
    fontFamily: Fonts.primary,
    fontWeight: TYPE_ROLES.navLabel.weight,
  },
});
