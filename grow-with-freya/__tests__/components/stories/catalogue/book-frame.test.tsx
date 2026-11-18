import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { BOOK_FRAME, BookFrame, BookPages, bookPagesGeometry, bookSpineWidth } from '@/components/stories/catalogue/book-frame';

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

  it('should shape its pages to its own width and corner', () => {
    const { UNSAFE_root } = render(
      <BookFrame width={120} height={160} radius={12}>
        <Text>cover art</Text>
      </BookFrame>
    );
    const expected = bookPagesGeometry(120, 12);

    const underTest = StyleSheet.flatten(byTestId(UNSAFE_root, 'book-frame-pages-block')[0].props.style);

    expect(underTest.borderRightWidth).toBe(expected.block);
    expect(underTest.borderTopRightRadius).toBe(expected.corner);
  });
});

describe('bookPagesGeometry', () => {
  it.each([
    [60, 10],
    [185, 15],
    [248, 15],
    [600, 24],
  ])('should scale the page block with a %ipt book and keep it inside sensible bounds', (width, radius) => {
    const underTest = bookPagesGeometry(width, radius);

    expect(underTest.block).toBeGreaterThanOrEqual(BOOK_FRAME.pagesMin);
    expect(underTest.block).toBeLessThanOrEqual(BOOK_FRAME.pagesMax);
    expect(underTest.rim).toBeGreaterThanOrEqual(BOOK_FRAME.rimMin);
    expect(underTest.rim).toBeLessThanOrEqual(BOOK_FRAME.rimMax);
  });

  it('should grow the block and the rim with the book between those bounds', () => {
    expect(bookPagesGeometry(200, 15).block).toBe(Math.round(200 * BOOK_FRAME.pagesRatio));
    expect(bookPagesGeometry(200, 15).rim).toBe(Math.round(200 * BOOK_FRAME.rimRatio));
    expect(bookPagesGeometry(20, 15).block).toBe(BOOK_FRAME.pagesMin);
    expect(bookPagesGeometry(2000, 15).block).toBe(BOOK_FRAME.pagesMax);
    expect(bookPagesGeometry(20, 15).rim).toBe(BOOK_FRAME.rimMin);
    expect(bookPagesGeometry(2000, 15).rim).toBe(BOOK_FRAME.rimMax);
  });

  it("should curve the pages on the cover's own corner, set in by the rim", () => {
    const underTest = bookPagesGeometry(200, 15);

    expect(underTest.corner).toBe(15 - underTest.rim);
  });

  it('should rule each leaf line inside the block, further in each time, on the same centre', () => {
    const underTest = bookPagesGeometry(200, 15);

    expect(underTest.leaves).toHaveLength(BOOK_FRAME.leafLines);
    underTest.leaves.forEach((leaf, i) => {
      expect(leaf.inset).toBeGreaterThan(underTest.rim);
      expect(leaf.inset).toBeLessThan(underTest.rim + underTest.block);
      expect(leaf.corner).toBeCloseTo(15 - leaf.inset, 5);
      if (i > 0) expect(leaf.inset).toBeGreaterThan(underTest.leaves[i - 1].inset);
    });
  });

  it("should put the cover's lip at the inner edge of the block, on the same centre", () => {
    const underTest = bookPagesGeometry(200, 15);

    expect(underTest.lip.inset).toBe(underTest.rim + underTest.block);
    expect(underTest.lip.corner).toBe(15 - underTest.lip.inset);
  });

  it('should never ask for a negative corner on a square-cornered book', () => {
    const underTest = bookPagesGeometry(200, 0);

    expect(underTest.corner).toBe(0);
    underTest.leaves.forEach((leaf) => expect(leaf.corner).toBe(0));
  });
});

describe('BookPages', () => {
  const pages = (width = 200, radius = 15) => render(<BookPages width={width} radius={radius} />).UNSAFE_root;

  it("should set the page block in from the top, the bottom and the fore-edge by the same rim, so it follows the cover's corners", () => {
    const expected = bookPagesGeometry(200, 15);

    const underTest = StyleSheet.flatten(byTestId(pages(), 'book-pages-block')[0].props.style);

    expect(underTest.top).toBe(expected.rim);
    expect(underTest.bottom).toBe(expected.rim);
    expect(underTest.right).toBe(expected.rim);
    expect(underTest.borderTopRightRadius).toBe(expected.corner);
    expect(underTest.borderBottomRightRadius).toBe(expected.corner);
  });

  it('should draw the block as one curved edge, with no line along the top or the bottom', () => {
    const expected = bookPagesGeometry(200, 15);

    const underTest = StyleSheet.flatten(byTestId(pages(), 'book-pages-block')[0].props.style);

    expect(underTest.borderRightWidth).toBe(expected.block);
    expect(underTest.borderTopWidth ?? 0).toBe(0);
    expect(underTest.borderBottomWidth ?? 0).toBe(0);
    expect(underTest.borderLeftWidth ?? 0).toBe(0);
    expect(underTest.backgroundColor ?? 'transparent').toBe('transparent');
  });

  it('should rule the leaves as curves of their own, each on its own inset and corner', () => {
    const expected = bookPagesGeometry(200, 15);

    const underTest = byTestId(pages(), 'book-pages-leaf').map((node: any) => StyleSheet.flatten(node.props.style));

    expect(underTest).toHaveLength(expected.leaves.length);
    underTest.forEach((style: any, i: number) => {
      expect(style.top).toBe(expected.leaves[i].inset);
      expect(style.bottom).toBe(expected.leaves[i].inset);
      expect(style.right).toBe(expected.leaves[i].inset);
      expect(style.borderTopRightRadius).toBe(expected.leaves[i].corner);
      expect(style.borderBottomRightRadius).toBe(expected.leaves[i].corner);
      expect(style.borderRightWidth).toBe(BOOK_FRAME.leafLineWidth);
    });
  });

  it('should tell the leaf lines from the paper they are ruled on', () => {
    const root = pages();

    const block = StyleSheet.flatten(byTestId(root, 'book-pages-block')[0].props.style);
    const leaf = StyleSheet.flatten(byTestId(root, 'book-pages-leaf')[0].props.style);

    expect(leaf.borderColor).not.toBe(block.borderColor);
  });

  it("should shade the cover's lip where it meets the pages", () => {
    const expected = bookPagesGeometry(200, 15);

    const underTest = StyleSheet.flatten(byTestId(pages(), 'book-pages-lip')[0].props.style);

    expect(underTest.top).toBe(expected.lip.inset);
    expect(underTest.right).toBe(expected.lip.inset);
    expect(underTest.borderTopRightRadius).toBe(expected.lip.corner);
    expect(underTest.borderRightWidth).toBeGreaterThan(0);
  });

  it("should wrap the back board round the pages, on the cover's own edge and in the spine's colour", () => {
    const expected = bookPagesGeometry(200, 15);

    const underTest = StyleSheet.flatten(byTestId(pages(), 'book-pages-board')[0].props.style);

    expect(underTest.top).toBe(0);
    expect(underTest.bottom).toBe(0);
    expect(underTest.right).toBe(0);
    expect(underTest.borderTopRightRadius).toBe(15);
    expect(underTest.borderBottomRightRadius).toBe(15);
    expect(underTest.borderRightWidth).toBe(expected.rim);
    expect(underTest.borderColor).toBe('#1D2657');
  });

  it('should bind the board in the colour the book is given', () => {
    const { UNSAFE_root } = render(<BookPages width={200} radius={15} boardColor="#402010" />);

    expect(StyleSheet.flatten(byTestId(UNSAFE_root, 'book-pages-board')[0].props.style).borderColor).toBe('#402010');
  });

  it('should be drawn at the size it will be seen at when the book is carried up to its seat, so its curves stay clean', () => {
    const { UNSAFE_root } = render(<BookPages width={90} radius={15} scale={4} />);
    const expected = bookPagesGeometry(360, 15);

    const frame = StyleSheet.flatten(byTestId(UNSAFE_root, 'book-pages')[0].props.style);
    const block = StyleSheet.flatten(byTestId(UNSAFE_root, 'book-pages-block')[0].props.style);

    expect(frame.width).toBe('400%');
    expect(frame.height).toBe('400%');
    expect(frame.transform).toEqual([{ scale: 0.25 }]);
    expect(frame.transformOrigin).toBe('left top');
    expect(block.borderRightWidth).toBe(expected.block);
    expect(block.borderTopRightRadius).toBe(expected.corner);
  });

  it("should keep to the corner the book is seen with, which does not grow as the book is carried up", () => {
    const { UNSAFE_root } = render(<BookPages width={90} radius={15} scale={4} />);

    const underTest = StyleSheet.flatten(byTestId(UNSAFE_root, 'book-pages-board')[0].props.style);

    expect(underTest.borderTopRightRadius).toBe(15);
    expect(underTest.borderBottomRightRadius).toBe(15);
  });

  it('should fill the cover as it is when the book is not scaled', () => {
    const underTest = StyleSheet.flatten(byTestId(pages(), 'book-pages')[0].props.style);

    expect(underTest.width).toBe('100%');
    expect(underTest.height).toBe('100%');
    expect(underTest.transform).toBeUndefined();
  });

  it('should take no touches from the cover beneath it', () => {
    expect(byTestId(pages(), 'book-pages')[0].props.pointerEvents).toBe('none');
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
