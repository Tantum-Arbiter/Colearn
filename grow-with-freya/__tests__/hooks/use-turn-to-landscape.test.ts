/**
 * Tests for useTurnToLandscape -decides when the device is sideways enough to
 * open the book.
 *
 * Three ways it can tell, because no single one covers every device: the screen
 * is already sideways, the screen turns sideways (a tablet, whose interface is
 * free to rotate), or gravity says the device turned while the interface stayed
 * portrait-locked (a phone).
 *
 * Key behaviors tested:
 * 1. Opens straight away when the screen is already sideways
 * 2. Opens when the screen turns sideways, even with no usable accelerometer
 * 3. Fires onTurned after enough consecutive landscape-gravity samples
 * 4. Portrait samples never fire, and they reset a broken streak
 * 5. Fires exactly once per activation
 * 6. Subscribes only while enabled; cleans up on unmount
 */

import { Dimensions } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { Accelerometer } from 'expo-sensors';
import { useTurnToLandscape, TURN_SAMPLES_REQUIRED } from '@/hooks/use-turn-to-landscape';

const PORTRAIT_SCREEN = { width: 834, height: 1194, scale: 2, fontScale: 1 };
const LANDSCAPE_SCREEN = { width: 1194, height: 834, scale: 2, fontScale: 1 };

function screenIs(size: typeof PORTRAIT_SCREEN) {
  jest.spyOn(Dimensions, 'get').mockReturnValue(size);
}

function turnScreen(size: typeof PORTRAIT_SCREEN) {
  screenIs(size);
  const handlers = (Dimensions.addEventListener as jest.Mock).mock.calls
    .filter(([event]) => event === 'change')
    .map(([, handler]) => handler);
  act(() => {
    handlers.forEach((handler) => handler({ window: size, screen: size }));
  });
}

const emit = (measurement: { x: number; y: number; z: number }) => {
  (Accelerometer as unknown as { __emit: (m: object) => void }).__emit(measurement);
};

const LANDSCAPE_SAMPLE = { x: 0.98, y: 0.05, z: 0.1 };
const PORTRAIT_SAMPLE = { x: 0.05, y: -0.98, z: 0.1 };

describe('useTurnToLandscape', () => {
  let onTurned: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (Accelerometer as unknown as { listeners: Set<unknown> }).listeners.clear();
    onTurned = jest.fn();
    jest.spyOn(Dimensions, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
    screenIs(PORTRAIT_SCREEN);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when the screen is already sideways', () => {
    it('should open the book without asking anyone to turn anything', () => {
      screenIs(LANDSCAPE_SCREEN);

      renderHook(() => useTurnToLandscape({ enabled: true, onTurned }));

      expect(onTurned).toHaveBeenCalledTimes(1);
    });

    it('should stay put until it is switched on', () => {
      screenIs(LANDSCAPE_SCREEN);

      renderHook(() => useTurnToLandscape({ enabled: false, onTurned }));

      expect(onTurned).not.toHaveBeenCalled();
    });
  });

  describe('when the screen turns sideways', () => {
    it('should open the book, the way a tablet turns on a table', () => {
      renderHook(() => useTurnToLandscape({ enabled: true, onTurned }));
      expect(onTurned).not.toHaveBeenCalled();

      turnScreen(LANDSCAPE_SCREEN);

      expect(onTurned).toHaveBeenCalledTimes(1);
    });

    it('should ignore a turn back to upright', () => {
      renderHook(() => useTurnToLandscape({ enabled: true, onTurned }));

      turnScreen(PORTRAIT_SCREEN);

      expect(onTurned).not.toHaveBeenCalled();
    });

    it('should open the book only once, however the news arrives', () => {
      renderHook(() => useTurnToLandscape({ enabled: true, onTurned }));

      turnScreen(LANDSCAPE_SCREEN);
      act(() => {
        for (let i = 0; i < TURN_SAMPLES_REQUIRED; i++) emit(LANDSCAPE_SAMPLE);
      });

      expect(onTurned).toHaveBeenCalledTimes(1);
    });
  });

  it('should fire onTurned after consecutive landscape samples', () => {
    renderHook(() => useTurnToLandscape({ enabled: true, onTurned }));

    act(() => {
      for (let i = 0; i < TURN_SAMPLES_REQUIRED; i++) emit(LANDSCAPE_SAMPLE);
    });

    expect(onTurned).toHaveBeenCalledTimes(1);
  });

  it('should not fire for portrait gravity', () => {
    renderHook(() => useTurnToLandscape({ enabled: true, onTurned }));

    act(() => {
      for (let i = 0; i < TURN_SAMPLES_REQUIRED * 2; i++) emit(PORTRAIT_SAMPLE);
    });

    expect(onTurned).not.toHaveBeenCalled();
  });

  it('should reset the streak when a portrait sample interrupts', () => {
    renderHook(() => useTurnToLandscape({ enabled: true, onTurned }));

    act(() => {
      for (let i = 0; i < TURN_SAMPLES_REQUIRED - 1; i++) emit(LANDSCAPE_SAMPLE);
      emit(PORTRAIT_SAMPLE);
      for (let i = 0; i < TURN_SAMPLES_REQUIRED - 1; i++) emit(LANDSCAPE_SAMPLE);
    });

    expect(onTurned).not.toHaveBeenCalled();
  });

  it('should fire only once even if landscape samples continue', () => {
    renderHook(() => useTurnToLandscape({ enabled: true, onTurned }));

    act(() => {
      for (let i = 0; i < TURN_SAMPLES_REQUIRED * 3; i++) emit(LANDSCAPE_SAMPLE);
    });

    expect(onTurned).toHaveBeenCalledTimes(1);
  });

  it('should ignore tilted samples where gravity is split between axes', () => {
    renderHook(() => useTurnToLandscape({ enabled: true, onTurned }));

    act(() => {
      for (let i = 0; i < TURN_SAMPLES_REQUIRED * 2; i++) emit({ x: 0.72, y: 0.65, z: 0.1 });
    });

    expect(onTurned).not.toHaveBeenCalled();
  });

  it('should not subscribe while disabled', () => {
    renderHook(() => useTurnToLandscape({ enabled: false, onTurned }));

    expect(Accelerometer.addListener).not.toHaveBeenCalled();

    act(() => {
      emit(LANDSCAPE_SAMPLE);
      emit(LANDSCAPE_SAMPLE);
      emit(LANDSCAPE_SAMPLE);
    });

    expect(onTurned).not.toHaveBeenCalled();
  });

  it('should not crash when the native sensor module is unavailable', () => {
    // A dev client built before expo-sensors was added resolves the JS module
    // but throws from the native bridge on first use
    (Accelerometer.addListener as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Cannot find native module 'ExpoAccelerometer'");
    });

    expect(() =>
      renderHook(() => useTurnToLandscape({ enabled: true, onTurned }))
    ).not.toThrow();
    expect(onTurned).not.toHaveBeenCalled();
  });

  it('should not crash on unmount when the sensor never subscribed', () => {
    (Accelerometer.addListener as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Cannot find native module 'ExpoAccelerometer'");
    });

    const { unmount } = renderHook(() => useTurnToLandscape({ enabled: true, onTurned }));

    expect(() => unmount()).not.toThrow();
  });

  it('should remove its listener on unmount', () => {
    const { unmount } = renderHook(() => useTurnToLandscape({ enabled: true, onTurned }));

    unmount();

    act(() => {
      for (let i = 0; i < TURN_SAMPLES_REQUIRED; i++) emit(LANDSCAPE_SAMPLE);
    });

    expect(onTurned).not.toHaveBeenCalled();
  });

  it('should re-arm after being disabled and re-enabled', () => {
    const { rerender } = renderHook(
      (props: { enabled: boolean }) => useTurnToLandscape({ enabled: props.enabled, onTurned }),
      { initialProps: { enabled: true } }
    );

    act(() => {
      for (let i = 0; i < TURN_SAMPLES_REQUIRED; i++) emit(LANDSCAPE_SAMPLE);
    });
    expect(onTurned).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    rerender({ enabled: true });

    act(() => {
      for (let i = 0; i < TURN_SAMPLES_REQUIRED; i++) emit(LANDSCAPE_SAMPLE);
    });

    expect(onTurned).toHaveBeenCalledTimes(2);
  });
});
