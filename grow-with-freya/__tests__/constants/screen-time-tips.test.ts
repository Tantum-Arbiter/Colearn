/**
 * The pool of ways to carry a story off the screen, and the shuffle that
 * deals them in a fresh order each time the owl arrives. About ten, so the
 * carousel is worth swiping; dealt from an injected roll so a test can
 * predict the hand.
 */

import { SCREEN_TIME_TIP_KEYS, shuffleTips } from '@/constants/screen-time-tips';

function rolls(...values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('SCREEN_TIME_TIP_KEYS', () => {
  it('holds about ten tips', () => {
    expect(SCREEN_TIME_TIP_KEYS.length).toBeGreaterThanOrEqual(9);
    expect(SCREEN_TIME_TIP_KEYS.length).toBeLessThanOrEqual(12);
  });

  it('keeps the three the tips panel already tells', () => {
    expect(SCREEN_TIME_TIP_KEYS).toEqual(expect.arrayContaining(['atHome', 'outdoors', 'creative']));
  });

  it('names each tip once', () => {
    expect(new Set(SCREEN_TIME_TIP_KEYS).size).toBe(SCREEN_TIME_TIP_KEYS.length);
  });
});

describe('shuffleTips', () => {
  it('deals every tip exactly once', () => {
    const underTest = shuffleTips(SCREEN_TIME_TIP_KEYS, Math.random);

    expect([...underTest].sort()).toEqual([...SCREEN_TIME_TIP_KEYS].sort());
  });

  it('leaves the pool it was dealt from untouched', () => {
    const pool = ['a', 'b', 'c', 'd'] as const;
    const before = [...pool];

    shuffleTips(pool, rolls(0));

    expect(pool).toEqual(before);
  });

  it('deals the same hand from the same rolls', () => {
    const first = shuffleTips(SCREEN_TIME_TIP_KEYS, rolls(0.1, 0.7, 0.3, 0.9, 0.5));
    const second = shuffleTips(SCREEN_TIME_TIP_KEYS, rolls(0.1, 0.7, 0.3, 0.9, 0.5));

    expect(first).toEqual(second);
  });

  it('deals a different hand from different rolls', () => {
    const one = shuffleTips(SCREEN_TIME_TIP_KEYS, rolls(0));
    const other = shuffleTips(SCREEN_TIME_TIP_KEYS, rolls(0.999));

    expect(one).not.toEqual(other);
  });

  /** A roll that always lands high keeps every card where it was. */
  it('keeps the pool’s order when every roll lands on the last card', () => {
    expect(shuffleTips(['a', 'b', 'c', 'd'], rolls(0.999))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('copes with an empty pool', () => {
    expect(shuffleTips([], Math.random)).toEqual([]);
  });
});
