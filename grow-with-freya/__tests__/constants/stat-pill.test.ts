/**
 * A stat orb, tapped, opens out into a pill from where it stands in the row,
 * across the other orbs. These are the numbers that place it, size it, colour
 * its edge to match its orb, and give the jelly its wobble without letting it
 * run off the screen.
 */

import {
  STAT_PILL,
  STAT_PILL_TINTS,
  dampingRatio,
  springOvershoot,
  statPillFrame,
} from '@/constants/stat-pill';
import { STAT_ORB, STAT_ORB_ORDER, statOrbDiameter, statOrbRowWidth } from '@/constants/stat-orbs';
import { HOME_CARDS, homeContentWidth } from '@/constants/home-journey';

const DIAMETER = 84;
const ROW = { x: 53, y: 600, width: statOrbRowWidth(DIAMETER, 3) };

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((value) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);

  return (light + 0.05) / (dark + 0.05);
}

describe('statPillFrame', () => {
  it.each([0, 1, 2])('should start the pill on orb %i, where the row draws it', (index) => {
    expect(statPillFrame(ROW, index, DIAMETER, 370).from).toBeCloseTo(ROW.x + index * (1 + STAT_ORB.gap) * DIAMETER, 5);
  });

  it('should open it centred on the row and as wide as it is given, so it covers every orb', () => {
    const frame = statPillFrame(ROW, 1, DIAMETER, 370);

    expect(frame.width).toBe(370);
    expect(frame.left).toBeCloseTo(ROW.x + ROW.width / 2 - 185, 5);
    expect(frame.left).toBeLessThanOrEqual(ROW.x);
    expect(frame.left + frame.width).toBeGreaterThanOrEqual(ROW.x + ROW.width);
  });

  it('should centre it on the orbs, below the room the row keeps above them', () => {
    expect(statPillFrame(ROW, 0, DIAMETER, 370).centreY).toBeCloseTo(ROW.y + DIAMETER * STAT_ORB.headroom + DIAMETER / 2, 5);
  });
});

describe('the bar', () => {
  it('should settle a little shallower than the orb, so the orb stands proud of it as its end', () => {
    expect(STAT_PILL.barHeight).toBeLessThan(1);
    expect(STAT_PILL.barHeight).toBeGreaterThanOrEqual(0.8);
  });

  it('should squash thinner as it stretches out, then swell back', () => {
    expect(STAT_PILL.squash).toBeLessThan(STAT_PILL.barHeight);
    expect(STAT_PILL.squash).toBeGreaterThan(0.5);
  });

  it('should hold its two lines of words and their tag inside the panel', () => {
    const lines = (STAT_PILL.eyebrow + STAT_PILL.title) * 1.25;

    expect(lines).toBeLessThanOrEqual(STAT_PILL.panel.height);
    expect(STAT_PILL.tag.height).toBeLessThan(STAT_PILL.panel.height - STAT_PILL.eyebrow * 1.25);
    expect(STAT_PILL.medallion).toBeLessThan(STAT_PILL.panel.height);
    expect(STAT_PILL.panel.height).toBeLessThan(1);
  });
});

describe('the jelly', () => {
  it('should wobble: the opening springs overshoot and settle back', () => {
    expect(dampingRatio(STAT_PILL.jelly.edges)).toBeLessThan(1);
    expect(dampingRatio(STAT_PILL.jelly.height)).toBeLessThan(1);
  });

  it('should squash and stretch: the height springs softer than the ends, so the two wobble out of step', () => {
    expect(dampingRatio(STAT_PILL.jelly.height)).toBeLessThan(dampingRatio(STAT_PILL.jelly.edges));
    expect(STAT_PILL.jelly.height.stiffness).toBeLessThan(STAT_PILL.jelly.edges.stiffness);
  });

  it('should stay calm: no spring so loose that it rings on and on', () => {
    expect(dampingRatio(STAT_PILL.jelly.edges)).toBeGreaterThan(0.25);
    expect(dampingRatio(STAT_PILL.jelly.height)).toBeGreaterThan(0.25);
  });

  it('should fold back with less wobble than it opens with', () => {
    expect(dampingRatio(STAT_PILL.jelly.fold)).toBeGreaterThan(dampingRatio(STAT_PILL.jelly.edges));
  });

  it.each([
    [375, false],
    [402, false],
    [440, false],
    [834, true],
    [1194, true],
  ])('should not wobble off a %i-point screen, even opening from the far orb', (screen, isTablet) => {
    const content = homeContentWidth(screen, isTablet ? HOME_CARDS.tabletContentMaxWidth : HOME_CARDS.contentMaxWidth);
    const diameter = statOrbDiameter(content);
    const rowWidth = statOrbRowWidth(diameter, 3);
    const row = { x: (screen - rowWidth) / 2, y: 0, width: rowWidth };
    const overshoot = springOvershoot(STAT_PILL.jelly.edges);
    const fromRight = statPillFrame(row, 2, diameter, content);
    const fromLeft = statPillFrame(row, 0, diameter, content);
    const leftTravel = fromRight.from - fromRight.left;
    const rightTravel = fromLeft.left + fromLeft.width - (fromLeft.from + diameter);

    expect(fromRight.left - leftTravel * overshoot).toBeGreaterThanOrEqual(0);
    expect(fromLeft.left + fromLeft.width + rightTravel * overshoot).toBeLessThanOrEqual(screen);
  });
});

describe('springOvershoot', () => {
  it('should read how far an underdamped spring runs past its mark', () => {
    expect(springOvershoot({ damping: 10, stiffness: 100, mass: 1 })).toBeCloseTo(Math.exp(-Math.PI / Math.sqrt(3)), 10);
  });

  it.each([
    [20, 100],
    [30, 100],
  ])('should read no overshoot at all from a spring damped at %i or more', (damping, stiffness) => {
    expect(springOvershoot({ damping, stiffness, mass: 1 })).toBe(0);
  });
});

describe('dampingRatio', () => {
  it('should read a spring as critically damped at exactly 2·√(stiffness·mass)', () => {
    expect(dampingRatio({ damping: 20, stiffness: 100, mass: 1 })).toBe(1);
    expect(dampingRatio({ damping: 10, stiffness: 100, mass: 1 })).toBe(0.5);
    expect(dampingRatio({ damping: 20, stiffness: 100, mass: 4 })).toBe(0.5);
  });
});

describe('the edge', () => {
  it('should have an edge for every orb', () => {
    expect(Object.keys(STAT_PILL_TINTS.edges).sort()).toEqual([...STAT_ORB_ORDER].sort());
  });

  it("should glow the streak's warm gold, like the flame orb's rim", () => {
    const [r, g, b] = channels(STAT_PILL_TINTS.edges.streak.glow);

    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });

  it("should glow the story's blue, like the bookmark orb's rim", () => {
    const [r, g, b] = channels(STAT_PILL_TINTS.edges.continue.glow);

    expect(b).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(r);
  });

  it("should glow the badges' violet, like the trophy orb's rim", () => {
    const [r, g, b] = channels(STAT_PILL_TINTS.edges.badges.glow);

    expect(b).toBeGreaterThan(r);
    expect(r).toBeGreaterThan(g);
  });
});

describe('the glass', () => {
  it('should be a lit blue all through, with no near-black band to read as a dark edge', () => {
    expect(Math.min(...STAT_PILL_TINTS.fill.map(relativeLuminance))).toBeGreaterThanOrEqual(0.055);
  });

  it('should still be dark enough under white words to read them clearly', () => {
    STAT_PILL_TINTS.fill.forEach((stop) => expect(contrast(STAT_PILL_TINTS.title, stop)).toBeGreaterThanOrEqual(4.5));
  });

  it('should keep the gold heading and the tag clear as day on the middle of the bar', () => {
    const middle = STAT_PILL_TINTS.fill[2];

    expect(contrast(STAT_PILL_TINTS.eyebrow, middle)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(STAT_PILL_TINTS.tagText, middle)).toBeGreaterThanOrEqual(4.5);
  });
});
