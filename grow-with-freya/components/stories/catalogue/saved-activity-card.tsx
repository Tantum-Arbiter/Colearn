import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import { BORDER_DEFAULT, SURFACE_NAV, TEXT_PRIMARY } from '@/constants/night-palette';
import { useAccessibility } from '@/hooks/use-accessibility';
import { RADIUS_NAV_ITEM, SPACE_1, SPACE_2 } from '@/components/child-ui/tokens';
import type { LearningActivity } from '@/data/learning-activities';

export interface SavedActivityCardProps {
  activity: LearningActivity;
  width: number;
  onOpen: (activity: LearningActivity) => void;
  testID?: string;
}

/**
 * A saved learning activity, shaped to stand in a row beside saved books.
 *
 * An activity has no cover to show -- it is an icon and a colour -- so the
 * card gives that icon the space a cover would take rather than pretending to
 * be a book with a blank jacket.
 */
export const SavedActivityCard = memo(function SavedActivityCard({
  activity,
  width,
  onOpen,
  testID,
}: SavedActivityCardProps) {
  const { t } = useTranslation();
  const { scaledFontSize } = useAccessibility();

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpen(activity);
  }, [activity, onOpen]);

  const label = t(activity.nameKey);

  return (
    <Pressable
      testID={testID ?? `saved-activity-card-${activity.id}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={handlePress}
      style={[styles.card, { width }]}
    >
      <View style={[styles.badge, { backgroundColor: activity.color }]}>
        <Ionicons name={activity.icon} size={Math.round(width * 0.34)} color="#FFFFFF" />
      </View>
      <Text
        style={[styles.title, { fontSize: scaledFontSize(13) }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS_NAV_ITEM,
    backgroundColor: SURFACE_NAV,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    padding: SPACE_2,
    gap: SPACE_1,
    alignItems: 'center',
  },
  badge: {
    aspectRatio: 1,
    alignSelf: 'stretch',
    borderRadius: RADIUS_NAV_ITEM - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
});
