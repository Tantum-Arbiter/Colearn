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
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    const fire = (reason: string) => {
      if (hasFired) return;
      hasFired = true;
      log.debug(`Opening the book: ${reason}`);
      onTurnedRef.current();
    };

    // Claim the turn straight away so nothing else fires meanwhile, then wait
    // for the window to stop changing size before opening anything.
    const fireOnceSettled = (reason: string) => {
      if (hasFired || settleTimer !== null) return;

      let lastSeen = Dimensions.get('window');
      const check = () => {
        const now = Dimensions.get('window');
        if (now.width !== lastSeen.width || now.height !== lastSeen.height) {
          lastSeen = now;
          settleTimer = setTimeout(check, TURN_SETTLE_MS);
          return;
        }
        settleTimer = null;
        fire(reason);
      };

      settleTimer = setTimeout(check, TURN_SETTLE_MS);
    };

    // Already sideways -- a tablet the child is holding in landscape, or one
    // lying flat whose interface has settled that way. Never ask someone to
    // turn a screen that is turned.
    if (screenIsSideways()) {
      fire('screen was already sideways');
      return;
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
    const clearSettle = () => {
      if (settleTimer !== null) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
    };

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
