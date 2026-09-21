/**
 * Grown-ups keeps whichever of the sun and moon is off duty: while the sun is
 * up on home, the moon sleeps here, and at night the sun does.
 */

import {
  SLEEPING_EYES,
  SLEEP_RHYTHM,
  PEEK_TOTAL_MS,
  peekOpenness,
  sleepingBody,
  zzzAt,
} from '@/constants/sleeping-sky-face';

describe('sleepingBody', () => {
  it('lets the moon sleep while the sun is up on home', () => {
    expect(sleepingBody('day')).toBe('moon');
  });

  it('lets the sun sleep while the moon is out on home', () => {
    expect(sleepingBody('night')).toBe('sun');
  });
});

describe('SLEEPING_EYES', () => {
  it.each(['sun', 'moon'] as const)('keeps the %s\'s eyes on its face, left of right, in the upper half', (body) => {
    const { left, right } = SLEEPING_EYES[body];

    expect(left.x).toBeLessThan(0.5);
    expect(right.x).toBeGreaterThan(0.5);
    [left, right].forEach((eye) => {
      expect(eye.y).toBeGreaterThan(0.4);
      expect(eye.y).toBeLessThan(0.65);
      expect(eye.width).toBeGreaterThan(0.05);
      expect(eye.width).toBeLessThan(0.15);
    });
  });
});

describe('peekOpenness', () => {
  it('lasts as long as the open, the look and the close together', () => {
    expect(PEEK_TOTAL_MS).toBe(SLEEP_RHYTHM.peekOpenMs + SLEEP_RHYTHM.peekHoldMs + SLEEP_RHYTHM.peekCloseMs);
  });

  it('starts shut', () => {
    expect(peekOpenness(0)).toBe(0);
  });

  it('is half open halfway through opening', () => {
    expect(peekOpenness(SLEEP_RHYTHM.peekOpenMs / 2)).toBeCloseTo(0.5, 5);
  });

  it('stays wide open while it has a look', () => {
    expect(peekOpenness(SLEEP_RHYTHM.peekOpenMs)).toBe(1);
    expect(peekOpenness(SLEEP_RHYTHM.peekOpenMs + SLEEP_RHYTHM.peekHoldMs / 2)).toBe(1);
    expect(peekOpenness(SLEEP_RHYTHM.peekOpenMs + SLEEP_RHYTHM.peekHoldMs)).toBe(1);
  });

  it('is half shut halfway through closing', () => {
    const closing = SLEEP_RHYTHM.peekOpenMs + SLEEP_RHYTHM.peekHoldMs;

    expect(peekOpenness(closing + SLEEP_RHYTHM.peekCloseMs / 2)).toBeCloseTo(0.5, 5);
  });

  it('is shut again at the end, and stays shut', () => {
    expect(peekOpenness(PEEK_TOTAL_MS)).toBe(0);
    expect(peekOpenness(PEEK_TOTAL_MS + 500)).toBe(0);
  });

  it('never opens beyond wide or closes beyond shut', () => {
    for (let ms = -100; ms <= PEEK_TOTAL_MS + 100; ms += 37) {
      const open = peekOpenness(ms);
      expect(open).toBeGreaterThanOrEqual(0);
      expect(open).toBeLessThanOrEqual(1);
    }
  });
});

describe('zzzAt', () => {
  it('rises and drifts right as it goes', () => {
    const early = zzzAt(0, 0.1);
    const late = zzzAt(0, 0.8);

    expect(late.y).toBeLessThan(early.y);
    expect(late.x).toBeGreaterThan(early.x);
    expect(late.scale).toBeGreaterThan(early.scale);
  });

  it('fades in from nothing and away to nothing', () => {
    expect(zzzAt(0, 0).opacity).toBeCloseTo(0, 5);
    expect(zzzAt(0, 0.5).opacity).toBeCloseTo(1, 5);
    expect(zzzAt(0, 0.999).opacity).toBeLessThan(0.01);
  });

  it('staggers the letters evenly through the loop', () => {
    const count = SLEEP_RHYTHM.zzzCount;

    expect(zzzAt(1, 0)).toEqual(zzzAt(0, 1 / count));
    expect(zzzAt(count - 1, 0)).toEqual(zzzAt(0, (count - 1) / count));
  });

  it('wraps round rather than running past the end of the loop', () => {
    expect(zzzAt(2, 0.9)).toEqual(zzzAt(0, (0.9 + 2 / SLEEP_RHYTHM.zzzCount) % 1));
  });
});
