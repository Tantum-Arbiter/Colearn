/**
 * Tests for the book-opening choreography.
 *
 * Opening a story is a small ritual, not a cut: the floating book settles,
 * the cover lifts, there is a breath with the first page showing, the book
 * grows to fill the screen, and the live reader dissolves in on top. On a
 * phone the screen also has to turn, which happens behind a veil with the
 * book re-entering afterwards rather than jumping.
 */

import { STORY_DETAIL_OPENING, STORY_OPENING, heroFadeDelay, needsGuidedTurn, openingSeat, placementIsStale, seatTransform, storyOpeningTimeline, type OpeningStepName } from '@/constants/story-opening';

function names(needsRotation: boolean): OpeningStepName[] {
  return storyOpeningTimeline(needsRotation).steps.map((step) => step.name);
}

describe('storyOpeningTimeline', () => {
  it('should open a tablet book by settling, lifting the cover, breathing, growing and dissolving', () => {
    const underTest = names(false);

    expect(underTest).toEqual(['settle', 'coverLift', 'hold', 'grow', 'dissolve']);
  });

  it('should turn a phone behind a veil and bring the book back before lifting the cover', () => {
    const underTest = names(true);

    expect(underTest).toEqual(['settle', 'veilIn', 'turn', 'reenter', 'coverLift', 'hold', 'grow', 'dissolve']);
  });

  it.each([false, true])('should never cut: every step takes time (needsRotation=%s)', (needsRotation) => {
    const underTest = storyOpeningTimeline(needsRotation).steps.every((step) => step.duration > 0);

    expect(underTest).toBe(true);
  });

  it.each([false, true])('should run its steps back to back with no gaps (needsRotation=%s)', (needsRotation) => {
    const { steps } = storyOpeningTimeline(needsRotation);

    const underTest = steps.every((step, index) =>
      index === 0 ? step.at === 0 : step.at === steps[index - 1].at + steps[index - 1].duration
    );

    expect(underTest).toBe(true);
  });

  it('should mount the live reader while the first page is showing, before the book grows', () => {
    const { steps, readerMountsAt } = storyOpeningTimeline(false);
    const hold = steps.find((step) => step.name === 'hold')!;
    const grow = steps.find((step) => step.name === 'grow')!;

    expect(readerMountsAt).toBe(hold.at);
    expect(readerMountsAt).toBeLessThan(grow.at);
  });

  it('should give the cover long enough to read as a book opening, not a flicker', () => {
    const underTest = STORY_OPENING.coverLiftMs;

    expect(underTest).toBeGreaterThanOrEqual(450);
  });

  it('should keep a tablet opening under two seconds', () => {
    const underTest = storyOpeningTimeline(false).total;

    expect(underTest).toBeLessThan(2000);
  });

  it('should keep a phone opening, turn included, under three seconds', () => {
    const underTest = storyOpeningTimeline(true).total;

    expect(underTest).toBeLessThan(3000);
  });

  it('should end on the dissolve so the reader is the last thing to change', () => {
    const { steps } = storyOpeningTimeline(true);

    const underTest = steps[steps.length - 1].name;

    expect(underTest).toBe('dissolve');
  });

  it('should bring the book back a touch small and low so it can rise into its seat', () => {
    expect(STORY_OPENING.reenterScale).toBeLessThan(1);
    expect(STORY_OPENING.reenterLift).toBeGreaterThan(0);
  });
});

describe('openingSeat', () => {
  const PHONE_LANDSCAPE = { width: 874, height: 402 };
  const CARD = { width: 300, height: 200 };

  it('should centre the book on the screen', () => {
    const underTest = openingSeat(PHONE_LANDSCAPE, CARD);

    expect(underTest.x + underTest.width / 2).toBeCloseTo(PHONE_LANDSCAPE.width / 2, 5);
    expect(underTest.y + underTest.height / 2).toBeCloseTo(PHONE_LANDSCAPE.height / 2, 5);
  });

  it('should leave room either side of the book', () => {
    const underTest = openingSeat(PHONE_LANDSCAPE, CARD);

    expect(underTest.x).toBeGreaterThan(0);
    expect(underTest.x + underTest.width).toBeLessThan(PHONE_LANDSCAPE.width);
  });

  it('should keep the card\'s own proportions', () => {
    const underTest = openingSeat(PHONE_LANDSCAPE, CARD);

    expect(underTest.width / underTest.height).toBeCloseTo(CARD.width / CARD.height, 5);
    expect(underTest.scale).toBeCloseTo(underTest.width / CARD.width, 5);
  });
});

describe('the cover dissolving as it swings clear', () => {
  it('should start fading only once the cover has swung past the spine', () => {
    const rightAngle = 90 / STORY_OPENING.coverLiftDegrees;

    const underTest = STORY_OPENING.coverFadeFrom;

    expect(underTest).toBeGreaterThanOrEqual(rightAngle);
    expect(underTest).toBeLessThan(1);
  });
});

describe('needsGuidedTurn', () => {
  const PHONE_PORTRAIT = { isTablet: false, width: 402, height: 874 };
  const PHONE_LANDSCAPE = { isTablet: false, width: 874, height: 402 };
  const TABLET_PORTRAIT = { isTablet: true, width: 834, height: 1194 };
  const TABLET_LANDSCAPE = { isTablet: true, width: 1194, height: 834 };

  it('should ask a phone held upright, whose screen cannot follow the device', () => {
    const underTest = needsGuidedTurn(PHONE_PORTRAIT);

    expect(underTest).toBe(true);
  });

  it('should not ask a phone that is already sideways', () => {
    const underTest = needsGuidedTurn(PHONE_LANDSCAPE);

    expect(underTest).toBe(false);
  });

  it.each([
    ['upright', TABLET_PORTRAIT],
    ['sideways', TABLET_LANDSCAPE],
  ])('should never ask a tablet held %s, since a child may turn it whenever they like', (_held, device) => {
    const underTest = needsGuidedTurn(device);

    expect(underTest).toBe(false);
  });

  it('should judge a tablet by what it is, not by how big its screen happens to be', () => {
    const underTest = needsGuidedTurn({ isTablet: true, width: 402, height: 874 });

    expect(underTest).toBe(false);
  });
});

describe('placementIsStale', () => {
  const PORTRAIT = { width: 402, height: 874 };
  const LANDSCAPE = { width: 874, height: 402 };

  it('should hold on the screen the book was placed against', () => {
    const underTest = placementIsStale(PORTRAIT, PORTRAIT);

    expect(underTest).toBe(false);
  });

  it('should not survive the child turning the phone', () => {
    const underTest = placementIsStale(PORTRAIT, LANDSCAPE);

    expect(underTest).toBe(true);
  });

  it('should treat a book that was never placed as needing one', () => {
    const underTest = placementIsStale(null, PORTRAIT);

    expect(underTest).toBe(true);
  });

  it('should notice a screen that changed on only one side', () => {
    const underTest = placementIsStale(PORTRAIT, { width: 402, height: 800 });

    expect(underTest).toBe(true);
  });
});

describe('seatTransform', () => {
  const CARD = { x: 20, y: 300, width: 300, height: 200 };
  const PORTRAIT = { width: 402, height: 874 };
  const LANDSCAPE = { width: 874, height: 402 };

  it.each([
    ['upright', PORTRAIT],
    ['sideways', LANDSCAPE],
  ])('should carry the card to the centre of a phone held %s', (_held, screen) => {
    const underTest = seatTransform(screen, CARD);

    expect(CARD.x + CARD.width / 2 + underTest.moveX).toBeCloseTo(screen.width / 2, 5);
    expect(CARD.y + CARD.height / 2 + underTest.moveY).toBeCloseTo(screen.height / 2, 5);
  });

  it('should keep the book at the centre of whichever screen it is on across a turn', () => {
    const before = seatTransform(PORTRAIT, CARD);
    const after = seatTransform(LANDSCAPE, CARD);

    const centreBefore = { x: CARD.x + CARD.width / 2 + before.moveX, y: CARD.y + CARD.height / 2 + before.moveY };
    const centreAfter = { x: CARD.x + CARD.width / 2 + after.moveX, y: CARD.y + CARD.height / 2 + after.moveY };

    expect(centreBefore).toEqual({ x: PORTRAIT.width / 2, y: PORTRAIT.height / 2 });
    expect(centreAfter).toEqual({ x: LANDSCAPE.width / 2, y: LANDSCAPE.height / 2 });
  });

  it('should describe the same seat the opening uses', () => {
    const seat = openingSeat(LANDSCAPE, CARD);

    const underTest = seatTransform(LANDSCAPE, CARD);

    expect(underTest.rect).toEqual({ x: seat.x, y: seat.y, width: seat.width, height: seat.height });
    expect(underTest.scale).toBeCloseTo(seat.scale, 5);
  });
});

describe('tile to detail', () => {
  it('should have the sheet rising while the book is still in flight', () => {
    const underTest = STORY_DETAIL_OPENING.sheetMountAt;

    expect(underTest).toBeGreaterThan(0);
    expect(underTest).toBeLessThan(STORY_DETAIL_OPENING.liftMs);
  });

  it('should fade the sheet\'s hero in only once the book has landed', () => {
    const heroStartsAt = STORY_DETAIL_OPENING.sheetMountAt + heroFadeDelay();

    expect(heroStartsAt).toBeGreaterThanOrEqual(STORY_DETAIL_OPENING.liftMs);
  });

  it('should have the sky settled before the book lands', () => {
    expect(STORY_DETAIL_OPENING.skySettleMs).toBeLessThanOrEqual(STORY_DETAIL_OPENING.liftMs);
  });

  it('should be over within a second, buttons included', () => {
    const { sheetMountAt, sheetRiseMs, staggerMs, contentMs } = STORY_DETAIL_OPENING;
    const lastContentSettles = sheetMountAt + Math.max(sheetRiseMs, 3 * staggerMs + contentMs);

    expect(lastContentSettles).toBeLessThan(1000);
  });
});
