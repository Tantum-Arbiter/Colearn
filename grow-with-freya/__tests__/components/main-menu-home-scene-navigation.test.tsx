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
import { IslandVoyageProvider, type IslandVoyage } from '@/contexts/island-voyage-context';
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
    ['navigation-item-home', 'stories'],
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
      finishedStoryIds: [],
      challengeCounts: {},
      earnedAchievementIds: [],
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

  it('should hand the home the way to open a story card', () => {
    const onOpenStoryCard = jest.fn();
    const underTest = render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={onNavigate} onOpenStoryCard={onOpenStoryCard} />
      </ScreenTimeProvider>
    );
    const home = underTest.UNSAFE_root.findAll(
      (n: { props: Record<string, unknown> }) => typeof n.props.onNavigate === 'function' && n.props.scrollBinding !== undefined
    )[0];

    expect(home.props.onOpenStoryCard).toBe(onOpenStoryCard);
  });

  it('should hand Progress the badge the home asks it to open', () => {
    mockTourUnseen = false;
    const underTest = renderHome();
    const home = underTest.UNSAFE_root.findAll(
      (n: { props: Record<string, unknown> }) => typeof n.props.onNavigate === 'function' && n.props.scrollBinding !== undefined
    )[0];

    home.props.onNavigate('progress', { badgeId: 'moon-explorer' });

    expect(onNavigate).toHaveBeenCalledWith('progress', { badgeId: 'moon-explorer' });
  });

  it('should set off for the island from achievement-card even though the carousel tour is unseen, opening no page for it', () => {
    const voyage = {
      phase: 'home',
      travel: { value: 0 },
      clouds: { value: 0 },
      arrival: { value: 0 },
      reduceMotion: false,
      depart: jest.fn(),
      comeBack: jest.fn(),
      islandReady: jest.fn(),
      settleHome: jest.fn(),
    } as unknown as IslandVoyage;
    const underTest = render(
      <IslandVoyageProvider voyage={voyage}>
        <ScreenTimeProvider>
          <MainMenu onNavigate={onNavigate} />
        </ScreenTimeProvider>
      </IslandVoyageProvider>
    );

    pressCard(underTest, 'achievement-card');

    expect(voyage.depart).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('should still navigate once the tour has been seen', () => {
    mockTourUnseen = false;
    const underTest = renderHome();

    pressCard(underTest, 'navigation-item-search');

    expect(onNavigate).toHaveBeenCalledWith('search');
  });

  it('should open the library for Learn, since the main menu is none of the bar\'s places', () => {
    mockTourUnseen = false;
    const underTest = renderHome();

    pressCard(underTest, 'navigation-item-home');

    expect(onNavigate).toHaveBeenCalledWith('stories');
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

/**
 * The home page is where the bar is first seen, so the home tour is the one
 * that walks the child along it. It is handed the bar's own buttons, and no
 * Learning target: there is no Learning button on the home page to point at.
 */
describe('the home tour and the bar', () => {
  const applyState = (next: Partial<AppState>) => {
    mockUseAppStore.mockImplementation(((selector?: (s: AppState) => unknown) =>
      typeof selector === 'function' ? selector(next as AppState) : next
    ) as unknown as typeof useAppStore);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTourUnseen = true;
    applyState({
      backgroundAnimationState: { cloudFloat1: 0, cloudFloat2: 0, rocketFloat1: 0, rocketFloat2: 0 },
      updateBackgroundAnimationState: jest.fn(),
      isAppReady: true,
      hasCompletedOnboarding: true,
      subscriptionTier: 'free',
      _devSubscriptionOverride: null,
      getEffectiveTier: () => 'free',
      useHomeScene: true,
      storyProgress: {},
      getContinueReadingStoryId: jest.fn(() => null),
      userNickname: 'Freya',
      readStoryIds: [],
      finishedStoryIds: [],
      challengeCounts: {},
      earnedAchievementIds: [],
      readingStreak: 0,
      achievementUnlockedAt: {},
      childAgeInMonths: 36,
      recordHomeVisit: jest.fn(),
      recordAchievementUnlocks: jest.fn(),
    });
  });

  function renderHome() {
    return render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={jest.fn()} />
      </ScreenTimeProvider>
    );
  }

  function tourTargets(tree: ReturnType<typeof render>): Record<string, unknown> {
    const tour = tree.UNSAFE_root.findAll(
      (n: { props: Record<string, unknown> }) => n.props.id === 'main_menu_tour' && n.props.targets !== undefined
    )[0];

    return tour.props.targets as Record<string, unknown>;
  }

  function barItemRefs(tree: ReturnType<typeof render>): Record<string, unknown> {
    const bar = tree.UNSAFE_root.findAll(
      (n: { props: Record<string, unknown> }) => n.props.itemRefs !== undefined && n.props.onSelect !== undefined
    )[0];

    return bar.props.itemRefs as Record<string, unknown>;
  }

  it.each([
    ['nav_learn', 'home'],
    ['nav_progress', 'progress'],
    ['screen_time_ring', 'screensafe'],
    ['nav_search', 'search'],
    ['nav_profile', 'profile'],
  ])('points the tour at the bar button itself for %s', (target, item) => {
    const tree = renderHome();

    const underTest = tourTargets(tree)[target];

    expect(underTest).toBeDefined();
    expect(underTest).toBe(barItemRefs(tree)[item]);
  });

  it('hands the tour the journey card and each of the three orbs, the same refs the home is given', () => {
    const tree = renderHome();
    const home = tree.UNSAFE_root.findAll(
      (n: { props: Record<string, unknown> }) => n.props.guideTargets !== undefined && n.props.scrollBinding !== undefined
    )[0].props.guideTargets as Record<string, unknown>;
    const targets = tourTargets(tree);

    expect(targets.achievement_card).toBe(home.achievement);
    expect(targets.streak_orb).toBe(home.streak);
    expect(targets.continue_orb).toBe(home.stories);
    expect(targets.badges_orb).toBe(home.badges);
    expect(targets.streak_orb).toBeDefined();
    expect(targets.badges_orb).toBeDefined();
  });

  it('points the tour at nothing the home no longer has', () => {
    const tree = renderHome();

    expect(Object.keys(tourTargets(tree))).not.toContain('stories_button');
    expect(Object.keys(tourTargets(tree))).not.toContain('instruments_button');
  });

  it('gives the tour nothing called Learning to point at', () => {
    const tree = renderHome();

    expect(Object.keys(tourTargets(tree))).not.toContain('learning_button');
  });

  it('leaves the grown-ups control to the Profile page, so the tour does not point at it here', () => {
    const tree = renderHome();

    expect(Object.keys(tourTargets(tree))).not.toContain('settings_button');
  });
});
