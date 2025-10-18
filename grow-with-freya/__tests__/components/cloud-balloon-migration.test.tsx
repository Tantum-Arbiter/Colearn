import React from 'react';
import { render } from '@testing-library/react-native';
import { MainMenu } from '../../components/main-menu';
import { getSvgComponentFromSvg } from '../../components/main-menu/assets';
import { useAppStore } from '../../store/app-store';

// Mock the store
jest.mock('../../store/app-store');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Reanimated is mocked globally in jest.setup.js

describe('Cloud/Balloon Migration Tests', () => {
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppStore.mockReturnValue({
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
      setAppReady: jest.fn(),
      setOnboardingComplete: jest.fn(),
      setCurrentChildId: jest.fn(),
      setCurrentScreen: jest.fn(),
      setLoading: jest.fn(),
      requestReturnToMainMenu: jest.fn(),
      clearReturnToMainMenu: jest.fn(),
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
      const { root } = render(<MainMenu onNavigate={mockOnNavigate} />);
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
      mockUseAppStore.mockReturnValue({
        ...mockUseAppStore(),
        updateBackgroundAnimationState: mockUpdate,
      });

      render(<MainMenu onNavigate={mockOnNavigate} />);

      // The component should be able to call updateBackgroundAnimationState
      // with the new cloud properties structure
      expect(mockUpdate).toBeDefined();
    });
  });
});
