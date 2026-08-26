import {
  runOnJS,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
  type WithTimingConfig,
} from 'react-native-reanimated';

export interface Beat {
  at: number;
  to: number;
  over?: number;
  easing?: WithTimingConfig['easing'];
}

export interface Track {
  on: SharedValue<number>;
  name: string;
  from?: number;
  beats: Beat[];
}

export interface ChoreographyOptions {
  onFinished?: () => void;
}

export function choreograph(tracks: Track[], options: ChoreographyOptions = {}): number {
  assertOneTrackPerValue(tracks);

  const ends = tracks.map((track, index) => trackEnd(track, index));
  const total = ends.reduce((longest, end) => Math.max(longest, end), 0);

  const closer = options.onFinished
    ? ends.findIndex((end, index) => end === total && tracks[index].beats.length > 0)
    : -1;

  if (options.onFinished && closer === -1) {
    throw new Error('choreograph: onFinished was given but no track has a beat to hang it on');
  }

  tracks.forEach((track, index) => {
    if (track.from !== undefined) {
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
