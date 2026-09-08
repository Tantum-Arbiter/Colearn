/**
 * Ways to carry a story off the screen and into the rest of the day. The
 * first three are the ones the tips panel already tells; the rest widen the
 * pool so the owl has a fresh hand to deal each time it lands.
 */
export const SCREEN_TIME_TIP_KEYS = [
  'atHome',
  'outdoors',
  'creative',
  'bathTime',
  'inTheDark',
  'onAPlate',
  'listen',
  'sockShow',
  'singIt',
  'whatIf',
] as const;

export type ScreenTimeTipKey = (typeof SCREEN_TIME_TIP_KEYS)[number];

/**
 * A Fisher-Yates deal of the pool, drawn from a roll the caller supplies so
 * the hand is predictable wherever it needs to be.
 */
export function shuffleTips<T>(pool: readonly T[], random: () => number): T[] {
  const dealt = [...pool];
  for (let index = dealt.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [dealt[index], dealt[swap]] = [dealt[swap], dealt[index]];
  }
  return dealt;
}

/** How many ideas the owl offers on one visit. */
export const TIPS_PER_VISIT = 2;

/**
 * Deals a hand of tips the parent has not heard yet, so an idea only comes
 * round again once every other one has been told. When too few are left for a
 * full hand the deck starts over, holding back the hand just told so nothing
 * repeats across the seam.
 */
export function dealTips<T>(
  pool: readonly T[],
  random: () => number,
  seen: readonly T[] = [],
  count: number = TIPS_PER_VISIT,
): { dealt: T[]; seen: T[] } {
  const wanted = Math.min(count, pool.length);
  let unheard = pool.filter(tip => !seen.includes(tip));
  let carried: T[] = [...seen];

  if (unheard.length < wanted) {
    const justTold = seen.slice(-wanted);
    const fresh = pool.filter(tip => !justTold.includes(tip));
    unheard = fresh.length >= wanted ? fresh : [...pool];
    carried = [];
  }

  const dealt = shuffleTips(unheard, random).slice(0, wanted);
  return { dealt, seen: [...carried, ...dealt] };
}
