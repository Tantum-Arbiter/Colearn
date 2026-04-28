/**
 * Tests for useMicPermission hook — shared microphone permission management.
 *
 * Key behaviors tested:
 * 1. Permission is only requested ONCE (singleton pattern)
 * 2. Multiple hook instances share the same cached state
 * 3. Concurrent requests are deduplicated (only one OS prompt)
 * 4. Denied state triggers fallback in consumers
 * 5. State persists across hook re-renders
 */

import { renderHook, act } from '@testing-library/react-native';
import { AudioModule } from 'expo-audio';
import { useMicPermission, _resetMicPermissionForTesting } from '@/hooks/use-mic-permission';

// AudioModule is globally mocked in jest.setup.js to return { granted: true }
const mockRequestPermissions = AudioModule.requestRecordingPermissionsAsync as jest.Mock;

describe('useMicPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetMicPermissionForTesting();
    // Default: permission granted
    mockRequestPermissions.mockResolvedValue({ granted: true });
  });

  describe('initial state', () => {
    it('should start as undetermined before any request', () => {
      const { result } = renderHook(() => useMicPermission());
      expect(result.current.status).toBe('undetermined');
      expect(result.current.isUndetermined).toBe(true);
      expect(result.current.isGranted).toBe(false);
      expect(result.current.isDenied).toBe(false);
    });
  });

  describe('requesting permission', () => {
    it('should transition to granted when permission is given', async () => {
      const { result } = renderHook(() => useMicPermission());

      await act(async () => {
        const status = await result.current.requestPermission();
        expect(status).toBe('granted');
      });

      expect(result.current.status).toBe('granted');
      expect(result.current.isGranted).toBe(true);
      expect(result.current.isDenied).toBe(false);
    });

    it('should transition to denied when permission is refused', async () => {
      mockRequestPermissions.mockResolvedValue({ granted: false });

      const { result } = renderHook(() => useMicPermission());

      await act(async () => {
        const status = await result.current.requestPermission();
        expect(status).toBe('denied');
      });

      expect(result.current.status).toBe('denied');
      expect(result.current.isDenied).toBe(true);
      expect(result.current.isGranted).toBe(false);
    });

    it('should return denied when requestRecordingPermissionsAsync throws', async () => {
      mockRequestPermissions.mockRejectedValue(new Error('Platform error'));

      const { result } = renderHook(() => useMicPermission());

      await act(async () => {
        const status = await result.current.requestPermission();
        expect(status).toBe('denied');
      });

      expect(result.current.isDenied).toBe(true);
    });
  });

  describe('singleton behavior — permission requested only ONCE', () => {
    it('should call requestRecordingPermissionsAsync only once across multiple requestPermission calls', async () => {
      const { result } = renderHook(() => useMicPermission());

      await act(async () => {
        await result.current.requestPermission();
      });
      await act(async () => {
        await result.current.requestPermission();
      });
      await act(async () => {
        await result.current.requestPermission();
      });

      // Should only have been called ONCE — subsequent calls return cached result
      expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    });

    it('should share state between two independent hook instances', async () => {
      const { result: hook1 } = renderHook(() => useMicPermission());
      const { result: hook2 } = renderHook(() => useMicPermission());

      // Both start as undetermined
      expect(hook1.current.isUndetermined).toBe(true);
      expect(hook2.current.isUndetermined).toBe(true);

      // Request from hook1
      await act(async () => {
        await hook1.current.requestPermission();
      });

      // hook2 should also be updated via the shared singleton
      expect(hook1.current.isGranted).toBe(true);
      expect(hook2.current.isGranted).toBe(true);

      // Only one OS permission prompt
      expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    });

    it('should not re-prompt after denial — returns cached denied', async () => {
      mockRequestPermissions.mockResolvedValue({ granted: false });

      const { result } = renderHook(() => useMicPermission());

      await act(async () => {
        await result.current.requestPermission();
      });
      expect(result.current.isDenied).toBe(true);

      // Call again — should NOT call the native API again
      await act(async () => {
        const status = await result.current.requestPermission();
        expect(status).toBe('denied');
      });

      expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrent request deduplication', () => {
    it('should only prompt once even if called concurrently', async () => {
      // Simulate slow permission dialog
      let resolvePermission: (value: { granted: boolean }) => void;
      mockRequestPermissions.mockImplementation(() => new Promise(resolve => {
        resolvePermission = resolve;
      }));

      const { result } = renderHook(() => useMicPermission());

      // Fire 3 concurrent requests
      let p1: Promise<any>, p2: Promise<any>, p3: Promise<any>;
      act(() => {
        p1 = result.current.requestPermission();
        p2 = result.current.requestPermission();
        p3 = result.current.requestPermission();
      });

      // Resolve the single permission dialog
      await act(async () => {
        resolvePermission!({ granted: true });
        await Promise.all([p1!, p2!, p3!]);
      });

      // Only ONE native call despite 3 concurrent requests
      expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
      expect(result.current.isGranted).toBe(true);
    });
  });

  describe('cross-hook integration (simulated)', () => {
    it('voice recording and breath detector hooks should share the same permission state', async () => {
      // Simulate what happens in story-book-reader:
      // - useVoiceRecording creates useMicPermission instance A
      // - useBreathDetector creates useMicPermission instance B
      // Both should share the same singleton

      const { result: hookA } = renderHook(() => useMicPermission());
      const { result: hookB } = renderHook(() => useMicPermission());

      // hookA requests permission (simulating voice recording starting)
      await act(async () => {
        await hookA.current.requestPermission();
      });

      // hookB should already be granted (simulating breath detector checking)
      expect(hookB.current.isGranted).toBe(true);

      // Only 1 native prompt total
      expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    });

    it('denial in one hook should propagate to the other', async () => {
      mockRequestPermissions.mockResolvedValue({ granted: false });

      const { result: hookA } = renderHook(() => useMicPermission());
      const { result: hookB } = renderHook(() => useMicPermission());

      await act(async () => {
        await hookA.current.requestPermission();
      });

      expect(hookA.current.isDenied).toBe(true);
      expect(hookB.current.isDenied).toBe(true);
    });

    it('hookB created AFTER hookA grants should inherit granted state', async () => {
      const { result: hookA } = renderHook(() => useMicPermission());

      await act(async () => {
        await hookA.current.requestPermission();
      });

      // hookB created after permission was already granted
      const { result: hookB } = renderHook(() => useMicPermission());

      // Should immediately have granted state (from singleton cache)
      expect(hookB.current.isGranted).toBe(true);

      // No additional native calls
      expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    });
  });

  describe('_resetMicPermissionForTesting', () => {
    it('should reset singleton state back to undetermined', async () => {
      const { result: hook1 } = renderHook(() => useMicPermission());

      await act(async () => {
        await hook1.current.requestPermission();
      });
      expect(hook1.current.isGranted).toBe(true);

      // Reset
      _resetMicPermissionForTesting();

      // New hook instance should be undetermined again
      const { result: hook2 } = renderHook(() => useMicPermission());
      expect(hook2.current.isUndetermined).toBe(true);
    });
  });
});
