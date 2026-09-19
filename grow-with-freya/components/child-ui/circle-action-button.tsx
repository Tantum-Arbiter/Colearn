import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  BORDER_ACTIVE,
  BORDER_DEFAULT,
  SURFACE_PRIMARY,
  TEXT_PRIMARY,
} from '@/constants/night-palette';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';
import { CIRCLE_BUTTON_DIAMETER_PHONE, CIRCLE_BUTTON_DIAMETER_TABLET } from './tokens';

const ICON_RATIO = 0.48;
const LABELLED_ICON_RATIO = 0.36;
const PILL_PADDING_RATIO = 0.25;
const LABEL_MIN_SCALE = 0.7;

type CircleActionType = 'back' | 'home' | 'audio' | 'settings';

interface CircleActionButtonProps {
  type: CircleActionType;
  onPress: () => void;
  accessibilityLabel: string;
  muted?: boolean;
  /** A word beside the icon; the button becomes a pill of the same height. */
  label?: string;
  testID?: string;
}

function iconName(type: CircleActionType, muted: boolean): keyof typeof Ionicons.glyphMap {
  if (type === 'back') return 'arrow-back';
  if (type === 'home') return 'home';
  if (type === 'settings') return 'settings-outline';
  return muted ? 'volume-mute' : 'volume-high';
}

export function CircleActionButton({
  type,
  onPress,
  accessibilityLabel,
  muted = false,
  label,
  testID,
}: CircleActionButtonProps) {
  const { isTablet, scaledFontSize } = useAccessibility();
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
        label ? [styles.pill, { paddingHorizontal: Math.round(diameter * PILL_PADDING_RATIO) }] : { width: diameter },
        {
          height: diameter,
          borderRadius: diameter / 2,
          borderColor: pressed ? BORDER_ACTIVE : BORDER_DEFAULT,
        },
      ]}
    >
      <Ionicons
        name={iconName(type, muted)}
        size={Math.round(diameter * (label ? LABELLED_ICON_RATIO : ICON_RATIO))}
        color={TEXT_PRIMARY}
      />
      {label ? (
        <Text
          style={[styles.label, { fontSize: scaledFontSize(isTablet ? 17 : 13) }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={LABEL_MIN_SCALE}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    gap: 6,
    maxWidth: '100%',
  },
  label: {
    flexShrink: 1,
    color: TEXT_PRIMARY,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  button: {
    backgroundColor: SURFACE_PRIMARY,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
