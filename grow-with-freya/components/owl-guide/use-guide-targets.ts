import { useEffect, useRef, useState, type RefObject } from 'react';
import type { View } from 'react-native';

import { GUIDE_TIMING, type TargetRect } from '@/constants/owl-guide';

export type GuideTargetRefs = Record<string, RefObject<View | null>>;

export interface GuideMeasurements {
  ready: boolean;
  rects: Record<string, TargetRect>;
}

const NOTHING: GuideMeasurements = { ready: false, rects: {} };

function measureAll(refs: GuideTargetRefs, done: (rects: Record<string, TargetRect>) => void): void {
  const entries = Object.entries(refs);
  const rects: Record<string, TargetRect> = {};
  let remaining = entries.length;

  if (remaining === 0) {
    done(rects);
    return;
  }

  const finishOne = () => {
    remaining -= 1;
    if (remaining === 0) done(rects);
  };

  entries.forEach(([id, ref]) => {
    const node = ref.current;
    if (!node || typeof node.measureInWindow !== 'function') {
      finishOne();
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) rects[id] = { x, y, width, height };
      finishOne();
    });
  });
}

export function useGuideTargets(
  refs: GuideTargetRefs,
  active: boolean,
  stepIndex: number,
  frameKey: string
): GuideMeasurements {
  const [measurements, setMeasurements] = useState<GuideMeasurements>(NOTHING);
  const lastFrameKey = useRef(frameKey);

  useEffect(() => {
    if (!active) {
      setMeasurements(NOTHING);
      lastFrameKey.current = frameKey;
      return;
    }

    const turned = lastFrameKey.current !== frameKey;
    lastFrameKey.current = frameKey;
    let cancelled = false;
    const timer = setTimeout(
      () => {
        measureAll(refs, (rects) => {
          if (!cancelled) setMeasurements({ ready: true, rects });
        });
      },
      turned ? GUIDE_TIMING.turnSettleMs : GUIDE_TIMING.measureSettleMs
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [refs, active, stepIndex, frameKey]);

  return measurements;
}
