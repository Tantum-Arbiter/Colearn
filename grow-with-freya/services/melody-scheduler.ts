import { parseChordEntry } from '@/services/sequence-matcher';

export interface MelodyEvent {
  index: number;
  notes: string[];
  startMs: number;
  slotMs: number;
  soundMs: number;
}

export interface MelodyTimeline {
  events: MelodyEvent[];
  totalMs: number;
}

export const MELODY_TAIL_MS = 350;
const MIN_BPM = 30;
const MAX_BPM = 300;
const ARTICULATION_RATIO = 0.15;
const MIN_ARTICULATION_MS = 40;
const MAX_ARTICULATION_MS = 140;

function beatsFor(sequence: string[], rhythm?: number[]): number[] {
  const usable = rhythm !== undefined
    && rhythm.length === sequence.length
    && rhythm.every(beats => Number.isFinite(beats) && beats > 0);
  return usable ? rhythm : sequence.map(() => 1);
}

export function buildMelodyTimeline(sequence: string[], bpm: number, rhythm?: number[]): MelodyTimeline {
  if (sequence.length === 0) {
    return { events: [], totalMs: 0 };
  }
  const beatMs = 60000 / Math.min(MAX_BPM, Math.max(MIN_BPM, bpm || 0));
  const beats = beatsFor(sequence, rhythm);
  let cursorMs = 0;
  const events = sequence.map((entry, index) => {
    const slotMs = Math.round(beats[index] * beatMs);
    const articulationMs = Math.min(MAX_ARTICULATION_MS, Math.max(MIN_ARTICULATION_MS, Math.round(slotMs * ARTICULATION_RATIO)));
    const event: MelodyEvent = {
      index,
      notes: parseChordEntry(entry),
      startMs: cursorMs,
      slotMs,
      soundMs: Math.max(1, slotMs - articulationMs),
    };
    cursorMs += slotMs;
    return event;
  });
  return { events, totalMs: cursorMs + MELODY_TAIL_MS };
}
