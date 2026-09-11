import { buildHoldPlan, holdProgress, holdRun, MAX_HOLD_MS, DEFAULT_HOLD_RATIO, RELEASE_SNAP_MS } from '@/services/hold-plan';

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
  const target = { index: 0, notes: ['C'], holdMs: 400 };

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
  it('runs a fresh press over the whole hold, at the rate of the hold', () => {
    expect(holdRun(true, 0, 800)).toEqual({ from: 0, to: 1, durationMs: 800 });
  });

  it('starts a press from the beginning however far the last one got', () => {
    // The credit starts again from zero on every press, so the sheet has to as
    // well -- otherwise it shows progress the score does not have.
    expect(holdRun(true, 0.7, 800).from).toBe(0);
    expect(holdRun(true, 0.7, 800).durationMs).toBe(800);
  });

  it('snaps back in a moment when the note is let go', () => {
    const run = holdRun(false, 0.7, 800);
    expect(run).toEqual({ from: 0.7, to: 0, durationMs: RELEASE_SNAP_MS });
  });

  it('snaps back in the same moment however long the note was', () => {
    expect(holdRun(false, 0.9, 2000).durationMs).toBe(holdRun(false, 0.1, 300).durationMs);
  });

  it('is quick enough to read as "hold it again" rather than a rewind', () => {
    expect(RELEASE_SNAP_MS).toBeLessThan(300);
  });

  it('keeps a nonsense position inside the hold', () => {
    expect(holdRun(false, 4, 800).from).toBe(1);
    expect(holdRun(false, -2, 800).from).toBe(0);
  });

  it('never asks for a negative duration', () => {
    expect(holdRun(true, 0, -50).durationMs).toBe(0);
  });
});
