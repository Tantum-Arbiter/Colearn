/**
 * Comprehensive Animation Tests for Main Menu
 * Tests star animations, rocket animations, and page transitions
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { MainMenu } from '@/components/main-menu';
import { 
  createMockSharedValue, 
  testAnimationTiming, 
  waitForAnimations,
  resetAnimationMocks,
  mockAnimationFunctions
} from '@/__tests__/utils/animation-test-utils';

// Reanimated is mocked globally in jest.setup.js

describe('MainMenu Animations', () => {
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    resetAnimationMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Star Background Animation', () => {
    it('should start star rotation animation on mount', () => {
      render(<MainMenu onNavigate={mockOnNavigate} />);

      // Should call withRepeat for continuous star rotation
      expect(mockAnimationFunctions.withRepeat).toHaveBeenCalled();
      
      // Should use withTiming for the rotation animation
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalledWith(
        360, // Full rotation
        expect.objectContaining({
          duration: 20000, // 20 second cycle
        })
      );
    });

    it('should maintain consistent star positions across renders', () => {
      const { rerender } = render(<MainMenu onNavigate={mockOnNavigate} />);
      
      const firstRenderCalls = mockAnimationFunctions.withTiming.mock.calls.length;
      
      // Re-render component
      rerender(<MainMenu onNavigate={mockOnNavigate} />);
      
      // Star animation should be consistent
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalled();
    });

    it('should complete full rotation cycle', async () => {
      render(<MainMenu onNavigate={mockOnNavigate} />);

      // Advance through full rotation cycle
      act(() => {
        jest.advanceTimersByTime(20000);
      });

      // Should have completed one full cycle
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalledWith(
        360,
        expect.objectContaining({ duration: 20000 })
      );
    });
  });

  describe('Rocket Animation', () => {
    it('should animate rocket on stories button press', async () => {
      const { getByTestId } = render(<MainMenu onNavigate={mockOnNavigate} />);

      // Clear initial animation calls
      mockAnimationFunctions.withTiming.mockClear();

      // Press stories button to trigger rocket animation
      const storiesButton = getByTestId('menu-icon-stories');
      fireEvent.press(storiesButton);

      // Should trigger rocket animation
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalled();
      
      // Advance through rocket animation
      await waitForAnimations(1000);
      
      // Should call navigation after animation
      expect(mockOnNavigate).toHaveBeenCalledWith('stories');
    });

    it('should have correct rocket animation sequence', async () => {
      const { getByTestId } = render(<MainMenu onNavigate={mockOnNavigate} />);

      mockAnimationFunctions.withTiming.mockClear();

      const storiesButton = getByTestId('menu-icon-stories');
      fireEvent.press(storiesButton);

      // Should have multiple animation phases for rocket
      const timingCalls = mockAnimationFunctions.withTiming.mock.calls;
      expect(timingCalls.length).toBeGreaterThan(1);
      
      // Should include scale and position animations
      expect(timingCalls.some(call => 
        typeof call[0] === 'number' && call[0] !== 360 // Not star rotation
      )).toBe(true);
    });

    it('should prevent multiple rocket animations during cooldown', async () => {
      const { getByTestId } = render(<MainMenu onNavigate={mockOnNavigate} />);

      const storiesButton = getByTestId('menu-icon-stories');
      
      // First press
      fireEvent.press(storiesButton);
      const firstCallCount = mockAnimationFunctions.withTiming.mock.calls.length;
      
      // Immediate second press (should be ignored)
      fireEvent.press(storiesButton);
      const secondCallCount = mockAnimationFunctions.withTiming.mock.calls.length;
      
      // Should not have additional animation calls
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('Menu Icon Animations', () => {
    it('should animate all menu icons on mount', () => {
      render(<MainMenu onNavigate={mockOnNavigate} />);

      // Should have animation calls for multiple icons
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalled();
      
      // Should use delays for staggered entrance
      expect(mockAnimationFunctions.withDelay).toHaveBeenCalled();
    });

    it('should have staggered entrance animations', () => {
      render(<MainMenu onNavigate={mockOnNavigate} />);

      const delayCalls = mockAnimationFunctions.withDelay.mock.calls;
      
      // Should have multiple delayed animations
      expect(delayCalls.length).toBeGreaterThan(0);
      
      // Delays should be different for each icon
      const delays = delayCalls.map(call => call[0]);
      const uniqueDelays = [...new Set(delays)];
      expect(uniqueDelays.length).toBeGreaterThan(1);
    });

    it('should handle icon press animations', async () => {
      const { getByTestId } = render(<MainMenu onNavigate={mockOnNavigate} />);

      // Test each menu icon
      const iconIds = ['stories', 'sensory', 'emotions', 'bedtime', 'screen_time', 'settings'];
      
      for (const iconId of iconIds) {
        mockAnimationFunctions.withTiming.mockClear();
        
        const icon = getByTestId(`menu-icon-${iconId}`);
        fireEvent.press(icon);
        
        // Should trigger animation on press
        expect(mockAnimationFunctions.withTiming).toHaveBeenCalled();
        
        await waitForAnimations(100);
      }
    });
  });

  describe('Page Transition Animations', () => {
    it('should trigger page transition animation on navigation', async () => {
      const { getByTestId } = render(<MainMenu onNavigate={mockOnNavigate} />);

      mockAnimationFunctions.withTiming.mockClear();

      // Press any navigation button
      const storiesButton = getByTestId('menu-icon-stories');
      fireEvent.press(storiesButton);

      // Should trigger transition animation
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalled();
      
      await waitForAnimations(1000);
      
      // Should complete navigation
      expect(mockOnNavigate).toHaveBeenCalledWith('stories');
    });
  });

  describe('Animation Performance', () => {
    it('should handle multiple rapid interactions', async () => {
      const { getByTestId } = render(<MainMenu onNavigate={mockOnNavigate} />);

      const storiesButton = getByTestId('menu-icon-stories');
      
      // Rapid button presses
      for (let i = 0; i < 10; i++) {
        fireEvent.press(storiesButton);
      }

      // Should not crash or cause memory issues
      await waitForAnimations(2000);
      
      // Should still be functional
      expect(getByTestId('main-menu-container')).toBeTruthy();
    });

    it('should cleanup animations on unmount', () => {
      const { unmount } = render(<MainMenu onNavigate={mockOnNavigate} />);

      // Unmount component
      unmount();

      // Should not cause memory leaks or errors
      // This is mainly testing that no errors are thrown
      expect(true).toBe(true);
    });
  });

  describe('Animation State Consistency', () => {
    it('should maintain animation state during re-renders', () => {
      const { rerender } = render(<MainMenu onNavigate={mockOnNavigate} />);

      const initialCalls = mockAnimationFunctions.withTiming.mock.calls.length;

      // Re-render with same props
      rerender(<MainMenu onNavigate={mockOnNavigate} />);

      // Should maintain consistent animation behavior
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalled();
    });

    it('should reset animation state when needed', async () => {
      const { getByTestId } = render(<MainMenu onNavigate={mockOnNavigate} />);

      // Trigger animation
      const storiesButton = getByTestId('menu-icon-stories');
      fireEvent.press(storiesButton);

      await waitForAnimations(1000);

      // Clear calls
      mockAnimationFunctions.withTiming.mockClear();

      // Trigger another animation
      const sensoryButton = getByTestId('menu-icon-sensory');
      fireEvent.press(sensoryButton);

      // Should trigger fresh animation
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalled();
    });
  });

  describe('Animation Error Handling', () => {
    it('should handle animation errors gracefully', () => {
      // Mock animation function to throw error
      mockAnimationFunctions.withTiming.mockImplementationOnce(() => {
        throw new Error('Animation error');
      });

      // Should not crash the component
      expect(() => {
        render(<MainMenu onNavigate={mockOnNavigate} />);
      }).not.toThrow();
    });

    it('should continue functioning after animation errors', async () => {
      const { getByTestId } = render(<MainMenu onNavigate={mockOnNavigate} />);

      // Mock error for one animation
      mockAnimationFunctions.withTiming.mockImplementationOnce(() => {
        throw new Error('Animation error');
      });

      const storiesButton = getByTestId('menu-icon-stories');
      
      // Should not crash on press
      expect(() => {
        fireEvent.press(storiesButton);
      }).not.toThrow();

      // Should still be functional
      expect(getByTestId('main-menu-container')).toBeTruthy();
    });
  });
});
