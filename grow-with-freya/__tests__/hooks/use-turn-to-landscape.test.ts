/**
 * Tests for useTurnToLandscape -detects a physical turn to landscape from
 * raw accelerometer gravity while the interface stays portrait-locked.
 *
 * Key behaviors tested:
 * 1. Fires onTurned after enough consecutive landscape-gravity samples
 * 2. Portrait samples never fire, and they reset a broken streak
 * 3. Fires exactly once per activation
 * 4. Subscribes only while enabled; cleans up on unmount
 */

import { renderHook, act } from '@testing-library/react-native';
import { Accelerometer } from 'expo-sensors';
import { useTurnToLandscape, TURN_SAMPLES_REQUIRED } from '@/hooks/use-turn-to-landscape';

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
