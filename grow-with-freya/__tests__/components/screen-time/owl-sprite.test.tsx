/**
 * Tests for the owl sprite player.
 *
 * The owl is one image moved behind a window rather than fifty images swapped
 * in and out: swapping sources flickers on the first paint of each frame,
 * where a single already-decoded texture never does. So the assertions here
 * are about the window and the offset -- the clipped frame keeps its size and
 * the sheet slides underneath it -- not about which file is on screen.
 *
 * Fake timers stay inside the describes (see the auto-hide-controls test):
 * a file-level afterEach that restores real timers runs after Testing
 * Library's own cleanup and hangs the suite.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

import { OwlSprite } from '@/components/screen-time/owl-sprite';
import { OWL_CLIPS, OWL_SHEET, owlFrameOffset } from '@/constants/owl-companion';

const mockReducedMotion = jest.fn(() => false);
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReducedMotion(),
}));

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((node: any) => node.props.testID === testID);
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (merged, entry) => ({ ...merged, ...flattenStyle(entry) }),
      {}
    );
  }
  return (style ?? {}) as Record<string, unknown>;
}

function sheetStyle(tree: ReturnType<typeof render>) {
  return flattenStyle(findByTestId(tree, 'owl-sprite-sheet')[0].props.style);
}

function renderSprite(props: Partial<React.ComponentProps<typeof OwlSprite>> = {}) {
  return render(<OwlSprite clip="idle" width={120} {...props} />);
}

describe('OwlSprite', () => {
  beforeEach(() => {
    mockReducedMotion.mockReturnValue(false);
  });

  it('clips the sheet down to a single frame', () => {
    const tree = renderSprite({ width: 120 });

    const window = flattenStyle(findByTestId(tree, 'owl-sprite')[0].props.style);

    expect(window.width).toBe(120);
    expect(window.overflow).toBe('hidden');
  });

  it('keeps the frame aspect ratio when scaling the window', () => {
    const tree = renderSprite({ width: 87 });

    const window = flattenStyle(findByTestId(tree, 'owl-sprite')[0].props.style);

    expect(window.height).toBeCloseTo((87 * OWL_SHEET.frameHeight) / OWL_SHEET.frameWidth, 5);
  });

  it('scales the whole sheet by the same factor as the window', () => {
    const scale = 60 / OWL_SHEET.frameWidth;

    const style = sheetStyle(renderSprite({ width: 60 }));

    expect(style.width).toBeCloseTo(OWL_SHEET.columns * OWL_SHEET.frameWidth * scale, 5);
    expect(style.height).toBeCloseTo(OWL_SHEET.rows * OWL_SHEET.frameHeight * scale, 5);
  });

  it('starts on the first frame of the clip it is given', () => {
    const scale = 120 / OWL_SHEET.frameWidth;
    const expected = owlFrameOffset(OWL_CLIPS.wave.steps[0].frame);

    const style = sheetStyle(renderSprite({ clip: 'wave', width: 120 }));

    expect(style.left).toBeCloseTo(expected.left * scale, 5);
    expect(style.top).toBeCloseTo(expected.top * scale, 5);
  });
});

describe('OwlSprite playback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('advances to the next frame once the current one has been held', () => {
    const scale = 120 / OWL_SHEET.frameWidth;
    const tree = renderSprite({ clip: 'talk', width: 120 });
    const second = owlFrameOffset(OWL_CLIPS.talk.steps[1].frame);

    act(() => {
      jest.advanceTimersByTime(OWL_CLIPS.talk.steps[0].ms);
    });

    expect(sheetStyle(tree).left).toBeCloseTo(second.left * scale, 5);
  });

  it('does not move before the frame has been held long enough', () => {
    const scale = 120 / OWL_SHEET.frameWidth;
    const tree = renderSprite({ clip: 'talk', width: 120 });
    const first = owlFrameOffset(OWL_CLIPS.talk.steps[0].frame);

    act(() => {
      jest.advanceTimersByTime(OWL_CLIPS.talk.steps[0].ms - 20);
    });

    expect(sheetStyle(tree).left).toBeCloseTo(first.left * scale, 5);
  });

  it('returns to the start of a looping clip', () => {
    const scale = 120 / OWL_SHEET.frameWidth;
    const tree = renderSprite({ clip: 'talk', width: 120 });
    const total = OWL_CLIPS.talk.steps.reduce((sum, step) => sum + step.ms, 0);
    const first = owlFrameOffset(OWL_CLIPS.talk.steps[0].frame);

    act(() => {
      jest.advanceTimersByTime(total);
    });

    expect(sheetStyle(tree).left).toBeCloseTo(first.left * scale, 5);
  });

  it('holds the last frame of a clip that does not loop', () => {
    const scale = 120 / OWL_SHEET.frameWidth;
    const steps = OWL_CLIPS.wave.steps;
    const tree = renderSprite({ clip: 'wave', width: 120 });
    const last = owlFrameOffset(steps[steps.length - 1].frame);

    act(() => {
      jest.advanceTimersByTime(steps.reduce((sum, step) => sum + step.ms, 0) * 3);
    });

    expect(sheetStyle(tree).left).toBeCloseTo(last.left * scale, 5);
  });

  it('reports the end of a clip that does not loop', () => {
    const onClipEnd = jest.fn();
    const steps = OWL_CLIPS.wave.steps;
    renderSprite({ clip: 'wave', width: 120, onClipEnd });

    act(() => {
      jest.advanceTimersByTime(steps.reduce((sum, step) => sum + step.ms, 0));
    });

    expect(onClipEnd).toHaveBeenCalledTimes(1);
  });

  it('never reports the end of a looping clip', () => {
    const onClipEnd = jest.fn();
    const total = OWL_CLIPS.idle.steps.reduce((sum, step) => sum + step.ms, 0);
    renderSprite({ clip: 'idle', width: 120, onClipEnd });

    act(() => {
      jest.advanceTimersByTime(total * 3);
    });

    expect(onClipEnd).not.toHaveBeenCalled();
  });

  it('restarts from the first frame when the clip changes', () => {
    const scale = 120 / OWL_SHEET.frameWidth;
    const tree = renderSprite({ clip: 'talk', width: 120 });

    act(() => {
      jest.advanceTimersByTime(OWL_CLIPS.talk.steps[0].ms);
    });
    tree.rerender(<OwlSprite clip="idle" width={120} />);

    const expected = owlFrameOffset(OWL_CLIPS.idle.steps[0].frame);
    expect(sheetStyle(tree).top).toBeCloseTo(expected.top * scale, 5);
  });

  it('stops animating once unmounted', () => {
    const onClipEnd = jest.fn();
    const steps = OWL_CLIPS.wave.steps;
    const tree = renderSprite({ clip: 'wave', width: 120, onClipEnd });

    tree.unmount();
    act(() => {
      jest.advanceTimersByTime(steps.reduce((sum, step) => sum + step.ms, 0) * 2);
    });

    expect(onClipEnd).not.toHaveBeenCalled();
  });
});

describe('OwlSprite with reduced motion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('holds a still owl rather than cycling frames', () => {
    const scale = 120 / OWL_SHEET.frameWidth;
    const tree = renderSprite({ clip: 'talk', width: 120 });
    const first = owlFrameOffset(OWL_CLIPS.talk.steps[0].frame);

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(sheetStyle(tree).left).toBeCloseTo(first.left * scale, 5);
  });

  it('still reports the end of a one-shot clip so sequencing survives', () => {
    const onClipEnd = jest.fn();
    renderSprite({ clip: 'wave', width: 120, onClipEnd });

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(onClipEnd).toHaveBeenCalledTimes(1);
  });
});
