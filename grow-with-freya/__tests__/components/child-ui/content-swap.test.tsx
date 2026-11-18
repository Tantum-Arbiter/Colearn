import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import * as reanimatedModule from 'react-native-reanimated';

import { CONTENT_SWAP, ContentSwap } from '@/components/child-ui/content-swap';

const mockReduceMotion = { on: false };
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReduceMotion.on,
}));

const reanimated = reanimatedModule as unknown as { withTiming: jest.Mock };

function fades(to: number) {
  return reanimated.withTiming.mock.calls.filter(([value, config]) => value === to && config.duration > 0);
}

function shown(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root
    .findAll((node: { props: Record<string, unknown> }) => node.props.testID === 'held')
    .map((node: { props: { children?: unknown } }) => node.props.children)
    .flat();
}

function held(label: string) {
  return <Text testID="held">{label}</Text>;
}

/**
 * The catalogue's shelves change wholesale when a theme or a filter is tapped.
 * They used to be replaced between one frame and the next, which read as the
 * page glitching rather than as a collection changing.
 */
describe('ContentSwap', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReduceMotion.on = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows what it was given', () => {
    const underTest = render(<ContentSwap contentKey="stories">{held('bedtime')}</ContentSwap>);

    expect(shown(underTest)).toContain('bedtime');
  });

  it('holds the old collection while it fades out', () => {
    const underTest = render(<ContentSwap contentKey="stories">{held('bedtime')}</ContentSwap>);

    underTest.rerender(<ContentSwap contentKey="learning">{held('spelling')}</ContentSwap>);

    expect(shown(underTest)).toContain('bedtime');
    expect(shown(underTest)).not.toContain('spelling');
  });

  it('changes over once the fade out is done', () => {
    const underTest = render(<ContentSwap contentKey="stories">{held('bedtime')}</ContentSwap>);
    underTest.rerender(<ContentSwap contentKey="learning">{held('spelling')}</ContentSwap>);

    act(() => {
      jest.advanceTimersByTime(CONTENT_SWAP.outMs);
    });

    expect(shown(underTest)).toContain('spelling');
    expect(shown(underTest)).not.toContain('bedtime');
  });

  /** A cover arriving or a download finishing must still reach the screen. */
  it('passes changes straight through while the collection is the same one', () => {
    const underTest = render(<ContentSwap contentKey="stories">{held('bedtime')}</ContentSwap>);

    underTest.rerender(<ContentSwap contentKey="stories">{held('bedtime, downloaded')}</ContentSwap>);

    expect(shown(underTest)).toContain('bedtime, downloaded');
  });

  it('changes over at once for a reader who has asked for less motion', () => {
    mockReduceMotion.on = true;
    const underTest = render(<ContentSwap contentKey="stories">{held('bedtime')}</ContentSwap>);

    underTest.rerender(<ContentSwap contentKey="learning">{held('spelling')}</ContentSwap>);

    expect(shown(underTest)).toContain('spelling');
  });

  it('keeps the guide\'s view of the column, so a tour can still point at it', () => {
    const underTest = render(<ContentSwap contentKey="stories">{held('bedtime')}</ContentSwap>);

    const column = underTest.UNSAFE_root.findAll(
      (node: { props: Record<string, unknown> }) => node.props.testID === 'content-swap',
    );

    expect(column).toHaveLength(1);
  });

  it('lands on the last collection asked for when two are tapped in quick succession', () => {
    const underTest = render(<ContentSwap contentKey="stories">{held('bedtime')}</ContentSwap>);

    underTest.rerender(<ContentSwap contentKey="learning">{held('spelling')}</ContentSwap>);
    underTest.rerender(<ContentSwap contentKey="music">{held('songs')}</ContentSwap>);
    act(() => {
      jest.advanceTimersByTime(CONTENT_SWAP.outMs);
    });

    expect(shown(underTest)).toContain('songs');
  });

  it('fades the old collection out and lifts it away before anything changes', () => {
    const underTest = render(<ContentSwap contentKey="stories">{held('bedtime')}</ContentSwap>);
    reanimated.withTiming.mockClear();

    underTest.rerender(<ContentSwap contentKey="learning">{held('spelling')}</ContentSwap>);

    expect(reanimated.withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: CONTENT_SWAP.outMs }));
    expect(reanimated.withTiming).toHaveBeenCalledWith(-CONTENT_SWAP.lift, expect.objectContaining({ duration: CONTENT_SWAP.outMs }));
    expect(fades(1)).toHaveLength(0);
  });

  /**
   * The fade in used to start in the same breath as the change-over, before
   * the new shelves had been built. On a device they arrived part-way through
   * it, so the collection snapped into view.
   */
  it('starts bringing the new collection in only once it is on the page', () => {
    const events: string[] = [];
    function Arriving({ label }: { label: string }) {
      useEffect(() => {
        events.push(`built ${label}`);
      }, [label]);
      return held(label);
    }
    const underTest = render(<ContentSwap contentKey="stories"><Arriving label="bedtime" /></ContentSwap>);
    underTest.rerender(<ContentSwap contentKey="learning"><Arriving label="spelling" /></ContentSwap>);
    events.length = 0;
    reanimated.withTiming.mockImplementation((value: number, config: { duration: number }) => {
      if (value === 1 && config.duration > 0) events.push('fade in');
      return value;
    });

    act(() => {
      jest.advanceTimersByTime(CONTENT_SWAP.outMs);
    });

    expect(events).toEqual(['built spelling', 'fade in']);
    expect(reanimated.withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: CONTENT_SWAP.inMs }));
    expect(reanimated.withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: CONTENT_SWAP.inMs }));

    reanimated.withTiming.mockImplementation((value: unknown, _config: unknown, callback?: (finished: boolean) => void) => {
      if (typeof callback === 'function') callback(true);
      return value;
    });
  });

  it('holds off the fade in until the fade out has run its course', () => {
    const underTest = render(<ContentSwap contentKey="stories">{held('bedtime')}</ContentSwap>);
    underTest.rerender(<ContentSwap contentKey="learning">{held('spelling')}</ContentSwap>);
    reanimated.withTiming.mockClear();

    act(() => {
      jest.advanceTimersByTime(CONTENT_SWAP.outMs - 1);
    });

    expect(fades(1)).toHaveLength(0);
    expect(shown(underTest)).toContain('bedtime');
  });

  /**
   * Tapping a filter on and straight off again used to leave the page blank:
   * the fade out had begun, the change-over was called off, and nothing
   * brought the shelves back.
   */
  it('brings the same collection back when the child changes their mind before it has gone', () => {
    const underTest = render(<ContentSwap contentKey="stories">{held('bedtime')}</ContentSwap>);
    underTest.rerender(<ContentSwap contentKey="learning">{held('spelling')}</ContentSwap>);
    reanimated.withTiming.mockClear();

    underTest.rerender(<ContentSwap contentKey="stories">{held('bedtime')}</ContentSwap>);

    expect(reanimated.withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: CONTENT_SWAP.inMs }));
    expect(reanimated.withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: CONTENT_SWAP.inMs }));

    reanimated.withTiming.mockClear();
    act(() => {
      jest.advanceTimersByTime(CONTENT_SWAP.outMs * 2);
    });

    expect(shown(underTest)).toContain('bedtime');
    expect(shown(underTest)).not.toContain('spelling');
    expect(reanimated.withTiming.mock.calls.filter(([, config]) => config.duration === CONTENT_SWAP.outMs)).toHaveLength(0);
  });

  it('moves nothing for a reader who has asked for less motion', () => {
    mockReduceMotion.on = true;
    const underTest = render(<ContentSwap contentKey="stories">{held('bedtime')}</ContentSwap>);
    reanimated.withTiming.mockClear();

    underTest.rerender(<ContentSwap contentKey="learning">{held('spelling')}</ContentSwap>);

    expect(fades(0)).toHaveLength(0);
    expect(fades(1)).toHaveLength(0);
    expect(fades(-CONTENT_SWAP.lift)).toHaveLength(0);
  });

  it('keeps each half short: the old shelves leave quicker than the new ones arrive', () => {
    expect(CONTENT_SWAP.outMs).toBeLessThan(CONTENT_SWAP.inMs);
    expect(CONTENT_SWAP.outMs + CONTENT_SWAP.inMs).toBeLessThanOrEqual(600);
    expect(CONTENT_SWAP.lift).toBeLessThanOrEqual(12);
  });
});
