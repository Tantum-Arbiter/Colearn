/**
 * Tests for useReducedMotion.
 *
 * Note: jest.config maps `react-native` to `react-native-web`, so a module-level
 * jest.mock('react-native') does not reliably intercept here. AccessibilityInfo is a
 * plain object on that module, so we spy on it directly instead.
 *
 * Key behaviors tested:
 * 1. Reads the OS preference on mount
 * 2. Updates live when the preference changes
 * 3. Unsubscribes on unmount
 * 4. Degrades to full motion (not a crash) when the platform omits the API
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

describe('useReducedMotion', () => {
  let isReduceMotionEnabled: jest.SpyInstance;
  let addEventListener: jest.SpyInstance;

  beforeEach(() => {
    isReduceMotionEnabled = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    addEventListener = jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial read', () => {
    it('should default to full motion before the preference resolves', () => {
      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(false);
    });

    it('should adopt the OS preference once it resolves', async () => {
      isReduceMotionEnabled.mockResolvedValue(true);

      const { result } = renderHook(() => useReducedMotion());

      await waitFor(() => expect(result.current).toBe(true));
    });

    it('should stay on full motion when the OS reports no preference', async () => {
      const { result } = renderHook(() => useReducedMotion());

      await waitFor(() => expect(isReduceMotionEnabled).toHaveBeenCalled());
      expect(result.current).toBe(false);
    });
  });

  describe('live updates', () => {
    it('should subscribe to the reduceMotionChanged event', async () => {
      renderHook(() => useReducedMotion());

      await waitFor(() =>
        expect(addEventListener).toHaveBeenCalledWith('reduceMotionChanged', expect.any(Function))
      );
    });

    it('should follow the preference when it changes while mounted', async () => {
      let emit: ((enabled: boolean) => void) | undefined;
      addEventListener.mockImplementation((_event: string, handler: (enabled: boolean) => void) => {
        emit = handler;
        return { remove: jest.fn() };
      });

      const { result } = renderHook(() => useReducedMotion());
      await waitFor(() => expect(addEventListener).toHaveBeenCalled());

      act(() => emit?.(true));

      await waitFor(() => expect(result.current).toBe(true));
    });
  });

  describe('teardown', () => {
    it('should remove its subscription on unmount', async () => {
      const remove = jest.fn();
      addEventListener.mockReturnValue({ remove });

      const { unmount } = renderHook(() => useReducedMotion());
      await waitFor(() => expect(addEventListener).toHaveBeenCalled());

      unmount();

      expect(remove).toHaveBeenCalled();
    });

    it('should not crash when the platform returns no subscription', async () => {
      addEventListener.mockReturnValue(undefined);

      const { unmount } = renderHook(() => useReducedMotion());
      await waitFor(() => expect(addEventListener).toHaveBeenCalled());

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('failure', () => {
    it('should stay on full motion when the preference cannot be read', async () => {
      isReduceMotionEnabled.mockRejectedValue(new Error('unsupported'));

      const { result } = renderHook(() => useReducedMotion());

      await waitFor(() => expect(addEventListener).toHaveBeenCalled());
      expect(result.current).toBe(false);
    });
  });
});
