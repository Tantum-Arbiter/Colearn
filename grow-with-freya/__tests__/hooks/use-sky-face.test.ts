/**
 * Tests for the expression the sky face is wearing.
 *
 * Resting is the default and the overwhelming majority of the time. A laugh is
 * brief and unprompted, and a child who has asked for less motion never sees one.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useSkyFace } from '@/hooks/use-sky-face';
import { SKY_FACE_RHYTHM, nextRestDelay } from '@/constants/sky-face';

const ROLL = 0.5;
const FIRST_REST = nextRestDelay(ROLL, true);
const LATER_REST = nextRestDelay(ROLL);

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: jest.fn(() => false),
}));

const { useReducedMotion } = jest.requireMock('@/hooks/use-reduced-motion');

function advance(ms: number): void {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

describe('useSkyFace', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useReducedMotion.mockReturnValue(false);
    jest.spyOn(Math, 'random').mockReturnValue(ROLL);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should arrive at rest', () => {
    const { result } = renderHook(() => useSkyFace());

    expect(result.current).toBe('resting');
  });

  it('should stay at rest through the quiet stretch', () => {
    const { result } = renderHook(() => useSkyFace());

    advance(FIRST_REST - 1);

    expect(result.current).toBe('resting');
  });

  it('should laugh once the quiet stretch has passed', () => {
    const { result } = renderHook(() => useSkyFace());

    advance(FIRST_REST);

    expect(result.current).toBe('laughing');
  });

  it('should settle back by itself', () => {
    const { result } = renderHook(() => useSkyFace());

    advance(FIRST_REST);
    advance(SKY_FACE_RHYTHM.laughMs);

    expect(result.current).toBe('resting');
  });

  it('should laugh again later, not immediately', () => {
    const { result } = renderHook(() => useSkyFace());

    advance(FIRST_REST);
    advance(SKY_FACE_RHYTHM.laughMs);
    advance(LATER_REST - 1);

    expect(result.current).toBe('resting');
  });

  it('should never laugh for a child who asked for less motion', () => {
    useReducedMotion.mockReturnValue(true);
    const { result } = renderHook(() => useSkyFace());

    advance(SKY_FACE_RHYTHM.restMaxMs * 6);

    expect(result.current).toBe('resting');
  });

  it('should stay at rest while disabled', () => {
    const { result } = renderHook(() => useSkyFace({ enabled: false }));

    advance(SKY_FACE_RHYTHM.restMaxMs * 4);

    expect(result.current).toBe('resting');
  });

  it('should stop scheduling once unmounted', () => {
    const { unmount } = renderHook(() => useSkyFace());

    unmount();

    expect(() => advance(SKY_FACE_RHYTHM.restMaxMs * 4)).not.toThrow();
  });
});

describe('useSkyFace when the face is tapped', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useReducedMotion.mockReturnValue(false);
    jest.spyOn(Math, 'random').mockReturnValue(ROLL);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should laugh straight away', () => {
    const underTest = renderHook(({ nudge }: { nudge: number }) => useSkyFace({ nudge }), {
      initialProps: { nudge: 0 },
    });

    underTest.rerender({ nudge: 1 });

    expect(underTest.result.current).toBe('laughing');
  });

  it('should settle again after one laugh', () => {
    const underTest = renderHook(({ nudge }: { nudge: number }) => useSkyFace({ nudge }), {
      initialProps: { nudge: 0 },
    });
    underTest.rerender({ nudge: 1 });

    advance(SKY_FACE_RHYTHM.laughMs);

    expect(underTest.result.current).toBe('resting');
  });

  it('should keep laughing on demand', () => {
    const underTest = renderHook(({ nudge }: { nudge: number }) => useSkyFace({ nudge }), {
      initialProps: { nudge: 0 },
    });
    underTest.rerender({ nudge: 1 });
    advance(SKY_FACE_RHYTHM.laughMs);

    underTest.rerender({ nudge: 2 });

    expect(underTest.result.current).toBe('laughing');
  });

  it('should stay still for a child who asked for less motion', () => {
    useReducedMotion.mockReturnValue(true);
    const underTest = renderHook(({ nudge }: { nudge: number }) => useSkyFace({ nudge }), {
      initialProps: { nudge: 0 },
    });

    underTest.rerender({ nudge: 1 });

    expect(underTest.result.current).toBe('resting');
  });
});
