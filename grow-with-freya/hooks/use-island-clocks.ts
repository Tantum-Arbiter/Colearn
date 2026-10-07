import { useEffect, useMemo } from 'react';
import { cancelAnimation, Easing, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { ISLAND_LIFE } from '@/constants/island-life';
import { useSteadySharedValue } from '@/hooks/use-steady-shared-value';

export interface IslandClocks {
  wind: SharedValue<number>;
  tide: SharedValue<number>;
  ripple: SharedValue<number>;
  sky: SharedValue<number>;
  beat: SharedValue<number>;
  fall: SharedValue<number>;
  lamp: SharedValue<number>;
}

function turn(clock: SharedValue<number>, durationMs: number): void {
  clock.value = withRepeat(withTiming(1, { duration: durationMs, easing: Easing.linear }), -1, false);
}

function rest(clock: SharedValue<number>): void {
  cancelAnimation(clock);
  clock.value = 0;
}

export function useIslandClocks(alive: boolean): IslandClocks {
  const wind = useSteadySharedValue(0);
  const tide = useSteadySharedValue(0);
  const ripple = useSteadySharedValue(0);
  const sky = useSteadySharedValue(0);
  const beat = useSteadySharedValue(0);
  const fall = useSteadySharedValue(0);
  const lamp = useSteadySharedValue(0);

  useEffect(() => {
    if (!alive) return undefined;

    turn(wind, ISLAND_LIFE.windMs);
    turn(tide, ISLAND_LIFE.tideMs);
    turn(ripple, ISLAND_LIFE.rippleMs);
    turn(sky, ISLAND_LIFE.skyMs);
    turn(beat, ISLAND_LIFE.beatMs);
    turn(fall, ISLAND_LIFE.fallMs);
    turn(lamp, ISLAND_LIFE.lampMs);

    return () => {
      [wind, tide, ripple, sky, beat, fall, lamp].forEach(rest);
    };
  }, [alive, beat, fall, lamp, ripple, sky, tide, wind]);

  return useMemo(
    () => ({ wind, tide, ripple, sky, beat, fall, lamp }),
    [wind, tide, ripple, sky, beat, fall, lamp]
  );
}
