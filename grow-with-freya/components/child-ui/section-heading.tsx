import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT_GOLD, TEXT_PRIMARY, TEXT_SECONDARY } from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { SPACE_1, SPACE_2, SPACE_3, TYPE_ROLES, typeSize } from './tokens';

interface SectionHeadingProps {
  label: string;
  /** The mark before the words; a gold star unless the section has one of its own. */
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  /** A way to the whole of the section, at the row's end: "See all". */
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

export function SectionHeading({
  label,
  icon = 'star',
  iconColor = ACCENT_GOLD,
  actionLabel,
  onAction,
  testID = 'section-heading',
}: SectionHeadingProps) {
  const { isTablet, scaledFontSize } = useAccessibility();

  return (
    <View testID={testID} style={styles.row}>
      <View style={styles.lead}>
        <Ionicons name={icon} size={isTablet ? 24 : 20} color={iconColor} />
        <Text
          accessibilityRole="header"
          style={[styles.label, { fontSize: scaledFontSize(typeSize('sectionHeading', isTablet)) }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      {actionLabel !== undefined && onAction && (
        <Pressable
          testID={`${testID}-action`}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          hitSlop={SPACE_2}
          style={styles.action}
        >
          <Text style={[styles.actionLabel, { fontSize: scaledFontSize(isTablet ? 16 : 14) }]} numberOfLines={1}>
            {actionLabel}
          </Text>
          <Ionicons name="chevron-forward" size={scaledFontSize(14)} color={TEXT_SECONDARY} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE_3,
  },
  lead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_2,
    flexShrink: 1,
  },
  label: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: TYPE_ROLES.sectionHeading.weight,
    flexShrink: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_1,
  },
  actionLabel: {
    color: TEXT_SECONDARY,
    fontFamily: Fonts.primary,
    fontWeight: '600',
  },
});
