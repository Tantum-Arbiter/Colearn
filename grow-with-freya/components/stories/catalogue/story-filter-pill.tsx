import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { STORY_FILTER_TAGS, StoryFilterTag } from '@/types/story';
import {
  ACCENT_GOLD,
  ACCENT_GREEN,
  ACCENT_PURPLE,
  BORDER_ACTIVE,
  BORDER_DEFAULT,
  SURFACE_SECONDARY,
  TEXT_PRIMARY,
} from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { CHILD_UI_MOTION, CHILD_UI_SCALE, motionDuration } from '@/constants/child-ui-motion';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  FILTER_PILL_HEIGHT,
  FILTER_PILL_PADDING_H,
  RADIUS_CONTROL,
  SPACE_2,
  TYPE_ROLES,
  typeSize,
} from '@/components/child-ui/tokens';

const SELECTED_SURFACE = 'rgba(85, 131, 214, 0.68)';

interface PillIconSpec {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export const FILTER_PILL_ICONS: Record<StoryFilterTag, PillIconSpec> = {
  calming: { icon: 'leaf', color: ACCENT_GREEN },
  bedtime: { icon: 'moon', color: ACCENT_GOLD },
  adventure: { icon: 'rocket', color: ACCENT_PURPLE },
  learning: { icon: 'book', color: '#FFD98E' },
  music: { icon: 'musical-notes', color: '#F2A65A' },
  family: { icon: 'people', color: '#7EC8E3' },
  creativity: { icon: 'color-palette', color: '#D8A7E8' },
  animals: { icon: 'paw', color: '#D9A066' },
  friendship: { icon: 'heart', color: '#F4A6B8' },
  nature: { icon: 'flower', color: ACCENT_GREEN },
  fantasy: { icon: 'sparkles', color: ACCENT_GOLD },
  counting: { icon: 'calculator', color: '#8ED1C6' },
  emotions: { icon: 'happy', color: '#F4A6B8' },
  silly: { icon: 'happy-outline', color: ACCENT_GOLD },
  rhymes: { icon: 'chatbubble-ellipses', color: '#7EC8E3' },
};

interface StoryFilterPillProps {
  tag: StoryFilterTag;
  selected: boolean;
  onToggle: (tag: StoryFilterTag) => void;
}

export function StoryFilterPill({ tag, selected, onToggle }: StoryFilterPillProps) {
  const { t } = useTranslation();
  const { isTablet, scaledFontSize } = useAccessibility();
  const reduceMotion = useReducedMotion();
  const iconShift = useSharedValue(0);
  const spec = FILTER_PILL_ICONS[tag];

  useEffect(() => {
    iconShift.value = withTiming(selected ? -CHILD_UI_SCALE.filterIconShift : 0, {
      duration: motionDuration(CHILD_UI_MOTION.filterSelect, reduceMotion),
      easing: Easing.out(Easing.ease),
    });
  }, [selected, reduceMotion, iconShift]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconShift.value }],
  }));

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(tag);
  }, [onToggle, tag]);

  return (
    <Pressable
      testID={`story-filter-pill-${tag}`}
      accessibilityRole="button"
      accessibilityLabel={t(STORY_FILTER_TAGS[tag].labelKey)}
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={[
        styles.pill,
        selected && styles.pillSelected,
      ]}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name={spec.icon} size={18} color={spec.color} />
      </Animated.View>
      <Text
        style={[styles.label, { fontSize: scaledFontSize(typeSize('filterLabel', isTablet)) }]}
        numberOfLines={1}
      >
        {t(STORY_FILTER_TAGS[tag].labelKey)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_2,
    height: FILTER_PILL_HEIGHT,
    paddingHorizontal: FILTER_PILL_PADDING_H,
    borderRadius: RADIUS_CONTROL,
    backgroundColor: SURFACE_SECONDARY,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  pillSelected: {
    backgroundColor: SELECTED_SURFACE,
    borderColor: BORDER_ACTIVE,
  },
  label: {
    color: TEXT_PRIMARY,
    fontFamily: Fonts.primary,
    fontWeight: TYPE_ROLES.filterLabel.weight,
  },
});
