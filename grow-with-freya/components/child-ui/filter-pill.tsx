import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import {
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
} from './tokens';

const SELECTED_SURFACE = 'rgba(85, 131, 214, 0.68)';

interface FilterPillProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function FilterPill({ icon, iconColor, label, selected, onPress, testID, style }: FilterPillProps) {
  const { isTablet, scaledFontSize } = useAccessibility();
  const reduceMotion = useReducedMotion();
  const iconShift = useSharedValue(0);

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
    onPress();
  }, [onPress]);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={[styles.pill, selected && styles.pillSelected, style]}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </Animated.View>
      <Text
        style={[styles.label, { fontSize: scaledFontSize(typeSize('filterLabel', isTablet)) }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    flexShrink: 1,
  },
});
