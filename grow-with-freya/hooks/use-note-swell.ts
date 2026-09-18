import { useEffect } from 'react';
import {
  useSharedValue,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { NoteEventBus } from '@/services/note-event-bus';

export const SWELL_ATTACK_MS = 90;
export const SWELL_SETTLE_MS = 140;
export const SWELL_RELEASE_MS = 260;
export const SWELL_BREATH_MS = 900;
const OVERSHOOT = 1.25;
const HOLD = 0.85;
const BREATH_DEPTH = 0.12;

export function useNoteSwell(noteEvents: NoteEventBus): SharedValue<number> {
  const reduceMotion = useReducedMotion();
  const swell = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(swell);
      swell.value = 0;
      return undefined;
    }
    let sounding = 0;
    const unsubscribe = noteEvents.subscribe(event => {
      if (event.phase === 'start') {
        sounding += 1;
        cancelAnimation(swell);
        swell.value = withSequence(
          withTiming(OVERSHOOT, { duration: SWELL_ATTACK_MS, easing: Easing.out(Easing.cubic) }),
          withTiming(HOLD, { duration: SWELL_SETTLE_MS, easing: Easing.inOut(Easing.ease) }),
          withRepeat(
            withSequence(
              withTiming(HOLD + BREATH_DEPTH, { duration: SWELL_BREATH_MS, easing: Easing.inOut(Easing.sin) }),
              withTiming(HOLD - BREATH_DEPTH, { duration: SWELL_BREATH_MS, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            true,
          ),
        );
      } else {
        sounding = Math.max(0, sounding - 1);
        if (sounding === 0) {
          cancelAnimation(swell);
          swell.value = withTiming(0, { duration: SWELL_RELEASE_MS, easing: Easing.inOut(Easing.ease) });
        }
      }
    });
    return () => {
      unsubscribe();
      cancelAnimation(swell);
      swell.value = 0;
    };
  }, [noteEvents, reduceMotion, swell]);

  return swell;
}
