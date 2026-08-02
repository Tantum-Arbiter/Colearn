/**
 * Tests for how often a shooting star crosses the sky.
 *
 * Rare and unannounced. A child who happens to look up is rewarded; one who is
 * reading a book never has their eye pulled away.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useShootingStar } from '@/hooks/use-shooting-star';
import { SHOOTING_STAR, nextShootingStarDelay } from '@/constants/night-sky';

jest.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: jest.fn(() => false),
}));

const { useReducedMotion } = jest.requireMock('@/hooks/use-reduced-motion');

const ROLL = 0.5;
const FIRST = nextShootingStarDelay(ROLL, true);
const LATER = nextShootingStarDelay(ROLL);

function advance(ms: number): void {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

describe('useShootingStar', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useReducedMotion.mockReturnValue(false);
    jest.spyOn(Math, 'random').mockReturnValue(ROLL);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should start with an empty sky', () => {
    const { result } = renderHook(() => useShootingStar());

    expect(result.current).toBe(0);
  });

  it('should hold off through the quiet stretch', () => {
    const { result } = renderHook(() => useShootingStar());

    advance(FIRST - 1);

    expect(result.current).toBe(0);
  });

  it('should send one across once the wait is over', () => {
    const { result } = renderHook(() => useShootingStar());

    advance(FIRST);

    expect(result.current).toBe(1);
  });

  it('should send another only after a further long wait', () => {
    const { result } = renderHook(() => useShootingStar());

    advance(FIRST);
    advance(LATER - 1);

    expect(result.current).toBe(1);
  });

  it('should keep them coming over a long session', () => {
    const { result } = renderHook(() => useShootingStar());

    advance(FIRST);
    advance(LATER);

    expect(result.current).toBe(2);
  });

  it.each([
    ['reduced motion is on', () => useReducedMotion.mockReturnValue(true), {}],
    ['it is disabled', () => undefined, { enabled: false }],
  ])('should send none when %s', (_case, arrange, options) => {
    arrange();
    const { result } = renderHook(() => useShootingStar(options));

    advance(SHOOTING_STAR.restMaxMs * 5);

    expect(result.current).toBe(0);
  });

  it('should stop scheduling once unmounted', () => {
    const { unmount } = renderHook(() => useShootingStar());

    unmount();

    expect(() => advance(SHOOTING_STAR.restMaxMs * 5)).not.toThrow();
  });
});
