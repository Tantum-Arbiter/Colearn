import { useEffect, useRef } from 'react';
import { Logger } from '@/utils/logger';

const log = Logger.create('TurnToLandscape');

export const TURN_SAMPLES_REQUIRED = 3;
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
    const accelerometer = accelerometerRef.current;
    if (!accelerometer) return;

    let consecutiveLandscapeSamples = 0;
    let hasFired = false;
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
          hasFired = true;
          log.debug('Physical landscape turn detected');
          onTurnedRef.current();
        }
      });
    } catch (error) {
      log.warn('Accelerometer unavailable, turn detection disabled:', error);
      return;
    }

    return () => subscription?.remove();
  }, [enabled]);

  return { sensorAvailable };
}
