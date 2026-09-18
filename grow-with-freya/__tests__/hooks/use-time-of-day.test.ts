/**
 * Tests for the hook that keeps the home scene in step with the clock.
 *
 * It must flip without a relaunch -a child who opens the app at ten to six
 * should see the night sky arrive on its own.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useTimeOfDay } from '@/hooks/use-time-of-day';

describe('useTimeOfDay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should report night when opened in the evening', () => {
    jest.setSystemTime(new Date(2026, 6, 29, 19, 15, 0));

    const { result } = renderHook(() => useTimeOfDay());

    expect(result.current).toBe('night');
  });

  it('should report day when opened mid-morning', () => {
    jest.setSystemTime(new Date(2026, 6, 29, 10, 0, 0));

    const { result } = renderHook(() => useTimeOfDay());

    expect(result.current).toBe('day');
  });

  it('should cross over to night while the app is still open', () => {
    jest.setSystemTime(new Date(2026, 6, 29, 17, 59, 0));
    const { result } = renderHook(() => useTimeOfDay());

    act(() => {
      jest.setSystemTime(new Date(2026, 6, 29, 18, 1, 0));
      jest.advanceTimersByTime(60_000);
    });

    expect(result.current).toBe('night');
  });

  it('should stop checking once unmounted', () => {
    jest.setSystemTime(new Date(2026, 6, 29, 12, 0, 0));
    const { unmount } = renderHook(() => useTimeOfDay());

    unmount();

    expect(() => jest.advanceTimersByTime(600_000)).not.toThrow();
  });
});
