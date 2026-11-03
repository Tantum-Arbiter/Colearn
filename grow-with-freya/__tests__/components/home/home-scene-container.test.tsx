import React from 'react';
import { act, render } from '@testing-library/react-native';
import { HomeSceneContainer } from '@/components/home/home-scene-container';
import type { HomeSceneProps } from '@/components/home/home-scene';
import { IslandVoyageProvider, type IslandVoyage } from '@/contexts/island-voyage-context';

const mockSceneProps: HomeSceneProps[] = [];
jest.mock('@/components/home/home-scene', () => ({
  HomeScene: (props: HomeSceneProps) => {
    mockSceneProps.push(props);
    return null;
  },
}));

const mockBadges = [
  { id: 'moon-explorer', titleKey: 't', descriptionKey: 'd', artwork: 1, category: 'stories', currentProgress: 2, targetProgress: 5, status: 'in_progress', recommendation: { labelKey: 'r', tag: 'calming' } },
];
jest.mock('@/components/home/use-child-home-data', () => ({
  useChildHomeData: () => ({
    badges: mockBadges,
    data: { firstName: 'Freya', storiesCompleted: 0, readingMinutes: 0, weeklyReadingMinutes: 0, readingStreakDays: 0, bestStreakDays: 0 },
    welcome: { state: 'normal', titleKey: 'title', subtitleKey: 'subtitle', params: { name: 'Freya', count: 0, achievement: '' } },
    celebrateAchievement: false,
  }),
}));

const mockJourneySteps = [{ id: 'day-1', day: 1, of: 7, kind: 'story', state: 'open', domainKey: 'plan.domains.language', skill: 'listening' }];
const mockUseJourneySteps = jest.fn((_isActive: boolean) => mockJourneySteps);
jest.mock('@/components/home/use-journey-steps', () => ({
  useJourneySteps: (isActive: boolean) => mockUseJourneySteps(isActive),
}));

jest.mock('@/components/home/screen-time-glance', () => ({ ScreenTimeGlance: () => null }));
jest.mock('@/components/ui/subscription-overlay', () => ({ SubscriptionOverlay: () => null }));
jest.mock('@/components/ui/trial-end-upgrade-overlay', () => ({ TrialEndUpgradeOverlay: () => null }));
let mockTransitioning = false;
jest.mock('@/contexts/story-transition-context', () => ({
  useStoryTransition: () => ({ requestStoryOpen: jest.fn(), isTransitioning: mockTransitioning }),
}));

const mockSheetProps: { badge: { id: string } | null; onClose: () => void; onRecommend: (badge: unknown) => void }[] = [];
jest.mock('@/components/progress/badge-detail-sheet', () => ({
  BadgeDetailSheet: (props: (typeof mockSheetProps)[number]) => {
    mockSheetProps.push(props);
    return null;
  },
}));
jest.mock('@/hooks/use-screen-time-allowance', () => ({ useScreenTimeAllowance: () => null }));
jest.mock('@/hooks/use-trial-end-prompt', () => ({ useTrialEndPrompt: () => ({ visible: false, dismiss: jest.fn(), status: null }) }));
jest.mock('@/hooks/use-time-of-day', () => ({ useTimeOfDay: () => 'day' }));
jest.mock('@/data/stories', () => ({ ALL_STORIES: [] }));
jest.mock('@/store/app-store', () => ({
  useAppStore: (selector: (state: { getEffectiveTier: () => string }) => unknown) => selector({ getEffectiveTier: () => 'free' }),
}));

function voyage(): IslandVoyage {
  return {
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
}

describe('HomeSceneContainer', () => {
  beforeEach(() => {
    mockSceneProps.length = 0;
    mockSheetProps.length = 0;
    mockTransitioning = false;
  });

  it.each([true, false])('hands the scene the journey`s steps, read while the home screen is showing (%p)', (isActive) => {
    mockUseJourneySteps.mockClear();
    render(
      <IslandVoyageProvider voyage={voyage()}>
        <HomeSceneContainer onNavigate={jest.fn()} isActive={isActive} />
      </IslandVoyageProvider>
    );

    expect(mockSceneProps[mockSceneProps.length - 1].journeySteps).toBe(mockJourneySteps);
    expect(mockUseJourneySteps).toHaveBeenLastCalledWith(isActive);
  });

  it('sets off for the island from the learning journey card, and opens no other page for it', () => {
    const given = voyage();
    const onNavigate = jest.fn();
    render(
      <IslandVoyageProvider voyage={given}>
        <HomeSceneContainer onNavigate={onNavigate} />
      </IslandVoyageProvider>
    );

    act(() => { mockSceneProps[mockSceneProps.length - 1].onOpenJourney(); });

    expect(given.depart).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  // counted as settled from the page switch under the cloud, the home started its sky and sun
  // 0.8 s later, in the middle of the landing, and the landing hitched
  it.each([
    ['home', true],
    ['leaving', true],
    ['recrossing', false],
    ['landing', false],
  ] as const)('while the voyage is %s, tells the home it is active: %p', (phase, active) => {
    render(
      <IslandVoyageProvider voyage={{ ...voyage(), phase }}>
        <HomeSceneContainer onNavigate={jest.fn()} isActive />
      </IslandVoyageProvider>
    );

    expect(mockSceneProps[mockSceneProps.length - 1].isActive).toBe(active);
  });

  it('keeps a home that is not shown inactive whatever the voyage is doing', () => {
    render(
      <IslandVoyageProvider voyage={voyage()}>
        <HomeSceneContainer onNavigate={jest.fn()} isActive={false} />
      </IslandVoyageProvider>
    );

    expect(mockSceneProps[mockSceneProps.length - 1].isActive).toBe(false);
  });

  it('hands the scene the way to open a story card', () => {
    const onOpenStoryCard = jest.fn();
    render(
      <IslandVoyageProvider voyage={voyage()}>
        <HomeSceneContainer onNavigate={jest.fn()} onOpenStoryCard={onOpenStoryCard} />
      </IslandVoyageProvider>
    );

    expect(mockSceneProps[mockSceneProps.length - 1].onOpenStoryCard).toBe(onOpenStoryCard);
  });

  // operator, 2026-10-05: "the achievement should appear in its window, not take us down the page
  // for achievements"
  describe('the badge being tracked', () => {
    function renderOn(onNavigate = jest.fn()) {
      render(
        <IslandVoyageProvider voyage={voyage()}>
          <HomeSceneContainer onNavigate={onNavigate} />
        </IslandVoyageProvider>
      );
      return onNavigate;
    }
    const sheet = () => mockSheetProps[mockSheetProps.length - 1];

    it('opens in its own window on the home, and goes nowhere', () => {
      const onNavigate = renderOn();

      act(() => { mockSceneProps[mockSceneProps.length - 1].onOpenBadge?.('moon-explorer'); });

      expect(sheet().badge?.id).toBe('moon-explorer');
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('closes back to the home', () => {
      renderOn();
      act(() => { mockSceneProps[mockSceneProps.length - 1].onOpenBadge?.('moon-explorer'); });

      act(() => { sheet().onClose(); });

      expect(sheet().badge).toBeNull();
    });

    it('takes its suggestion to the library, with the window closed behind it', () => {
      const onNavigate = renderOn();
      act(() => { mockSceneProps[mockSceneProps.length - 1].onOpenBadge?.('moon-explorer'); });

      act(() => { sheet().onRecommend(sheet().badge); });

      expect(sheet().badge).toBeNull();
      expect(onNavigate).toHaveBeenCalledWith('stories', { recommend: { tag: 'calming' } });
    });

    it('falls back to Progress for a badge the home does not know', () => {
      const onNavigate = renderOn();

      act(() => { mockSceneProps[mockSceneProps.length - 1].onOpenBadge?.('not-a-badge'); });

      expect(onNavigate).toHaveBeenCalledWith('progress', { badgeId: 'not-a-badge' });
      expect(sheet().badge).toBeNull();
    });
  });

  it.each([true, false])('tells the scene whether a story card is open over it (%p)', (open) => {
    mockTransitioning = open;
    render(
      <IslandVoyageProvider voyage={voyage()}>
        <HomeSceneContainer onNavigate={jest.fn()} />
      </IslandVoyageProvider>
    );

    expect(mockSceneProps[mockSceneProps.length - 1].storyOpen).toBe(open);
  });

  it('still opens the badges from the bar at the foot of the screen', () => {
    const onNavigate = jest.fn();
    render(
      <IslandVoyageProvider voyage={voyage()}>
        <HomeSceneContainer onNavigate={onNavigate} />
      </IslandVoyageProvider>
    );

    act(() => { mockSceneProps[mockSceneProps.length - 1].onSelectSection('progress'); });

    expect(onNavigate).toHaveBeenCalledWith('progress');
  });

  it('does nothing from the card, rather than fail, with no voyage above it', () => {
    const onNavigate = jest.fn();
    render(<HomeSceneContainer onNavigate={onNavigate} />);

    expect(() => {
      act(() => { mockSceneProps[mockSceneProps.length - 1].onOpenJourney(); });
    }).not.toThrow();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
