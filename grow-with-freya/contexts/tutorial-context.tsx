import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/utils/logger';

const log = Logger.create('TutorialContext');

const TUTORIAL_STORAGE_KEY = '@tutorial_state';

/**
 * Tutorial IDs for tracking completion
 */
export type TutorialId =
  | 'main_menu_tour'
  | 'story_reader_tips'
  | 'settings_walkthrough'
  | 'gesture_hints'
  | 'book_mode_tour'
  | 'record_mode_tour'
  | 'narrate_mode_tour';

/**
 * Persisted tutorial state
 */
interface TutorialState {
  completedTutorials: TutorialId[];
  hasSeenFirstStory: boolean;
  hasSeenSettings: boolean;
  lastResetTimestamp: number;
}

const DEFAULT_STATE: TutorialState = {
  completedTutorials: [],
  hasSeenFirstStory: false,
  hasSeenSettings: false,
  lastResetTimestamp: 0,
};

interface TutorialContextType {
  // State
  isLoaded: boolean;
  completedTutorials: TutorialId[];
  hasSeenFirstStory: boolean;
  hasSeenSettings: boolean;

  // Active tutorial management
  activeTutorial: TutorialId | null;
  currentStep: number;

  // Actions
  startTutorial: (tutorialId: TutorialId) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;

  // Checks
  shouldShowTutorial: (tutorialId: TutorialId) => boolean;
  markFirstStoryViewed: () => void;
  markSettingsViewed: () => void;

  // Reset (for settings)
  resetAllTutorials: () => Promise<void>;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

interface TutorialProviderProps {
  children: ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [state, setState] = useState<TutorialState>(DEFAULT_STATE);
  const [activeTutorial, setActiveTutorial] = useState<TutorialId | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Load persisted state on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const stored = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as TutorialState;
          setState(parsed);
          log.debug('Loaded tutorial state:', parsed);
        }
      } catch (error) {
        log.error('Failed to load tutorial state:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadState();
  }, []);

  // Persist state changes
  const persistState = useCallback(async (newState: TutorialState) => {
    try {
      await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(newState));
      setState(newState);
    } catch (error) {
      log.error('Failed to persist tutorial state:', error);
    }
  }, []);

  const shouldShowTutorial = useCallback((tutorialId: TutorialId): boolean => {
    return !state.completedTutorials.includes(tutorialId);
  }, [state.completedTutorials]);

  const startTutorial = useCallback((tutorialId: TutorialId) => {
    log.debug('Starting tutorial:', tutorialId);
    setActiveTutorial(tutorialId);
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, []);

  const previousStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const skipTutorial = useCallback(() => {
    if (activeTutorial) {
      const newState = {
        ...state,
        completedTutorials: [...state.completedTutorials, activeTutorial],
      };
      persistState(newState);
      setActiveTutorial(null);
      setCurrentStep(0);
      log.debug('Skipped tutorial:', activeTutorial);
    }
  }, [activeTutorial, state, persistState]);

  const completeTutorial = useCallback(() => {
    if (activeTutorial) {
      const newState = {
        ...state,
        completedTutorials: [...state.completedTutorials, activeTutorial],
      };
      persistState(newState);
      setActiveTutorial(null);
      setCurrentStep(0);
      log.debug('Completed tutorial:', activeTutorial);
    }
  }, [activeTutorial, state, persistState]);

  const markFirstStoryViewed = useCallback(() => {
    if (!state.hasSeenFirstStory) {
      const newState = { ...state, hasSeenFirstStory: true };
      persistState(newState);
    }
  }, [state, persistState]);

  const markSettingsViewed = useCallback(() => {
    if (!state.hasSeenSettings) {
      const newState = { ...state, hasSeenSettings: true };
      persistState(newState);
    }
  }, [state, persistState]);

  const resetAllTutorials = useCallback(async () => {
    const newState: TutorialState = {
      ...DEFAULT_STATE,
      lastResetTimestamp: Date.now(),
    };
    await persistState(newState);
    log.info('Reset all tutorials');
  }, [persistState]);

  const contextValue: TutorialContextType = {
    isLoaded,
    completedTutorials: state.completedTutorials,
    hasSeenFirstStory: state.hasSeenFirstStory,
    hasSeenSettings: state.hasSeenSettings,
    activeTutorial,
    currentStep,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    shouldShowTutorial,
    markFirstStoryViewed,
    markSettingsViewed,
    resetAllTutorials,
  };

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextType {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}

