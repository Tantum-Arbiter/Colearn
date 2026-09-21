import { useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';
import { Logger } from '@/utils/logger';

const log = Logger.create('TurnToLandscape');

export const TURN_SAMPLES_REQUIRED = 3;
/**
 * iOS animates the interface round over roughly a third of a second, reporting
 * the new size as it starts rather than when it lands. Opening the book on that
 * first report ran the whole book-opening on top of the system's own rotation,
 * and the two transforms compounded into a skewed, displaced book. So a turn is
 * only acted on once the window has held the same size for this long.
 */
export const TURN_SETTLE_MS = 320;
const UPDATE_INTERVAL_MS = 150;
const LANDSCAPE_GRAVITY_MIN = 0.7;
const CROSS_AXIS_GRAVITY_MAX = 0.5;

interface AccelerometerMeasurement {
  x: number;
  y: number;
  z: number;
}

interface AccelerometerSubscription {
  remove: () => void;
}

function screenIsSideways(): boolean {
  const { width, height } = Dimensions.get('window');

  return width > height;
}

function sameSize(a: { width: number; height: number }, b: { width: number; height: number }): boolean {
  return a.width === b.width && a.height === b.height;
}

/**
 * Calls `onSettled` once the window has held one size for `settleMs`, starting
 * the wait again each time the size changes. Returns a cancel, for a caller
 * that goes away before the turn lands.
 */
function settleWindow(settleMs: number, onSettled: () => void): () => void {
  let lastSeen = Dimensions.get('window');
  let timer: ReturnType<typeof setTimeout> | null = null;

  const check = () => {
    const now = Dimensions.get('window');
    if (!sameSize(now, lastSeen)) {
      lastSeen = now;
      timer = setTimeout(check, settleMs);
      return;
    }
    timer = null;
    onSettled();
  };

  timer = setTimeout(check, settleMs);

  return () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

/**
 * Resolves once the window has held one size for `settleMs`.
 *
 * For anything that has to seat or open the book on a screen that may still
 * be turning -- a phone the child turned while the book was being drawn, say,
 * which reaches the opening with the screen already sideways and the system
 * still animating the interface round.
 */
export function waitForWindowToSettle(settleMs: number = TURN_SETTLE_MS): Promise<void> {
  return new Promise((resolve) => {
    settleWindow(settleMs, resolve);
  });
}

interface AccelerometerModule {
  setUpdateInterval: (intervalMs: number) => void;
  addListener: (listener: (measurement: AccelerometerMeasurement) => void) => AccelerometerSubscription;
}

function loadAccelerometer(): AccelerometerModule | null {
  try {
    const sensors = require('expo-sensors') as { Accelerometer?: AccelerometerModule };
    return sensors.Accelerometer ?? null;
  } catch (error) {
    log.warn('expo-sensors unavailable, turn detection disabled:', error);
    return null;
  }
}

export interface UseTurnToLandscapeOptions {
  enabled: boolean;
  onTurned: () => void;
}

export interface UseTurnToLandscapeResult {
  sensorAvailable: boolean;
}

export function useTurnToLandscape({ enabled, onTurned }: UseTurnToLandscapeOptions): UseTurnToLandscapeResult {
  const onTurnedRef = useRef(onTurned);
  onTurnedRef.current = onTurned;

  const accelerometerRef = useRef<AccelerometerModule | null | undefined>(undefined);
  if (accelerometerRef.current === undefined) {
    accelerometerRef.current = loadAccelerometer();
  }
  const sensorAvailable = accelerometerRef.current !== null;

  useEffect(() => {
    if (!enabled) return;

    let hasFired = false;
    let cancelSettle: (() => void) | null = null;

    const fire = (reason: string) => {
      if (hasFired) return;
      hasFired = true;
      log.debug(`Opening the book: ${reason}`);
      onTurnedRef.current();
    };

    // Claim the turn straight away so nothing else fires meanwhile, then wait
    // for the window to stop changing size before opening anything.
    const fireOnceSettled = (reason: string) => {
      if (hasFired || cancelSettle !== null) return;

      cancelSettle = settleWindow(TURN_SETTLE_MS, () => {
        cancelSettle = null;
        fire(reason);
      });
    };

    const clearSettle = () => {
      if (cancelSettle !== null) {
        cancelSettle();
        cancelSettle = null;
      }
    };

    // Already sideways: never ask someone to turn a screen that is turned.
    // It still has to land, though. A phone turned while the book was being
    // drawn arrives here mid-turn, with the size already reported and the
    // system still animating the interface round; opening on that first
    // report ran the book-opening on top of the rotation.
    if (screenIsSideways()) {
      fireOnceSettled('screen was already sideways');
      return clearSettle;
    }

    // The interface itself turning is the signal a tablet gives, where
    // orientation is unlocked; it also covers a device flat on a table, where
    // gravity says nothing about which way round it is.
    const dimensionsSubscription = Dimensions.addEventListener('change', () => {
      if (screenIsSideways()) {
        fireOnceSettled('screen turned sideways');
      }
    });

    const accelerometer = accelerometerRef.current;

    if (!accelerometer) {
      return () => {
        clearSettle();
        dimensionsSubscription?.remove?.();
      };
    }

    let consecutiveLandscapeSamples = 0;
    let subscription: AccelerometerSubscription | null = null;

    // A dev client built before expo-sensors was linked resolves the JS module
    // but throws from the native bridge -degrade to the tap fallback instead
    try {
      accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
      subscription = accelerometer.addListener(({ x, y }) => {
        if (hasFired) return;

        const isLandscapeGravity =
          Math.abs(x) > LANDSCAPE_GRAVITY_MIN && Math.abs(y) < CROSS_AXIS_GRAVITY_MAX;

        if (!isLandscapeGravity) {
          consecutiveLandscapeSamples = 0;
          return;
        }

        consecutiveLandscapeSamples += 1;
        if (consecutiveLandscapeSamples >= TURN_SAMPLES_REQUIRED) {
          // Settled too: if the interface is free to follow, it is turning right
          // now, and the book must not open on top of that
          fireOnceSettled('gravity says the device turned');
        }
      });
    } catch (error) {
      log.warn('Accelerometer unavailable, falling back to the screen turning:', error);
      return () => {
        clearSettle();
        dimensionsSubscription?.remove?.();
      };
    }

    return () => {
      clearSettle();
      subscription?.remove();
      dimensionsSubscription?.remove?.();
    };
  }, [enabled]);

  return { sensorAvailable };
}
