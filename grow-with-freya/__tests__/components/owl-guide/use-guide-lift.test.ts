import { act, renderHook } from '@testing-library/react-native';
import { withTiming } from 'react-native-reanimated';

import { useGuideLift } from '@/components/owl-guide/use-guide-lift';

/** Where the sheet was last asked to glide to. */
function glidedTo() {
  const calls = (withTiming as unknown as jest.Mock).mock.calls;
  return calls.length > 0 ? calls[calls.length - 1][0] : undefined;
}

/**
 * The card sheet has no scroll view to offer the owl, so it rises instead:
 * a button low on the sheet would otherwise sit behind the bubble, and the
 * bubble would have to leave the owl to reach it.
 */
describe('useGuideLift', () => {
  beforeEach(() => {
    (withTiming as unknown as jest.Mock).mockClear();
  });

  it('lifts by what it is asked for', () => {
    const underTest = renderHook(() => useGuideLift());

    act(() => underTest.result.current.scroller.reveal(120));

    expect(glidedTo()).toBe(-120);
  });

  /** Each step moves the sheet on from where the last one left it. */
  it('lifts further for a button lower down the sheet', () => {
    const underTest = renderHook(() => useGuideLift());
    act(() => underTest.result.current.scroller.reveal(120));

    act(() => underTest.result.current.scroller.reveal(60));

    expect(glidedTo()).toBe(-180);
  });

  it('settles the sheet back down when the tour lets go of it', () => {
    const underTest = renderHook(() => useGuideLift());
    act(() => underTest.result.current.scroller.reveal(120));

    act(() => underTest.result.current.scroller.release());

    expect(glidedTo()).toBe(0);
  });

  it('tells how far it has lifted the sheet, and that it is flat again once released', () => {
    const underTest = renderHook(() => useGuideLift());
    act(() => underTest.result.current.scroller.reveal(120));
    act(() => underTest.result.current.scroller.reveal(-30));
    const lifted = underTest.result.current.scroller.away();

    act(() => underTest.result.current.scroller.release());

    expect(lifted).toBe(90);
    expect(underTest.result.current.scroller.away()).toBe(0);
  });

  it('starts again from flat once it has been released', () => {
    const underTest = renderHook(() => useGuideLift());
    act(() => underTest.result.current.scroller.reveal(120));
    act(() => underTest.result.current.scroller.release());

    act(() => underTest.result.current.scroller.reveal(40));

    expect(glidedTo()).toBe(-40);
  });
});
