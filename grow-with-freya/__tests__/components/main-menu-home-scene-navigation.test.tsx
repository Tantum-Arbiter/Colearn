/**
 * Tests for navigation out of the home scene while the carousel tour is unseen.
 *
 * The carousel tour (`main_menu_tour`) gates navigation until it finishes on
 * the legacy carousel branch. On the home scene the owl guide covers the screen
 * itself while it is talking, so navigation is never gated there: a tap that
 * lands before the owl arrives must still work.
 *
 * These live in their own file because they need `shouldShowGuide` to
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

jest.mock('@/contexts/owl-guide-context', () => ({
  OwlGuideProvider: ({ children }: { children: React.ReactNode }) => children,
  useOwlGuide: () => ({
    isLoaded: true,
    completedGuides: [],
    lastResetTimestamp: 0,
    activeGuide: null,
    stepIndex: 0,
    startGuide: jest.fn(),
    nextStep: jest.fn(),
    skipGuide: jest.fn(),
    completeGuide: jest.fn(),
    dismissGuide: jest.fn(),
    shouldShowGuide: () => mockTourUnseen,
    resetGuides: jest.fn(),
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
    ['achievement-card', 'progress'],
    ['navigation-item-progress', 'progress'],
    ['navigation-item-search', 'search'],
    ['navigation-item-profile', 'profile'],
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

    pressCard(underTest, 'navigation-item-search');

    expect(onNavigate).toHaveBeenCalledWith('search');
  });

  it('should go nowhere for Home, which is where the child already is', () => {
    mockTourUnseen = false;
    const underTest = renderHome();

    pressCard(underTest, 'navigation-item-home');

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('should open the library as a section, never one mode of the stories', () => {
    mockTourUnseen = false;
    const underTest = renderHome();

    pressCard(underTest, 'navigation-item-profile');

    const destination = onNavigate.mock.calls[0][0];
    expect(destination).toBe('profile');
    expect(destination.startsWith('stories-')).toBe(false);
  });
});
