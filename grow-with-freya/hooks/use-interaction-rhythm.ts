import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STORY_GARDEN_DELAYS } from '@/constants/story-garden-motion';

export type HotspotStage = 'dormant' | 'invited' | 'highlighted' | 'acted' | 'settled';

export interface InteractionRhythm {
  activeHotspotId: string | null;
  stageFor: (hotspotId: string) => HotspotStage;
  isInvited: (hotspotId: string) => boolean;
  beginObservation: () => void;
  markActed: (hotspotId: string) => void;
  resetPage: () => void;
}

export interface InteractionRhythmOptions {
  hotspotIds: readonly string[];
  enabled?: boolean;
  observationDelay?: number;
  settleDelay?: number;
}

export function useInteractionRhythm({
  hotspotIds,
  enabled = true,
  observationDelay = STORY_GARDEN_DELAYS.hotspotObservation,
  settleDelay = 600,
}: InteractionRhythmOptions): InteractionRhythm {
  const [stages, setStages] = useState<Record<string, HotspotStage>>({});
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMountedRef = useRef(true);
  const observedRef = useRef<string | null>(null);

  const idsKey = hotspotIds.join('|');

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        callback();
      }
    }, delay);
    timersRef.current.push(timer);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const resetPage = useCallback(() => {
    clearTimers();
    observedRef.current = null;
    setStages({});
  }, [clearTimers]);

  useEffect(() => {
    resetPage();
  }, [idsKey, resetPage]);

  const activeHotspotId = useMemo(() => {
    const pending = hotspotIds.find((id) => {
      const stage = stages[id] ?? 'dormant';
      return stage !== 'acted' && stage !== 'settled';
    });

    return pending ?? null;
  }, [hotspotIds, stages]);

  const beginObservation = useCallback(() => {
    if (!enabled || !activeHotspotId) {
      return;
    }

    if (observedRef.current === activeHotspotId) {
      return;
    }

    observedRef.current = activeHotspotId;

    schedule(() => {
      setStages((current) => {
        if (current[activeHotspotId] === 'acted' || current[activeHotspotId] === 'settled') {
          return current;
        }
        return { ...current, [activeHotspotId]: 'invited' };
      });

      schedule(() => {
        setStages((current) => {
          if (current[activeHotspotId] !== 'invited') {
            return current;
          }
          return { ...current, [activeHotspotId]: 'highlighted' };
        });
      }, observationDelay);
    }, observationDelay);
  }, [enabled, activeHotspotId, schedule, observationDelay]);

  const markActed = useCallback(
    (hotspotId: string) => {
      setStages((current) => ({ ...current, [hotspotId]: 'acted' }));

      schedule(() => {
        setStages((current) => {
          if (current[hotspotId] !== 'acted') {
            return current;
          }
          return { ...current, [hotspotId]: 'settled' };
        });
      }, settleDelay);
    },
    [schedule, settleDelay]
  );

  const stageFor = useCallback(
    (hotspotId: string): HotspotStage => stages[hotspotId] ?? 'dormant',
    [stages]
  );

  const isInvited = useCallback(
    (hotspotId: string): boolean => {
      if (!enabled) {
        return false;
      }
      const stage = stages[hotspotId] ?? 'dormant';
      return stage === 'invited' || stage === 'highlighted';
    },
    [enabled, stages]
  );

  return useMemo(
    () => ({
      activeHotspotId,
      stageFor,
      isInvited,
      beginObservation,
      markActed,
      resetPage,
    }),
    [activeHotspotId, stageFor, isInvited, beginObservation, markActed, resetPage]
  );
}
