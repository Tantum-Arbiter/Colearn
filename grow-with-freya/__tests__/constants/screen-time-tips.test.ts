/**
 * The pool of ways to carry a story off the screen, and the shuffle that
 * deals them in a fresh order each time the owl arrives. About ten, so the
 * carousel is worth swiping; dealt from an injected roll so a test can
 * predict the hand.
 */

import {
  SCREEN_TIME_TIP_KEYS,
  TIPS_PER_VISIT,
  dealTips,
  shuffleTips,
} from '@/constants/screen-time-tips';

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

/**
 * The owl offers a couple of ideas, not the whole pool, and never one this
 * parent has already been told until the deck has been all the way through.
 */
describe('dealTips', () => {
  const POOL = ['a', 'b', 'c', 'd', 'e'] as const;

  it('deals a hand of TIPS_PER_VISIT', () => {
    const { dealt } = dealTips(SCREEN_TIME_TIP_KEYS, Math.random);

    expect(dealt).toHaveLength(TIPS_PER_VISIT);
  });

  it('never deals the same tip twice in one hand', () => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const { dealt } = dealTips(SCREEN_TIME_TIP_KEYS, Math.random);

      expect(new Set(dealt).size).toBe(dealt.length);
    }
  });

  it('only deals tips from the pool', () => {
    const { dealt } = dealTips(SCREEN_TIME_TIP_KEYS, Math.random);

    dealt.forEach(tip => expect(SCREEN_TIME_TIP_KEYS).toContain(tip));
  });

  it('never repeats a tip while unheard ones remain', () => {
    let seen: string[] = [];
    const told: string[] = [];

    // Two rounds of the pool: the first should use every tip exactly once.
    for (let visit = 0; visit < Math.floor(POOL.length / 2); visit += 1) {
      const hand = dealTips(POOL, Math.random, seen);
      told.push(...hand.dealt);
      seen = hand.seen;
    }

    expect(new Set(told).size).toBe(told.length);
  });

  it('starts the deck over once too few are left for a hand', () => {
    let seen: string[] = ['a', 'b', 'c', 'd'];

    const { dealt, seen: next } = dealTips(POOL, Math.random, seen);

    expect(dealt).toHaveLength(2);
    expect(next).toHaveLength(2);
  });

  it('does not repeat the hand just told across the seam', () => {
    const seen = ['a', 'b', 'c', 'd'];

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const { dealt } = dealTips(POOL, Math.random, seen);

      expect(dealt).not.toContain('c');
      expect(dealt).not.toContain('d');
    }
  });

  it('carries the hand forward so the next visit knows what was told', () => {
    const first = dealTips(POOL, Math.random);
    const second = dealTips(POOL, Math.random, first.seen);

    expect(second.seen).toEqual([...first.seen, ...second.dealt]);
  });

  it('copes with a pool smaller than a hand', () => {
    const { dealt } = dealTips(['only'], Math.random);

    expect(dealt).toEqual(['only']);
  });
});
