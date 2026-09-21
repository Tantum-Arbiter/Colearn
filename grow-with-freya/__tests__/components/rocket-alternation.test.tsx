import React from 'react';
import { render } from '@testing-library/react-native';
import { MainMenu } from '../../components/main-menu';
import { useAppStore, type AppState } from '../../store/app-store';
import { ScreenTimeProvider } from '../../components/screen-time/screen-time-provider';

// Mock the store
jest.mock('../../store/app-store', () => ({
  useAppStore: jest.fn(),
  BASIC_TIER_INSTRUMENTS: ['flute', 'recorder', 'ocarina'],
}));
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Reanimated is mocked globally in jest.setup.js

describe('Main Menu Performance Tests', () => {
  const mockOnNavigate = jest.fn();

  let state: Partial<AppState>;

  // the store is read both bare and via selectors, so the mock has to honour a
  // selector argument the way zustand does
  const applyState = (next: Partial<AppState>) => {
    state = next;
    mockUseAppStore.mockImplementation(((selector?: (s: AppState) => unknown) =>
      typeof selector === 'function' ? selector(state as AppState) : state
    ) as unknown as typeof useAppStore);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    applyState({
      backgroundAnimationState: {
        cloudFloat1: -200,
        cloudFloat2: -400,
        rocketFloat1: 1000, // Static value - rockets removed
        rocketFloat2: -200, // Static value - rockets removed
      },
      updateBackgroundAnimationState: jest.fn(),
      isAppReady: true,
      hasCompletedOnboarding: false,
      currentChildId: null,
      currentScreen: 'main',
      isLoading: false,
      shouldReturnToMainMenu: false,
      subscriptionTier: 'free',
      _devSubscriptionOverride: null,
      getEffectiveTier: () => 'free',
      setAppReady: jest.fn(),
      setOnboardingComplete: jest.fn(),
      setCurrentChild: jest.fn(),
      setCurrentScreen: jest.fn(),
      setLoading: jest.fn(),
      setShowLoginAfterOnboarding: jest.fn(),
      requestReturnToMainMenu: jest.fn(),
      clearReturnToMainMenu: jest.fn(),
      // these cloud animations belong to the legacy menu, not the home scene
      useHomeScene: false,
      storyProgress: {},
      getContinueReadingStoryId: jest.fn(() => null),
    });
  });

  const renderMenu = () =>
    render(
      <ScreenTimeProvider>
        <MainMenu onNavigate={mockOnNavigate} />
      </ScreenTimeProvider>
    );

  // the menu writes cloud positions and the rocket values in its unmount
  // cleanup, so that payload is the observable evidence of what it animates
  const persistedOnUnmount = (): Record<string, number> => {
    const update = jest.fn();
    applyState({ ...state, updateBackgroundAnimationState: update });

    renderMenu().unmount();

    return update.mock.calls[0][0] as Record<string, number>;
  };

  describe('Performance Optimization', () => {
    it('should render without rocket animations for optimal performance', () => {
      const { toJSON } = renderMenu();

      expect(JSON.stringify(toJSON())).toContain('main-menu-container');
    });

    it('should handle static rocket values in state persistence', () => {
      // hard-coded in the menu because rockets were removed -- if either ever
      // becomes animated again these stop being constants
      expect(persistedOnUnmount()).toMatchObject({
        rocketFloat1: 1000,
        rocketFloat2: -200,
      });
    });
  });

  describe('Cloud Animation Integrity', () => {
    it('should maintain cloud animations without rocket interference', () => {
      const persisted = persistedOnUnmount();

      expect(Number.isFinite(persisted.cloudFloat1)).toBe(true);
      expect(Number.isFinite(persisted.cloudFloat2)).toBe(true);
      expect(persisted.rocketFloat1).toBe(1000);
      expect(persisted.rocketFloat2).toBe(-200);
    });

    it('should handle animation resume for clouds only', () => {
      // the menu always starts clouds from its own off-screen constants and
      // never reads backgroundAnimationState, so a stored mid-animation
      // position must not leak into what it writes back
      applyState({
        ...state,
        backgroundAnimationState: {
          cloudFloat1: -100,
          cloudFloat2: -300,
          rocketFloat1: 1000,
          rocketFloat2: -200,
        },
      });

      const persisted = persistedOnUnmount();

      expect(persisted.cloudFloat1).not.toBe(-100);
      expect(persisted.cloudFloat2).not.toBe(-300);
      expect(Number.isFinite(persisted.cloudFloat1)).toBe(true);
    });
  });

  describe('Render Stability', () => {
    it('should maintain consistent rendering across re-renders', () => {
      const { toJSON, rerender } = renderMenu();
      const first = JSON.stringify(toJSON());

      rerender(
        <ScreenTimeProvider>
          <MainMenu onNavigate={mockOnNavigate} />
        </ScreenTimeProvider>
      );

      expect(JSON.stringify(toJSON())).toBe(first);
    });

    it('should handle edge cases in cloud positioning', () => {
      // the menu guards on isFinite before saving, so absurd stored positions
      // must never reach the persisted payload
      applyState({
        ...state,
        backgroundAnimationState: {
          cloudFloat1: -1000,
          cloudFloat2: 2000,
          rocketFloat1: 1000,
          rocketFloat2: -200,
        },
      });

      const persisted = persistedOnUnmount();

      expect(Number.isFinite(persisted.cloudFloat1)).toBe(true);
      expect(Number.isFinite(persisted.cloudFloat2)).toBe(true);
      expect(persisted.cloudFloat2).not.toBe(2000);
    });
  });
});
