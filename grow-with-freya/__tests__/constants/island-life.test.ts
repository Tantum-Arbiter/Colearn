import { ISLAND_ART } from '@/constants/island-art';
import {
  GULL_COURSES,
  ISLAND_LIFE,
  beamReach,
  billowSwell,
  cloudDrift,
  fallShift,
  gullPlace,
  gullProgress,
  lampFlare,
  poolRing,
  pulseRing,
  sprayPose,
  treeSway,
  villageGlow,
  waterGlow,
  wingLift,
} from '@/constants/island-life';

const STEPS = Array.from({ length: 41 }, (_, index) => index / 40);

describe('how fast the island moves', () => {
  it('is slow enough to be calm', () => {
    expect(ISLAND_LIFE.windMs).toBeGreaterThanOrEqual(5000);
    expect(ISLAND_LIFE.tideMs).toBeGreaterThanOrEqual(40000);
    expect(ISLAND_LIFE.rippleMs).toBeGreaterThanOrEqual(2400);
    expect(ISLAND_LIFE.skyMs).toBeGreaterThanOrEqual(40000);
  });

  it('beats a gull`s wings about twice a second at most', () => {
    expect(ISLAND_LIFE.beatMs).toBeGreaterThanOrEqual(480);
    expect(ISLAND_LIFE.beatMs).toBeLessThanOrEqual(1200);
  });
});

describe('how fast the water falls and the lighthouse turns', () => {
  it('runs the falls quickly enough to be seen and slowly enough to be calm', () => {
    const tilesASecond = (ISLAND_LIFE.fallTiles * 1000) / ISLAND_LIFE.fallMs;

    expect(tilesASecond).toBeGreaterThanOrEqual(0.4);
    expect(tilesASecond).toBeLessThanOrEqual(1.2);
    expect(Number.isInteger(ISLAND_LIFE.fallTiles)).toBe(true);
  });

  it('pulses the lamp every few seconds, twice in each turn, not faster', () => {
    const betweenPulses = ISLAND_LIFE.lampMs / 2;

    expect(betweenPulses).toBeGreaterThanOrEqual(2500);
    expect(betweenPulses).toBeLessThanOrEqual(5000);
  });
});

describe('fallShift', () => {
  const TILE = 48;

  it('starts a whole tile up, so the strip covers the fall from the first moment', () => {
    expect(fallShift(0, TILE)).toBe(-TILE);
  });

  it('only ever runs downwards within one tile, never baring the top of the fall', () => {
    Array.from({ length: 401 }, (_, index) => index / 400).forEach((fall) => {
      const shift = fallShift(fall, TILE);

      expect(shift).toBeGreaterThanOrEqual(-TILE);
      expect(shift).toBeLessThan(0);
    });
  });

  it('runs down steadily, as many tiles in a turn as it is set to', () => {
    const early = fallShift(0.1 / ISLAND_LIFE.fallTiles, TILE);
    const later = fallShift(0.3 / ISLAND_LIFE.fallTiles, TILE);

    expect(early).toBeCloseTo(-TILE + 0.1 * TILE, 6);
    expect(later).toBeCloseTo(-TILE + 0.3 * TILE, 6);
    expect(fallShift(1 / ISLAND_LIFE.fallTiles + 0.0001, TILE)).toBeLessThan(early);
  });

  it('comes round to where it began, so the join cannot be seen', () => {
    expect(fallShift(1, TILE)).toBeCloseTo(fallShift(0, TILE), 6);
  });

  it.each([
    [Number.NaN, 48],
    [0.3, 0],
    [0.3, Number.NaN],
  ])('rests for a fall of %p and a tile of %p', (fall, tile) => {
    expect(fallShift(fall, tile)).toBe(tile > 0 ? -tile : 0);
  });
});

describe('poolRing', () => {
  it('spreads a ripple from small to its full size as it ages', () => {
    expect(poolRing(0, 0).scale).toBeCloseTo(ISLAND_LIFE.rippleFrom, 6);
    expect(poolRing(0.5, 0).scale).toBeGreaterThan(poolRing(0.2, 0).scale);
    expect(poolRing(0.9999, 0).scale).toBeCloseTo(1, 2);
  });

  it('brings a ripple up quickly, then fades it out as it reaches the edge', () => {
    expect(poolRing(0, 0).opacity).toBe(0);
    expect(poolRing(0.2, 0).opacity).toBeGreaterThan(0.5);
    expect(poolRing(0.9, 0).opacity).toBeLessThan(poolRing(0.3, 0).opacity);
    expect(poolRing(0.9999, 0).opacity).toBeCloseTo(0, 2);
  });

  it('keeps a ripple within size and within sight', () => {
    Array.from({ length: 201 }, (_, index) => index / 200).forEach((fall) => {
      Array.from({ length: ISLAND_LIFE.poolRings }, (_, ring) => ring).forEach((ring) => {
        const pose = poolRing(fall, ring);

        expect(pose.scale).toBeGreaterThanOrEqual(ISLAND_LIFE.rippleFrom - 1e-9);
        expect(pose.scale).toBeLessThanOrEqual(1);
        expect(pose.opacity).toBeGreaterThanOrEqual(0);
        expect(pose.opacity).toBeLessThanOrEqual(0.9);
      });
    });
  });

  it('sends the ripples out one after another, evenly, so the pool is never still', () => {
    expect(ISLAND_LIFE.poolRings).toBeGreaterThanOrEqual(3);
    expect(poolRing(1 / ISLAND_LIFE.poolRings, 0).scale).toBeCloseTo(poolRing(0, 1).scale, 6);
    Array.from({ length: 101 }, (_, index) => index / 100).forEach((fall) => {
      const showing = Array.from({ length: ISLAND_LIFE.poolRings }, (_, ring) => poolRing(fall, ring).opacity);

      expect(Math.max(...showing)).toBeGreaterThan(0.4);
    });
  });

  it('holds its ripples where they are for a clock that is not a number', () => {
    expect(poolRing(Number.NaN, 1)).toEqual(poolRing(0, 1));
  });
});

describe('sprayPose', () => {
  it('swells a puff as it fades, and has it gone as it is biggest', () => {
    const young = sprayPose(0.05, 0);
    const old = sprayPose(0.95, 0);

    expect(old.scale).toBeGreaterThan(young.scale);
    expect(old.opacity).toBeLessThan(young.opacity);
    expect(sprayPose(0.9999, 0).opacity).toBeCloseTo(0, 2);
  });

  it('keeps a puff within sight and within size', () => {
    Array.from({ length: 101 }, (_, index) => index / 100).forEach((fall) => {
      [0, 1].forEach((puff) => {
        const pose = sprayPose(fall, puff);

        expect(pose.opacity).toBeGreaterThanOrEqual(0);
        expect(pose.opacity).toBeLessThanOrEqual(0.75);
        expect(pose.scale).toBeGreaterThanOrEqual(0.7);
        expect(pose.scale).toBeLessThanOrEqual(1.35);
      });
    });
  });

  it('sends the second puff half a turn behind the first, so there is always spray', () => {
    expect(sprayPose(0.5, 1)).toEqual(sprayPose(0, 0));
    expect(sprayPose(0.2, 0).opacity + sprayPose(0.2, 1).opacity).toBeGreaterThan(0.3);
  });

  it('shows a puff at rest, for a fall that is not a number', () => {
    expect(sprayPose(Number.NaN, 0)).toEqual(sprayPose(0, 0));
    expect(sprayPose(0, 0).opacity).toBeGreaterThan(0.5);
  });
});

describe('the lighthouse', () => {
  it('points its beam to the right at rest, as far as it goes', () => {
    expect(beamReach(0)).toBe(1);
  });

  it('swings the beam round: right, away, left, towards, and right again', () => {
    expect(beamReach(0.25)).toBeCloseTo(0, 6);
    expect(beamReach(0.5)).toBeCloseTo(-1, 6);
    expect(beamReach(0.75)).toBeCloseTo(0, 6);
    expect(beamReach(1)).toBeCloseTo(1, 6);
  });

  it('never reaches further than its length', () => {
    Array.from({ length: 101 }, (_, index) => index / 100).forEach((lamp) => {
      expect(Math.abs(beamReach(lamp))).toBeLessThanOrEqual(1);
    });
  });

  it('is always lit, and flashes each time a beam swings through the eye: twice a turn', () => {
    const flares = Array.from({ length: 401 }, (_, index) => lampFlare(index / 400));
    const flashes = flares.filter((flare, index) => index > 0 && index < 400 && flare > flares[index - 1] && flare >= flares[index + 1]);

    expect(Math.min(...flares)).toBeCloseTo(ISLAND_LIFE.lampGlow, 6);
    expect(ISLAND_LIFE.lampGlow).toBeGreaterThanOrEqual(0.4);
    expect(flashes).toHaveLength(2);
    expect(lampFlare(0.25)).toBeCloseTo(1, 6);
    expect(lampFlare(0.75)).toBeCloseTo(1, 6);
  });

  it('flashes briefly: dim again a tenth of a turn either side', () => {
    expect(lampFlare(0.15)).toBeLessThan(ISLAND_LIFE.lampGlow + 0.12);
    expect(lampFlare(0.35)).toBeLessThan(ISLAND_LIFE.lampGlow + 0.12);
    expect(lampFlare(0)).toBe(ISLAND_LIFE.lampGlow);
  });

  describe('the pulse that spreads from each flash', () => {
    it.each([0.25, 0.75])('sets out from the lamp, small and bright, at the flash at %p', (flash) => {
      const start = pulseRing(flash);

      expect(start.scale).toBeCloseTo(ISLAND_LIFE.pulseFrom, 6);
      expect(start.opacity).toBeCloseTo(ISLAND_LIFE.pulseBright, 6);
    });

    it('spreads and fades, and is gone well before the next flash', () => {
      const early = pulseRing(0.27);
      const later = pulseRing(0.36);

      expect(later.scale).toBeGreaterThan(early.scale);
      expect(later.opacity).toBeLessThan(early.opacity);
      expect(pulseRing(0.25 + ISLAND_LIFE.pulseLife / 2).opacity).toBeCloseTo(0, 6);
      expect(pulseRing(0.6).opacity).toBe(0);
    });

    it('never grows past its full size, nor shows brighter than it sets out', () => {
      Array.from({ length: 401 }, (_, index) => index / 400).forEach((lamp) => {
        const ring = pulseRing(lamp);

        expect(ring.scale).toBeGreaterThanOrEqual(ISLAND_LIFE.pulseFrom - 1e-9);
        expect(ring.scale).toBeLessThanOrEqual(1 + 1e-9);
        expect(ring.opacity).toBeGreaterThanOrEqual(0);
        expect(ring.opacity).toBeLessThanOrEqual(ISLAND_LIFE.pulseBright + 1e-9);
      });
    });

    it('shows no ring at rest, or for a lamp that is not a number', () => {
      expect(pulseRing(0).opacity).toBe(0);
      expect(pulseRing(Number.NaN).opacity).toBe(0);
    });
  });


  it.each([Number.NaN, Number.POSITIVE_INFINITY])('is lit and still for a lamp of %p', (lamp) => {
    expect(beamReach(lamp)).toBe(1);
    expect(lampFlare(lamp)).toBe(ISLAND_LIFE.lampGlow);
  });
});

describe('villageGlow', () => {
  it('never lets a lamp go out, or dim far', () => {
    Array.from({ length: 201 }, (_, index) => index / 200).forEach((lamp) => {
      [0, 1].forEach((sheet) => {
        expect(villageGlow(lamp, sheet)).toBeGreaterThanOrEqual(0.6);
        expect(villageGlow(lamp, sheet)).toBeLessThanOrEqual(1);
      });
    });
  });

  it('glimmers, and the two sheets not together', () => {
    const first = Array.from({ length: 201 }, (_, index) => villageGlow(index / 200, 0));

    expect(Math.max(...first) - Math.min(...first)).toBeGreaterThan(0.2);
    expect(villageGlow(0.1, 0)).not.toBeCloseTo(villageGlow(0.1, 1), 2);
  });

  it('comes round to where it began', () => {
    expect(villageGlow(1, 1)).toBeCloseTo(villageGlow(0, 1), 6);
  });

  it('is lit and steady for a lamp that is not a number', () => {
    expect(villageGlow(Number.NaN, 0)).toBe(villageGlow(0, 0));
    expect(villageGlow(0, 0)).toBeGreaterThanOrEqual(0.6);
  });
});

describe('treeSway', () => {
  it.each([2.5, 5.5])('never leans a tree further than its sway of %p degrees', (sway) => {
    STEPS.forEach((wind) => {
      [0, 1, 7, 26].forEach((index) => {
        expect(Math.abs(treeSway(wind, index, sway))).toBeLessThanOrEqual(sway);
      });
    });
  });

  it('leans it both ways, and most of the way', () => {
    const leans = STEPS.map((wind) => treeSway(wind, 0, 4));

    expect(Math.max(...leans)).toBeGreaterThan(4 * 0.7);
    expect(Math.min(...leans)).toBeLessThan(-4 * 0.7);
  });

  it('comes round to where it began, so the wind can blow for ever without a jerk', () => {
    [0, 3, 11].forEach((index) => {
      expect(treeSway(1, index, 4)).toBeCloseTo(treeSway(0, index, 4), 6);
    });
  });

  it('moves a little at a time', () => {
    const leans = Array.from({ length: 201 }, (_, index) => treeSway(index / 200, 2, 4));

    leans.slice(1).forEach((lean, index) => expect(Math.abs(lean - leans[index])).toBeLessThan(0.4));
  });

  it('does not sway every tree together', () => {
    const together = STEPS.every((wind) => Math.abs(treeSway(wind, 0, 4) - treeSway(wind, 1, 4)) < 0.2);

    expect(together).toBe(false);
  });

  it.each([0, -3, Number.NaN])('leaves a tree with a sway of %p standing straight', (sway) => {
    expect(treeSway(0.3, 1, sway)).toBe(0);
  });

  it('stands straight for a wind that is not a number', () => {
    expect(treeSway(Number.NaN, 1, 4)).toBe(0);
  });
});

describe('cloudDrift', () => {
  it.each([
    [12, 2, 0],
    [-12, 3, 0.15],
    [7, 2, 0.4],
  ])('carries a cloud with a reach of %p only away from where it was painted, and no further', (reach, beats, lag) => {
    STEPS.forEach((tide) => {
      const drift = cloudDrift(tide, reach, beats, lag);

      expect(drift * Math.sign(reach)).toBeGreaterThanOrEqual(0);
      expect(Math.abs(drift)).toBeLessThanOrEqual(Math.abs(reach) + 1e-9);
    });
  });

  it('rests exactly where it was painted at the start of a tide with no lag', () => {
    expect(cloudDrift(0, 9, 2, 0)).toBe(0);
  });

  it('goes the whole way out and comes the whole way back', () => {
    const drifts = Array.from({ length: 401 }, (_, index) => cloudDrift(index / 400, 10, 2, 0));

    expect(Math.max(...drifts)).toBeCloseTo(10, 3);
    expect(Math.min(...drifts)).toBeCloseTo(0, 6);
  });

  it('goes out and back as many times in a tide as it has beats', () => {
    const peaks = (beats: number) => {
      const drifts = Array.from({ length: 1201 }, (_, index) => cloudDrift(index / 1200, 10, beats, 0));
      return drifts.filter((drift, index) => index > 0 && index < 1200 && drift > drifts[index - 1] && drift >= drifts[index + 1]).length;
    };

    expect(peaks(2)).toBe(2);
    expect(peaks(3)).toBe(3);
  });

  it('comes round to where it began', () => {
    expect(cloudDrift(1, 12, 3, 0.15)).toBeCloseTo(cloudDrift(0, 12, 3, 0.15), 6);
  });

  it('starts a cloud with a lag part of the way out', () => {
    expect(cloudDrift(0, 10, 2, 0.5)).toBeCloseTo(10, 6);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])('rests for a tide of %p', (tide) => {
    expect(cloudDrift(tide, 10, 2, 0)).toBe(0);
  });
});

describe('billowSwell', () => {
  it('never makes a cloud smaller than it was painted, so it always covers itself', () => {
    STEPS.forEach((tide) => {
      [0, 1].forEach((index) => expect(billowSwell(tide, index)).toBeGreaterThanOrEqual(1));
    });
  });

  it('swells it by a few parts in a hundred and no more', () => {
    const swells = Array.from({ length: 401 }, (_, index) => billowSwell(index / 400, 0));

    expect(Math.max(...swells)).toBeCloseTo(1 + ISLAND_LIFE.billowSwell, 4);
    expect(ISLAND_LIFE.billowSwell).toBeLessThanOrEqual(0.05);
    expect(ISLAND_LIFE.billowSwell).toBeGreaterThan(0.01);
  });

  it('comes round to where it began, and swells the two corners out of step', () => {
    expect(billowSwell(1, 0)).toBeCloseTo(billowSwell(0, 0), 6);
    expect(billowSwell(0.1, 0)).not.toBeCloseTo(billowSwell(0.1, 1), 4);
  });

  it('is its own size for a tide that is not a number', () => {
    expect(billowSwell(Number.NaN, 0)).toBe(1);
  });
});

describe('waterGlow', () => {
  const SHEETS = 3;

  it.each([0, 1, 2])('shows sheet %i whole when its turn comes', (sheet) => {
    expect(waterGlow(sheet / SHEETS, sheet, SHEETS)).toBeCloseTo(1, 6);
  });

  it.each([0, 1, 2])('hides sheet %i when the turn is as far from it as it can be', (sheet) => {
    expect(waterGlow((sheet / SHEETS + 0.5) % 1, sheet, SHEETS)).toBe(0);
  });

  it('always shows the same amount of light between them, so the water never pulses', () => {
    Array.from({ length: 121 }, (_, index) => index / 120).forEach((ripple) => {
      const light = [0, 1, 2].reduce((sum, sheet) => sum + waterGlow(ripple, sheet, SHEETS), 0);

      expect(light).toBeCloseTo(1, 6);
    });
  });

  it('never shows more than two sheets at once', () => {
    STEPS.forEach((ripple) => {
      expect([0, 1, 2].filter((sheet) => waterGlow(ripple, sheet, SHEETS) > 0).length).toBeLessThanOrEqual(2);
    });
  });

  it('shows the first sheet again as the ripple comes round', () => {
    expect(waterGlow(0.98, 0, SHEETS)).toBeGreaterThan(0.9);
    expect(waterGlow(1, 0, SHEETS)).toBeCloseTo(waterGlow(0, 0, SHEETS), 6);
  });

  it.each([
    [Number.NaN, 0, 3],
    [0.2, 0, 0],
    [0.2, 0, Number.NaN],
  ])('shows nothing for a ripple of %p on sheet %p of %p', (ripple, sheet, sheets) => {
    expect(waterGlow(ripple, sheet, sheets)).toBe(0);
  });
});

describe('the gulls', () => {
  it('are a few, not a flock', () => {
    expect(GULL_COURSES.length).toBeGreaterThanOrEqual(3);
    expect(GULL_COURSES.length).toBeLessThanOrEqual(5);
  });

  it.each(GULL_COURSES.map((course, index) => [index, course] as const))('gull %i begins and ends out of sight, off either side of the painting', (_index, course) => {
    const margin = course.size;

    expect(Math.min(course.fromX, course.toX)).toBeLessThanOrEqual(-margin);
    expect(Math.max(course.fromX, course.toX)).toBeGreaterThanOrEqual(ISLAND_ART.width + margin);
  });

  it.each(GULL_COURSES.map((course, index) => [index, course] as const))('gull %i stays inside the painting from top to bottom, bob and all', (_index, course) => {
    STEPS.forEach((progress) => {
      const place = gullPlace(progress, course);

      expect(place.y).toBeGreaterThan(course.size);
      expect(place.y).toBeLessThan(ISLAND_ART.height - course.size);
    });
  });

  it.each(GULL_COURSES.map((course, index) => [index, course] as const))('gull %i crosses in a whole number of laps, so the sky can turn for ever', (_index, course) => {
    expect(Number.isInteger(course.laps)).toBe(true);
    expect(course.laps).toBeGreaterThanOrEqual(1);
    expect(ISLAND_LIFE.skyMs / course.laps).toBeGreaterThanOrEqual(14000);
  });

  it('do not all set off together', () => {
    const lags = GULL_COURSES.map((course) => gullProgress(0, course));

    expect(new Set(lags.map((lag) => lag.toFixed(2))).size).toBe(GULL_COURSES.length);
  });

  describe('gullProgress', () => {
    const course = { ...GULL_COURSES[0], laps: 3, lag: 0.25 };

    it.each([
      [0, 0.25],
      [0.1, 0.55],
      [0.25, 0],
      [0.5, 0.75],
    ])('at a sky of %p is %p of the way across', (sky, expected) => {
      expect(gullProgress(sky, course)).toBeCloseTo(expected, 6);
    });

    it('is always from nought up to, but not reaching, one', () => {
      Array.from({ length: 301 }, (_, index) => index / 300).forEach((sky) => {
        const progress = gullProgress(sky, course);

        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThan(1);
      });
    });

    it('is at the start for a sky that is not a number', () => {
      expect(gullProgress(Number.NaN, course)).toBe(0);
    });
  });

  describe('gullPlace', () => {
    const course = { fromX: -100, fromY: 400, toX: 1300, toY: 600, laps: 2, lag: 0, bob: 10, bobs: 4, size: 40, near: 1.2, far: 0.8 };

    it('starts where the course starts and ends where it ends', () => {
      expect(gullPlace(0, course)).toEqual({ x: -100, y: 400, scale: 1.2 });
      expect(gullPlace(1, course).x).toBeCloseTo(1300, 6);
      expect(gullPlace(1, course).y).toBeCloseTo(600, 6);
      expect(gullPlace(1, course).scale).toBeCloseTo(0.8, 6);
    });

    it('goes steadily across', () => {
      const xs = STEPS.map((progress) => gullPlace(progress, course).x);

      xs.slice(1).forEach((x, index) => expect(x - xs[index]).toBeCloseTo(1400 / 40, 6));
    });

    it('rises and dips about its line by no more than its bob', () => {
      const off = Array.from({ length: 401 }, (_, index) => {
        const progress = index / 400;
        return gullPlace(progress, course).y - (400 + 200 * progress);
      });

      expect(Math.max(...off)).toBeCloseTo(10, 2);
      expect(Math.min(...off)).toBeCloseTo(-10, 2);
    });

    it('holds at the ends for a progress outside them', () => {
      expect(gullPlace(-1, course)).toEqual(gullPlace(0, course));
      expect(gullPlace(Number.NaN, course)).toEqual(gullPlace(0, course));
      expect(gullPlace(3, course).x).toBeCloseTo(1300, 6);
    });
  });

  describe('wingLift', () => {
    it('keeps the wings within what a gull can do', () => {
      Array.from({ length: 61 }, (_, index) => index / 60).forEach((beat) => {
        STEPS.forEach((progress) => {
          const lift = wingLift(beat, progress, 0);

          expect(lift).toBeLessThanOrEqual(ISLAND_LIFE.wingGlide + ISLAND_LIFE.wingFlap + 1e-9);
          expect(lift).toBeGreaterThanOrEqual(ISLAND_LIFE.wingGlide - ISLAND_LIFE.wingFlap - 1e-9);
        });
      });
    });

    it('flaps for part of the way and glides, wings held a little up, for part of it', () => {
      const span = (progress: number) => {
        const lifts = Array.from({ length: 61 }, (_, index) => wingLift(index / 60, progress, 0));
        return Math.max(...lifts) - Math.min(...lifts);
      };
      const spans = Array.from({ length: 101 }, (_, index) => span(index / 100));

      expect(Math.max(...spans)).toBeGreaterThan(ISLAND_LIFE.wingFlap * 1.6);
      expect(Math.min(...spans)).toBeLessThan(0.01);
      expect(wingLift(0.3, spans.indexOf(Math.min(...spans)) / 100, 0)).toBeCloseTo(ISLAND_LIFE.wingGlide, 4);
    });

    it('comes round with the beat', () => {
      expect(wingLift(1, 0.1, 0)).toBeCloseTo(wingLift(0, 0.1, 0), 6);
    });

    it('does not beat every gull`s wings together', () => {
      const beats = Array.from({ length: 120 }, (_, index) => index / 120);
      const highest = (progress: number, gull: number) => {
        const lifts = beats.map((beat) => wingLift(beat, progress, gull));
        return beats[lifts.indexOf(Math.max(...lifts))];
      };
      const flapsHard = (progress: number, gull: number) =>
        Math.max(...beats.map((beat) => wingLift(beat, progress, gull))) > ISLAND_LIFE.wingGlide + ISLAND_LIFE.wingFlap * 0.9;
      const both = Array.from({ length: 201 }, (_, index) => index / 200).find(
        (progress) => flapsHard(progress, 0) && flapsHard(progress, 1)
      );

      expect(both).toBeDefined();
      expect(Math.abs(highest(both ?? 0, 0) - highest(both ?? 0, 1))).toBeGreaterThan(0.1);
    });

    it('glides for a beat that is not a number', () => {
      expect(wingLift(Number.NaN, 0.1, 0)).toBe(ISLAND_LIFE.wingGlide);
    });
  });
});
