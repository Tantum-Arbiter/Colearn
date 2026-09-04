import { STORY_CARD, cardCoverTransform, cardIndexAtOffset, storyCardLayout } from '@/constants/story-card';

const PHONE = { width: 402, height: 874 };
const TABLET = { width: 1194, height: 834 };
const PHONE_INSETS = { top: 59, bottom: 34 };

describe('storyCardLayout', () => {
  it('should sit centred with a side margin on a phone', () => {
    const underTest = storyCardLayout(PHONE, false);

    expect(underTest.width).toBe(PHONE.width - STORY_CARD.sideInset * 2);
    expect(underTest.x + underTest.width / 2).toBeCloseTo(PHONE.width / 2, 0);
  });

  it('should be a card on a tablet, not a page', () => {
    const underTest = storyCardLayout(TABLET, true);

    expect(underTest.width).toBe(STORY_CARD.maxWidth);
    expect(underTest.x + underTest.width / 2).toBeCloseTo(TABLET.width / 2, 0);
  });

  it('should hold a book with the shelf books\' proportions, centred in the cover area', () => {
    const underTest = storyCardLayout(PHONE, false, PHONE_INSETS);

    expect(underTest.book.width / underTest.book.height).toBeCloseTo(STORY_CARD.bookAspect, 1);
    expect(underTest.book.x + underTest.book.width / 2).toBeCloseTo(underTest.x + underTest.width / 2, 0);
    expect(underTest.book.y).toBe(underTest.y + STORY_CARD.bookInset);
    expect(underTest.coverHeight).toBe(underTest.book.height + STORY_CARD.bookInset * 2);
  });

  it('should rise from the bottom of the screen, clear of the home indicator', () => {
    const underTest = storyCardLayout(PHONE, false, PHONE_INSETS);

    expect(underTest.y + underTest.height).toBe(PHONE.height - PHONE_INSETS.bottom - STORY_CARD.bottomGap);
  });

  it('should keep clear of the status bar on a short screen by giving up cover height', () => {
    const shortScreen = { width: 402, height: 560 };

    const underTest = storyCardLayout(shortScreen, false, PHONE_INSETS);

    expect(underTest.y).toBeGreaterThanOrEqual(PHONE_INSETS.top + STORY_CARD.topGap);
    expect(underTest.book.width).toBeLessThan(underTest.width - STORY_CARD.bookInset * 2);
  });

  it('should stand exactly as tall as its cover and body together', () => {
    const underTest = storyCardLayout(PHONE, false, PHONE_INSETS);

    expect(underTest.height).toBe(underTest.coverHeight + STORY_CARD.bodyHeight.phone);
  });

  it('should advance the carousel by one card and its gap', () => {
    const underTest = storyCardLayout(PHONE, false);

    expect(underTest.step).toBe(underTest.width + STORY_CARD.gap);
    expect(underTest.edgePadding).toBe(underTest.x);
  });
});

describe('cardCoverTransform', () => {
  const layout = storyCardLayout(PHONE, false);
  const LANDSCAPE_TILE = { x: 16, y: 300, width: 370, height: 210 };
  const PORTRAIT_TILE = { x: 16, y: 600, width: 110, height: 170 };

  it.each([
    ['a wide featured tile', LANDSCAPE_TILE],
    ['a tall shelf tile', PORTRAIT_TILE],
  ])('should land %s centred on the card\'s book', (_case, tile) => {
    const underTest = cardCoverTransform(layout, tile);

    expect(tile.x + tile.width / 2 + underTest.moveX).toBeCloseTo(layout.book.x + layout.book.width / 2, 5);
    expect(tile.y + tile.height / 2 + underTest.moveY).toBeCloseTo(layout.book.y + layout.book.height / 2, 5);
  });

  it.each([
    ['a wide featured tile', LANDSCAPE_TILE],
    ['a tall shelf tile', PORTRAIT_TILE],
  ])('should keep %s inside the card\'s book', (_case, tile) => {
    const underTest = cardCoverTransform(layout, tile).rect;

    expect(underTest.x).toBeGreaterThanOrEqual(layout.book.x - 0.01);
    expect(underTest.x + underTest.width).toBeLessThanOrEqual(layout.book.x + layout.book.width + 0.01);
    expect(underTest.y).toBeGreaterThanOrEqual(layout.book.y - 0.01);
    expect(underTest.y + underTest.height).toBeLessThanOrEqual(layout.book.y + layout.book.height + 0.01);
  });

  it('should fill the card\'s book exactly when the shelf book has the same shape', () => {
    const shelfBook = { x: 16, y: 300, width: 160, height: 100 };

    const underTest = cardCoverTransform(layout, shelfBook).rect;

    expect(underTest.width).toBeCloseTo(layout.book.width, 0);
    expect(underTest.height).toBeCloseTo(layout.book.height, 0);
  });
});

describe('cardIndexAtOffset', () => {
  it('should round to the nearest card', () => {
    expect(cardIndexAtOffset(0, 372, 5)).toBe(0);
    expect(cardIndexAtOffset(372 * 2 + 100, 372, 5)).toBe(2);
    expect(cardIndexAtOffset(372 * 2 + 200, 372, 5)).toBe(3);
  });

  it('should never point past either end of the shelf', () => {
    expect(cardIndexAtOffset(-500, 372, 5)).toBe(0);
    expect(cardIndexAtOffset(372 * 40, 372, 5)).toBe(4);
    expect(cardIndexAtOffset(300, 372, 0)).toBe(0);
  });
});
