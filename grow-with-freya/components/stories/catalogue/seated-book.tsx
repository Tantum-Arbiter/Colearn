import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { BookHinge, BookPages, BookSpineShade, bookSpineWidth } from './book-frame';
import { CoverTitle } from './cover-title';
import { STORY_OPENING } from '@/constants/story-opening';

export interface SeatedBookProps {
  /** The tile the book was tapped on; the seat keeps its proportions. */
  card: { width: number; height: number };
  /** The screen the seat is on, so the spine scales with the book. */
  screenWidth: number;
  radius: number;
  spineColor?: string;
  /** The title the book wears on the shelf; it wears the same one here. */
  title?: string;
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
 *
 * It is dressed exactly as the book on the shelf: the same spine with its
 * light down the ridge, the same hinge and pages, and the same title over the
 * cover -- so the book a child tapped is the book they see waiting.
 */
export function SeatedBook({
  card,
  screenWidth,
  radius,
  spineColor = '#1D2657',
  title,
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
        {title !== undefined && <CoverTitle title={title} testID={`${testID}-title`} />}
        <View
          testID={`${testID}-spine`}
          style={[styles.spine, { width: spineWidth, backgroundColor: spineColor, borderTopLeftRadius: radius, borderBottomLeftRadius: radius }]}
          pointerEvents="none"
        >
          <BookSpineShade />
        </View>
        <BookHinge />
        <BookPages testID={`${testID}-pages`} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Hidden until the animated style drives it: for the first frames after
  // mount the animated style is not yet applied, and without this the view
  // rendered at the default opacity of 1 -- the page edges and page lines
  // flashed at the seat as the card sank, before the outline was drawn.
  seat: {
    opacity: 0,
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
    overflow: 'hidden',
  },
});
