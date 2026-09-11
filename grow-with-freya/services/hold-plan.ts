/**
 * How long each note of a song is held.
 *
 * Pure maths -- no React, no clock, no timers. This is the whole of the
 * hold-the-note feature's data layer: it turns a song's `rhythm` (slot length in
 * beats) and optional `hold` (how much of the slot the note actually sounds)
 * into a millisecond target per entry, which the sheet draws as a shadow behind
 * the note and the child fills by keeping the note sounding.
 *
 * There is deliberately no timeline and no start time. The sheet moves only when
 * the right note is played, so nothing here needs to know *when* a note happens
 * -- only how long it lasts.
 */

import { parseChordEntry } from '@/services/sequence-matcher';

/**
 * Share of its slot a note sounds for when the song does not say otherwise. The
 * rest of the slot is the gap that lets the next note articulate -- the same
 * 0.85 the reward melody already plays at (`melody-scheduler`).
 */
export const DEFAULT_HOLD_RATIO = 0.85;

/**
 * Longest hold to ever ask for.
 *
 * In blow mode a note auto-fades after `BLOW_MAX_SUSTAIN_MS` (3 s) because iOS
 * cannot record the mic at full speaker volume, so a longer target would be
 * unachievable there. Clamped here, in the one place, so no drawing or judging
 * layer has to remember it -- and clamped for press mode too, so switching mode
 * never changes what the sheet asks for.
 */
export const MAX_HOLD_MS = 2000;

const MIN_BPM = 30;
const MAX_BPM = 300;

export interface HoldTarget {
  index: number;
  /** Every lane that has to be held: a chord entry needs all of them. */
  notes: string[];
  /** How long to hold, in ms, already clamped to what blow mode can sustain. */
  holdMs: number;
}

export interface HoldPlan {
  targets: HoldTarget[];
  /** True when every note is the same length, i.e. the song teaches nothing about it. */
  isUniform: boolean;
  /** One beat in ms at this song's tempo, for turning a hold into a length on the page. */
  beatMs: number;
}

/** Beats per entry, falling back to one beat each when the song's rhythm doesn't fit. */
function beatsFor(sequence: string[], beats?: number[]): number[] {
  const usable = beats !== undefined
    && beats.length === sequence.length
    && beats.every(value => Number.isFinite(value) && value > 0);
  return usable ? beats : sequence.map(() => 1);
}

export function buildHoldPlan(
  sequence: string[],
  bpm: number,
  rhythm?: number[],
  hold?: number[],
): HoldPlan {
  const beatMs = 60000 / Math.min(MAX_BPM, Math.max(MIN_BPM, bpm || 0));
  const slots = beatsFor(sequence, rhythm);
  const holds = hold !== undefined && hold.length === sequence.length && hold.every(v => Number.isFinite(v) && v > 0)
    ? hold
    : slots.map(slot => slot * DEFAULT_HOLD_RATIO);

  const targets = sequence.map((entry, index) => ({
    index,
    notes: parseChordEntry(entry),
    holdMs: Math.min(MAX_HOLD_MS, holds[index] * beatMs),
  }));

  const isUniform = targets.every(target => target.holdMs === targets[0]?.holdMs);
  return { targets, isUniform, beatMs };
}

/** Fraction of a target covered so far, 0-1. A note with nothing to hold is already done. */
export function holdProgress(heldMs: number, target: HoldTarget): number {
  if (target.holdMs <= 0) return 1;
  return Math.min(1, Math.max(0, heldMs) / target.holdMs);
}

/**
 * How long the hold takes to snap back when the note is let go early.
 *
 * A note only counts if it is held all the way through in one go -- the credit
 * starts again from zero on the next press -- so the sheet has to start again
 * too. It used to rewind at half the speed it ran, which meant the score spent
 * up to twice the hold sliding backwards with nothing held: long enough to read
 * as the sheet undoing itself rather than as "hold it again".
 */
export const RELEASE_SNAP_MS = 180;

export interface HoldRun {
  /** Where the hold starts from: always the beginning of a fresh press. */
  from: number;
  /** Where it is heading -- 1 for a hold running, 0 for one let go. */
  to: 0 | 1;
  durationMs: number;
}

/**
 * The move the sheet should make for a hold that is starting, or one let go.
 *
 * `at` is how much of the hold has run so far, which only matters on release --
 * a new press restarts the credit, so it restarts the sheet as well and the two
 * can never disagree about how much of the note is left.
 */
export function holdRun(holding: boolean, at: number, holdMs: number): HoldRun {
  if (holding) return { from: 0, to: 1, durationMs: Math.max(0, holdMs) };
  return { from: Math.min(1, Math.max(0, at)), to: 0, durationMs: RELEASE_SNAP_MS };
}
