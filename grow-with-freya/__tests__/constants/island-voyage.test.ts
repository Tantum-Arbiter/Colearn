import { earthDiameter } from '@/constants/earth';
import {
  CLOUD_PUFFS,
  VOYAGE_MOTION,
  VOYAGE_PAGE,
  VOYAGE_ROWS,
  CHROME_TRACE,
  VOYAGE_TIMING,
  barSink,
  chromeOpacity,
  fogOpacity,
  isTravelling,
  islandScale,
  puffPose,
  rowPose,
  sunRise,
  voyageMaxZoom,
  voyageTiming,
  zoomScale,
  type VoyagePhase,
} from '@/constants/island-voyage';

const PHASES: VoyagePhase[] = ['home', 'leaving', 'crossing', 'arriving', 'island', 'returning', 'recrossing', 'landing'];
const WIDTH = 390;
const HEIGHT = 844;

describe('the phases of the voyage', () => {
  it.each([
    ['home', 'main'],
    ['leaving', 'main'],
    ['crossing', 'island'],
    ['arriving', 'island'],
    ['island', 'island'],
    ['returning', 'island'],
    ['recrossing', 'main'],
    ['landing', 'main'],
  ] as const)('shows the right page while %s (%s)', (phase, page) => {
    expect(VOYAGE_PAGE[phase]).toBe(page);
  });

  it.each(PHASES)('knows whether %s is a place or a passage', (phase) => {
    expect(isTravelling(phase)).toBe(phase !== 'home' && phase !== 'island');
  });
});

describe('voyageTiming', () => {
  it('keeps the whole way there under three and a half seconds, and the way back shorter', () => {
    const full = voyageTiming(false);

    const there = full.leaveMs + full.crossingMinMs + full.arriveMs;
    const back = full.returnMs + full.recrossingMs + full.landMs;

    expect(there).toBeLessThanOrEqual(3500);
    expect(back).toBeLessThan(there);
  });

  it('closes the cloud inside the leaving, not after it', () => {
    expect(VOYAGE_TIMING.full.cloudsInMs).toBeLessThan(VOYAGE_TIMING.full.leaveMs);
    expect(VOYAGE_TIMING.reduced.cloudsInMs).toBeLessThanOrEqual(VOYAGE_TIMING.reduced.leaveMs);
  });

  it('opens the cloud inside the arriving and the landing', () => {
    expect(VOYAGE_TIMING.full.cloudsOutMs).toBeLessThanOrEqual(VOYAGE_TIMING.full.arriveMs);
    expect(VOYAGE_TIMING.full.cloudsOutMs).toBeLessThanOrEqual(VOYAGE_TIMING.full.landMs);
  });

  it('waits for the island at least a moment and never for long', () => {
    expect(VOYAGE_TIMING.full.crossingMinMs).toBeGreaterThan(0);
    expect(VOYAGE_TIMING.full.crossingMaxMs).toBeGreaterThan(VOYAGE_TIMING.full.crossingMinMs);
    expect(VOYAGE_TIMING.full.crossingMaxMs).toBeLessThanOrEqual(1000);
  });

  it('is a short fade for someone who has asked for less motion', () => {
    const reduced = voyageTiming(true);

    expect(reduced).toBe(VOYAGE_TIMING.reduced);
    expect(reduced.moves).toBe(false);
    expect(voyageTiming(false).moves).toBe(true);
    expect(reduced.leaveMs + reduced.arriveMs).toBeLessThanOrEqual(900);
  });
});

describe('rowPose', () => {
  it.each(Object.entries(VOYAGE_ROWS))('leaves %s exactly where it is at rest', (_name, row) => {
    expect(rowPose(0, row.order, row.exit, WIDTH, HEIGHT)).toEqual({ translateX: 0, translateY: 0, opacity: 1 });
  });

  it.each(Object.entries(VOYAGE_ROWS))('has %s out of view and gone well before the cloud closes', (_name, row) => {
    const underTest = rowPose(0.5, row.order, row.exit, WIDTH, HEIGHT);

    expect(underTest.opacity).toBe(0);
    expect(Math.abs(underTest.translateX) >= WIDTH || Math.abs(underTest.translateY) >= HEIGHT * VOYAGE_MOTION.rowLift).toBe(true);
  });

  it.each([
    ['up', 0, -1],
    ['left', -1, 0],
    ['right', 1, 0],
  ] as const)('sends a row going %s the right way and no other', (exit, x, y) => {
    const underTest = rowPose(0.2, 0, exit, WIDTH, HEIGHT);

    expect(Math.sign(underTest.translateX)).toBe(x);
    expect(Math.sign(underTest.translateY)).toBe(y);
  });

  it('starts each row a little after the one before it', () => {
    const early = 0.1;

    const first = rowPose(early, 0, 'left', WIDTH, HEIGHT);
    const third = rowPose(early, 2, 'left', WIDTH, HEIGHT);
    const fifth = rowPose(early, 4, 'left', WIDTH, HEIGHT);

    expect(Math.abs(first.translateX)).toBeGreaterThan(Math.abs(third.translateX));
    expect(Math.abs(third.translateX)).toBeGreaterThan(Math.abs(fifth.translateX));
  });

  it('holds a later row still until its turn', () => {
    expect(rowPose(VOYAGE_MOTION.rowStagger * 2, 4, 'right', WIDTH, HEIGHT)).toEqual({ translateX: 0, translateY: 0, opacity: 1 });
  });

  it('moves off slowly and gathers speed', () => {
    const quarter = Math.abs(rowPose(VOYAGE_MOTION.rowWindow * 0.25, 0, 'left', WIDTH, HEIGHT).translateX);
    const half = Math.abs(rowPose(VOYAGE_MOTION.rowWindow * 0.5, 0, 'left', WIDTH, HEIGHT).translateX);

    expect(quarter).toBeLessThan(half / 2);
  });

  it.each([-1, 2, Number.NaN])('stays inside its ends for a travel of %p', (travel) => {
    const underTest = rowPose(travel, 1, 'left', WIDTH, HEIGHT);

    expect(underTest.opacity === 0 || underTest.opacity === 1).toBe(true);
    expect(Math.abs(underTest.translateX)).toBeLessThanOrEqual(WIDTH);
  });
});

describe('barSink', () => {
  it.each([
    [0, 0],
    [VOYAGE_MOTION.barWindow, 1],
    [1, 1],
    [-0.5, 0],
    [Number.NaN, 0],
  ])('at a travel of %p has the bar %p of the way down', (travel, expected) => {
    expect(barSink(travel)).toBe(expected);
  });

  it('is part way down part way through', () => {
    const underTest = barSink(VOYAGE_MOTION.barWindow / 2);

    expect(underTest).toBeGreaterThan(0);
    expect(underTest).toBeLessThan(1);
  });
});

describe('zoomScale', () => {
  const maxZoom = voyageMaxZoom(WIDTH, HEIGHT);

  it('leaves the sky its own size until the rows are on their way', () => {
    expect(zoomScale(0, maxZoom)).toBe(1);
    expect(zoomScale(VOYAGE_MOTION.zoomFrom, maxZoom)).toBe(1);
  });

  it('ends with the earth filling the screen', () => {
    expect(zoomScale(1, maxZoom)).toBeCloseTo(maxZoom, 5);
  });

  it('never runs backwards on the way in', () => {
    const steps = Array.from({ length: 21 }, (_, index) => zoomScale(index / 20, maxZoom));

    steps.slice(1).forEach((scale, index) => expect(scale).toBeGreaterThanOrEqual(steps[index]));
  });

  it('gathers speed, so most of the dive is under the cloud', () => {
    const halfway = zoomScale((VOYAGE_MOTION.zoomFrom + 1) / 2, maxZoom);

    expect(halfway - 1).toBeLessThan((maxZoom - 1) * 0.3);
  });

  it.each([-1, Number.NaN])('rests at its own size for a travel of %p', (travel) => {
    expect(zoomScale(travel, maxZoom)).toBe(1);
  });

  it('goes no further than the end for a travel past it', () => {
    expect(zoomScale(3, maxZoom)).toBeCloseTo(maxZoom, 5);
  });
});

describe('voyageMaxZoom', () => {
  it.each([
    [390, 844],
    [320, 568],
    [834, 1210],
    [1210, 834],
  ])('brings the earth past the far corners of a %i by %i screen', (width, height) => {
    const radius = earthDiameter(width, height) / 2;

    expect(radius * voyageMaxZoom(width, height)).toBeGreaterThan(Math.hypot(width / 2, height));
  });

  it.each([
    [0, 844],
    [390, 0],
    [Number.NaN, 844],
  ])('does not zoom at all on a screen not yet measured (%p by %p)', (width, height) => {
    expect(voyageMaxZoom(width, height)).toBe(1);
  });
});

describe('the cloud', () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 0],
    [-1, 0],
    [3, 0],
    [Number.NaN, 0],
  ])('at %p has the fog at %p', (clouds, expected) => {
    expect(fogOpacity(clouds)).toBe(expected);
  });

  it('thickens on the way in and thins on the way out', () => {
    expect(fogOpacity(0.8)).toBeGreaterThan(fogOpacity(0.6));
    expect(fogOpacity(1.2)).toBeGreaterThan(fogOpacity(1.4));
  });

  it('is clear for the first part of the way in, so the dive can be seen', () => {
    expect(fogOpacity(VOYAGE_MOTION.fogFrom)).toBe(0);
  });

  it('has several clouds, set about the middle rather than on it', () => {
    expect(CLOUD_PUFFS.length).toBeGreaterThanOrEqual(6);
    CLOUD_PUFFS.forEach((puff) => {
      expect(Math.abs(puff.x) + Math.abs(puff.y)).toBeGreaterThan(0);
      expect(puff.size).toBeGreaterThan(0);
    });
  });

  it.each(CLOUD_PUFFS.map((_, index) => index))('shows nothing of cloud %i at either end', (index) => {
    expect(puffPose(0, index, WIDTH, HEIGHT).opacity).toBe(0);
    expect(puffPose(2, index, WIDTH, HEIGHT).opacity).toBe(0);
  });

  it.each(CLOUD_PUFFS.map((_, index) => index))('has cloud %i whole when the cover is whole', (index) => {
    expect(puffPose(1, index, WIDTH, HEIGHT).opacity).toBe(1);
  });

  it.each(CLOUD_PUFFS.map((_, index) => index))('brings cloud %i towards the eye all the way through', (index) => {
    const scales = [0, 0.5, 1, 1.5, 2].map((clouds) => puffPose(clouds, index, WIDTH, HEIGHT).scale);

    scales.slice(1).forEach((scale, step) => expect(scale).toBeGreaterThan(scales[step]));
  });

  it.each(CLOUD_PUFFS.map((_, index) => index))('carries cloud %i outwards from the middle, never back', (index) => {
    const distances = [0, 0.5, 1, 1.5, 2].map((clouds) => {
      const pose = puffPose(clouds, index, WIDTH, HEIGHT);
      return Math.hypot(pose.translateX, pose.translateY);
    });

    distances.slice(1).forEach((distance, step) => expect(distance).toBeGreaterThan(distances[step]));
  });

  it.each([
    [-1, 0],
    [Number.NaN, 0],
    [2.5, 2],
    [40, 2],
  ])('holds every cloud at its end for a cover of %p, as at %p', (clouds, end) => {
    CLOUD_PUFFS.forEach((_, index) => {
      expect(puffPose(clouds, index, WIDTH, HEIGHT)).toEqual(puffPose(end, index, WIDTH, HEIGHT));
    });
  });

  it('has no pose for a cloud that is not there', () => {
    expect(puffPose(1, CLOUD_PUFFS.length, WIDTH, HEIGHT)).toEqual({ translateX: 0, translateY: 0, scale: 1, opacity: 0 });
    expect(puffPose(1, -1, WIDTH, HEIGHT).opacity).toBe(0);
  });
});

describe('arriving on the island', () => {
  it('opens on the island a little close and settles to its own size', () => {
    expect(islandScale(0)).toBeCloseTo(1 + VOYAGE_MOTION.islandPush, 5);
    expect(islandScale(1)).toBe(1);
    expect(islandScale(0.5)).toBeLessThan(islandScale(0.25));
  });

  it('slows as it settles', () => {
    const firstHalf = islandScale(0) - islandScale(0.5);
    const secondHalf = islandScale(0.5) - islandScale(1);

    expect(firstHalf).toBeGreaterThan(secondHalf);
  });

  it.each([-1, Number.NaN])('is close for an arrival of %p', (arrival) => {
    expect(islandScale(arrival)).toBeCloseTo(1 + VOYAGE_MOTION.islandPush, 5);
  });

  it('keeps the sun below the horizon until the cloud has begun to open', () => {
    expect(sunRise(0, 300)).toBe(300);
    expect(sunRise(VOYAGE_MOTION.sunRiseFrom, 300)).toBe(300);
  });

  it('brings the sun to rest exactly in its place', () => {
    expect(sunRise(1, 300)).toBe(0);
    expect(sunRise(2, 300)).toBe(0);
  });

  it('rises a touch past its place before settling, and never sinks below where it began', () => {
    const steps = Array.from({ length: 41 }, (_, index) => sunRise(index / 40, 300));

    expect(Math.min(...steps)).toBeLessThan(0);
    expect(Math.min(...steps)).toBeGreaterThan(-300 * 0.08);
    expect(Math.max(...steps)).toBe(300);
  });

  // at nothing iOS never draws the header and the step card, and their first draw landed on the
  // arrival's frames as they began to fade in; a trace too faint to see has them drawn under the cloud
  it.each([
    [0, CHROME_TRACE],
    [VOYAGE_MOTION.chromeFrom, CHROME_TRACE],
    [1, 1],
    [Number.NaN, CHROME_TRACE],
  ])('at an arrival of %p shows the way home at %p', (arrival, expected) => {
    expect(chromeOpacity(arrival)).toBe(expected);
  });

  it('keeps the header and card a trace too faint to see until they fade in, never nothing', () => {
    expect(CHROME_TRACE).toBeGreaterThan(0);
    expect(CHROME_TRACE).toBeLessThanOrEqual(0.01);
    expect(chromeOpacity(VOYAGE_MOTION.chromeFrom + (1 - VOYAGE_MOTION.chromeFrom) / 2)).toBeCloseTo(0.5, 6);
  });
});
