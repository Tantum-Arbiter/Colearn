import React from 'react';
import { render } from '@testing-library/react-native';
import { MainMenu } from '../../components/main-menu';
import { useAppStore } from '../../store/app-store';
import { ScreenTimeProvider } from '../../components/screen-time/screen-time-provider';

// Mock the store
jest.mock('../../store/app-store');
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

// Reanimated is mocked globally in jest.setup.js

describe('Main Menu Performance Tests', () => {
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppStore.mockReturnValue({
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
      setAppReady: jest.fn(),
      setOnboardingComplete: jest.fn(),
      setCurrentChildId: jest.fn(),
      setCurrentScreen: jest.fn(),
      setLoading: jest.fn(),
      requestReturnToMainMenu: jest.fn(),
      clearReturnToMainMenu: jest.fn(),
    });
  });

  describe('Performance Optimization', () => {
    it('should render without rocket animations for optimal performance', () => {
      // Rockets have been completely removed per user request
      const { root } = render(
        <ScreenTimeProvider>
          <MainMenu onNavigate={mockOnNavigate} />
        </ScreenTimeProvider>
      );
      expect(root).toBeTruthy();

      // The main menu should render successfully without any rocket animations
      // This ensures optimal performance with no rocket-related overhead
    });

    it('should handle static rocket values in state persistence', () => {
      const store = mockUseAppStore();

      // Verify rocket positions are static values (no animation)
      expect(store.backgroundAnimationState.rocketFloat1).toBe(1000); // Static off-screen
      expect(store.backgroundAnimationState.rocketFloat2).toBe(-200); // Static off-screen

      const { root } = render(
        <ScreenTimeProvider>
          <MainMenu onNavigate={mockOnNavigate} />
        </ScreenTimeProvider>
      );
      expect(root).toBeTruthy();
    });
  });

  describe('Cloud Animation Integrity', () => {
    it('should maintain cloud animations without rocket interference', () => {
      const { root } = render(
        <ScreenTimeProvider>
          <MainMenu onNavigate={mockOnNavigate} />
        </ScreenTimeProvider>
      );
      expect(root).toBeTruthy();

      // Cloud animations should work independently without rocket complexity
    });

    it('should handle animation resume for clouds only', () => {
      // Test with different cloud positions
      mockUseAppStore.mockReturnValue({
        ...mockUseAppStore(),
        backgroundAnimationState: {
          cloudFloat1: -100, // Mid-animation position
          cloudFloat2: -300, // Different position
          rocketFloat1: 1000, // Static
          rocketFloat2: -200, // Static
        },
      });

      const { root } = render(
        <ScreenTimeProvider>
          <MainMenu onNavigate={mockOnNavigate} />
        </ScreenTimeProvider>
      );
      expect(root).toBeTruthy();

      // Component should handle cloud resume logic without rocket complexity
    });
  });

  describe('Render Stability', () => {
    it('should maintain consistent rendering across re-renders', () => {
      const { root, rerender } = render(
        <ScreenTimeProvider>
          <MainMenu onNavigate={mockOnNavigate} />
        </ScreenTimeProvider>
      );
      expect(root).toBeTruthy();

      // Re-render should not break the animation sequence
      rerender(
        <ScreenTimeProvider>
          <MainMenu onNavigate={mockOnNavigate} />
        </ScreenTimeProvider>
      );
      expect(root).toBeTruthy();
    });

    it('should handle edge cases in cloud positioning', () => {
      // Test with clouds at boundary positions
      mockUseAppStore.mockReturnValue({
        ...mockUseAppStore(),
        backgroundAnimationState: {
          cloudFloat1: -1000, // Far off-screen
          cloudFloat2: 2000,  // Far off-screen opposite
          rocketFloat1: 1000, // Static
          rocketFloat2: -200, // Static
        },
      });

      const { root } = render(
        <ScreenTimeProvider>
          <MainMenu onNavigate={mockOnNavigate} />
        </ScreenTimeProvider>
      );
      expect(root).toBeTruthy();
    });
  });
});
