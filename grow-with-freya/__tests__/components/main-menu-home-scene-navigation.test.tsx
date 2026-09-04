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
import { HOME_ACTIVITIES } from '@/constants/home-scene';

jest.mock('@/store/app-store');

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

  const pressCard = (tree: ReturnType<typeof render>, id: string) => {
    const matches = tree.UNSAFE_root.findAll(
      (n: { props: Record<string, unknown> }) => n.props.testID === `activity-card-${id}`
    );

    fireEvent.press(matches[matches.length - 1]);
  };

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
    });
  });

  it.each(HOME_ACTIVITIES.map((activity) => [activity.id, activity.destination]))(
    'should navigate from the %s card even though the carousel tour is unseen',
    (id, destination) => {
      const underTest = renderHome();

      pressCard(underTest, id);

      expect(onNavigate).toHaveBeenCalledWith(destination);
    }
  );

  it('should still navigate once the tour has been seen', () => {
    mockTourUnseen = false;
    const underTest = renderHome();

    pressCard(underTest, 'interactive');

    expect(onNavigate).toHaveBeenCalledWith('stories');
  });

  it('should open every story from the Storybooks tile, never one mode of them', () => {
    mockTourUnseen = false;
    const underTest = renderHome();

    pressCard(underTest, 'interactive');

    const destination = onNavigate.mock.calls[0][0];
    expect(destination).toBe('stories');
    expect(destination.startsWith('stories-')).toBe(false);
  });
});
