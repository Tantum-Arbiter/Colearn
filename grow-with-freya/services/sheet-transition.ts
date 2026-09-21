/**
 * Timings for the two things the music sheet says without words.
 *
 * Pure numbers -- no React, no timers. The sheet animates these on the UI
 * thread and `useMusicChallenge` schedules its reset against the same figures,
 * so the score only ever changes while the notes are hidden behind the cue.
 * Splitting them would let the child watch the sheet snap back to the first
 * note, which is the thing both cues exist to cover.
 */

/** A wrong note, or a finished song offering itself to be played again. */
export type SheetCue = 'wrong' | 'replay';

/** How long the red wash takes to come up over the paper, and to leave again. */
export const ERROR_RED_IN_MS = 180;
export const ERROR_RED_OUT_MS = 220;

/**
 * How long the notes take to leave the page, and to come back.
 *
 * The way in is the longer of the two, and both run at an even rate rather than
 * easing out. Coloured notes on cream paper only start to read somewhere around
 * two-fifths opacity, so an eased fade -- quickest at the start -- crossed into
 * visibility in the first fifth of its duration and looked like the song simply
 * appearing. Even, and longer, spends most of the fade in the part of the range
 * the eye can actually follow.
 */
export const NOTES_OUT_MS = 260;
export const NOTES_IN_MS = 520;

/**
 * The moment the notes are fully hidden, measured from the start of the cue.
 *
 * This is when the score may be reset. A wrong note shows the red wash first --
 * the child needs to see *that* something went wrong before the page clears --
 * so its notes start leaving only once the red has gone.
 */
export function cueMaskedAtMs(cue: SheetCue): number {
  return cue === 'wrong'
    ? ERROR_RED_IN_MS + ERROR_RED_OUT_MS + NOTES_OUT_MS
    : NOTES_OUT_MS;
}

/** How long the whole cue lasts, from the first frame to the notes being back. */
export function cueTotalMs(cue: SheetCue): number {
  return cueMaskedAtMs(cue) + NOTES_IN_MS;
}

/** How long the notes are away for, once hidden. */
export function cueHiddenMs(cue: SheetCue): number {
  return cueTotalMs(cue) - cueMaskedAtMs(cue);
}
