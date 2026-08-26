import {
  runOnJS,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
  type WithTimingConfig,
} from 'react-native-reanimated';

/**
 * One move a shared value makes, placed on the choreography's own clock.
 *
 * `at` is milliseconds from the start of the whole piece rather than from
 * the previous beat, because that is how choreography is actually reasoned
 * about ("the border picks up just before the line lands"). Offsets from the
 * previous beat have to be re-derived by hand every time the order changes,
 * which is exactly the arithmetic this replaces.
 */
export interface Beat {
  /** milliseconds from the start of the choreography */
  at: number;
  /** what the value arrives at */
  to: number;
  /** how long it takes to get there; omitted or zero snaps */
  over?: number;
  easing?: WithTimingConfig['easing'];
}

/**
 * Everything one shared value does, in one place.
 *
 * A track owns its value for the length of the piece: `choreograph` assigns
 * to it exactly once. `beats` may be empty when a track exists only to place
 * the value somewhere before the piece starts.
 */
export interface Track {
  /** the shared value this track owns */
  on: SharedValue<number>;
  /** used in validation messages; no effect on the motion */
  name: string;
  /** where the value starts, snapped before anything animates */
  from?: number;
  /** what it does, in time order */
  beats: Beat[];
}

export interface ChoreographyOptions {
  /**
   * Called on the JS thread once the piece has finished -- attached to the
   * last beat of whichever track ends last, so it cannot be hung on an
   * animation that happens to finish early.
   */
  onFinished?: () => void;
}

/**
 * Runs a whole piece of choreography, assigning exactly one animation to
 * each shared value.
 *
 * The bug this exists to make unrepresentable: assigning to a shared value
 * twice in the same handler silently discards the first animation. It
 * produced four separate "the thing never appeared" defects in the screen-
 * time glance alone -- the orb invisible through its whole spin, the spiral
 * arm never drawn, the closing teardrop never seen, the border's first
 * segment showing early -- each of which looked like a different bug and
 * needed a slow-motion recording to find.
 *
 * Here a value cannot be animated twice, because a track owns it and a
 * duplicate track is an error rather than a silent cancellation. Everything
 * a value does is sequenced into a single animation before it is assigned.
 *
 * It composes rather than forbids: a value no track claims can still be
 * animated by hand next to a `choreograph` call. What it rules out is the
 * same value being claimed twice.
 *
 * Returns the length of the piece in milliseconds.
 */
export function choreograph(tracks: Track[], options: ChoreographyOptions = {}): number {
  assertOneTrackPerValue(tracks);

  const ends = tracks.map((track, index) => trackEnd(track, index));
  const total = ends.reduce((longest, end) => Math.max(longest, end), 0);

  // the callback belongs to the track that finishes last, whichever that is
  // -- hanging it on a named animation is how the window once closed while
  // the orb was still half blue
  const closer = options.onFinished
    ? ends.findIndex((end, index) => end === total && tracks[index].beats.length > 0)
    : -1;

  if (options.onFinished && closer === -1) {
    throw new Error('choreograph: onFinished was given but no track has a beat to hang it on');
  }

  tracks.forEach((track, index) => {
    if (track.from !== undefined) {
      // a snap, not an animation: nothing is cancelled by the assignment
      // that follows it
      track.on.value = track.from;
    }

    if (track.beats.length === 0) {
      return;
    }

    const onFinished = index === closer ? options.onFinished : undefined;
    track.on.value = build(track.beats, onFinished);
  });

  return total;
}

/**
 * Sequences a track's beats into one animation, the delays between them
 * derived from the gaps on the choreography's clock.
 */
function build(beats: Beat[], onFinished?: () => void) {
  let cursor = 0;

  const steps = beats.map((beat, index) => {
    const over = beat.over ?? 0;
    const gap = beat.at - cursor;
    cursor = beat.at + over;

    const last = index === beats.length - 1;
    const step = withTiming(
      beat.to,
      { duration: over, easing: beat.easing },
      last && onFinished
        ? (finished) => {
            'worklet';
            if (finished) runOnJS(onFinished)();
          }
        : undefined
    );

    return gap > 0 ? withDelay(gap, step) : step;
  });

  return steps.length === 1 ? steps[0] : withSequence(...steps);
}

function trackEnd(track: Track, index: number): number {
  let cursor = 0;

  track.beats.forEach((beat, beatIndex) => {
    const over = beat.over ?? 0;
    const where = `${track.name || `track ${index}`} beat ${beatIndex}`;

    if (!Number.isFinite(beat.at) || beat.at < 0) {
      throw new Error(`choreograph: ${where} starts at ${beat.at}`);
    }
    if (!Number.isFinite(over) || over < 0) {
      throw new Error(`choreograph: ${where} runs for ${over}ms`);
    }
    // Beats on one value are sequential by construction, so an overlap does
    // not do what it reads as -- the second would start late rather than on
    // top. Saying so here beats discovering it on a device.
    if (beat.at < cursor) {
      throw new Error(
        `choreograph: ${where} starts at ${beat.at}ms, before the previous beat ends at ${cursor}ms`
      );
    }

    cursor = beat.at + over;
  });

  return cursor;
}

function assertOneTrackPerValue(tracks: Track[]): void {
  const claimed = new Set<SharedValue<number>>();

  for (const track of tracks) {
    if (claimed.has(track.on)) {
      throw new Error(
        `choreograph: "${track.name}" animates a shared value another track already owns. ` +
          'Two animations on one value cancel, silently -- merge them into one track.'
      );
    }
    claimed.add(track.on);
  }
}
