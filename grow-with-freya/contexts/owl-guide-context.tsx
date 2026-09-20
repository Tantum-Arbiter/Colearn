import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GUIDE_IDS, GUIDE_STORAGE_KEY, type GuideId } from '@/constants/owl-guide';
import { Logger } from '@/utils/logger';

export { GUIDE_STORAGE_KEY };

const log = Logger.create('OwlGuide');

export interface GuideState {
  completedGuides: GuideId[];
  lastResetTimestamp: number;
}

const EMPTY_STATE: GuideState = {
  completedGuides: [],
  lastResetTimestamp: 0,
};

const LEGACY_FLAGS: Record<string, GuideId> = {
  hasSeenFirstStory: 'story_reader_tips',
  hasSeenSettings: 'settings_walkthrough',
  hasSeenEmotionCards: 'emotion_cards_tips',
  hasSeenScreenTime: 'screen_time_tips',
};

function isGuideId(value: unknown): value is GuideId {
  return typeof value === 'string' && (GUIDE_IDS as readonly string[]).includes(value);
}

export function migrateGuideState(raw: unknown): GuideState {
  if (!raw || typeof raw !== 'object') return EMPTY_STATE;
  const record = raw as Record<string, unknown>;

  const listed = [
    ...(Array.isArray(record.completedGuides) ? record.completedGuides : []),
    ...(Array.isArray(record.completedTutorials) ? record.completedTutorials : []),
  ];
  const flagged = Object.entries(LEGACY_FLAGS)
    .filter(([flag]) => record[flag] === true)
    .map(([, id]) => id);

  const completedGuides = [...new Set([...listed, ...flagged].filter(isGuideId))];
  const lastResetTimestamp = typeof record.lastResetTimestamp === 'number' ? record.lastResetTimestamp : 0;

  return { completedGuides, lastResetTimestamp };
}

export interface OwlGuideContextValue {
  isLoaded: boolean;
  completedGuides: GuideId[];
  lastResetTimestamp: number;
  activeGuide: GuideId | null;
  stepIndex: number;
  startGuide: (id: GuideId) => void;
  nextStep: () => void;
  skipGuide: () => void;
  completeGuide: () => void;
  dismissGuide: () => void;
  shouldShowGuide: (id: GuideId) => boolean;
  resetGuides: () => Promise<void>;
}

const OwlGuideContext = createContext<OwlGuideContextValue | undefined>(undefined);

export function OwlGuideProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [state, setState] = useState<GuideState>(EMPTY_STATE);
  const [activeGuide, setActiveGuide] = useState<GuideId | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(GUIDE_STORAGE_KEY);
        if (!cancelled && stored) {
          setState(migrateGuideState(JSON.parse(stored)));
        }
      } catch (error) {
        log.error('Failed to load guide state:', error);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: GuideState) => {
    setState(next);
    try {
      await AsyncStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      log.error('Failed to persist guide state:', error);
    }
  }, []);

  const shouldShowGuide = useCallback(
    (id: GuideId) => !state.completedGuides.includes(id),
    [state.completedGuides]
  );

  const startGuide = useCallback((id: GuideId) => {
    setActiveGuide(id);
    setStepIndex(0);
  }, []);

  const nextStep = useCallback(() => setStepIndex((index) => index + 1), []);

  const finish = useCallback(
    (remember: boolean) => {
      if (activeGuide && remember && !state.completedGuides.includes(activeGuide)) {
        persist({ ...state, completedGuides: [...state.completedGuides, activeGuide] });
      }
      setActiveGuide(null);
      setStepIndex(0);
    },
    [activeGuide, persist, state]
  );

  const skipGuide = useCallback(() => finish(true), [finish]);
  const completeGuide = useCallback(() => finish(true), [finish]);
  const dismissGuide = useCallback(() => finish(false), [finish]);

  const resetGuides = useCallback(async () => {
    setActiveGuide(null);
    setStepIndex(0);
    await persist({ completedGuides: [], lastResetTimestamp: Date.now() });
  }, [persist]);

  const value = useMemo<OwlGuideContextValue>(
    () => ({
      isLoaded,
      completedGuides: state.completedGuides,
      lastResetTimestamp: state.lastResetTimestamp,
      activeGuide,
      stepIndex,
      startGuide,
      nextStep,
      skipGuide,
      completeGuide,
      dismissGuide,
      shouldShowGuide,
      resetGuides,
    }),
    [
      isLoaded,
      state.completedGuides,
      state.lastResetTimestamp,
      activeGuide,
      stepIndex,
      startGuide,
      nextStep,
      skipGuide,
      completeGuide,
      dismissGuide,
      shouldShowGuide,
      resetGuides,
    ]
  );

  return <OwlGuideContext.Provider value={value}>{children}</OwlGuideContext.Provider>;
}

export function useOwlGuide(): OwlGuideContextValue {
  const context = useContext(OwlGuideContext);
  if (!context) {
    throw new Error('useOwlGuide must be used within an OwlGuideProvider');
  }
  return context;
}
