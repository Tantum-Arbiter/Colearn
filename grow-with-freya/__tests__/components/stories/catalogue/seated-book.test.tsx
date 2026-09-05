/**
 * Tests for SeatedBook -- the book as it waits at the centre of the screen,
 * while it is being sketched and while the phone is being asked to turn.
 *
 * It is laid out by Yoga rather than carried there by a transform, and that
 * is the whole point of it: when the screen turns, iOS blends the old layout
 * into the new one, and a view Yoga centres in both stays at the centre
 * through the blend. A transform applied from JS does not -- it is drawn
 * with the old offset for the first frames and swings into place.
 *
 * Key behaviors tested:
 * 1. Takes the seat's share of the screen and keeps the card's proportions
 * 2. Wears the same spine, hinge and pages as the book on the shelf
 * 3. Wears the shelf's title over the cover, and no page edges of its own
 * 4. Is hidden until its opacity is driven, so nothing flashes at mount
 * 5. Asks for a lift of exactly the book's bob
 * 6. Scales the spine with the seat
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { SeatedBook } from '@/components/stories/catalogue/seated-book';
import { bookSpineWidth } from '@/components/stories/catalogue/book-frame';
import { STORY_OPENING } from '@/constants/story-opening';

const CARD = { width: 248, height: 155 };
const SCREEN_WIDTH = 402;

function byTestId(root: any, id: string) {
  return root.findAll((node: any) => node.props?.testID === id);
}

function renderSeated(overrides: Partial<React.ComponentProps<typeof SeatedBook>> = {}) {
  const bob = { value: 6 } as SharedValue<number>;
  const opacity = { value: 1 } as SharedValue<number>;
  return render(
    <SeatedBook card={CARD} screenWidth={SCREEN_WIDTH} radius={15} bob={bob} opacity={opacity} {...overrides}>
      <Text>cover</Text>
    </SeatedBook>
  );
}

describe('SeatedBook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should take the seat's share of the screen and keep the card's proportions", () => {
    const { UNSAFE_root } = renderSeated();

    const underTest = StyleSheet.flatten(byTestId(UNSAFE_root, 'seated-book')[0].props.style);

    expect(underTest.width).toBe(`${STORY_OPENING.seatWidthRatio * 100}%`);
    expect(underTest.aspectRatio).toBeCloseTo(CARD.width / CARD.height, 5);
  });

  it('should wear the same spine, hinge and pages as the book on the shelf', () => {
    const { UNSAFE_root } = renderSeated();

    expect(byTestId(UNSAFE_root, 'seated-book-spine').length).toBeGreaterThan(0);
    expect(byTestId(UNSAFE_root, 'seated-book-pages').length).toBeGreaterThan(0);
  });

  it("should wear the shelf's title over the cover, and carry no page edges of its own", () => {
    // The defect this pins: at its seat the book wore a flat spine, no title
    // and a block of page edges standing beside it, none of which the shelf
    // has -- so the book waiting to be opened was not the book that was tapped.
    const { UNSAFE_root } = renderSeated({ title: 'Snuggle Little Wombat' });
    const book = byTestId(UNSAFE_root, 'seated-book')[0];

    const title = byTestId(book, 'seated-book-title');

    expect(title.length).toBeGreaterThan(0);
    expect(title.some((node: any) => node.props.children === 'Snuggle Little Wombat')).toBe(true);
    expect(byTestId(book, 'seated-book-edges')).toHaveLength(0);
  });

  it('should wear no title when it is given none', () => {
    const { UNSAFE_root } = renderSeated();

    expect(byTestId(UNSAFE_root, 'seated-book-title')).toHaveLength(0);
  });

  it("should light the spine as the shelf does, with rounded corners against the book's edge", () => {
    const { UNSAFE_root } = renderSeated();

    const spine = byTestId(UNSAFE_root, 'seated-book-spine')[0];
    const underTest = StyleSheet.flatten(spine.props.style);

    expect(underTest.borderTopLeftRadius).toBe(15);
    expect(underTest.borderBottomLeftRadius).toBe(15);
    expect(spine.findAll((n: any) => n.props.testID === 'linear-gradient').length).toBeGreaterThan(0);
  });

  it('should be hidden until its opacity is driven, so nothing flashes at mount', () => {
    // The defect this pins: the base style carried no opacity, so for the
    // first frames after mount -- before the animated style is applied -- the
    // view rendered at the default opacity of 1. Filmed on an iPad: the page
    // edges and page lines flashed at the seat for ~80ms as the card sank,
    // 300ms before the outline was drawn. The cover art was not decoded yet,
    // so only the lines showed.
    const { UNSAFE_root } = renderSeated();

    const underTest = StyleSheet.flatten(byTestId(UNSAFE_root, 'seated-book')[0].props.style);

    expect(underTest.opacity).toBe(0);
  });

  it("should ask for a lift of exactly the book's bob", () => {
    // The shared reanimated mock returns an empty style whatever it is asked
    // for, so the lift cannot be read off the element; what can be checked is
    // that the book asks for a style that translates by the bob.
    renderSeated();

    const styles = (useAnimatedStyle as jest.Mock).mock.calls.map(([factory]) => factory());
    const underTest = styles.find((style) => style?.transform?.some((part: object) => 'translateY' in part));

    expect(underTest?.transform).toEqual([{ translateY: 6 }]);
  });

  it('should scale the spine with the seat, as the book on the shelf does', () => {
    const { UNSAFE_root } = renderSeated();
    const seatWidth = SCREEN_WIDTH * STORY_OPENING.seatWidthRatio;

    const underTest = StyleSheet.flatten(byTestId(UNSAFE_root, 'seated-book-spine')[0].props.style);

    expect(underTest.width).toBeCloseTo(bookSpineWidth(CARD.width) * (seatWidth / CARD.width), 5);
  });
});
