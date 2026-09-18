/**
 * Tests for `choreograph` -- the helper that exists so that one shared value
 * can only ever carry one animation.
 *
 * The global reanimated mock in `jest.setup.js` flattens delays and fires
 * timing callbacks synchronously, which is fine for rendering components but
 * useless for asserting anything about a timeline. This file replaces it with
 * a recording mock: the animation builders return plain descriptions, so a
 * test can read back exactly what was assigned to each value, when each beat
 * runs, and what the value ends at.
 */

import { choreograph, type Track } from '@/utils/choreograph';

jest.mock('react-native-reanimated', () => ({
  withTiming: (to: number, config: any, callback?: (finished: boolean) => void) => ({
    kind: 'timing',
    to,
    duration: config?.duration ?? 300,
    easing: config?.easing,
    // the key's presence matters, not just its value -- see the easing tests
    configKeys: config ? Object.keys(config) : [],
    callback,
  }),
  withDelay: (ms: number, animation: any) => ({ kind: 'delay', ms, animation }),
  withSequence: (...animations: any[]) => ({ kind: 'sequence', animations }),
  runOnJS: (fn: (...args: any[]) => void) => fn,
}));

/** A shared value that remembers every assignment made to it. */
function makeValue(initial = 0) {
  const assignments: any[] = [];
  return {
    get value() {
      return assignments.length ? assignments[assignments.length - 1] : initial;
    },
    set value(next: any) {
      assignments.push(next);
    },
    assignments,
  } as any;
}

/**
 * Walks a recorded animation, returning the value it settles at, the moment
 * it finishes, and the beats it passes through on the way.
 */
function replay(animation: any, startsAt = 0): {
  endsAt: number;
  to: number;
  beats: Array<{ at: number; to: number; over: number }>;
  callbacks: Array<{ at: number; fire: (finished: boolean) => void }>;
} {
  if (animation.kind === 'delay') {
    return replay(animation.animation, startsAt + animation.ms);
  }

  if (animation.kind === 'sequence') {
    let cursor = startsAt;
    const beats: Array<{ at: number; to: number; over: number }> = [];
    const callbacks: Array<{ at: number; fire: (finished: boolean) => void }> = [];
    let to = 0;

    for (const step of animation.animations) {
      const played = replay(step, cursor);
      beats.push(...played.beats);
      callbacks.push(...played.callbacks);
      cursor = played.endsAt;
      to = played.to;
    }

    return { endsAt: cursor, to, beats, callbacks };
  }

  const endsAt = startsAt + animation.duration;
  return {
    endsAt,
    to: animation.to,
    beats: [{ at: startsAt, to: animation.to, over: animation.duration }],
    callbacks: animation.callback ? [{ at: endsAt, fire: animation.callback }] : [],
  };
}

describe('choreograph', () => {
  it('assigns exactly one animation to a value, however many beats it has', () => {
    const opacity = makeValue();

    choreograph([
      {
        on: opacity,
        name: 'opacity',
        beats: [
          { at: 0, to: 1, over: 140 },
          { at: 600, to: 0, over: 180 },
          { at: 900, to: 1, over: 100 },
        ],
      },
    ]);

    expect(opacity.assignments).toHaveLength(1);
  });

  it('ends at the last beat’s target rather than the first’s', () => {
    const opacity = makeValue();

    choreograph([
      {
        on: opacity,
        name: 'opacity',
        beats: [
          { at: 0, to: 1, over: 140 },
          { at: 600, to: 0, over: 180 },
        ],
      },
    ]);

    // the defect this replaces: the second assignment cancelled the first and
    // the value went straight to 0, never having been seen at 1
    const played = replay(opacity.value);
    expect(played.to).toBe(0);
    expect(played.beats).toEqual([
      { at: 0, to: 1, over: 140 },
      { at: 600, to: 0, over: 180 },
    ]);
  });

  it('places every beat on the choreography’s clock, not the previous beat’s', () => {
    const morph = makeValue();

    choreograph([
      {
        on: morph,
        name: 'morph',
        beats: [
          { at: 620, to: 1, over: 340 },
          { at: 1500, to: 0, over: 200 },
        ],
      },
    ]);

    const played = replay(morph.value);
    expect(played.beats.map((beat) => beat.at)).toEqual([620, 1500]);
    expect(played.endsAt).toBe(1700);
  });

  it('snaps a value to its start before anything animates', () => {
    const scale = makeValue(1);

    choreograph([
      { on: scale, name: 'scale', from: 0.55, beats: [{ at: 0, to: 1, over: 320 }] },
    ]);

    expect(scale.assignments).toHaveLength(2);
    expect(scale.assignments[0]).toBe(0.55);
    expect(replay(scale.assignments[1]).to).toBe(1);
  });

  it('accepts a track that only places a value, with nothing to animate', () => {
    const travel = makeValue(1);

    choreograph([{ on: travel, name: 'travel', from: 0, beats: [] }]);

    expect(travel.assignments).toEqual([0]);
  });

  it('refuses two tracks on one shared value', () => {
    const opacity = makeValue();

    expect(() =>
      choreograph([
        { on: opacity, name: 'fade in', beats: [{ at: 0, to: 1, over: 140 }] },
        { on: opacity, name: 'fade out', beats: [{ at: 600, to: 0, over: 180 }] },
      ])
    ).toThrow(/already owns/);
  });

  it('refuses beats that overlap, since the second would silently start late', () => {
    const opacity = makeValue();

    expect(() =>
      choreograph([
        {
          on: opacity,
          name: 'opacity',
          beats: [
            { at: 0, to: 1, over: 200 },
            { at: 150, to: 0, over: 100 },
          ],
        },
      ])
    ).toThrow(/before the previous beat ends/);
  });

  it('reports the length of the whole piece', () => {
    const short = makeValue();
    const long = makeValue();

    const total = choreograph([
      { on: short, name: 'short', beats: [{ at: 0, to: 1, over: 140 }] },
      { on: long, name: 'long', beats: [{ at: 620, to: 1, over: 340 }] },
    ]);

    expect(total).toBe(960);
  });

  describe('easing', () => {
    it('leaves the easing key out entirely when a beat has none', () => {
      // The defect this pins: passing `easing: undefined` is not the same as
      // omitting it. Reanimated crashed the app natively -- straight to the
      // home screen, no red box -- the moment the glance opened. The original
      // hand-written code omitted the key, and only the rewrite started
      // passing it as undefined.
      const value = makeValue();

      choreograph([
        { on: value, name: 'value', beats: [{ at: 0, to: 1, over: 140 }] },
      ]);

      expect(value.value.configKeys).toEqual(['duration']);
    });

    it('passes the easing through when a beat has one', () => {
      const value = makeValue();
      const easing = () => 0;

      choreograph([
        { on: value, name: 'value', beats: [{ at: 0, to: 1, over: 140, easing }] },
      ]);

      expect(value.value.configKeys.sort()).toEqual(['duration', 'easing']);
      expect(value.value.easing).toBe(easing);
    });

    it('omits it per beat, so one eased beat does not force the others', () => {
      const value = makeValue();
      const easing = () => 0;

      choreograph([
        {
          on: value,
          name: 'value',
          beats: [
            { at: 0, to: 1, over: 140 },
            { at: 600, to: 0, over: 180, easing },
          ],
        },
      ]);

      const [first, second] = value.value.animations;
      expect(first.configKeys).toEqual(['duration']);
      expect(second.animation.configKeys.sort()).toEqual(['duration', 'easing']);
    });
  });

  describe('the finishing callback', () => {
    it('hangs on the track that ends last, not the one declared last', () => {
      const early = makeValue();
      const late = makeValue();
      const onFinished = jest.fn();

      choreograph(
        [
          { on: late, name: 'late', beats: [{ at: 300, to: 1, over: 900 }] },
          { on: early, name: 'early', beats: [{ at: 0, to: 1, over: 140 }] },
        ],
        { onFinished }
      );

      expect(replay(early.value).callbacks).toHaveLength(0);

      const played = replay(late.value);
      expect(played.callbacks).toHaveLength(1);
      expect(played.callbacks[0].at).toBe(1200);
    });

    it('fires only after the last beat, and only if it finished', () => {
      const value = makeValue();
      const onFinished = jest.fn();

      choreograph(
        [
          {
            on: value,
            name: 'value',
            beats: [
              { at: 0, to: 1, over: 140 },
              { at: 600, to: 0, over: 180 },
            ],
          },
        ],
        { onFinished }
      );

      const played = replay(value.value);
      expect(played.callbacks).toHaveLength(1);
      expect(played.callbacks[0].at).toBe(780);

      played.callbacks[0].fire(false);
      expect(onFinished).not.toHaveBeenCalled();

      played.callbacks[0].fire(true);
      expect(onFinished).toHaveBeenCalledTimes(1);
    });

    it('refuses to be given a callback with nothing to hang it on', () => {
      const value = makeValue();

      expect(() =>
        choreograph([{ on: value, name: 'value', from: 0, beats: [] }], {
          onFinished: jest.fn(),
        })
      ).toThrow(/no track has a beat/);
    });
  });
});