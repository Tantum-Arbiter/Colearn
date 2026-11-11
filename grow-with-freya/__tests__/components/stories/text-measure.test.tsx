import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { wordText } from '@/components/stories/sound-words';
import { TextMeasure } from '@/components/stories/text-measure';
import { textLines } from '@/components/stories/text-pages';
import { PageProgressRing, RING_CLOSE_MS, RING_COLLAPSE_MS, RING_STROKE, ringOffset } from '@/components/stories/page-progress-ring';
import { FADE_OUT_MS } from '@/components/stories/text-pages';

describe('TextMeasure', () => {
  const lines = textLines('one two three\n*Tap!*');

  function setup() {
    const onBreaks = jest.fn();
    const view = render(<TextMeasure lines={lines} renderWord={(pieces) => <Text>{wordText(pieces)}</Text>} onBreaks={onBreaks} />);
    const find = (testID: string) => view.UNSAFE_root.findAll((node: ReactTestInstance) => node.props.testID === testID && typeof node.props.onLayout === 'function')[0];
    const layout = (testID: string, y: number) => act(() => fireEvent(find(testID), 'layout', { nativeEvent: { layout: { x: 0, y, width: 40, height: 20 } } }));
    return { ...view, find, layout, onBreaks };
  }

  it('is invisible, untouchable and silent to the screen reader', () => {
    const { UNSAFE_root } = setup();
    const box = UNSAFE_root.findAll((node: ReactTestInstance) => node.props.testID === 'story-text-measure')[0];

    expect(box.props.pointerEvents).toBe('none');
    expect(box.props.accessibilityElementsHidden).toBe(true);
    expect(box.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(box.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ opacity: 0 })]));
  });

  it('measures every line, the sound line too', () => {
    const { find } = setup();

    expect(find('measure-word-3')).toBeDefined();
    expect(find('measure-word-0')).toBeDefined();
  });

  it('reports where each line wraps once every word has a place', () => {
    const { layout, onBreaks } = setup();

    layout('measure-row-0', 10);
    layout('measure-row-1', 60);
    layout('measure-word-0', 0);
    layout('measure-word-1', 0);
    layout('measure-word-3', 0);
    expect(onBreaks).not.toHaveBeenCalled();
    layout('measure-word-2', 22);

    expect(onBreaks).toHaveBeenLastCalledWith([[4], []]);
  });
});

describe('PageProgressRing', () => {
  it('draws the outline in step with how much of the page has been read', () => {
    const cases: [number, number][] = [
      [0, 100],
      [0.25, 75],
      [1 / 3, 100 - 100 / 3],
      [1, 0],
      [1.5, 0],
      [-1, 100],
    ];

    for (const [progress, offset] of cases) expect(ringOffset(progress, 100)).toBeCloseTo(offset, 5);
  });

  describe('moving to a new page', () => {
    const reanimated = jest.requireMock('react-native-reanimated');
    const circumference = (size: number) => 2 * Math.PI * ((size - RING_STROKE) / 2);
    beforeEach(() => jest.clearAllMocks());

    it('closes the ring and collapses it clockwise with no hold, then starts the new page empty', () => {
      const view = render(<PageProgressRing size={50} page={1} progress={2 / 3} reduceMotion={false} />);
      reanimated.withSequence.mockClear();
      reanimated.withDelay.mockClear();

      view.rerender(<PageProgressRing size={50} page={2} progress={0} reduceMotion={false} />);

      expect(reanimated.withSequence).toHaveBeenCalledTimes(2);
      const [closed, collapsed] = reanimated.withSequence.mock.calls[0];
      const [, restart] = reanimated.withSequence.mock.calls[1];
      expect(closed).toBe(0);
      expect(reanimated.withDelay).not.toHaveBeenCalled();
      expect(collapsed).toBeCloseTo(-circumference(50), 5);
      expect(restart).toBeCloseTo(circumference(50), 5);
    });

    it('closing and collapsing together fit inside the words` fade-out, so the ring resets as the page turns', () => {
      expect(RING_CLOSE_MS + RING_COLLAPSE_MS).toBeLessThanOrEqual(FADE_OUT_MS);
      const view = render(<PageProgressRing size={50} page={1} progress={0} reduceMotion={false} />);
      reanimated.withTiming.mockClear();

      view.rerender(<PageProgressRing size={50} page={1} progress={1} reduceMotion={false} />);

      const durations = reanimated.withTiming.mock.calls.map((call: [number, { duration: number }]) => call[1].duration);
      expect(durations).toEqual([RING_CLOSE_MS, RING_COLLAPSE_MS]);
    });

    it('stepping within a page, or turning back, only moves the ring', () => {
      const view = render(<PageProgressRing size={50} page={2} progress={1 / 3} reduceMotion={false} />);
      reanimated.withSequence.mockClear();

      view.rerender(<PageProgressRing size={50} page={2} progress={2 / 3} reduceMotion={false} />);
      view.rerender(<PageProgressRing size={50} page={1} progress={0} reduceMotion={false} />);

      expect(reanimated.withSequence).not.toHaveBeenCalled();
    });

    it('under Reduce Motion goes straight to the new page`s start', () => {
      const view = render(<PageProgressRing size={50} page={1} progress={1} reduceMotion />);
      reanimated.withSequence.mockClear();

      view.rerender(<PageProgressRing size={50} page={2} progress={0} reduceMotion />);

      expect(reanimated.withSequence).not.toHaveBeenCalled();
    });
  });

  describe('the press that leaves a page', () => {
    const reanimated = jest.requireMock('react-native-reanimated');
    const circumference = (size: number) => 2 * Math.PI * ((size - RING_STROKE) / 2);
    beforeEach(() => jest.clearAllMocks());

    it('closes the ring and collapses it clockwise, with no hold between', () => {
      const view = render(<PageProgressRing size={50} page={1} progress={1 / 2} reduceMotion={false} />);
      reanimated.withSequence.mockClear();
      reanimated.withDelay.mockClear();

      view.rerender(<PageProgressRing size={50} page={1} progress={1} reduceMotion={false} />);

      const [closed, collapsed] = reanimated.withSequence.mock.calls[0];
      expect(closed).toBe(0);
      expect(collapsed).toBeCloseTo(-circumference(50), 5);
      expect(reanimated.withDelay).not.toHaveBeenCalled();
    });

    it('once it has gone, the new page starts empty without playing it again', () => {
      const view = render(<PageProgressRing size={50} page={1} progress={1 / 2} reduceMotion={false} />);
      view.rerender(<PageProgressRing size={50} page={1} progress={1} reduceMotion={false} />);
      reanimated.withSequence.mockClear();

      view.rerender(<PageProgressRing size={50} page={2} progress={0} reduceMotion={false} />);

      expect(reanimated.withSequence).not.toHaveBeenCalled();
    });

    it('under Reduce Motion it is gone at once', () => {
      const view = render(<PageProgressRing size={50} page={1} progress={0} reduceMotion />);
      reanimated.withSequence.mockClear();

      view.rerender(<PageProgressRing size={50} page={1} progress={1} reduceMotion />);

      expect(reanimated.withSequence).not.toHaveBeenCalled();
    });
  });

  it('draws only the reading line, in the arrows` purple, with no grey track: the coin`s own rim is the track', () => {
    const { RING_FILL } = require('@/components/stories/page-progress-ring');
    const view = render(<PageProgressRing size={50} page={1} progress={0.5} reduceMotion={false} />);
    const circles = view.UNSAFE_root.findAll((node: ReactTestInstance) => typeof node.props.strokeDasharray === 'string' || (node.props.r !== undefined && node.props.stroke !== undefined && typeof node.type !== 'string'));
    const strokes = [...new Set(circles.map((node) => node.props.stroke))];

    expect(strokes).toEqual([RING_FILL]);
    expect(RING_FILL.toLowerCase()).not.toBe('#e8a33d');
  });

  it('follows the stroke it is given, so it can lie on a rim of any width', () => {
    const view = render(<PageProgressRing size={50} stroke={4} page={1} progress={0.5} reduceMotion={false} />);
    const circle = view.UNSAFE_root.findAll((node: ReactTestInstance) => typeof node.props.strokeDasharray === 'string')[0];

    expect(circle.props.strokeWidth).toBe(4);
    expect(circle.props.r).toBe((50 - 4) / 2);
  });

  it('is decoration only, hidden from the screen reader and touches', () => {
    const view = render(<PageProgressRing size={50} page={1} progress={0.5} reduceMotion={false} />);
    const ring = view.UNSAFE_root.findAll((node: ReactTestInstance) => node.props.testID === 'page-progress-ring')[0];

    expect(ring.props.pointerEvents).toBe('none');
    expect(ring.props.accessibilityElementsHidden).toBe(true);
  });
});
