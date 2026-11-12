import React, { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { cancelAnimation, useAnimatedStyle, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS_CARD, RADIUS_CONTROL, SPACE_2, SPACE_3, SPACE_4, SPACE_5 } from '@/components/child-ui/tokens';
import { pictureSource } from '@/components/experience/engines/choose/choose-engine';
import type { ScreenFrame } from '@/components/experience/engines/place/place-geometry';
import { Fonts } from '@/constants/theme';
import { useSteadySharedValue } from '@/hooks/use-steady-shared-value';
import { NAV_BUTTON, PHONE_READER, readerEdge, readerScale } from './narration-layout';

export interface ChallengeTips {
  picture: string | number;
  label: string;
  heading: string;
  tips: string[];
}

export interface TipsInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const PANEL_PAD = SPACE_5;
export const PANEL_FADE_MS = 360;
export const CLOSE_HEIGHT = 44;
export const BADGE_GLOW_MS = 2400;
export const BADGE_WIGGLE_REST_MS = 2600;
export const MIN_TOUCH = 44;

const INK = '#503C8C';
const GOLD = '#FFD23F';
const CREAM = '#FFF6E3';
const SPARKLE = '#FFF1B8';

export function tipsPanelFrame(screen: { width: number; height: number }, insets: TipsInsets, button: number): ScreenFrame {
  const left = readerEdge(insets.left) + button + 12 + SPACE_4;
  const right = readerEdge(insets.right) + button + 12 + SPACE_4;
  const top = Math.max(insets.top + 20, 20) + button + SPACE_3;
  const bottom = screen.height - Math.max(insets.bottom, 12) - SPACE_3;
  return { left, top, width: Math.max(0, screen.width - left - right), height: Math.max(0, bottom - top) };
}

export interface TipsPanelLayout {
  frame: ScreenFrame;
  scale: number;
}

const PHONE_PANEL = tipsPanelFrame(PHONE_READER, PHONE_READER.insets, NAV_BUTTON);

export function tipsPanelLayout(screen: { width: number; height: number }, insets: TipsInsets, button: number, isTablet: boolean): TipsPanelLayout {
  if (!isTablet) return { frame: tipsPanelFrame(screen, insets, button), scale: 1 };
  const room = screen.height > screen.width
    ? {
      left: readerEdge(insets.left),
      top: Math.max(insets.top + 20, 20) + button + SPACE_3,
      width: Math.max(0, screen.width - readerEdge(insets.left) - readerEdge(insets.right)),
      height: Math.max(0, screen.height - Math.max(insets.bottom, 12) - button - SPACE_3 - (Math.max(insets.top + 20, 20) + button + SPACE_3)),
    }
    : tipsPanelFrame(screen, insets, button);
  const scale = Math.min(readerScale(screen.width, screen.height, isTablet), room.width / PHONE_PANEL.width, room.height / PHONE_PANEL.height);
  const width = PHONE_PANEL.width * scale;
  const height = PHONE_PANEL.height * scale;
  const top = Math.min(Math.max((screen.height - height) / 2, room.top), room.top + room.height - height);
  return { frame: { left: (screen.width - width) / 2, top, width, height }, scale };
}

function useFade(reduceMotion: boolean, open: boolean) {
  const shown = useSteadySharedValue(open ? 1 : 0);
  useEffect(() => {
    const target = open ? 1 : 0;
    shown.value = reduceMotion ? target : withTiming(target, { duration: PANEL_FADE_MS });
  }, [shown, reduceMotion, open]);
  return useAnimatedStyle(() => ({ opacity: shown.value }));
}

interface TipsPanelProps extends ChallengeTips {
  frame: ScreenFrame;
  scale: number;
  reduceMotion: boolean;
  open: boolean;
  closeLabel: string;
  onClose: () => void;
}

export const TipsPanel = memo(function TipsPanel({ picture, label, heading, tips, frame, scale, reduceMotion, open, closeLabel, onClose }: TipsPanelProps) {
  const style = useFade(reduceMotion, open);
  const tipSize = 16 * scale;
  const headingSize = 17 * scale;
  const labelSize = 16 * scale;
  const pad = PANEL_PAD * scale;
  const side = Math.max(0, Math.min(frame.height - pad * 2 - labelSize * 1.6, frame.width * 0.3));

  return (
    <Animated.View
      testID="learning-challenge-tips"
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      style={[styles.panel, { left: frame.left, top: frame.top, width: frame.width, height: frame.height, padding: pad, gap: SPACE_5 * scale }, style]}
    >
      <View style={[styles.face, { width: side }]}>
        <View style={[styles.circle, { width: side, height: side, borderRadius: side / 2 }]}>
          <Image testID="learning-challenge-tips-picture" source={pictureSource(picture)} style={{ width: side * 0.86, height: side * 0.86 }} contentFit="contain" transition={0} accessible={false} />
        </View>
        <Text testID="learning-challenge-tips-label" style={[styles.label, { fontSize: labelSize }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View testID="learning-challenge-tips-column" style={styles.column}>
        <View testID="learning-challenge-tips-text" style={styles.text}>
        <Text testID="learning-challenge-tips-heading" style={[styles.heading, { fontSize: headingSize, lineHeight: headingSize * 1.3 }]}>
          {heading}
        </Text>
        <View style={styles.list}>
          {tips.map((tip, index) => (
            <View key={index} style={styles.row}>
              <View style={[styles.dot, { marginTop: tipSize * 0.5 }]} />
              <Text testID={`learning-challenge-tip-${index}`} style={[styles.tip, { fontSize: tipSize, lineHeight: tipSize * 1.35 }]}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
        </View>
        <Pressable testID="learning-tips-close" onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel} style={[styles.close, { height: CLOSE_HEIGHT * scale, paddingHorizontal: SPACE_5 * scale }]}>
          <Text style={[styles.closeText, { fontSize: 16 * scale }]}>{closeLabel}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
});

interface TipsBadgeProps {
  size: number;
  open: boolean;
  reduceMotion: boolean;
  label: string;
  onPress: () => void;
}

export const TipsBadge = memo(function TipsBadge({ size, open, reduceMotion, label, onPress }: TipsBadgeProps) {
  const glow = useSteadySharedValue(0);
  const tilt = useSteadySharedValue(0);

  useEffect(() => {
    cancelAnimation(glow);
    cancelAnimation(tilt);
    tilt.value = 0;
    if (open) {
      glow.value = 0;
      return;
    }
    if (reduceMotion) {
      glow.value = 1;
      return;
    }
    glow.value = withRepeat(withSequence(withTiming(1, { duration: BADGE_GLOW_MS / 2 }), withTiming(0.4, { duration: BADGE_GLOW_MS / 2 })), -1, false);
    tilt.value = withRepeat(
      withSequence(withDelay(BADGE_WIGGLE_REST_MS, withTiming(-12, { duration: 140 })), withTiming(12, { duration: 160 }), withTiming(-6, { duration: 130 }), withTiming(0, { duration: 120 })),
      -1,
      false
    );
  }, [glow, tilt, open, reduceMotion]);

  const haloStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.92 + glow.value * 0.14 }] }));
  const sparkleStyle = useAnimatedStyle(() => ({ opacity: 0.3 + glow.value * 0.7 }));
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }));
  const ink = open ? GOLD : INK;
  const star = Math.round(size * 0.36);
  const stemWidth = Math.max(3, Math.round(size * 0.15));
  const stemHeight = Math.round(size * 0.28);
  const sparkle = Math.round(size * 0.42);
  const halo = Math.max(3, Math.round(size * 0.12));

  return (
    <View testID="learning-tips-badge-spot" style={[styles.badgeSpot, { width: size, height: size }]}>
      <Animated.View pointerEvents="none" style={[styles.halo, { top: -halo, left: -halo, right: -halo, bottom: -halo, borderRadius: size / 2 + halo }, haloStyle]} />
      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        <Pressable
          testID="learning-tips-badge"
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ expanded: open }}
          hitSlop={Math.max(10, Math.ceil((MIN_TOUCH - size) / 2))}
          style={({ pressed }) => [styles.badge, { borderRadius: size / 2 }, open ? styles.badgeOpen : null, pressed ? styles.badgePressed : null]}
        >
          <View pointerEvents="none" style={styles.glyph}>
            <Ionicons name="star" size={star} color={ink} />
            <View style={{ width: stemWidth, height: stemHeight, borderRadius: stemWidth / 2, backgroundColor: ink, marginTop: -Math.round(star * 0.1) }} />
          </View>
        </Pressable>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.sparkle, { top: -sparkle * 0.4, right: -sparkle * 0.4 }, sparkleStyle]}>
        <Ionicons name="sparkles" size={sparkle} color={SPARKLE} />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE_5,
    borderRadius: RADIUS_CARD,
    backgroundColor: 'rgba(255, 246, 227, 0.96)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  face: {
    alignItems: 'center',
    gap: SPACE_2,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8E3C4',
  },
  label: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#8A5320',
    textAlign: 'center',
  },
  column: {
    flex: 1,
    alignSelf: 'stretch',
    gap: SPACE_3,
  },
  text: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACE_3,
  },
  heading: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#2E2A4F',
  },
  list: {
    gap: SPACE_2,
  },
  row: {
    flexDirection: 'row',
    gap: SPACE_2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8A33D',
  },
  tip: {
    flex: 1,
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    color: '#2E2A4F',
  },
  close: {
    alignSelf: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: SPACE_5,
    borderRadius: RADIUS_CONTROL,
    backgroundColor: 'rgba(80, 60, 140, 0.92)',
  },
  closeText: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badgeSpot: {
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: 'rgba(255, 210, 63, 0.3)',
    shadowColor: GOLD,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  badge: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: CREAM,
    shadowColor: '#8A5320',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  badgeOpen: {
    backgroundColor: INK,
    borderColor: GOLD,
  },
  badgePressed: {
    transform: [{ scale: 0.9 }],
  },
  glyph: {
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
  },
});
