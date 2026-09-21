import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';

import { CONTENT_SWAP, ContentSwap } from '@/components/child-ui/content-swap';

const mockReduceMotion = { on: false };
jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => mockReduceMotion.on,
}));

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
});
