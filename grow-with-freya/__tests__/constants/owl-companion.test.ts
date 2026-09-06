/**
 * Tests for the owl companion's sprite geometry and clip tables.
 *
 * The sheet is a 4x4 grid sliced from a 50-frame source, so the frame indices
 * in the clips are the only thing standing between a clip and a wrong owl.
 * These assertions pin the geometry to the packed asset and keep every clip
 * pointing at a frame that exists.
 */

import {
  OWL_SHEET,
  OWL_FRAME_COUNT,
  OWL_CLIPS,
  OWL_CLIP_NAMES,
  owlFrameOffset,
  owlClipDuration,
} from '@/constants/owl-companion';

describe('OWL_SHEET', () => {
  it('describes the packed 4x4 sheet', () => {
    expect(OWL_SHEET.columns).toBe(4);
    expect(OWL_SHEET.rows).toBe(4);
    expect(OWL_SHEET.frameWidth).toBe(174);
    expect(OWL_SHEET.frameHeight).toBe(162);
  });

  it('counts one frame per cell', () => {
    expect(OWL_FRAME_COUNT).toBe(16);
  });
});

describe('owlFrameOffset', () => {
  it('puts the first frame at the sheet origin', () => {
    expect(owlFrameOffset(0)).toEqual({ left: 0, top: 0 });
  });

  it('walks across a row before dropping to the next', () => {
    expect(owlFrameOffset(3)).toEqual({ left: -3 * 174, top: 0 });
    expect(owlFrameOffset(4)).toEqual({ left: 0, top: -162 });
  });

  it('reaches the last cell of the sheet', () => {
    expect(owlFrameOffset(15)).toEqual({ left: -3 * 174, top: -3 * 162 });
  });
});

describe('OWL_CLIPS', () => {
  it('offers idle, talk, wave and delight', () => {
    expect(OWL_CLIP_NAMES).toEqual(['idle', 'talk', 'wave', 'delight']);
  });

  it.each(OWL_CLIP_NAMES)('%s only references frames on the sheet', (name) => {
    const frames = OWL_CLIPS[name].steps.map((step) => step.frame);

    expect(Math.min(...frames)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...frames)).toBeLessThan(OWL_FRAME_COUNT);
  });

  it.each(OWL_CLIP_NAMES)('%s holds every frame for a visible moment', (name) => {
    const durations = OWL_CLIPS[name].steps.map((step) => step.ms);

    expect(Math.min(...durations)).toBeGreaterThanOrEqual(60);
  });

  it('loops idle and talk, but plays wave and delight once', () => {
    expect(OWL_CLIPS.idle.loop).toBe(true);
    expect(OWL_CLIPS.talk.loop).toBe(true);
    expect(OWL_CLIPS.wave.loop).toBe(false);
    expect(OWL_CLIPS.delight.loop).toBe(false);
  });

  it('works the beak through talk rather than opening it once', () => {
    const openMouthFrames = [4, 5, 6, 7];
    const talkFrames = OWL_CLIPS.talk.steps.map((step) => step.frame);

    expect(talkFrames.filter((frame) => openMouthFrames.includes(frame)).length).toBeGreaterThan(2);
  });

  it('lets idle hoot only in passing, never sitting open-mouthed', () => {
    const openMouthFrames = [4, 5, 6, 7];
    const open = OWL_CLIPS.idle.steps.filter((step) => openMouthFrames.includes(step.frame));

    expect(open.length).toBeLessThanOrEqual(1);
    expect(open.every((step) => step.ms <= 250)).toBe(true);
  });

  /**
   * The regression this guards: idle was first built from four near-identical
   * frames held 1.3--1.7s apiece, chosen to eliminate body jitter. On device it
   * read as a still image -- 2.3s of literally zero changed pixels between
   * screenshots. An owl that never moves is not an animation, so no idle frame
   * may outstay a second.
   */
  it('never holds an idle frame long enough to read as a still image', () => {
    const longest = Math.max(...OWL_CLIPS.idle.steps.map((step) => step.ms));

    expect(longest).toBeLessThanOrEqual(1000);
  });

  it('gives idle a wing beat so the motion is not only blinks', () => {
    const wingFrames = OWL_CLIPS.idle.steps.filter((step) => step.frame >= 12);

    expect(wingFrames.length).toBeGreaterThan(0);
  });

  it('blinks during idle', () => {
    const eyesClosedFrames = [8, 9, 10];
    const idleFrames = OWL_CLIPS.idle.steps.map((step) => step.frame);

    expect(idleFrames.some((frame) => eyesClosedFrames.includes(frame))).toBe(true);
  });

  it('raises the wing through the wave rather than snapping to it', () => {
    const wingFrames = OWL_CLIPS.wave.steps
      .map((step) => step.frame)
      .filter((frame) => frame >= 12);

    expect(wingFrames).toEqual([12, 13, 14, 15, 14, 13, 12]);
  });

  it('ends the wave on the resting frame so idle can take over invisibly', () => {
    const steps = OWL_CLIPS.wave.steps;

    expect(steps[steps.length - 1].frame).toBe(0);
  });
});

describe('owlClipDuration', () => {
  it('sums the clip it is given', () => {
    expect(owlClipDuration('wave')).toBe(
      OWL_CLIPS.wave.steps.reduce((total, step) => total + step.ms, 0)
    );
  });

  it('keeps the wave short enough to precede a message', () => {
    expect(owlClipDuration('wave')).toBeLessThanOrEqual(1400);
  });
});
