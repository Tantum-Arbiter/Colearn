/**
 * The three stat orbs under the Learning Journey card -- the streak, the
 * week's reading and the badges unlocked. These are the numbers that size
 * them for the screen, stand the words inside the glass, and keep the motion
 * slight.
 */

import {
  STAT_ORB,
  STAT_ORB_ORDER,
  STAT_ORB_TINTS,
  statOrbDiameter,
  statOrbFloatDelay,
  statOrbRowHeight,
  statOrbRowWidth,
} from '@/constants/stat-orbs';

const PHONE = { screen: 402, content: 370 };
const SMALL_PHONE = { screen: 375, content: 343 };
const TABLET = { screen: 834, content: 500 };
const CLOUD_OVERHANG = 0.14;

describe('STAT_ORB_ORDER', () => {
  it('should read streak, the story to carry on with, badges, left to right', () => {
    expect(STAT_ORB_ORDER).toEqual(['streak', 'continue', 'badges']);
  });
});

describe('statOrbDiameter', () => {
  it.each([PHONE, SMALL_PHONE, TABLET])('should fit three orbs and their clouds across a $screen-point screen', ({ screen, content }) => {
    const diameter = statOrbDiameter(content);

    expect(statOrbRowWidth(diameter, 3) + diameter * CLOUD_OVERHANG * 2).toBeLessThanOrEqual(screen);
  });

  it('should grow with the room it is given, between a floor and a ceiling', () => {
    expect(statOrbDiameter(TABLET.content)).toBeGreaterThan(statOrbDiameter(PHONE.content));
    expect(statOrbDiameter(200)).toBe(STAT_ORB.smallest);
    expect(statOrbDiameter(2000)).toBe(STAT_ORB.largest);
  });

  it('should stay small on a phone: well under a quarter of the card it sits under', () => {
    expect(statOrbDiameter(PHONE.content)).toBeLessThanOrEqual(86);
  });

  it('should be a whole number of points, so the art sits on the pixel grid', () => {
    expect(Number.isInteger(statOrbDiameter(PHONE.content))).toBe(true);
  });

  it.each([0, -10, Number.NaN])('should fall back to the smallest orb for a width of %s', (width) => {
    expect(statOrbDiameter(width)).toBe(STAT_ORB.smallest);
  });
});

describe('statOrbRowWidth', () => {
  it('should stand the orbs a little apart, as in the mock', () => {
    expect(statOrbRowWidth(100, 3)).toBe(300 + 2 * 100 * STAT_ORB.gap);
    expect(statOrbRowWidth(100, 2)).toBe(200 + 100 * STAT_ORB.gap);
    expect(STAT_ORB.gap).toBeGreaterThan(0);
  });
});

describe('the space between the orbs', () => {
  it('should stand them clear of each other by about a quarter of an orb', () => {
    expect(STAT_ORB.gap).toBeGreaterThanOrEqual(0.24);
  });

  it.each([PHONE, SMALL_PHONE, TABLET])('should still keep the row inside the card width on a $screen-point screen', ({ content }) => {
    expect(statOrbRowWidth(statOrbDiameter(content), 3)).toBeLessThanOrEqual(content);
  });
});

describe('statOrbRowHeight', () => {
  it('should leave room for the glow above the glass and the clouds at its foot', () => {
    expect(statOrbRowHeight(100)).toBe(100 * (1 + STAT_ORB.headroom + STAT_ORB.footroom));
    expect(STAT_ORB.headroom).toBeGreaterThan(0);
    expect(STAT_ORB.footroom).toBeGreaterThan(0);
  });
});

describe('the words inside the glass', () => {
  it('should start every number at the same height, low in the glass under the picture', () => {
    expect(STAT_ORB.words.top).toBeGreaterThanOrEqual(0.5);
  });

  // operator, 2026-10-04: "lower the text and increase the size of it all in the orbs", then
  // "increase the size of the day streak text etc on other orbs too"
  it('should write the numbers and the words under them bigger than the cuts before', () => {
    expect(STAT_ORB.number.size).toBeGreaterThanOrEqual(0.25);
    expect(STAT_ORB.label.size).toBeGreaterThanOrEqual(0.17);
  });

  it('should make the number the biggest thing', () => {
    expect(STAT_ORB.number.size).toBeGreaterThanOrEqual(STAT_ORB.label.size * 1.4);
  });

  it('should set every word under a number on the line of the middle orb\'s word, inside the glass', () => {
    const lineUnderNumber = STAT_ORB.words.top + STAT_ORB.number.size * 1.19 - STAT_ORB.label.tuck;

    expect(lineUnderNumber).toBeCloseTo(STAT_ORB.caption.top, 1);
    expect(lineUnderNumber).toBeGreaterThanOrEqual(0.68);
    expect(lineUnderNumber + STAT_ORB.label.size * 1.2).toBeLessThanOrEqual(0.92);
  });

  it('should write every word under a number at one size, invitations included', () => {
    expect(STAT_ORB.invite.size).toBe(STAT_ORB.label.size);
  });

  it('should fit four digits on the glass without shrinking them, so every number is one size', () => {
    const roundedDigit = 0.62;

    expect(4 * roundedDigit * STAT_ORB.number.size).toBeLessThanOrEqual(STAT_ORB.number.width);
  });

  it('should let the words spread over the clouds at the foot of the orb rather than shrink, inside its art', () => {
    [STAT_ORB.label.width, STAT_ORB.invite.width].forEach((width) => {
      expect(width).toBeGreaterThanOrEqual(0.88);
      expect(width).toBeLessThanOrEqual(0.92);
    });
  });

  it('should write the words big enough for a parent to read at a glance on a phone', () => {
    expect(statOrbDiameter(PHONE.content) * STAT_ORB.label.size).toBeGreaterThanOrEqual(10.5);
  });

  it('should write the words bigger than the first cut, about an eighth of the orb', () => {
    expect(STAT_ORB.label.size).toBeGreaterThanOrEqual(0.125);
  });

  it("should set the middle orb's word under its bookmark, inside the glass", () => {
    const { width, aspect, top } = STAT_ORB.bookmark;

    expect(STAT_ORB.caption.top).toBeGreaterThanOrEqual(top + width * aspect);
    expect(STAT_ORB.caption.top + STAT_ORB.label.size * 1.3).toBeLessThanOrEqual(0.92);
  });
});

describe('the bookmark clipped to a cover', () => {
  const { width, top, right } = STAT_ORB.bookmark.corner;
  const height = width * STAT_ORB.bookmark.aspect;
  const left = 1 - right - width;
  const fromCentre = (x: number, y: number) => Math.hypot(x - 0.5, y - 0.5);

  it('should sit in the top right of the orb, its head on the rim', () => {
    expect(left).toBeGreaterThan(0.5);
    expect(top + height).toBeLessThan(0.5);
    expect(fromCentre(left + width / 2, top)).toBeGreaterThan(0.49);
    expect(fromCentre(left + width / 2, top)).toBeLessThan(0.56);
  });

  it('should hang over the cover, not off the orb', () => {
    expect(fromCentre(left + width / 2, top + height)).toBeLessThan(0.4);
    expect(fromCentre(1 - right, top)).toBeLessThan(0.62);
  });

  // operator, 2026-10-04: "increase its size" -- up from a quarter of the orb
  it('should be about a third of the orb, no bigger than the bookmark standing alone, and end above Continue', () => {
    expect(width).toBeGreaterThanOrEqual(0.3);
    expect(width).toBeLessThanOrEqual(STAT_ORB.bookmark.width);
    expect(top + height).toBeLessThan(STAT_ORB.caption.top);
  });
});

describe('the bookmark in the middle orb', () => {
  it('should stand inside the glass, clear of the clouds at its foot', () => {
    const { width, aspect, top } = STAT_ORB.bookmark;

    expect(width).toBeGreaterThan(0.25);
    expect(width).toBeLessThanOrEqual(0.4);
    expect(top + width * aspect).toBeLessThanOrEqual(0.72);
    expect(top).toBeGreaterThanOrEqual(0.12);
  });

  it('should be taller than it is wide, as a bookmark is', () => {
    expect(STAT_ORB.bookmark.aspect).toBeGreaterThan(1);
  });

  it('should end above the invitation to read when there is nothing to continue, and stay a fair size', () => {
    const { inviting, aspect } = STAT_ORB.bookmark;

    expect(inviting.top + inviting.width * aspect).toBeLessThanOrEqual(STAT_ORB.invite.top);
    expect(inviting.width).toBeGreaterThanOrEqual(0.28);
    expect(inviting.width).toBeLessThan(STAT_ORB.bookmark.width);
  });

  it('should keep a two-line invitation inside the glass, above its foot', () => {
    expect(STAT_ORB.invite.top + STAT_ORB.invite.size * 1.2 * 2).toBeLessThanOrEqual(0.92);
  });
});

describe('the cover in the Continue orb', () => {
  it('should fill the whole glass, centred, its edge tucked under the rim drawn in front of it', () => {
    expect(STAT_ORB.cover.centre).toBe(0.5);
    expect(STAT_ORB.cover.size).toBeGreaterThanOrEqual(0.88);
    expect(STAT_ORB.cover.size).toBeLessThanOrEqual(0.93);
  });

  it('should shade the foot of the cover and leave its top clear', () => {
    const alpha = (colour: string) => Number(colour.match(/([\d.]+)\)$/)?.[1]);

    expect(alpha(STAT_ORB_TINTS.coverShade[0])).toBe(0);
    expect(alpha(STAT_ORB_TINTS.coverShade[1])).toBeGreaterThanOrEqual(0.55);
  });
});

describe('the float', () => {
  it('should be slight: a couple of points of rise and a few per cent of swell', () => {
    expect(statOrbDiameter(PHONE.content) * STAT_ORB.float.rise).toBeLessThanOrEqual(4);
    expect(STAT_ORB.float.rise).toBeGreaterThan(0);
    expect(STAT_ORB.float.scale).toBeGreaterThan(1);
    expect(STAT_ORB.float.scale).toBeLessThanOrEqual(1.04);
  });

  it('should be slow, a breath rather than a bounce', () => {
    expect(STAT_ORB.float.ms).toBeGreaterThanOrEqual(3000);
  });

  it('should set the orbs off one after another, so they do not bob as one block', () => {
    expect(statOrbFloatDelay(0)).toBe(0);
    expect(statOrbFloatDelay(1)).toBe(STAT_ORB.float.staggerMs);
    expect(statOrbFloatDelay(2)).toBe(STAT_ORB.float.staggerMs * 2);
    expect(STAT_ORB.float.staggerMs).toBeGreaterThan(0);
    expect(STAT_ORB.float.staggerMs * 2).toBeLessThan(STAT_ORB.float.ms);
  });
});
