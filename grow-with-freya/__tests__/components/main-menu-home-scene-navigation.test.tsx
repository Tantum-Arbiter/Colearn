/**
 * Tests for navigation out of the home scene while the carousel tour is unseen.
 *
 * The carousel tour (`main_menu_tour`) gates navigation until it finishes, but
 * its overlay only renders on the legacy carousel branch. With the home scene
 * on -- which is the default -- nothing could ever finish the tour, so every
 * tap on Storybooks, Instruments and Puzzles was swallowed on a fresh install.
 *
 * These live in their own file because they need `shouldShowTutorial` to
 * return true, which is the opposite of the global mock in jest.setup and
 * would gate the legacy tests in main-menu.test.tsx.
 */


import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MainMenu } from '@/components/main-menu';
import { ScreenTimeProvider } from '@/components/screen-time/screen-time-provider';
import { useAppStore, type AppState } from '@/store/app-store';

jest.mock('@/store/app-store');
jest.mock('@/components/progress/use-progress-data', () => ({
  useProgressData: () => ({ badges: [], counters: {}, summary: { earned: 0, total: 0 }, challenges: [], milestones: [] }),
}));


let mockTourUnseen = true;

jest.mock('@/contexts/tutorial-context', () => ({
  TutorialProvider: ({ children }: { children: React.ReactNode }) => children,
  useTutorial: () => ({
    isLoaded: true,
    completedTutorials: [],
    hasSeenFirstStory: true,
    hasSeenSettings: true,
    activeTutorial: null,
    currentStep: 0,
    startTutorial: jest.fn(),
    nextStep: jest.fn(),
    previousStep: jest.fn(),
    skipTutorial: jest.fn(),
    completeTutorial: jest.fn(),
    shouldShowTutorial: () => mockTourUnseen,
    markFirstStoryViewed: jest.fn(),
    markSettingsViewed: jest.fn(),
    resetAllTutorials: jest.fn(),
    lastResetTimestamp: 0,
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

describe('home scene navigation', () => {
  const onNavigate = jest.fn();

  const applyState = (next: Partial<AppState>) => {
    mockUseAppStore.mockImplementation(((selector?: (s: AppState) => unknown) =>
      typeof selector === 'function' ? selector(next as AppState) : next
    ) as unknown as typeof useAppStore);
  };

  const renderHome = () =>
    render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={onNavigate} />
      </ScreenTimeProvider>
    );

  const pressCard = (tree: ReturnType<typeof render>, testID: string) => {
    const matches = tree.UNSAFE_root.findAll(
      (n: { props: Record<string, unknown> }) => n.props.testID === testID
    );

    fireEvent.press(matches[matches.length - 1]);
  };

  const WAYS_IN: [string, string][] = [
    ['continue-card', 'stories'],
    ['journey-card', 'progress'],
    ['achievement-card', 'progress'],
    ['find-story-pill', 'stories'],
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockTourUnseen = true;
    applyState({
      backgroundAnimationState: { cloudFloat1: 0, cloudFloat2: 0, rocketFloat1: 0, rocketFloat2: 0 },
      updateBackgroundAnimationState: jest.fn(),
      isAppReady: true,
      hasCompletedOnboarding: true,
      currentChildId: null,
      currentScreen: 'main',
      isLoading: false,
      shouldReturnToMainMenu: false,
      setAppReady: jest.fn(),
      setOnboardingComplete: jest.fn(),
      setCurrentChild: jest.fn(),
      setCurrentScreen: jest.fn(),
      setLoading: jest.fn(),
      setShowLoginAfterOnboarding: jest.fn(),
      requestReturnToMainMenu: jest.fn(),
      clearReturnToMainMenu: jest.fn(),
      subscriptionTier: 'free',
      _devSubscriptionOverride: null,
      getEffectiveTier: () => 'free',
      useHomeScene: true,
      storyProgress: {},
      getContinueReadingStoryId: jest.fn(() => null),
      userNickname: 'Freya',
      readStoryIds: [],
      readingStreak: 0,
      lastReadDate: null,
      achievementUnlockedAt: {},
      lastHomeVisitAt: null,
      lastStoryCompletedAt: null,
      childAgeInMonths: 36,
      recordHomeVisit: jest.fn(),
      recordAchievementUnlocks: jest.fn(),
    });
  });

  it.each(WAYS_IN)(
    'should navigate from %s even though the carousel tour is unseen',
    (testID, destination) => {
      const underTest = renderHome();

      pressCard(underTest, testID);

      expect(onNavigate).toHaveBeenCalledWith(destination);
    }
  );

  it('should still navigate once the tour has been seen', () => {
    mockTourUnseen = false;
    const underTest = renderHome();

    pressCard(underTest, 'find-story-pill');

    expect(onNavigate).toHaveBeenCalledWith('stories');
  });

  it('should open every story from the home, never one mode of them', () => {
    mockTourUnseen = false;
    const underTest = renderHome();

    pressCard(underTest, 'find-story-pill');

    const destination = onNavigate.mock.calls[0][0];
    expect(destination).toBe('stories');
    expect(destination.startsWith('stories-')).toBe(false);
  });
});
