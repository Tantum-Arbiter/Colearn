/**
 * The story card: a compact sheet that floats over the dimmed shelf when a
 * tile is tapped, with the cover on top and the ways to read beneath. The
 * child can swipe between books without leaving it, and choosing a way to
 * read opens the book from right there.
 */
export const STORY_CARD = {
  /** Widest the card ever gets, so a tablet shows a card rather than a page. */
  maxWidth: 520,
  /** Side margin on a phone; on a tablet the cap wins and the card sits centred. */
  sideInset: 22,
  /** Cover height as a fraction of card width: a landscape picture book spread. */
  coverAspect: 0.6,
  /** Where the top of the card sits, as a fraction of the screen height. */
  topRatio: { phone: 0.09, tablet: 0.13 },
  /** Gap between cards in the carousel. */
  gap: 14,
  radius: 28,
} as const;

export interface StoryCardLayout {
  x: number;
  y: number;
  width: number;
  coverHeight: number;
  /** Distance the carousel advances per card. */
  step: number;
  /** Horizontal padding that keeps the first and last card centred. */
  edgePadding: number;
}

export function storyCardLayout(
  screen: { width: number; height: number },
  isTablet: boolean
): StoryCardLayout {
  const width = Math.min(STORY_CARD.maxWidth, screen.width - STORY_CARD.sideInset * 2);
  const x = Math.round((screen.width - width) / 2);
  const y = Math.round(screen.height * (isTablet ? STORY_CARD.topRatio.tablet : STORY_CARD.topRatio.phone));

  return {
    x,
    y,
    width,
    coverHeight: Math.round(width * STORY_CARD.coverAspect),
    step: width + STORY_CARD.gap,
    edgePadding: x,
  };
}

/**
 * The transform that carries a tapped tile onto the card's cover: centred on
 * it and scaled to fit inside it, so a tile of any shape lands within the
 * cover and nothing spills over the card's edge while it flies.
 */
export function cardCoverTransform(
  layout: StoryCardLayout,
  tile: { x: number; y: number; width: number; height: number }
): { moveX: number; moveY: number; scale: number; rect: { x: number; y: number; width: number; height: number } } {
  const scale = Math.min(layout.width / tile.width, layout.coverHeight / tile.height);
  const width = tile.width * scale;
  const height = tile.height * scale;
  const centreX = layout.x + layout.width / 2;
  const centreY = layout.y + layout.coverHeight / 2;

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
