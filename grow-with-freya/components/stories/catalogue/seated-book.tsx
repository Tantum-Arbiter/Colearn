import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { BookHinge, BookPages, bookSpineWidth } from './book-frame';
import { STORY_OPENING } from '@/constants/story-opening';

/**
 * The block of page edges beside the cover while the book waits: three strips,
 * each a little shorter than the last, standing a little in from the top and
 * bottom of the cover.
 */
export const SEATED_BOOK_EDGES = {
  strips: [0.96, 0.9, 0.84],
  width: 2,
  gap: 1.5,
  inset: 0.04,
} as const;

export interface SeatedBookProps {
  /** The tile the book was tapped on; the seat keeps its proportions. */
  card: { width: number; height: number };
  /** The screen the seat is on, so the spine scales with the book. */
  screenWidth: number;
  radius: number;
  spineColor?: string;
  /** The book's rise and fall while it waits. */
  bob: SharedValue<number>;
  /** The cover appearing inside the sketch's outline. */
  opacity: SharedValue<number>;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The book as it waits at the centre of the screen -- while it is being
 * sketched, and while the phone is being asked to turn.
 *
 * It is laid out by Yoga, centred in the overlay at the seat's share of the
 * screen width, rather than carried to the seat by a transform. That is the
 * whole point of it. When the screen turns, iOS blends the old layout into the
 * new, and a view Yoga centres in both stays at the centre through the blend.
 * The transform-driven book cannot: its new layout is drawn with the old
 * offset for the first frames, until the JS listener catches up, and it swings
 * into place. The transform-driven book takes over at the opening, at this
 * same size and place.
 */
export function SeatedBook({
  card,
  screenWidth,
  radius,
  spineColor = '#1D2657',
  bob,
  opacity,
  children,
  style,
  testID = 'seated-book',
}: SeatedBookProps) {
  const seatWidth = screenWidth * STORY_OPENING.seatWidthRatio;
  const spineWidth = bookSpineWidth(card.width) * (seatWidth / card.width);

  const floatStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: bob.value }],
  }));

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.seat,
        { width: `${STORY_OPENING.seatWidthRatio * 100}%`, aspectRatio: card.width / card.height, borderRadius: radius },
        floatStyle,
        style,
      ]}
      pointerEvents="none"
    >
      <View testID={`${testID}-cover`} style={[styles.cover, { borderRadius: radius }]}>
        {children}
        <View testID={`${testID}-spine`} style={[styles.spine, { width: spineWidth, backgroundColor: spineColor }]} pointerEvents="none" />
        <BookHinge />
        <BookPages testID={`${testID}-pages`} />
      </View>

      <View
        testID={`${testID}-edges`}
        style={[styles.edges, { top: `${SEATED_BOOK_EDGES.inset * 100}%`, height: `${(1 - SEATED_BOOK_EDGES.inset * 2) * 100}%` }]}
        pointerEvents="none"
      >
        {SEATED_BOOK_EDGES.strips.map((height, i) => (
          <View
            key={height}
            style={[styles.edge, { height: `${height * 100}%`, marginLeft: i === 0 ? 0 : SEATED_BOOK_EDGES.gap }]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  seat: {
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    zIndex: 50,
  },
  cover: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#141C4A',
  },
  spine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  edges: {
    position: 'absolute',
    left: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  edge: {
    width: SEATED_BOOK_EDGES.width,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 250, 235, 0.75)',
  },
});
