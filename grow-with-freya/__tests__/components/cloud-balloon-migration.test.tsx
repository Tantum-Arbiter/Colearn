import React from 'react';
import { render } from '@testing-library/react-native';
import { MainMenu } from '../../components/main-menu';
import { getSvgComponentFromSvg } from '../../components/main-menu/assets';
import { useAppStore, type AppState } from '../../store/app-store';
import { ScreenTimeProvider } from '../../components/screen-time/screen-time-provider';

// Mock the store
jest.mock('../../store/app-store', () => ({
  useAppStore: jest.fn(),
  BASIC_TIER_INSTRUMENTS: ['flute', 'recorder', 'ocarina'],
}));
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Reanimated is mocked globally in jest.setup.js

describe('Cloud/Balloon Migration Tests', () => {
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
        rocketFloat1: 1000,
        rocketFloat2: -200,
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

  describe('Store Migration', () => {
    // the real store, not the mock this suite installs: asserting on the mock
    // only restates the fixture and passes whatever the store actually holds
    const actualStore = (
      jest.requireActual('../../store/app-store') as { useAppStore: typeof useAppStore }
    ).useAppStore;

    it('should use cloudFloat1 and cloudFloat2 instead of balloonFloat1 and balloonFloat2', () => {
      const { backgroundAnimationState } = actualStore.getState();

      expect(backgroundAnimationState).toHaveProperty('cloudFloat1');
      expect(backgroundAnimationState).toHaveProperty('cloudFloat2');
      expect(backgroundAnimationState).not.toHaveProperty('balloonFloat1');
      expect(backgroundAnimationState).not.toHaveProperty('balloonFloat2');
    });

    it('should have correct initial cloud positions', () => {
      const { backgroundAnimationState } = actualStore.getState();

      expect(backgroundAnimationState.cloudFloat1).toBe(-200);
      expect(backgroundAnimationState.cloudFloat2).toBe(-400);
    });
  });

  describe('Component Rendering', () => {
    it('should render MainMenu with cloud animations without crashing', () => {
      const { root } = render(
        <ScreenTimeProvider>
          <MainMenu onNavigate={mockOnNavigate} />
        </ScreenTimeProvider>
      );
      expect(root).toBeTruthy();
    });
  });

  describe('Asset Backward Compatibility', () => {
    it('should map balloon to cloud component for backward compatibility', () => {
      // the actual compatibility claim: the old name resolves to the same
      // component as the new one, rather than merely being non-null
      expect(getSvgComponentFromSvg('balloon')).toBe(getSvgComponentFromSvg('cloud'));
    });

    it('should handle cloud icon type', () => {
      const SvgComponent = getSvgComponentFromSvg('cloud');

      const { toJSON } = render(<SvgComponent width={24} height={24} />);

      expect(toJSON()).not.toBeNull();
    });
  });

  describe('Animation State Management', () => {
    it('should call updateBackgroundAnimationState with cloud properties', () => {
      const mockUpdate = jest.fn();
      applyState({ ...state, updateBackgroundAnimationState: mockUpdate });

      const { unmount } = render(
        <ScreenTimeProvider>
          <MainMenu onNavigate={mockOnNavigate} />
        </ScreenTimeProvider>
      );

      // the menu persists cloud positions in its unmount cleanup
      unmount();

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          cloudFloat1: expect.any(Number),
          cloudFloat2: expect.any(Number),
        })
      );
    });
  });
});
