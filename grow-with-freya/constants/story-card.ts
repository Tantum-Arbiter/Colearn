/**
 * The story card: a sheet that rises from the bottom of the screen when a
 * tile is tapped, over the shelf left visible but shadowed behind it. The
 * cover sits on top and the ways to read beneath; the child can swipe along
 * the shelf without leaving it, and choosing a way to read opens the book
 * from right there.
 */
export const STORY_CARD = {
  /** Widest the card ever gets, so a tablet shows a card rather than a page. */
  maxWidth: 520,
  /** Side margin on a phone -- wide enough for the neighbours to peek in. */
  sideInset: 30,
  /** The book on the card has the shelf books' proportions: width over height. */
  bookAspect: 1.6,
  /** Margin around the book inside the card's cover area. */
  bookInset: 16,
  /** Height of everything beneath the cover; larger type scrolls within it. */
  bodyHeight: { phone: 374, tablet: 366 },
  /** Gap between the card and the bottom of the safe area. */
  bottomGap: 10,
  /** Room to keep clear beneath the status bar. */
  topGap: 12,
  /** Gap between cards in the carousel. */
  gap: 14,
  radius: 28,
} as const;

export interface StoryCardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  coverHeight: number;
  /** Where the book sits on screen, inside the card's cover area. */
  book: { x: number; y: number; width: number; height: number };
  /** Distance the carousel advances per card. */
  step: number;
  /** Horizontal padding that keeps the first and last card centred. */
  edgePadding: number;
}

export function storyCardLayout(
  screen: { width: number; height: number },
  isTablet: boolean,
  insets: { top: number; bottom: number } = { top: 0, bottom: 0 }
): StoryCardLayout {
  const width = Math.min(STORY_CARD.maxWidth, screen.width - STORY_CARD.sideInset * 2);
  const x = Math.round((screen.width - width) / 2);
  const bodyHeight = isTablet ? STORY_CARD.bodyHeight.tablet : STORY_CARD.bodyHeight.phone;
  const bottom = screen.height - insets.bottom - STORY_CARD.bottomGap;
  const tallestCover = bottom - bodyHeight - insets.top - STORY_CARD.topGap;
  const bookWidthByCard = width - STORY_CARD.bookInset * 2;
  const bookHeightByCard = bookWidthByCard / STORY_CARD.bookAspect;
  const tallestBook = tallestCover - STORY_CARD.bookInset * 2;
  const bookHeight = Math.round(Math.max(0, Math.min(bookHeightByCard, tallestBook)));
  const bookWidth = Math.round(bookHeight * STORY_CARD.bookAspect);
  const coverHeight = bookHeight + STORY_CARD.bookInset * 2;
  const height = coverHeight + bodyHeight;
  const y = Math.round(bottom - height);

  return {
    x,
    y,
    width,
    height,
    coverHeight,
    book: {
      x: x + Math.round((width - bookWidth) / 2),
      y: y + STORY_CARD.bookInset,
      width: bookWidth,
      height: bookHeight,
    },
    step: width + STORY_CARD.gap,
    edgePadding: x,
  };
}

/**
 * The transform that puts the tapped shelf book exactly where the card's book
 * sits: centred on it and scaled to fit inside it. Every book shares one
 * shape, so it fills that rect and the two are indistinguishable.
 */
export function cardCoverTransform(
  layout: StoryCardLayout,
  tile: { x: number; y: number; width: number; height: number }
): { moveX: number; moveY: number; scale: number; rect: { x: number; y: number; width: number; height: number } } {
  const scale = Math.min(layout.book.width / tile.width, layout.book.height / tile.height);
  const width = tile.width * scale;
  const height = tile.height * scale;
  const centreX = layout.book.x + layout.book.width / 2;
  const centreY = layout.book.y + layout.book.height / 2;

  return {
    moveX: centreX - (tile.x + tile.width / 2),
    moveY: centreY - (tile.y + tile.height / 2),
    scale,
    rect: { x: centreX - width / 2, y: centreY - height / 2, width, height },
  };
}

/** Which card the carousel has come to rest on, from its scroll offset. */
export function cardIndexAtOffset(offsetX: number, step: number, count: number): number {
  if (count <= 0 || step <= 0) {
    return 0;
  }

  return Math.min(count - 1, Math.max(0, Math.round(offsetX / step)));
}
