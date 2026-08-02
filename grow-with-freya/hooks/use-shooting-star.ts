import { useEffect, useRef, useState } from 'react';
import { SHOOTING_STAR, nextShootingStarDelay } from '@/constants/night-sky';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export interface ShootingStarOptions {
  enabled?: boolean;
}

export function useShootingStar({ enabled = true }: ShootingStarOptions = {}): number {
  const [flight, setFlight] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!enabled || reduceMotion) {
      return;
    }

    let cancelled = false;
    let isFirst = true;

    const schedule = () => {
      const delay = nextShootingStarDelay(Math.random(), isFirst);
      isFirst = false;

      timerRef.current = setTimeout(() => {
        if (cancelled) {
          return;
        }

        setFlight((current) => current + 1);
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      cancelled = true;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, reduceMotion]);

  return flight;
}
