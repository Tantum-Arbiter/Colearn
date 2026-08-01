import { useEffect, useRef, useState } from 'react';
import { SKY_FACE_RHYTHM, nextRestDelay, type SkyFaceExpression } from '@/constants/sky-face';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export interface SkyFaceOptions {
  enabled?: boolean;
}

export function useSkyFace({ enabled = true }: SkyFaceOptions = {}): SkyFaceExpression {
  const [expression, setExpression] = useState<SkyFaceExpression>('resting');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!enabled || reduceMotion) {
      setExpression('resting');
      return;
    }

    let cancelled = false;
    let isFirst = true;

    const clear = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const settle = () => {
      if (cancelled) {
        return;
      }

      setExpression('resting');
      schedule();
    };

    const laugh = () => {
      if (cancelled) {
        return;
      }

      setExpression('laughing');
      timerRef.current = setTimeout(settle, SKY_FACE_RHYTHM.laughMs);
    };

    const schedule = () => {
      const delay = nextRestDelay(Math.random(), isFirst);
      isFirst = false;
      timerRef.current = setTimeout(laugh, delay);
    };

    schedule();

    return () => {
      cancelled = true;
      clear();
    };
  }, [enabled, reduceMotion]);

  return expression;
}
