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
  iconDrop: 2,
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
  paddingHorizontal?: number;
  gap?: number;
  glow?: { opacity: number; radius: number };
  balanced?: boolean;
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
  paddingHorizontal = GOLD_BUTTON.paddingHorizontal,
  gap = GOLD_BUTTON.gap,
  glow,
  balanced = true,
  hitSlop,
  style,
  testID = 'gold-button',
}: GoldButtonProps) {
  const { scaledFontSize } = useAccessibility();
  const glyph = (seen: boolean) => (
    <View
      testID={seen ? `${testID}-icon` : `${testID}-icon-twin`}
      accessibilityElementsHidden={!seen}
      importantForAccessibility={seen ? 'auto' : 'no-hide-descendants'}
      style={[styles.glyph, !seen && styles.glyphTwin]}
    >
      <Ionicons name={icon} size={iconSize} color={HERO_CARD.arrowInk} />
    </View>
  );


  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={hitSlop}
      style={({ pressed }) => [styles.root, { minHeight: height }, style, pressed && styles.pressed]}
    >
      <View
        testID={`${testID}-glow`}
        pointerEvents="none"
        style={[styles.glow, { borderRadius: height / 2 }, glow && { shadowOpacity: glow.opacity, shadowRadius: glow.radius }]}
      />
      <LinearGradient
        testID={`${testID}-face`}
        colors={[HERO_CARD.arrowTop, HERO_CARD.arrowBottom]}
        style={[styles.face, { minHeight: height, borderRadius: height / 2, paddingHorizontal }]}
      >
        <LinearGradient colors={[...GOLD_BUTTON.sheen]} style={styles.sheen} pointerEvents="none" />
        <View testID={`${testID}-word`} style={[styles.word, { gap }]}>
          {balanced || iconPosition === 'leading' ? glyph(iconPosition === 'leading') : null}
          <Text style={[styles.label, { fontSize: scaledFontSize(fontSize) }]} numberOfLines={1}>
            {label}
          </Text>
          {balanced || iconPosition === 'trailing' ? glyph(iconPosition === 'trailing') : null}
        </View>
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
    ...StyleSheet.absoluteFill,
    backgroundColor: HERO_CARD.arrowBottom,
    shadowColor: HERO_CARD.arrowBottom,
    shadowOpacity: GOLD_BUTTON.glowOpacity,
    shadowRadius: GOLD_BUTTON.glowRadius,
    shadowOffset: { width: 0, height: 2 },
    elevation: 10,
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  word: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glyph: {
    paddingTop: GOLD_BUTTON.iconDrop,
  },
  glyphTwin: {
    opacity: 0,
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
