import { buildHoldPlan, holdMoveMs, holdProgress, holdRun, MAX_HOLD_MS, DEFAULT_HOLD_RATIO, RELEASE_SNAP_MS } from '@/services/hold-plan';
import { buildMelodyTimeline } from '@/services/melody-scheduler';

describe('buildHoldPlan', () => {
  it('holds every note for most of its slot when the song says nothing else', () => {
    const plan = buildHoldPlan(['C', 'D'], 120, [1, 2]);
    // A beat is 500ms at 120bpm, and a note sounds for 0.85 of its slot.
    expect(plan.targets[0].holdMs).toBeCloseTo(500 * DEFAULT_HOLD_RATIO, 0);
    expect(plan.targets[1].holdMs).toBeCloseTo(1000 * DEFAULT_HOLD_RATIO, 0);
  });

  it('leaves a gap at the end of the slot so the next note can articulate', () => {
    // A beat is 500ms at 120bpm; the note has to stop short of that.
    const plan = buildHoldPlan(['C', 'D'], 120, [1, 1]);
    expect(plan.targets[0].holdMs).toBeLessThan(500);
    expect(plan.targets[0].holdMs).toBeGreaterThan(350);
  });

  it('gives every note one beat when the song has no rhythm at all', () => {
    const plan = buildHoldPlan(['C', 'D', 'E'], 120);
    expect(plan.targets.map(t => t.holdMs)).toEqual([
      500 * DEFAULT_HOLD_RATIO, 500 * DEFAULT_HOLD_RATIO, 500 * DEFAULT_HOLD_RATIO,
    ]);
  });

  it('takes an explicit hold over the one derived from the slot', () => {
    const plan = buildHoldPlan(['C', 'D'], 120, [2, 2], [0.4, 1.8]);
    expect(plan.targets[0].holdMs).toBeCloseTo(200, 0);
    expect(plan.targets[1].holdMs).toBeCloseTo(900, 0);
  });

  it('never asks for longer than blow mode can sustain', () => {
    // 8 beats at 60bpm is 8 seconds; the note would fade long before that.
    const plan = buildHoldPlan(['C'], 60, [8]);
    expect(plan.targets[0].holdMs).toBe(MAX_HOLD_MS);
  });

  it('caps to something a child can actually hold', () => {
    expect(MAX_HOLD_MS).toBeLessThan(3000);
  });

  it('reads a chord entry as every lane that has to be held', () => {
    expect(buildHoldPlan(['C+E'], 120).targets[0].notes).toEqual(['C', 'E']);
  });

  it('ignores a rhythm that does not line up with the sequence', () => {
    const plan = buildHoldPlan(['C', 'D', 'E'], 120, [1, 2]);
    expect(plan.targets.map(t => t.holdMs)).toEqual([
      500 * DEFAULT_HOLD_RATIO, 500 * DEFAULT_HOLD_RATIO, 500 * DEFAULT_HOLD_RATIO,
    ]);
  });

  it('says when a song has nothing to teach about length', () => {
    expect(buildHoldPlan(['C', 'D'], 120).isUniform).toBe(true);
    expect(buildHoldPlan(['C', 'D'], 120, [1, 1]).isUniform).toBe(true);
    expect(buildHoldPlan(['C', 'D'], 120, [1, 2]).isUniform).toBe(false);
  });

  it('has no targets for an empty sequence', () => {
    expect(buildHoldPlan([], 120).targets).toEqual([]);
  });

  it('falls back to a sane tempo for a nonsense bpm', () => {
    expect(buildHoldPlan(['C'], 0, [1]).targets[0].holdMs).toBeGreaterThan(0);
    expect(buildHoldPlan(['C'], -5, [1]).targets[0].holdMs).toBeGreaterThan(0);
  });
});

describe('holdProgress', () => {
  const target = { index: 0, notes: ['C'], holdMs: 400, slotMs: 500 };

  it('reads nothing before the note is held', () => {
    expect(holdProgress(0, target)).toBe(0);
  });

  it('fills across the hold', () => {
    expect(holdProgress(200, target)).toBeCloseTo(0.5, 3);
  });

  it('stops at full, however long the note is held', () => {
    expect(holdProgress(400, target)).toBe(1);
    expect(holdProgress(4000, target)).toBe(1);
  });

  it('counts a note with nothing to hold as already done', () => {
    expect(holdProgress(0, { ...target, holdMs: 0 })).toBe(1);
  });
});

describe('holdRun', () => {
  it('runs a press over the whole hold, at the rate of the hold', () => {
    expect(holdRun(true, true, 800)).toEqual({ to: 1, durationMs: 800, fromStart: true });
  });

  it('carries a press on the same note on from wherever the move reached', () => {
    // Pressing again part-way through a snap-back must not restart the move:
    // that jumped the score by whatever the snap had not yet undone.
    expect(holdRun(true, false, 800).fromStart).toBe(false);
    expect(holdRun(true, false, 800).durationMs).toBe(800);
  });

  it('still takes the whole hold, so the note ends where it should', () => {
    // However far along it already was, a press runs for the same span the
    // credit waits -- so the score reaches the end of the travel as it counts.
    expect(holdRun(true, false, 800).durationMs).toBe(holdRun(true, true, 800).durationMs);
  });

  it('carries a release on from wherever the move reached', () => {
    // Not "from 0.7" -- from wherever it is. Only the UI thread knows that, and
    // handing it a JS-side copy snapped the score back several frames.
    const run = holdRun(false, false, 800);
    expect(run).toEqual({ to: 0, durationMs: RELEASE_SNAP_MS, fromStart: false });
  });

  it('begins from nothing only on a note it has just moved on to', () => {
    // That one has to: its resting place has already shifted along by a whole
    // note's travel, so the leftover move would draw it that far out.
    expect(holdRun(false, true, 800).fromStart).toBe(true);
    expect(holdRun(true, true, 800).fromStart).toBe(true);
    expect(holdRun(false, false, 800).fromStart).toBe(false);
    expect(holdRun(true, false, 800).fromStart).toBe(false);
  });

  it('snaps back in the same moment however long the note was', () => {
    expect(holdRun(false, false, 2000).durationMs).toBe(holdRun(false, false, 300).durationMs);
  });

  it('is quick enough to read as "hold it again" rather than a rewind', () => {
    expect(RELEASE_SNAP_MS).toBeLessThan(300);
  });

  it('never asks for a negative duration', () => {
    expect(holdRun(true, true, -50).durationMs).toBe(0);
  });
});

describe('slot length', () => {
  it('is the whole slot, not the part of it the note sounds for', () => {
    const plan = buildHoldPlan(['C', 'D'], 120, [1, 2]);
    expect(plan.targets.map(t => t.slotMs)).toEqual([500, 1000]);
    expect(plan.targets[0].holdMs).toBeLessThan(plan.targets[0].slotMs);
  });

  it('matches the reward melody note for note, so the sheet can move with it', () => {
    // The melody starts each note one slot after the last. If these two ever
    // disagreed the score would finish a note's travel early and stall, or run
    // past the note still sounding.
    const sequence = ['C', 'C', 'C', 'D', 'E', 'D', 'C', 'E', 'D', 'D', 'C'];
    const rhythm = [1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 4];
    const plan = buildHoldPlan(sequence, 90, rhythm);
    const melody = buildMelodyTimeline(sequence, 90, rhythm);
    expect(plan.targets.map(t => t.slotMs)).toEqual(melody.events.map(e => e.slotMs));
  });

  it('is never cut short by the blow-mode clamp', () => {
    // Eight beats at 60bpm is 8s. The hold is capped at 2s, but the note still
    // occupies its full slot when the melody plays it.
    const plan = buildHoldPlan(['C'], 60, [8]);
    expect(plan.targets[0].holdMs).toBe(MAX_HOLD_MS);
    expect(plan.targets[0].slotMs).toBe(8000);
  });

  it('gives every entry one beat when the song has no rhythm', () => {
    expect(buildHoldPlan(['C', 'D'], 120).targets.map(t => t.slotMs)).toEqual([500, 500]);
  });
});

describe('holdMoveMs', () => {
  const plan = buildHoldPlan(['C', 'D'], 90, [1, 4]);

  it('covers a note in the time the child has to hold it', () => {
    expect(holdMoveMs(plan.targets[0], false)).toBe(plan.targets[0].holdMs);
  });

  it('covers a note in its whole slot when the melody plays it back', () => {
    // Otherwise the score finishes early and stands still until the next note
    // sounds -- 667ms of dead time on the four-beat note below.
    expect(holdMoveMs(plan.targets[1], true)).toBe(plan.targets[1].slotMs);
    expect(holdMoveMs(plan.targets[1], true) - holdMoveMs(plan.targets[1], false)).toBeGreaterThan(600);
  });

  it('never moves for a note that is not there', () => {
    expect(holdMoveMs(undefined, true)).toBe(0);
    expect(holdMoveMs(undefined, false)).toBe(0);
  });
});
