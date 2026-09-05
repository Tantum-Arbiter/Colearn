/**
 * Tests for the book-opening choreography.
 *
 * Opening a story is a small ritual, not a cut: the floating book settles,
 * the cover lifts, there is a breath with the first page showing, the book
 * grows to fill the screen, and the live reader dissolves in on top. On a
 * phone the screen also has to turn, which happens behind a veil with the
 * book re-entering afterwards rather than jumping.
 */

import { STORY_DETAIL_OPENING, STORY_OPENING, STORY_SKETCH, bookOutlinePath, needsGuidedTurn, openingSeat, placementIsStale, seatTransform, coverFaceOpacity, openBookGrowScale, sketchDashOffset, storyOpeningTimeline, storySketchTimeline, type OpeningStepName } from '@/constants/story-opening';

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

describe('coverFaceOpacity', () => {
  const PAST_THE_SPINE = 90 / STORY_OPENING.coverLiftDegrees + 0.01;

  it('should show the printed face while the cover still faces the child', () => {
    const underTest = coverFaceOpacity(0.2);

    expect(underTest.front).toBe(1);
    expect(underTest.back).toBe(0);
  });

  it('should turn to the back of the cover once it has swung past the spine', () => {
    const underTest = coverFaceOpacity(PAST_THE_SPINE);

    expect(underTest.front).toBe(0);
    expect(underTest.back).toBe(1);
  });

  it('should hold the opened cover rather than dissolving it away', () => {
    // It used to fade out over the last 40% of the lift, so the cover had gone
    // by the time the book grew to fill the screen. It stays now: the book
    // holds open and zooms in with its cover still on it.
    const underTest = coverFaceOpacity(1);

    expect(underTest.back).toBe(1);
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

describe('tile to card', () => {
  it('should have the shadow settled by the time the card has risen', () => {
    expect(STORY_DETAIL_OPENING.groundFadeMs).toBeLessThanOrEqual(STORY_DETAIL_OPENING.sheetRiseMs);
  });

  it('should be over well within a second, buttons included', () => {
    const { sheetRiseMs, staggerMs, contentMs } = STORY_DETAIL_OPENING;

    const underTest = Math.max(sheetRiseMs, 2 * staggerMs + contentMs);

    expect(underTest).toBeLessThan(700);
  });
});

describe('storySketchTimeline', () => {
  const underTest = storySketchTimeline();

  it('should hold off until the card is out of view, so the pen starts on a clear screen', () => {
    expect(underTest.draw.at).toBe(STORY_DETAIL_OPENING.sheetSinkMs + STORY_SKETCH.afterCardMs);
  });

  it('should leave a real beat between the card leaving and the first mark', () => {
    expect(STORY_SKETCH.afterCardMs).toBeGreaterThanOrEqual(250);
  });

  it('should show the cover only once the whole outline has been drawn', () => {
    expect(underTest.cover.at).toBe(underTest.draw.ends);
  });

  it('should fade the drawn line only after the cover has begun to appear', () => {
    expect(underTest.strokeOut.at).toBeGreaterThan(underTest.cover.at);
    expect(underTest.strokeOut.at).toBeLessThan(underTest.cover.ends);
  });

  it('should give the outline long enough to read as a line being drawn', () => {
    expect(underTest.draw.over).toBeGreaterThanOrEqual(400);
  });

  it('should still be brief enough that the book is never kept waiting', () => {
    expect(underTest.total).toBe(Math.max(underTest.cover.ends, underTest.strokeOut.ends));
    expect(underTest.total).toBeLessThanOrEqual(1600);
  });
});

describe('bookOutlinePath', () => {
  const RECT = { x: 100, y: 200, width: 300, height: 180 };
  const RADIUS = 15;
  const SPINE = 20;

  it('should draw the spine first, upwards, so the pen starts on an empty screen', () => {
    const underTest = bookOutlinePath(RECT, RADIUS, SPINE);

    expect(underTest.d.startsWith(`M ${RECT.x + SPINE} ${RECT.y + RECT.height} L ${RECT.x + SPINE} ${RECT.y}`)).toBe(true);
  });

  it('should close the loop where the spine began, so the pen never doubles back', () => {
    const underTest = bookOutlinePath(RECT, RADIUS, SPINE);

    expect(underTest.d.endsWith(`L ${RECT.x + SPINE} ${RECT.y}`)).toBe(true);
  });

  it('should measure the cover all the way round plus the spine down it', () => {
    const underTest = bookOutlinePath(RECT, RADIUS, SPINE);

    const straights = 2 * (RECT.width - 2 * RADIUS) + 2 * (RECT.height - 2 * RADIUS);
    const corners = 2 * Math.PI * RADIUS;
    expect(underTest.length).toBeCloseTo(straights + corners + RECT.height, 5);
  });

  it('should round every corner of the cover', () => {
    const underTest = bookOutlinePath(RECT, RADIUS, SPINE);

    expect(underTest.d.match(/A /g)?.length).toBe(4);
  });

  it('should keep a narrow spine clear of the corner, where the top edge is not yet straight', () => {
    const underTest = bookOutlinePath(RECT, RADIUS, 6);

    expect(underTest.d.startsWith(`M ${RECT.x + RADIUS} ${RECT.y + RECT.height}`)).toBe(true);
  });

  it('should never ask for a corner rounder than the book is tall', () => {
    const underTest = bookOutlinePath({ x: 0, y: 0, width: 100, height: 20 }, RADIUS, SPINE);

    expect(underTest.d).toContain('A 10 10');
    expect(underTest.length).toBeCloseTo(2 * 80 + 2 * Math.PI * 10 + 20, 5);
  });
});

describe('the sketch, in relation to the card', () => {
  it('should give the card a sink the sketch can time itself against', () => {
    expect(STORY_DETAIL_OPENING.sheetSinkMs).toBeGreaterThan(0);
  });

  it('should draw the outline in a visible line', () => {
    expect(STORY_SKETCH.strokeWidth).toBeGreaterThanOrEqual(2);
  });
});

describe('sketchDashOffset', () => {
  const LENGTH = 400;

  it('should hide the whole line before the drawing starts', () => {
    const underTest = sketchDashOffset(LENGTH, 0);

    expect(underTest).toBe(LENGTH);
  });

  it('should show the whole line once the drawing is done', () => {
    const underTest = sketchDashOffset(LENGTH, 1);

    expect(underTest).toBe(0);
  });

  it('should uncover the line evenly as the drawing runs', () => {
    const underTest = sketchDashOffset(LENGTH, 0.25);

    expect(underTest).toBe(300);
  });
});


describe('SKETCH_DRAW_CURVE', () => {
  function easing([x1, y1, x2, y2]: readonly [number, number, number, number]) {
    const axis = (t: number, a: number, b: number) =>
      3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;

    return (x: number) => {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 50; i += 1) {
        const mid = (lo + hi) / 2;
        if (axis(mid, x1, x2) < x) lo = mid;
        else hi = mid;
      }
      return axis((lo + hi) / 2, y1, y2);
    };
  }

  const FRAMES = 29;
  const ease = easing(STORY_SKETCH.drawCurve);
  const steps = Array.from({ length: FRAMES }, (_, i) => ease((i + 1) / FRAMES) - ease(i / FRAMES));
  const mean = steps.reduce((sum, step) => sum + step, 0) / steps.length;

  it('should never lurch: no frame lays down much more line than the frames around it', () => {
    // The defect this pins: an in-out cubic peaks at nearly three times the
    // average pace, and over a draw this short a single frame put down 39% of
    // the whole outline. The line crawled, leapt, and glided to a halt.
    const underTest = Math.max(...steps) / mean;

    expect(underTest).toBeLessThan(1.35);
  });

  it('should never stall or reverse', () => {
    const underTest = Math.min(...steps) / mean;

    expect(underTest).toBeGreaterThan(0.25);
  });

  it('should start promptly, the way a pen does rather than creeping into motion', () => {
    const underTest = steps[0] / mean;

    expect(underTest).toBeGreaterThan(0.45);
  });

  it('should settle rather than stop dead', () => {
    const underTest = steps[steps.length - 1] / mean;

    expect(underTest).toBeLessThan(0.6);
  });
});


describe('openBookGrowScale', () => {
  const TABLET = { width: 834, height: 1210 };
  const PHONE_LANDSCAPE = { width: 874, height: 402 };
  const BOOK = { width: 384, height: 250 };

  it('should carry the book out to the sides of the screen', () => {
    const underTest = openBookGrowScale(TABLET, BOOK);

    expect(BOOK.width * underTest).toBeCloseTo(TABLET.width, 5);
  });

  it('should never push the spread out of view, whatever the screen shape', () => {
    // The defect this pins: the grow took the larger of the two ratios, which
    // filled the screen by cropping the book -- the top and bottom of the
    // spread were gone before the reader arrived to cover them.
    const screens = [TABLET, PHONE_LANDSCAPE];

    const underTest = screens.every((screen) => {
      const scale = openBookGrowScale(screen, BOOK);
      return BOOK.width * scale <= screen.width + 0.001 && BOOK.height * scale <= screen.height + 0.001;
    });

    expect(underTest).toBe(true);
  });

  it('should still be a growth from the seat the cover was lifted at', () => {
    const seat = openingSeat(TABLET, { width: 300, height: 200 });

    const underTest = openBookGrowScale(TABLET, seat);

    expect(underTest).toBeGreaterThan(1);
  });
});

describe('going back from the prompt', () => {
  it('should bring the card back in while the book is still scrolling out of view', () => {
    // The two overlap: the card rises over the book as it leaves, rather than
    // the child watching the book go and then waiting for the card.
    const underTest = STORY_DETAIL_OPENING.cardReturnsAt;

    expect(underTest).toBeGreaterThan(0);
    expect(underTest).toBeLessThan(STORY_DETAIL_OPENING.sheetSinkMs);
  });
});
