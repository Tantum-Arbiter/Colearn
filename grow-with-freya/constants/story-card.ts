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
  /** Side margin on a phone -- wide enough that the neighbours plainly show,
   *  not a sliver: what shows of each is this less the gap. */
  sideInset: 48,
  /** Cover height as a fraction of card width: a wide picture book spread. */
  coverAspect: 0.52,
  /** Height of everything beneath the cover, sized to what it holds at the
   *  default type size -- on a phone, two rows of chips and three buttons;
   *  larger type scrolls within it. */
  bodyHeight: { phone: 352, tablet: 350 },
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
  const coverHeight = Math.round(Math.max(0, Math.min(width * STORY_CARD.coverAspect, tallestCover)));
  const height = coverHeight + bodyHeight;

  return {
    x,
    y: Math.round(bottom - height),
    width,
    height,
    coverHeight,
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
