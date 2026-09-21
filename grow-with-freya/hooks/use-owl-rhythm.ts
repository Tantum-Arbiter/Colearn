import { useEffect, useRef } from 'react';

import {
  blinkDuration,
  blinkShape,
  glanceHold,
  nextBlinkDelay,
  nextGlanceDelay,
  nextRuffleDelay,
  pickGlance,
  OWL_RHYTHM,
  type BlinkShape,
  type GlanceGesture,
} from '@/constants/owl-companion';

export interface OwlRhythmHandlers {
  onBlink: (shape: BlinkShape) => void;
  onGlance: (gesture: GlanceGesture, holdMs: number) => void;
  onRuffle: () => void;
}

export interface OwlRhythmOptions extends OwlRhythmHandlers {
  enabled: boolean;
}

export function useOwlRhythm({ enabled, onBlink, onGlance, onRuffle }: OwlRhythmOptions): void {
  const handlers = useRef<OwlRhythmHandlers>({ onBlink, onGlance, onRuffle });
  handlers.current = { onBlink, onGlance, onRuffle };

  useEffect(() => {
    if (!enabled) return;

    const timers = new Set<ReturnType<typeof setTimeout>>();
    const after = (ms: number, run: () => void) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        run();
      }, ms);
      timers.add(timer);
    };

    const scheduleBlink = (isFirst: boolean) => {
      after(nextBlinkDelay(Math.random(), isFirst), () => {
        const shape = blinkShape(Math.random());
        handlers.current.onBlink(shape);
        after(blinkDuration(shape), () => scheduleBlink(false));
      });
    };

    const scheduleGlance = (isFirst: boolean) => {
      after(nextGlanceDelay(Math.random(), isFirst), () => {
        const gesture = pickGlance(Math.random());
        const hold = glanceHold(Math.random());
        handlers.current.onGlance(gesture, hold);
        after(hold + OWL_RHYTHM.glanceReturnMs, () => scheduleGlance(false));
      });
    };

    const scheduleRuffle = (isFirst: boolean) => {
      after(nextRuffleDelay(Math.random(), isFirst), () => {
        handlers.current.onRuffle();
        after(OWL_RHYTHM.ruffleMs, () => scheduleRuffle(false));
      });
    };

    scheduleBlink(true);
    scheduleGlance(true);
    scheduleRuffle(true);

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [enabled]);
}
