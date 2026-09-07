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
