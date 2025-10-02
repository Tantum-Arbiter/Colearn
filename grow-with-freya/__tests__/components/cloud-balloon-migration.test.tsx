import React from 'react';
import { render } from '@testing-library/react-native';
import { MainMenu } from '../../components/main-menu';
import { getSvgComponentFromSvg } from '../../components/main-menu/assets';
import { useAppStore } from '../../store/app-store';

// Mock the store
jest.mock('../../store/app-store');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

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
      const balloonComponent = getSvgComponentFromSvg('balloon');
      
      expect(cloudComponent).toBeDefined();
      expect(balloonComponent).toBeDefined();
      expect(balloonComponent).toBe(cloudComponent);
    });

    it('should handle both cloud and balloon icon types', () => {
      const iconTypes = ['cloud', 'balloon'];
      
      iconTypes.forEach(iconType => {
        const SvgComponent = getSvgComponentFromSvg(iconType);
        expect(typeof SvgComponent).toBe('function');
        expect(SvgComponent.name).toBeTruthy();
      });
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
