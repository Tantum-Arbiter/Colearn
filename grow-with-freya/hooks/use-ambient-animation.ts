import { useEffect, useRef, useState } from 'react';
import { cancelAnimation, withRepeat, withTiming, Easing, type SharedValue } from 'react-native-reanimated';
import { PAGE_TRANSITION_DURATION_MS } from '@/constants/page-transition';

export type AmbientStarter = (value: SharedValue<number>) => void;

export function spinStars(durationMs: number): AmbientStarter {
  return (value) => {
    value.value = withRepeat(withTiming(360, { duration: durationMs, easing: Easing.linear }), -1, false);
  };
}

export function useSettledAfterTransition(
  active: boolean,
  delayMs: number = PAGE_TRANSITION_DURATION_MS
): boolean {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!active) {
      setSettled(false);
      return;
    }
    const timer = setTimeout(() => setSettled(true), delayMs);

    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return settled;
}

export function useAmbientLoop(
  active: boolean,
  value: SharedValue<number>,
  start: AmbientStarter,
  restValue: number,
  delayMs: number = PAGE_TRANSITION_DURATION_MS
): void {
  const startRef = useRef(start);

  useEffect(() => {
    startRef.current = start;
  });

  useEffect(() => {
    if (!active) {
      cancelAnimation(value);
      value.value = restValue;
      return;
    }
    const timer = setTimeout(() => startRef.current(value), delayMs);

    return () => {
      clearTimeout(timer);
      cancelAnimation(value);
    };
  }, [active, value, restValue, delayMs]);
}
