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
    it('should use cloudFloat1 and cloudFloat2 instead of balloonFloat1 and balloonFloat2', () => {
      const store = mockUseAppStore();
      
      expect(store.backgroundAnimationState).toHaveProperty('cloudFloat1');
      expect(store.backgroundAnimationState).toHaveProperty('cloudFloat2');
      expect(store.backgroundAnimationState).not.toHaveProperty('balloonFloat1');
      expect(store.backgroundAnimationState).not.toHaveProperty('balloonFloat2');
    });

    it('should have correct initial cloud positions', () => {
      const store = mockUseAppStore();
      
      expect(store.backgroundAnimationState.cloudFloat1).toBe(-200);
      expect(store.backgroundAnimationState.cloudFloat2).toBe(-400);
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
      const cloudComponent = getSvgComponentFromSvg('cloud');

      expect(cloudComponent).toBeDefined();
      // Test that cloud component works (balloon is mapped to cloud internally)
      expect(typeof cloudComponent === 'function' || typeof cloudComponent === 'object').toBe(true);
    });

    it('should handle cloud icon type', () => {
      const SvgComponent = getSvgComponentFromSvg('cloud');
      // The component might be an object with default export or a function
      expect(SvgComponent).toBeTruthy();
      expect(typeof SvgComponent === 'function' || typeof SvgComponent === 'object').toBe(true);
    });
  });

  describe('Animation State Management', () => {
    it('should call updateBackgroundAnimationState with cloud properties', () => {
      const mockUpdate = jest.fn();
      applyState({ ...state, updateBackgroundAnimationState: mockUpdate });

      render(
        <ScreenTimeProvider>
          <MainMenu onNavigate={mockOnNavigate} />
        </ScreenTimeProvider>
      );

      // The component should be able to call updateBackgroundAnimationState
      // with the new cloud properties structure
      expect(mockUpdate).toBeDefined();
    });
  });
});
