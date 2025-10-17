/**
 * Comprehensive Performance Tests
 * Tests rendering performance, memory usage, animation performance, and stress testing
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { MainMenu } from '@/components/main-menu';
import { StorySelectionScreen } from '@/components/stories/story-selection-screen';
import { StoryBookReader } from '@/components/stories/story-book-reader';
import { Story } from '@/types/story';
import { 
  testAnimationPerformance,
  waitForAnimations,
  resetAnimationMocks,
  mockAnimationFunctions 
} from '@/__tests__/utils/animation-test-utils';

// Mock console methods to track errors
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

// Mock all dependencies
jest.mock('@/contexts/story-transition-context', () => ({
  useStoryTransition: jest.fn(() => ({
    isTransitioning: false,
    transitionStory: null,
    transitionLayout: null,
    completeTransition: jest.fn(),
    startTransition: jest.fn(),
  })),
}));

jest.mock('@/store/app-store', () => ({
  useAppStore: jest.fn(() => ({
    requestReturnToMainMenu: jest.fn(),
  })),
}));

// Performance test story
const PERFORMANCE_TEST_STORY: Story = {
  id: 'perf-test-story',
  title: 'Performance Test Story',
  category: 'adventure',
  tag: '⚡ Performance',
  emoji: '⚡',
  coverImage: 'test-cover.jpg',
  isAvailable: true,
  ageRange: '3-6',
  duration: 2,
  pages: [
    {
      id: 'cover',
      type: 'cover',
      content: {
        title: 'Performance Test Story',
        subtitle: 'Testing performance',
        backgroundImage: 'test-bg.jpg',
      },
    },
    {
      id: 'page1',
      type: 'story',
      content: {
        text: 'Performance testing in progress...',
        backgroundImage: 'test-page1.jpg',
      },
    },
  ],
};

describe('Comprehensive Performance Tests', () => {
  beforeEach(() => {
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
    resetAnimationMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe('Rendering Performance', () => {
    it('should render MainMenu within performance budget', () => {
      const startTime = performance.now();
      
      const { getByTestId } = render(<MainMenu onNavigate={jest.fn()} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
      expect(getByTestId('main-menu-container')).toBeTruthy();
      
      // Should not have excessive console warnings
      expect(mockConsoleError.mock.calls.length).toBeLessThan(5);
    });

    it('should render StorySelectionScreen efficiently', () => {
      const startTime = performance.now();
      
      const { getByText } = render(<StorySelectionScreen />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 150ms
      expect(renderTime).toBeLessThan(150);
      expect(getByText('Choose Your Adventure')).toBeTruthy();
    });

    it('should render StoryBookReader efficiently', () => {
      const startTime = performance.now();
      
      const { getByTestId } = render(
        <StoryBookReader
          story={PERFORMANCE_TEST_STORY}
          onExit={jest.fn()}
          onReadAnother={jest.fn()}
          onBedtimeMusic={jest.fn()}
        />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 200ms
      expect(renderTime).toBeLessThan(200);
      expect(getByTestId('story-content')).toBeTruthy();
    });

    it('should handle rapid re-renders efficiently', () => {
      const { rerender } = render(<MainMenu onNavigate={jest.fn()} />);
      
      const startTime = performance.now();
      
      // Perform 10 re-renders
      for (let i = 0; i < 10; i++) {
        rerender(<MainMenu onNavigate={jest.fn()} />);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete re-renders efficiently (less than 100ms for 10 re-renders)
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('Memory Management', () => {
    it('should handle mount/unmount cycles without memory leaks', () => {
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        const { unmount } = render(<MainMenu onNavigate={jest.fn()} />);
        unmount();
      }
      
      // Should complete without excessive console warnings
      expect(mockConsoleError.mock.calls.length).toBeLessThan(5);
    });

    it('should manage story reader memory efficiently', () => {
      const renderComponent = () => render(
        <StoryBookReader
          story={PERFORMANCE_TEST_STORY}
          onExit={jest.fn()}
          onReadAnother={jest.fn()}
          onBedtimeMusic={jest.fn()}
        />
      );

      const performanceResult = testAnimationPerformance(renderComponent, 5);
      
      // Memory increase should be reasonable (less than 10MB for 5 iterations)
      expect(performanceResult.memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should cleanup animations on unmount', () => {
      const { unmount } = render(<MainMenu onNavigate={jest.fn()} />);
      
      // Should not throw errors on unmount
      expect(() => {
        unmount();
      }).not.toThrow();
      
      // Should not have memory leaks from animations
      expect(mockConsoleError.mock.calls.length).toBeLessThan(3);
    });
  });

  describe('Animation Performance', () => {
    it('should handle multiple simultaneous animations', async () => {
      const { getByTestId } = render(<MainMenu onNavigate={jest.fn()} />);
      
      // Trigger multiple animations
      const iconIds = ['stories', 'sensory', 'emotions', 'bedtime'];
      
      iconIds.forEach(iconId => {
        const icon = getByTestId(`menu-icon-${iconId}`);
        fireEvent.press(icon);
      });
      
      // Should handle concurrent animations without errors
      await waitForAnimations(2000);
      expect(mockConsoleError.mock.calls.length).toBeLessThan(5);
      expect(getByTestId('main-menu-container')).toBeTruthy();
    });

    it('should maintain animation performance under stress', async () => {
      const { getByTestId } = render(
        <StoryBookReader
          story={PERFORMANCE_TEST_STORY}
          onExit={jest.fn()}
          onReadAnother={jest.fn()}
          onBedtimeMusic={jest.fn()}
        />
      );

      const rightTouchArea = getByTestId('right-touch-area');
      const leftTouchArea = getByTestId('left-touch-area');

      // Rapid navigation to stress test animations
      for (let i = 0; i < 20; i++) {
        fireEvent.press(rightTouchArea);
        fireEvent.press(leftTouchArea);
      }

      // Should handle rapid interactions without breaking
      await waitForAnimations(2000);
      expect(getByTestId('story-content')).toBeTruthy();
      expect(mockConsoleError.mock.calls.length).toBeLessThan(10);
    });

    it('should optimize animation function calls', () => {
      render(<MainMenu onNavigate={jest.fn()} />);
      
      // Should use animation functions efficiently
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalled();
      expect(mockAnimationFunctions.withRepeat).toHaveBeenCalled();
      
      // Should not have excessive animation calls
      const totalCalls = Object.values(mockAnimationFunctions)
        .reduce((total, mock) => total + (jest.isMockFunction(mock) ? mock.mock.calls.length : 0), 0);
      
      expect(totalCalls).toBeLessThan(50); // Reasonable limit for initial render
    });
  });

  describe('Interaction Performance', () => {
    it('should handle rapid button presses efficiently', async () => {
      const mockOnNavigate = jest.fn();
      const { getByTestId } = render(<MainMenu onNavigate={mockOnNavigate} />);
      
      const storiesButton = getByTestId('menu-icon-stories');
      
      // Rapid button presses
      for (let i = 0; i < 20; i++) {
        fireEvent.press(storiesButton);
      }
      
      // Should handle rapid interactions without errors
      await waitForAnimations(1000);
      expect(mockConsoleError.mock.calls.length).toBeLessThan(5);
      expect(getByTestId('main-menu-container')).toBeTruthy();
    });

    it('should debounce interactions appropriately', async () => {
      const mockOnNavigate = jest.fn();
      const { getByTestId } = render(<MainMenu onNavigate={mockOnNavigate} />);
      
      const storiesButton = getByTestId('menu-icon-stories');
      
      // Multiple rapid presses
      fireEvent.press(storiesButton);
      fireEvent.press(storiesButton);
      fireEvent.press(storiesButton);
      
      await waitForAnimations(1000);
      
      // Should debounce and only call once (or limited times)
      expect(mockOnNavigate.mock.calls.length).toBeLessThan(3);
    });
  });

  describe('Stress Testing', () => {
    it('should handle component lifecycle stress', () => {
      // Rapid mount/unmount cycles
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(<MainMenu onNavigate={jest.fn()} />);
        unmount();
      }
      
      // Should complete without excessive errors
      expect(mockConsoleError.mock.calls.length).toBeLessThan(10);
    });

    it('should handle concurrent component rendering', () => {
      // Render multiple components simultaneously
      const components = [
        render(<MainMenu onNavigate={jest.fn()} />),
        render(<StorySelectionScreen />),
        render(
          <StoryBookReader
            story={PERFORMANCE_TEST_STORY}
            onExit={jest.fn()}
            onReadAnother={jest.fn()}
            onBedtimeMusic={jest.fn()}
          />
        ),
      ];
      
      // All should render successfully
      components.forEach(component => {
        expect(component.toJSON()).toBeTruthy();
      });
      
      // Cleanup
      components.forEach(component => {
        component.unmount();
      });
      
      // Should not have excessive errors
      expect(mockConsoleError.mock.calls.length).toBeLessThan(15);
    });

    it('should maintain performance under memory pressure', () => {
      // Simulate memory pressure with many components
      const components = [];
      
      for (let i = 0; i < 10; i++) {
        components.push(render(<MainMenu onNavigate={jest.fn()} />));
      }
      
      // All should render successfully
      components.forEach(component => {
        expect(component.toJSON()).toBeTruthy();
      });
      
      // Cleanup all at once
      components.forEach(component => {
        component.unmount();
      });
      
      // Should handle cleanup without excessive errors
      expect(mockConsoleError.mock.calls.length).toBeLessThan(20);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from animation errors', () => {
      // Mock animation function to throw error once
      mockAnimationFunctions.withTiming.mockImplementationOnce(() => {
        throw new Error('Animation error');
      });
      
      // Should not crash the component
      expect(() => {
        render(<MainMenu onNavigate={jest.fn()} />);
      }).not.toThrow();
    });

    it('should continue functioning after errors', async () => {
      const { getByTestId } = render(<MainMenu onNavigate={jest.fn()} />);
      
      // Mock error for one interaction
      mockAnimationFunctions.withTiming.mockImplementationOnce(() => {
        throw new Error('Interaction error');
      });
      
      const storiesButton = getByTestId('menu-icon-stories');
      
      // Should not crash on interaction
      expect(() => {
        fireEvent.press(storiesButton);
      }).not.toThrow();
      
      // Should still be functional
      await waitForAnimations(1000);
      expect(getByTestId('main-menu-container')).toBeTruthy();
    });
  });
});
