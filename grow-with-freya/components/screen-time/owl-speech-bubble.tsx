import React, { memo, useEffect, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Fonts } from '@/constants/theme';
import { OWL_RHYTHM } from '@/constants/owl-companion';

export const BUBBLE_POP_MS = 380;
export const BUBBLE_FRESH_MS = 220;
export const BUBBLE_LEAVE_MS = 160;
export const BUBBLE_TAIL_LEFT = 44;
export const BUBBLE_TAIL_SIZE = 16;
export const BUBBLE_POINTER_SIZE = 12;

export type BubbleTail = 'up' | 'down' | 'left' | 'right';

export type BubbleTailAlign = 'left' | 'right';

/** Which way the page turned, so the fresh content slides in from that side. */
export type BubbleTurn = 'forward' | 'back';

const SLIDE_PX = 18;
const BUBBLE_MUTE_MS = 160;
const ARROW_SIZE = 20;

export interface OwlSpeechBubbleProps {
  eyebrow?: string;
  title?: string;
  body: string;
  footnote?: string;
  footnoteEmphasis?: boolean;
  /** A picture under the words, for a step that words alone would not carry. */
  illustration?: ReactNode;
  page: number;
  pageCount: number;
  nextLabel: string;
  closeLabel: string;
  onNext: () => void;
  onClose: () => void;
  /** A way to the page before. Absent on a first page, which has none. */
  onBack?: () => void;
  backLabel?: string;
  /** Draws the way on as an arrow rather than a word; the label stays the accessible name. */
  nextAsArrow?: boolean;
  direction?: BubbleTurn;
  /** Holds the words out of sight while the thing they are about is still
   *  being found, so the change reads as one fade rather than a snap. */
  muted?: boolean;
  leaving?: boolean;
  maxWidth: number;
  tail?: BubbleTail | null;
  tailOffset?: number;
  tailAlign?: BubbleTailAlign;
  pointer?: BubbleTail | null;
  idPrefix?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
  testID?: string;
}

const pop = Easing.out(Easing.back(1.4));
const settle = Easing.out(Easing.cubic);
const drop = Easing.in(Easing.quad);

function popOrigin(tail: BubbleTail, align: BubbleTailAlign): string {
  const x = align === 'left' ? '14%' : '86%';
  switch (tail) {
    case 'down':
      return `${x} 100%`;
    case 'up':
      return `${x} 0%`;
    case 'left':
      return '0% 85%';
    case 'right':
      return '100% 85%';
  }
}

function tailStyle(tail: BubbleTail, offset: number, align: BubbleTailAlign): ViewStyle {
  const half = BUBBLE_TAIL_SIZE / 2;
  const along: ViewStyle = align === 'left' ? { left: offset } : { right: offset };
  switch (tail) {
    case 'down':
      return { ...along, bottom: 0, borderRightWidth: 1, borderBottomWidth: 1 };
    case 'up':
      return { ...along, top: 0, borderLeftWidth: 1, borderTopWidth: 1 };
    case 'left':
      return { left: 0, bottom: offset - half, borderLeftWidth: 1, borderBottomWidth: 1 };
    case 'right':
      return { right: 0, bottom: offset - half, borderRightWidth: 1, borderTopWidth: 1 };
  }
}

function pointerStyle(pointer: BubbleTail): ViewStyle {
  switch (pointer) {
    case 'up':
      return { top: 0, alignSelf: 'center', borderLeftWidth: 1, borderTopWidth: 1 };
    case 'down':
      return { bottom: 0, alignSelf: 'center', borderRightWidth: 1, borderBottomWidth: 1 };
    case 'left':
      return { left: 0, top: '50%', borderLeftWidth: 1, borderBottomWidth: 1 };
    case 'right':
      return { right: 0, top: '50%', borderRightWidth: 1, borderTopWidth: 1 };
  }
}

function wrapPadding(tail: BubbleTail | null, pointer: BubbleTail | null): ViewStyle {
  const pad: ViewStyle = {};
  const half = BUBBLE_TAIL_SIZE / 2;
  const pointerHalf = BUBBLE_POINTER_SIZE / 2;
  const side = (edge: BubbleTail, amount: number) => {
    const key = edge === 'up' ? 'paddingTop' : edge === 'down' ? 'paddingBottom' : edge === 'left' ? 'paddingLeft' : 'paddingRight';
    pad[key] = Math.max(Number(pad[key] ?? 0), amount);
  };
  if (tail) side(tail, half);
  if (pointer) side(pointer, pointerHalf);
  return pad;
}

export const OwlSpeechBubble = memo(function OwlSpeechBubble({
  eyebrow,
  title,
  body,
  footnote,
  footnoteEmphasis = false,
  illustration,
  page,
  pageCount,
  nextLabel,
  closeLabel,
  onNext,
  onClose,
  onBack,
  backLabel,
  nextAsArrow = false,
  direction = 'forward',
  muted = false,
  leaving = false,
  maxWidth,
  tail = 'down',
  tailOffset = BUBBLE_TAIL_LEFT,
  tailAlign = 'left',
  pointer = null,
  idPrefix = 'screen-time-owl',
  onLayout,
  testID = 'screen-time-owl-bubble',
}: OwlSpeechBubbleProps) {
  const { scaledFontSize } = useAccessibility();
  const reduceMotion = useReducedMotion();
  const presence = useSharedValue(0);
  const fresh = useSharedValue(1);
  // the words leave straight down their own opacity and arrive with the slide:
  // fading out along the entry path reads as the old page being pushed away
  const slide = useSharedValue(1);

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
      fresh.value = muted ? 0 : 1;
      slide.value = 0;
      return;
    }
    if (muted) {
      slide.value = 0;
      fresh.value = withTiming(0, { duration: BUBBLE_MUTE_MS, easing: drop });
      return;
    }
    slide.value = 1;
    fresh.value = 0;
    fresh.value = withTiming(1, { duration: BUBBLE_FRESH_MS, easing: settle });
  }, [page, muted, fresh, slide, reduceMotion]);

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: presence.value,
    transform: [{ scale: reduceMotion ? 1 : 0.7 + 0.3 * presence.value }],
  }));

  // the fresh page arrives from the side the turn came from: forward slides
  // in from the right, back from the left
  const slideFrom = direction === 'back' ? -SLIDE_PX : SLIDE_PX;
  const contentStyle = useAnimatedStyle(() => ({
    opacity: fresh.value,
    transform: [{ translateX: (1 - fresh.value) * slideFrom * slide.value }],
  }));

  const isLast = page >= pageCount - 1;

  return (
    <Animated.View
      style={[styles.wrap, { maxWidth, transformOrigin: popOrigin(tail ?? 'down', tailAlign) }, wrapPadding(tail, pointer), bubbleStyle]}
      testID={testID}
      onLayout={onLayout}
    >
      <View style={styles.bubble}>
        <Pressable
          testID={`${idPrefix}-close`}
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
            <Text style={[styles.eyebrow, { fontSize: scaledFontSize(11) }]} testID={`${idPrefix}-eyebrow`}>
              {eyebrow}
            </Text>
          ) : null}
          {title ? (
            <Text style={[styles.title, { fontSize: scaledFontSize(17) }]} testID={`${idPrefix}-title`}>
              {title}
            </Text>
          ) : null}
          <Text style={[styles.body, { fontSize: scaledFontSize(15) }]} testID={`${idPrefix}-body`}>
            {body}
          </Text>
          {illustration ? (
            <View testID={`${idPrefix}-illustration`}>{illustration}</View>
          ) : null}
          {footnote ? (
            <Text
              style={[
                styles.footnote,
                footnoteEmphasis && styles.footnoteEmphasis,
                { fontSize: scaledFontSize(12) },
              ]}
              testID={`${idPrefix}-footnote`}
            >
              {footnote}
            </Text>
          ) : null}
        </Animated.View>

        <View style={styles.footer}>
          {onBack ? (
            <Pressable
              testID={`${idPrefix}-back`}
              accessibilityRole="button"
              accessibilityLabel={backLabel ?? ''}
              onPress={onBack}
              hitSlop={6}
              style={({ pressed }) => [styles.arrow, pressed && styles.pillPressed]}
            >
              <Ionicons name="chevron-back" size={ARROW_SIZE} color="#FFFFFF" />
            </Pressable>
          ) : null}

          <View style={styles.dots} testID={`${idPrefix}-dots`}>
            {Array.from({ length: pageCount }, (_, index) => (
              <View
                key={index}
                testID={`${idPrefix}-dot-${index}`}
                accessibilityState={{ selected: index === page }}
                style={[styles.dot, index === page && styles.dotCurrent]}
              />
            ))}
          </View>

          <Pressable
            testID={isLast ? `${idPrefix}-okay` : `${idPrefix}-next`}
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
            onPress={onNext}
            hitSlop={nextAsArrow && !isLast ? 6 : undefined}
            style={({ pressed }) => [
              nextAsArrow && !isLast ? styles.arrow : styles.pill,
              pressed && styles.pillPressed,
            ]}
          >
            {nextAsArrow && !isLast ? (
              <Ionicons name="chevron-forward" size={ARROW_SIZE} color="#FFFFFF" />
            ) : (
              <Text style={[styles.pillLabel, { fontSize: scaledFontSize(15) }]}>{nextLabel}</Text>
            )}
          </Pressable>
        </View>
      </View>

      {tail ? (
        <View testID={`${idPrefix}-tail-${tail}`} style={[styles.tail, tailStyle(tail, tailOffset, tailAlign)]} />
      ) : null}
      {pointer ? (
        <View testID={`${idPrefix}-pointer-${pointer}`} style={[styles.pointer, pointerStyle(pointer)]} />
      ) : null}
    </Animated.View>
  );
});

const GLASS = 'rgba(18, 24, 46, 0.96)';
const EDGE = 'rgba(255, 255, 255, 0.14)';

const styles = StyleSheet.create({
  wrap: {
    maxWidth: '100%',
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
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginHorizontal: 8,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  dotCurrent: {
    width: 12,
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
    position: 'absolute',
    width: BUBBLE_TAIL_SIZE,
    height: BUBBLE_TAIL_SIZE,
    backgroundColor: GLASS,
    borderColor: EDGE,
    transform: [{ rotate: '45deg' }],
  },
  pointer: {
    position: 'absolute',
    width: BUBBLE_POINTER_SIZE,
    height: BUBBLE_POINTER_SIZE,
    backgroundColor: GLASS,
    borderColor: EDGE,
    transform: [{ rotate: '45deg' }],
  },
});
