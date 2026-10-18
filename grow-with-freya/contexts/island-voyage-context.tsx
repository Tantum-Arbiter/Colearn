import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Easing, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import { VOYAGE_PAGE, voyageTiming, type VoyagePage, type VoyagePhase } from '@/constants/island-voyage';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSteadySharedValue } from '@/hooks/use-steady-shared-value';
import { CALM, whenCalm } from '@/utils/when-calm';

export interface IslandVoyage {
  phase: VoyagePhase;
  travel: SharedValue<number>;
  clouds: SharedValue<number>;
  arrival: SharedValue<number>;
  reduceMotion: boolean;
  depart: () => void;
  comeBack: () => void;
  islandReady: () => void;
  settleHome: () => void;
}

const IslandVoyageContext = createContext<IslandVoyage | null>(null);

function nothing(): void {}

function aim(shared: SharedValue<number>, to: number): void {
  shared.value = to;
}

export function useIslandVoyageController(onShowPage: (page: VoyagePage) => void): IslandVoyage {
  const reduceMotion = useReducedMotion();
  const travel = useSteadySharedValue(0);
  const clouds = useSteadySharedValue(0);
  const arrival = useSteadySharedValue(0);
  const [phase, setPhase] = useState<VoyagePhase>('home');

  const phaseRef = useRef<VoyagePhase>('home');
  const pageRef = useRef<VoyagePage>('main');
  const timingRef = useRef(voyageTiming(reduceMotion));
  const showPageRef = useRef(onShowPage);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const crossing = useRef({ ready: false, held: false });
  const enterRef = useRef<(next: VoyagePhase) => void>(nothing);

  useEffect(() => {
    showPageRef.current = onShowPage;
    timingRef.current = voyageTiming(reduceMotion);
  }, [onShowPage, reduceMotion]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];
  }, []);

  const later = useCallback((ms: number, run: () => void) => {
    const timer = setTimeout(() => {
      timers.current = timers.current.filter((pending) => pending !== timer);
      run();
    }, ms);
    timers.current.push(timer);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const enter = useCallback((next: VoyagePhase) => {
    phaseRef.current = next;
    setPhase(next);
    if (next === 'crossing') crossing.current = { ready: false, held: false };
    if (VOYAGE_PAGE[next] !== pageRef.current) {
      pageRef.current = VOYAGE_PAGE[next];
      showPageRef.current(pageRef.current);
    }
  }, []);

  useEffect(() => {
    const timing = timingRef.current;
    let callOff: (() => void) | undefined;

    switch (phase) {
      case 'leaving':
        callOff = whenCalm(() => {
          if (timing.moves) {
            aim(travel, withTiming(1, { duration: timing.leaveMs, easing: Easing.linear }));
          }
          aim(clouds, 0);
          aim(
            clouds,
            withDelay(
              timing.leaveMs - timing.cloudsInMs,
              withTiming(1, { duration: timing.cloudsInMs, easing: Easing.inOut(Easing.quad) })
            )
          );
          later(timing.leaveMs, () => enterRef.current('crossing'));
        }, CALM.afterTapMs);
        break;
      case 'crossing':
        aim(arrival, 0);
        later(timing.crossingMinMs, () => {
          crossing.current.held = true;
          if (crossing.current.ready) enterRef.current('arriving');
        });
        later(timing.crossingMaxMs, () => {
          if (phaseRef.current === 'crossing') enterRef.current('arriving');
        });
        break;
      case 'arriving':
        callOff = whenCalm(() => {
          aim(clouds, withTiming(2, { duration: timing.cloudsOutMs, easing: Easing.out(Easing.quad) }));
          aim(arrival, timing.moves ? withTiming(1, { duration: timing.arriveMs, easing: Easing.linear }) : 1);
          later(timing.arriveMs, () => enterRef.current('island'));
        });
        break;
      case 'island':
        aim(clouds, 0);
        break;
      case 'returning':
        callOff = whenCalm(() => {
          aim(clouds, 0);
          aim(clouds, withTiming(1, { duration: timing.returnMs, easing: Easing.inOut(Easing.quad) }));
          later(timing.returnMs, () => enterRef.current('recrossing'));
        }, CALM.afterTapMs);
        break;
      case 'recrossing':
        later(timing.recrossingMs, () => enterRef.current('landing'));
        break;
      case 'landing':
        callOff = whenCalm(() => {
          aim(clouds, withTiming(2, { duration: timing.cloudsOutMs, easing: Easing.out(Easing.quad) }));
          aim(travel, withTiming(0, { duration: timing.landMs, easing: Easing.linear }));
          later(timing.landMs, () => enterRef.current('home'));
        });
        break;
      case 'home':
        aim(clouds, 0);
        aim(arrival, 0);
        aim(travel, 0);
        break;
    }

    return callOff;
  }, [phase, arrival, clouds, later, travel]);

  useEffect(() => {
    enterRef.current = enter;
  }, [enter]);

  const depart = useCallback(() => {
    if (phaseRef.current === 'home') enter('leaving');
  }, [enter]);

  const comeBack = useCallback(() => {
    if (phaseRef.current === 'island') enter('returning');
  }, [enter]);

  const islandReady = useCallback(() => {
    if (phaseRef.current !== 'crossing') return;

    crossing.current.ready = true;
    if (crossing.current.held) enter('arriving');
  }, [enter]);

  const settleHome = useCallback(() => {
    if (phaseRef.current === 'island') enter('home');
  }, [enter]);

  return useMemo(
    () => ({ phase, travel, clouds, arrival, reduceMotion, depart, comeBack, islandReady, settleHome }),
    [phase, travel, clouds, arrival, reduceMotion, depart, comeBack, islandReady, settleHome]
  );
}

export function IslandVoyageProvider({ voyage, children }: { voyage: IslandVoyage; children: ReactNode }) {
  return <IslandVoyageContext.Provider value={voyage}>{children}</IslandVoyageContext.Provider>;
}

export function useIslandVoyage(): IslandVoyage {
  const provided = useContext(IslandVoyageContext);
  const travel = useSteadySharedValue(0);
  const clouds = useSteadySharedValue(0);
  const arrival = useSteadySharedValue(0);
  const inert = useMemo<IslandVoyage>(
    () => ({
      phase: 'home',
      travel,
      clouds,
      arrival,
      reduceMotion: false,
      depart: nothing,
      comeBack: nothing,
      islandReady: nothing,
      settleHome: nothing,
    }),
    [travel, clouds, arrival]
  );

  return provided ?? inert;
}
