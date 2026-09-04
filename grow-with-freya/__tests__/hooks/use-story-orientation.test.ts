/**
 * Tests for useStoryOrientation.
 *
 * This hook exists to replace fixed setTimeout sleeps around ScreenOrientation.lockAsync.
 * The whole point of the book-opening bridge is that the book settles when the DEVICE
 * has actually rotated, not when an arbitrary timer expires.
 *
 * Key behaviors tested:
 * 1. Resolves on the emitted orientation change, not a timer
 * 2. No-ops when already in the target orientation (tablets)
 * 3. Falls back gracefully if the rotation never lands
 * 4. Cleans up listeners and pending waits on unmount
 * 5. Only phones ever have their orientation taken away
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import {
  applyDefaultOrientation,
  isTabletDevice,
  useStoryOrientation,
  ORIENTATION_SETTLE_TIMEOUT_MS,
} from '@/hooks/use-story-orientation';

const mockedOrientation = ScreenOrientation as unknown as {
  lockAsync: jest.Mock;
  unlockAsync: jest.Mock;
  addOrientationChangeListener: jest.Mock;
  __emitOrientationChange: (orientation: string) => void;
  __resetListeners: () => void;
};

function setWindowSize(width: number, height: number): void {
  jest.spyOn(Dimensions, 'get').mockReturnValue({
    width,
    height,
    scale: 2,
    fontScale: 1,
  });
}

describe('useStoryOrientation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockedOrientation.__resetListeners();
    mockedOrientation.lockAsync.mockResolvedValue(undefined);
    setWindowSize(390, 844);
  });

  describe('initial state', () => {
    it('should report portrait when the window is taller than it is wide', () => {
      const { result } = renderHook(() => useStoryOrientation());

      expect(result.current.orientation).toBe('portrait');
    });

    it('should report landscape when the window is wider than it is tall', () => {
      setWindowSize(844, 390);

      const { result } = renderHook(() => useStoryOrientation());

      expect(result.current.orientation).toBe('landscape');
    });

    it('should not be settling before any lock is requested', () => {
      const { result } = renderHook(() => useStoryOrientation());

      expect(result.current.isSettling).toBe(false);
    });
  });

  describe('locking to landscape', () => {
    it('should resolve when the device reports landscape, not on a timer', async () => {
      const { result } = renderHook(() => useStoryOrientation());

      let settled: string | undefined;
      act(() => {
        result.current.lockLandscape().then((value) => {
          settled = value;
        });
      });

      expect(settled).toBeUndefined();

      setWindowSize(844, 390);
      act(() => {
        mockedOrientation.__emitOrientationChange('LANDSCAPE_LEFT');
      });

      await waitFor(() => expect(settled).toBe('landscape'));
    });

    it('should request the landscape lock exactly once', async () => {
      const { result } = renderHook(() => useStoryOrientation());

      act(() => {
        result.current.lockLandscape();
      });

      await waitFor(() => expect(mockedOrientation.lockAsync).toHaveBeenCalledTimes(1));
      expect(mockedOrientation.lockAsync).toHaveBeenCalledWith(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
    });

    it('should mark itself as settling while the device turns', async () => {
      const { result } = renderHook(() => useStoryOrientation());

      act(() => {
        result.current.lockLandscape();
      });

      await waitFor(() => expect(result.current.isSettling).toBe(true));
    });

    it('should stop settling once the device has turned', async () => {
      const { result } = renderHook(() => useStoryOrientation());

      act(() => {
        result.current.lockLandscape();
      });
      await waitFor(() => expect(result.current.isSettling).toBe(true));

      setWindowSize(844, 390);
      act(() => {
        mockedOrientation.__emitOrientationChange('LANDSCAPE_RIGHT');
      });

      await waitFor(() => expect(result.current.isSettling).toBe(false));
    });
  });

  describe('already in the target orientation', () => {
    it('should resolve immediately without locking on a landscape tablet', async () => {
      setWindowSize(1180, 820);

      const { result } = renderHook(() => useStoryOrientation());

      let settled: string | undefined;
      await act(async () => {
        settled = await result.current.lockLandscape();
      });

      expect(settled).toBe('landscape');
      expect(mockedOrientation.lockAsync).not.toHaveBeenCalled();
    });
  });

  describe('when rotation never lands', () => {
    it('should give up after the settle timeout rather than hang forever', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useStoryOrientation());

      let settled: string | undefined;
      act(() => {
        result.current.lockLandscape().then((value) => {
          settled = value;
        });
      });

      await act(async () => {
        jest.advanceTimersByTime(ORIENTATION_SETTLE_TIMEOUT_MS + 1);
      });

      expect(settled).toBe('portrait');
      jest.useRealTimers();
    });
  });

  describe('lock failure', () => {
    it('should settle to the current orientation when the lock rejects', async () => {
      mockedOrientation.lockAsync.mockRejectedValue(new Error('not permitted'));
      const { result } = renderHook(() => useStoryOrientation());

      let settled: string | undefined;
      await act(async () => {
        settled = await result.current.lockLandscape();
      });

      expect(settled).toBe('portrait');
      expect(result.current.isSettling).toBe(false);
    });
  });

  describe('teardown', () => {
    it('should remove its orientation listener on unmount', () => {
      const { unmount } = renderHook(() => useStoryOrientation());
      const subscription = mockedOrientation.addOrientationChangeListener.mock.results[0]
        .value as { remove: jest.Mock };

      unmount();

      expect(subscription.remove).toHaveBeenCalled();
    });
  });
});

/**
 * A phone is portrait-locked everywhere outside the reader, so the app turns it
 * for the story and gives the lock back afterwards. A tablet is a tablet: a
 * child turns it whenever they like, on iOS and on Android, and nothing in the
 * app ever takes that away.
 */
describe('applyDefaultOrientation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should hand a phone back its portrait lock', async () => {
    setWindowSize(390, 844);

    await applyDefaultOrientation();

    expect(mockedOrientation.lockAsync).toHaveBeenCalledWith(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    expect(mockedOrientation.unlockAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['upright', 834, 1194],
    ['sideways', 1194, 834],
  ])('should leave a tablet held %s free to turn', async (_held, width, height) => {
    setWindowSize(width, height);

    await applyDefaultOrientation();

    expect(mockedOrientation.unlockAsync).toHaveBeenCalled();
    expect(mockedOrientation.lockAsync).not.toHaveBeenCalled();
  });
});

describe('isTabletDevice', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['a phone upright', 390, 844, false],
    ['a phone sideways', 844, 390, false],
    ['a tablet upright', 834, 1194, true],
    ['a tablet sideways', 1194, 834, true],
  ])('should recognise %s whichever way it is held', (_case, width, height, expected) => {
    setWindowSize(width, height);

    const underTest = isTabletDevice();

    expect(underTest).toBe(expected);
  });
});
