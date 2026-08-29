import React, { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  BORDER_ACTIVE,
  BORDER_DEFAULT,
  SURFACE_PRIMARY,
  TEXT_PRIMARY,
} from '@/constants/night-palette';
import { useAccessibility } from '@/hooks/use-accessibility';
import { CIRCLE_BUTTON_DIAMETER_PHONE, CIRCLE_BUTTON_DIAMETER_TABLET } from './tokens';

const ICON_RATIO = 0.48;

interface CircleActionButtonProps {
  type: 'back' | 'audio';
  onPress: () => void;
  accessibilityLabel: string;
  muted?: boolean;
  testID?: string;
}

function iconName(type: 'back' | 'audio', muted: boolean): keyof typeof Ionicons.glyphMap {
  if (type === 'back') return 'arrow-back';
  return muted ? 'volume-mute' : 'volume-high';
}

export function CircleActionButton({
  type,
  onPress,
  accessibilityLabel,
  muted = false,
  testID,
}: CircleActionButtonProps) {
  const { isTablet } = useAccessibility();
  const diameter = isTablet ? CIRCLE_BUTTON_DIAMETER_TABLET : CIRCLE_BUTTON_DIAMETER_PHONE;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Pressable
      testID={testID ?? `circle-action-${type}`}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          borderColor: pressed ? BORDER_ACTIVE : BORDER_DEFAULT,
        },
      ]}
    >
      <Ionicons name={iconName(type, muted)} size={Math.round(diameter * ICON_RATIO)} color={TEXT_PRIMARY} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: SURFACE_PRIMARY,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
