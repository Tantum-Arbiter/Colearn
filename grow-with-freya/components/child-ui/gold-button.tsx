import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { HERO_CARD } from '@/constants/home-sky';
import { Fonts } from '@/constants/theme';
import { useAccessibility } from '@/hooks/use-accessibility';

export const GOLD_BUTTON = {
  height: 52,
  fontSize: 18,
  iconSize: 24,
  paddingHorizontal: 26,
  gap: 8,
  glowOpacity: 0.8,
  glowRadius: 20,
  sheenHeight: 22,
  sheen: ['rgba(255, 255, 255, 0.55)', 'rgba(255, 255, 255, 0)'],
} as const;

export interface GoldButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Leading for an action the glyph names (sign in); trailing for a note on it (locked). */
  iconPosition?: 'leading' | 'trailing';
  accessibilityLabel?: string;
  height?: number;
  fontSize?: number;
  iconSize?: number;
  hitSlop?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The app's one gold call to action: a lemon-to-gold face with a white sheen
 * along its top edge, dark ink, and a soft gold halo beneath. Login and the
 * free trial both wear it, so they can never drift apart.
 */
export function GoldButton({
  label,
  icon,
  onPress,
  iconPosition = 'leading',
  accessibilityLabel,
  height = GOLD_BUTTON.height,
  fontSize = GOLD_BUTTON.fontSize,
  iconSize = GOLD_BUTTON.iconSize,
  hitSlop,
  style,
  testID = 'gold-button',
}: GoldButtonProps) {
  const { scaledFontSize } = useAccessibility();
  const glyph = <Ionicons name={icon} size={iconSize} color={HERO_CARD.arrowInk} />;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={hitSlop}
      style={({ pressed }) => [styles.root, { minHeight: height }, style, pressed && styles.pressed]}
    >
      <View testID={`${testID}-glow`} pointerEvents="none" style={[styles.glow, { borderRadius: height / 2 }]} />
      <LinearGradient
        colors={[HERO_CARD.arrowTop, HERO_CARD.arrowBottom]}
        style={[styles.face, { minHeight: height, borderRadius: height / 2 }]}
      >
        <LinearGradient colors={[...GOLD_BUTTON.sheen]} style={styles.sheen} pointerEvents="none" />
        {iconPosition === 'leading' ? glyph : null}
        <Text style={[styles.label, { fontSize: scaledFontSize(fontSize) }]} numberOfLines={1}>
          {label}
        </Text>
        {iconPosition === 'trailing' ? glyph : null}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: HERO_CARD.pressScale }],
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: HERO_CARD.arrowBottom,
    shadowColor: HERO_CARD.arrowBottom,
    shadowOpacity: GOLD_BUTTON.glowOpacity,
    shadowRadius: GOLD_BUTTON.glowRadius,
    shadowOffset: { width: 0, height: 2 },
    elevation: 10,
  },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GOLD_BUTTON.gap,
    paddingHorizontal: GOLD_BUTTON.paddingHorizontal,
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: GOLD_BUTTON.sheenHeight,
  },
  label: {
    color: HERO_CARD.arrowInk,
    fontFamily: Fonts.rounded,
    fontWeight: '800',
  },
});
