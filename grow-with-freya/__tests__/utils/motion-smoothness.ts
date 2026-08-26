/**
 * A shared assertion for "this motion has no hitch in it".
 *
 * Every derived motion function in the app is a pure function of a progress,
 * and the fault they all share is a stall: a `withSequence` join, a curve
 * that changes direction abruptly, a piecewise definition whose halves do not
 * meet. All of them show up the same way -- one sampled step much larger, or
 * a run of steps much smaller, than the rest.
 *
 * The measure is against **distance travelled, not net range**. A shape that
 * doubles back -- the orb's anticipation bulge, the drop's stretch -- covers
 * more ground than its endpoints suggest, and measuring against the endpoints
 * makes a perfectly smooth curve look like a failing one. That mistake cost
 * an afternoon the first time this was written, which is why it is written
 * down here once rather than re-derived at each call site.
 */

type Sample = number | Record<string, number>;

export interface SmoothnessOptions {
  /** how finely to sample; more steps means a tighter bound */
  steps?: number;
  /**
   * How many times the average step the biggest one may be. Four is loose
   * enough for a normal ease and tight enough to catch a stop: a sequence
   * join shows up an order of magnitude over.
   */
  tolerance?: number;
  from?: number;
  to?: number;
}

function channels(sample: Sample): Record<string, number> {
  return typeof sample === 'number' ? { value: sample } : sample;
}

/**
 * Asserts that `motion` moves continuously across its range, with no step
 * disproportionate to the distance it covers.
 */
export function expectSmooth(
  motion: (progress: number) => Sample,
  options: SmoothnessOptions = {}
): void {
  const { steps = 400, tolerance = 4, from = 0, to = 1 } = options;

  let previous = channels(motion(from));
  const biggest: Record<string, number> = {};
  const travelled: Record<string, number> = {};

  for (const key of Object.keys(previous)) {
    biggest[key] = 0;
    travelled[key] = 0;
  }

  for (let i = 1; i <= steps; i++) {
    const next = channels(motion(from + ((to - from) * i) / steps));

    for (const key of Object.keys(biggest)) {
      const step = Math.abs(next[key] - previous[key]);
      biggest[key] = Math.max(biggest[key], step);
      travelled[key] += step;
    }

    previous = next;
  }

  // reported by name, so a failure says which channel stalled rather than
  // just which number was too big
  const hitches = Object.keys(biggest).filter(
    (key) => travelled[key] > 0 && biggest[key] >= (travelled[key] / steps) * tolerance
  );

  expect(hitches).toEqual([]);
}
