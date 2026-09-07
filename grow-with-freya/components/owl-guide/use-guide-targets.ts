import { useEffect, useRef, useState, type RefObject } from 'react';
import type { View } from 'react-native';

import { GUIDE_TIMING, type TargetRect } from '@/constants/owl-guide';

export type GuideTargetRefs = Record<string, RefObject<View | null>>;

export interface GuideMeasurements {
  ready: boolean;
  rects: Record<string, TargetRect>;
  /** Which revision these rects were taken at -- a caller that has just moved
   *  the page can tell whether they are of the view it asked for. */
  revision: number;
  /** And which step: between steps the rects on hand are still the last one's,
   *  taken in whatever view that step had scrolled the page to. */
  step: number;
}

const NOTHING: GuideMeasurements = { ready: false, rects: {}, revision: -1, step: -1 };

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

/**
 * `revision` is for anything that moves the targets without changing the step
 * -- a page scrolled to bring one into view, say. It re-measures on the short
 * settle rather than the long one a rotation takes.
 */
export function useGuideTargets(
  refs: GuideTargetRefs,
  active: boolean,
  stepIndex: number,
  frameKey: string,
  revision = 0
): GuideMeasurements {
  const [measurements, setMeasurements] = useState<GuideMeasurements>(NOTHING);
  const lastFrameKey = useRef(frameKey);
  const lastRevision = useRef(revision);

  useEffect(() => {
    if (!active) {
      setMeasurements(NOTHING);
      lastFrameKey.current = frameKey;
      return;
    }

    const turned = lastFrameKey.current !== frameKey;
    const scrolled = lastRevision.current !== revision;
    lastFrameKey.current = frameKey;
    lastRevision.current = revision;
    let cancelled = false;
    const timer = setTimeout(
      () => {
        measureAll(refs, (rects) => {
          if (!cancelled) setMeasurements({ ready: true, rects, revision, step: stepIndex });
        });
      },
      turned
        ? GUIDE_TIMING.turnSettleMs
        : scrolled
          ? GUIDE_TIMING.scrollSettleMs
          : GUIDE_TIMING.measureSettleMs
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [refs, active, stepIndex, frameKey, revision]);

  return measurements;
}
