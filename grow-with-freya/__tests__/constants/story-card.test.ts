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

  it('should give the cover the proportions of a picture book spread', () => {
    const underTest = storyCardLayout(PHONE, false, PHONE_INSETS);

    expect(underTest.coverHeight / underTest.width).toBeCloseTo(STORY_CARD.coverAspect, 2);
  });

  it('should rise from the bottom of the screen, clear of the home indicator', () => {
    const underTest = storyCardLayout(PHONE, false, PHONE_INSETS);

    expect(underTest.y + underTest.height).toBe(PHONE.height - PHONE_INSETS.bottom - STORY_CARD.bottomGap);
  });

  it('should keep clear of the status bar on a short screen by giving up cover height', () => {
    const shortScreen = { width: 402, height: 560 };

    const underTest = storyCardLayout(shortScreen, false, PHONE_INSETS);

    expect(underTest.y).toBeGreaterThanOrEqual(PHONE_INSETS.top + STORY_CARD.topGap);
    expect(underTest.coverHeight).toBeLessThan(underTest.width * STORY_CARD.coverAspect);
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
  ])('should land %s centred on the cover', (_case, tile) => {
    const underTest = cardCoverTransform(layout, tile);

    expect(tile.x + tile.width / 2 + underTest.moveX).toBeCloseTo(layout.x + layout.width / 2, 5);
    expect(tile.y + tile.height / 2 + underTest.moveY).toBeCloseTo(layout.y + layout.coverHeight / 2, 5);
  });

  it.each([
    ['a wide featured tile', LANDSCAPE_TILE],
    ['a tall shelf tile', PORTRAIT_TILE],
  ])('should keep %s inside the cover so nothing spills over the card', (_case, tile) => {
    const underTest = cardCoverTransform(layout, tile).rect;

    expect(underTest.x).toBeGreaterThanOrEqual(layout.x - 0.01);
    expect(underTest.x + underTest.width).toBeLessThanOrEqual(layout.x + layout.width + 0.01);
    expect(underTest.y).toBeGreaterThanOrEqual(layout.y - 0.01);
    expect(underTest.y + underTest.height).toBeLessThanOrEqual(layout.y + layout.coverHeight + 0.01);
  });

  it('should fill the cover along the limiting side', () => {
    const underTest = cardCoverTransform(layout, LANDSCAPE_TILE).rect;

    const fillsWidth = Math.abs(underTest.width - layout.width) < 0.01;
    const fillsHeight = Math.abs(underTest.height - layout.coverHeight) < 0.01;
    expect(fillsWidth || fillsHeight).toBe(true);
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

describe('the shelf either side of the card', () => {
  it('should let the neighbouring cards show well past the chosen one, not as a sliver', () => {
    // The defect this pins: a 30pt side margin less the 14pt gap left 16pt of
    // each neighbour showing, which was hard to see at all. A swipe should be
    // an invitation the child can see.
    const underTest = STORY_CARD.sideInset - STORY_CARD.gap;

    expect(underTest).toBeGreaterThanOrEqual(30);
  });

  it('should size the body to what it holds: two rows of chips and three buttons, and no blank foot', () => {
    // At the default type size the body holds the title, a row of meta, two
    // lines of description, the theme chips and three ways to read. On a phone
    // four chips wrap to a second row, and with Record a button like the other
    // two that comes to a little over 350pt; 322pt cut Record off at the foot,
    // and the old 374pt left an empty band beneath it.
    expect(STORY_CARD.bodyHeight.phone).toBeGreaterThanOrEqual(350);
    expect(STORY_CARD.bodyHeight.phone).toBeLessThanOrEqual(360);
    // tablet type scales up, but its wider card keeps the chips to one row
    expect(STORY_CARD.bodyHeight.tablet).toBeLessThanOrEqual(STORY_CARD.bodyHeight.phone + 30);
  });
});
