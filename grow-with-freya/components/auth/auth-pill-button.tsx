import React from 'react';
import { View, StyleSheet, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../themed-text';
import { useAccessibility } from '@/hooks/use-accessibility';
import { Fonts } from '@/constants/theme';
import { GOLD } from '../onboarding/onboarding-theme';
import { INK } from './auth-theme';

export type AuthPillVariant = 'light' | 'guest';

interface AuthPillButtonProps {
  label: string;
  variant: AuthPillVariant;
  onPress: () => void;
  /** Brand mark or badge art shown at the leading edge. */
  icon?: React.ReactNode;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one pill used by every auth call to action: leading mark, centred label,
 * trailing chevron. `light` is the signed-in-with-a-provider treatment, `guest`
 * the gold-outlined night pill.
 */
export function AuthPillButton({
  label,
  variant,
  onPress,
  icon,
  disabled,
  testID,
  style,
}: AuthPillButtonProps) {
  const { scaledFontSize, scaledButtonSize } = useAccessibility();
  const isLight = variant === 'light';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isLight ? styles.light : styles.guest,
        pressed && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      {/* the icon slot is reserved even when empty so labels stay optically
          centred across a stack of buttons */}
      <View style={[styles.iconSlot, { width: scaledButtonSize(26) }]}>{icon}</View>
      {/* No adjustsFontSizeToFit here: beside a mark that reports its size late
          (the Google SVG) it measures the label against a near-zero frame and
          shrinks the text to nothing. Long translations wrap to a second line
          instead, which costs a little pill height but always stays legible. */}
      <ThemedText
        testID="auth-pill-label"
        style={[
          styles.label,
          isLight ? styles.lightLabel : styles.guestLabel,
          { fontSize: scaledFontSize(17) },
        ]}
        numberOfLines={2}
      >
        {label}
      </ThemedText>
      <Ionicons
        name="chevron-forward"
        size={scaledButtonSize(20)}
        color={isLight ? INK : '#FFFFFF'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 18,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  light: {
    backgroundColor: '#FBF7EE',
  },
  guest: {
    backgroundColor: 'rgba(10, 14, 44, 0.92)',
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  pressed: {
    opacity: 0.75,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    textAlign: 'center',
  },
  lightLabel: {
    color: INK,
  },
  guestLabel: {
    color: '#FFFFFF',
  },
});
