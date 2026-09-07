import React, { memo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Fonts } from '@/constants/theme';
import { OWL_RHYTHM } from '@/constants/owl-companion';

export const BUBBLE_POP_MS = 380;
export const BUBBLE_FRESH_MS = 220;
export const BUBBLE_LEAVE_MS = 160;
export const BUBBLE_TAIL_LEFT = 44;

export interface OwlSpeechBubbleProps {
  eyebrow?: string;
  title?: string;
  body: string;
  footnote?: string;
  footnoteEmphasis?: boolean;
  page: number;
  pageCount: number;
  nextLabel: string;
  closeLabel: string;
  onNext: () => void;
  onClose: () => void;
  leaving?: boolean;
  maxWidth: number;
  testID?: string;
}

const pop = Easing.out(Easing.back(1.4));
const settle = Easing.out(Easing.cubic);
const drop = Easing.in(Easing.quad);

export const OwlSpeechBubble = memo(function OwlSpeechBubble({
  eyebrow,
  title,
  body,
  footnote,
  footnoteEmphasis = false,
  page,
  pageCount,
  nextLabel,
  closeLabel,
  onNext,
  onClose,
  leaving = false,
  maxWidth,
  testID = 'screen-time-owl-bubble',
}: OwlSpeechBubbleProps) {
  const { scaledFontSize } = useAccessibility();
  const reduceMotion = useReducedMotion();
  const presence = useSharedValue(0);
  const fresh = useSharedValue(1);

  useEffect(() => {
    if (leaving) {
      presence.value = withTiming(0, { duration: BUBBLE_LEAVE_MS, easing: drop });
      return;
    }
    presence.value = reduceMotion
      ? withTiming(1, { duration: OWL_RHYTHM.reducedFadeMs })
      : withTiming(1, { duration: BUBBLE_POP_MS, easing: pop });
  }, [leaving, presence, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      fresh.value = 1;
      return;
    }
    fresh.value = 0;
    fresh.value = withTiming(1, { duration: BUBBLE_FRESH_MS, easing: settle });
  }, [page, fresh, reduceMotion]);

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: presence.value,
    transform: [{ scale: reduceMotion ? 1 : 0.7 + 0.3 * presence.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: fresh.value,
    transform: [{ translateY: (1 - fresh.value) * 6 }],
  }));

  const isLast = page >= pageCount - 1;

  return (
    <Animated.View style={[styles.wrap, { maxWidth }, bubbleStyle]} testID={testID}>
      <View style={styles.bubble}>
        <Pressable
          testID="screen-time-owl-close"
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          hitSlop={10}
          style={styles.close}
        >
          <Text style={styles.closeGlyph}>×</Text>
        </Pressable>

        <Animated.View style={[styles.content, contentStyle]}>
          {eyebrow ? (
            <Text style={[styles.eyebrow, { fontSize: scaledFontSize(11) }]} testID="screen-time-owl-eyebrow">
              {eyebrow}
            </Text>
          ) : null}
          {title ? (
            <Text style={[styles.title, { fontSize: scaledFontSize(17) }]} testID="screen-time-owl-title">
              {title}
            </Text>
          ) : null}
          <Text style={[styles.body, { fontSize: scaledFontSize(15) }]} testID="screen-time-owl-body">
            {body}
          </Text>
          {footnote ? (
            <Text
              style={[
                styles.footnote,
                footnoteEmphasis && styles.footnoteEmphasis,
                { fontSize: scaledFontSize(12) },
              ]}
              testID="screen-time-owl-footnote"
            >
              {footnote}
            </Text>
          ) : null}
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.dots} testID="screen-time-owl-dots">
            {Array.from({ length: pageCount }, (_, index) => (
              <View
                key={index}
                testID={`screen-time-owl-dot-${index}`}
                accessibilityState={{ selected: index === page }}
                style={[styles.dot, index === page && styles.dotCurrent]}
              />
            ))}
          </View>

          <Pressable
            testID={isLast ? 'screen-time-owl-okay' : 'screen-time-owl-next'}
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
            onPress={onNext}
            style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
          >
            <Text style={[styles.pillLabel, { fontSize: scaledFontSize(15) }]}>{nextLabel}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tail} />
    </Animated.View>
  );
});

const GLASS = 'rgba(18, 24, 46, 0.96)';
const EDGE = 'rgba(255, 255, 255, 0.14)';

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    transformOrigin: '14% 100%',
  },
  bubble: {
    backgroundColor: GLASS,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: EDGE,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  close: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeGlyph: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.72)',
  },
  content: {
    paddingRight: 24,
  },
  eyebrow: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255, 214, 140, 0.9)',
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  body: {
    fontFamily: Fonts.rounded,
    color: 'rgba(255, 255, 255, 0.86)',
    lineHeight: 21,
  },
  footnote: {
    fontFamily: Fonts.rounded,
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 17,
    marginTop: 8,
  },
  footnoteEmphasis: {
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.68)',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  dotCurrent: {
    width: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  pill: {
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  pillLabel: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tail: {
    marginLeft: BUBBLE_TAIL_LEFT,
    marginTop: -8,
    width: 16,
    height: 16,
    backgroundColor: GLASS,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: EDGE,
    transform: [{ rotate: '45deg' }],
  },
});
