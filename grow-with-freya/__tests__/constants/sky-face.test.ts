/**
 * Tests for how often the sun and moon laugh.
 *
 * The face should feel alive without asking for attention. A laugh every half
 * minute or so, at an interval a child cannot predict, is company -a laugh
 * every few seconds is a distraction.
 */

import { SKY_FACE_RHYTHM, laughsPerMinute, nextRestDelay } from '@/constants/sky-face';

describe('nextRestDelay', () => {
  it.each([
    ['the shortest roll', 0, SKY_FACE_RHYTHM.restMinMs],
    ['the longest roll', 1, SKY_FACE_RHYTHM.restMaxMs],
  ])('should return %s', (_case, roll, expected) => {
    const underTest = nextRestDelay(roll);

    expect(underTest).toBe(expected);
  });

  it('should sit between the bounds for a middling roll', () => {
    const underTest = nextRestDelay(0.5);

    expect(underTest).toBeGreaterThan(SKY_FACE_RHYTHM.restMinMs);
    expect(underTest).toBeLessThan(SKY_FACE_RHYTHM.restMaxMs);
  });

  it.each([-4, 2.7])('should clamp a roll of %f', (roll) => {
    const underTest = nextRestDelay(roll);

    expect(underTest).toBeGreaterThanOrEqual(SKY_FACE_RHYTHM.restMinMs);
    expect(underTest).toBeLessThanOrEqual(SKY_FACE_RHYTHM.restMaxMs);
  });

  it('should let the first laugh come sooner so the face is not lifeless on arrival', () => {
    const underTest = nextRestDelay(0, true);

    expect(underTest).toBeLessThan(nextRestDelay(0));
  });

  it('should never make two identical rolls differ', () => {
    const underTest = [nextRestDelay(0.31), nextRestDelay(0.31)];

    expect(underTest[0]).toBe(underTest[1]);
  });
});

describe('laughsPerMinute', () => {
  it('should stay at a calm pace across the whole range', () => {
    const underTest = [
      laughsPerMinute(SKY_FACE_RHYTHM.restMinMs),
      laughsPerMinute(SKY_FACE_RHYTHM.restMaxMs),
    ];

    expect(underTest[0]).toBeLessThan(4);
    expect(underTest[1]).toBeGreaterThan(0.5);
  });

  it('should spend the overwhelming majority of the time at rest', () => {
    const average = (SKY_FACE_RHYTHM.restMinMs + SKY_FACE_RHYTHM.restMaxMs) / 2;

    const underTest = SKY_FACE_RHYTHM.laughMs / (average + SKY_FACE_RHYTHM.laughMs);

    expect(underTest).toBeLessThan(0.06);
  });
});
