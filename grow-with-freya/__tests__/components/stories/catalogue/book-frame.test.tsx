import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { BOOK_FRAME, BookFrame, bookSpineWidth } from '@/components/stories/catalogue/book-frame';

function byTestId(root: any, testID: string) {
  return root.findAll((node: any) => node.props?.testID === testID);
}

describe('BookFrame', () => {
  it('should draw a spine, the cover, and the block of pages', () => {
    const { UNSAFE_root } = render(
      <BookFrame width={120} height={160} radius={12}>
        <Text>cover art</Text>
      </BookFrame>
    );

    expect(byTestId(UNSAFE_root, 'book-frame-spine').length).toBeGreaterThan(0);
    expect(byTestId(UNSAFE_root, 'book-frame-cover').length).toBeGreaterThan(0);
    expect(byTestId(UNSAFE_root, 'book-frame-pages').length).toBeGreaterThan(0);
  });

  it('should keep the cover art inside the cover, not on the spine', () => {
    const { UNSAFE_root } = render(
      <BookFrame width={120} height={160} radius={12}>
        <Text testID="art">cover art</Text>
      </BookFrame>
    );

    const cover = byTestId(UNSAFE_root, 'book-frame-cover')[0];
    expect(byTestId(cover, 'art').length).toBeGreaterThan(0);
    const spine = byTestId(UNSAFE_root, 'book-frame-spine')[0];
    expect(byTestId(spine, 'art').length).toBe(0);
  });

  it('should give the cover the width the spine leaves', () => {
    const { UNSAFE_root } = render(
      <BookFrame width={120} height={160} radius={12}>
        <Text>cover art</Text>
      </BookFrame>
    );

    const cover = byTestId(UNSAFE_root, 'book-frame-cover')[0];
    const flat = Object.assign({}, ...[cover.props.style].flat(Infinity).filter(Boolean));
    expect(flat.width).toBe(120 - bookSpineWidth(120));
  });
});

describe('bookSpineWidth', () => {
  it('should scale with the book but never thinner than a hardback', () => {
    expect(bookSpineWidth(60)).toBe(BOOK_FRAME.spineMin);
    expect(bookSpineWidth(200)).toBe(Math.round(200 * BOOK_FRAME.spineRatio));
  });

  it('should never grow past a sensible spine on a big featured book', () => {
    expect(bookSpineWidth(600)).toBe(BOOK_FRAME.spineMax);
  });
});
