import React, { ReactNode } from 'react';

// Mock TutorialContext for tests
export type TutorialId = 
  | 'main_menu_tour'
  | 'story_reader_tips'
  | 'settings_walkthrough'
  | 'gesture_hints';

const mockTutorialContext = {
  isLoaded: true,
  completedTutorials: [] as TutorialId[],
  hasSeenFirstStory: true,
  hasSeenSettings: true,
  activeTutorial: null as TutorialId | null,
  currentStep: 0,
  startTutorial: jest.fn(),
  nextStep: jest.fn(),
  previousStep: jest.fn(),
  skipTutorial: jest.fn(),
  completeTutorial: jest.fn(),
  shouldShowTutorial: jest.fn().mockReturnValue(false),
  markFirstStoryViewed: jest.fn(),
  markSettingsViewed: jest.fn(),
  resetAllTutorials: jest.fn().mockResolvedValue(undefined),
};

export function TutorialProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useTutorial() {
  return mockTutorialContext;
}

