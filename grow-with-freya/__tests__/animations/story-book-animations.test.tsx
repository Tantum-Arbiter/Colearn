/**
 * Comprehensive Animation Tests for Story Book Reader
 * Tests all animation sequences, timing, and state transitions
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { StoryBookReader } from '@/components/stories/story-book-reader';
import { Story } from '@/types/story';
import { 
  createMockSharedValue, 
  testAnimationTiming, 
  testAnimationSequence,
  waitForAnimations,
  resetAnimationMocks,
  mockAnimationFunctions,
  testAnimationPerformance
} from '@/__tests__/utils/animation-test-utils';

// Mock all dependencies
jest.mock('@/contexts/story-transition-context', () => ({
  useStoryTransition: jest.fn(() => ({
    isTransitioning: false,
    transitionStory: null,
    transitionLayout: null,
    completeTransition: jest.fn(),
  })),
}));

const mockStory: Story = {
  id: 'animation-test-story',
  title: 'Animation Test Story',
  category: 'adventure',
  tag: '🎬 Animation',
  emoji: '🎬',
  coverImage: 'test-cover.jpg',
  isAvailable: true,
  ageRange: '3-6',
  duration: 3,
  pages: [
    {
      id: 'cover',
      type: 'cover',
      content: {
        title: 'Animation Test Story',
        subtitle: 'Testing all animations',
        backgroundImage: 'test-bg.jpg',
      },
    },
    {
      id: 'page1',
      type: 'story',
      content: {
        text: 'First page with animations...',
        backgroundImage: 'test-page1.jpg',
      },
    },
    {
      id: 'page2',
      type: 'story',
      content: {
        text: 'Final page with completion.',
        backgroundImage: 'test-page2.jpg',
      },
    },
  ],
};

describe('StoryBookReader Animations', () => {
  const mockOnExit = jest.fn();
  const mockOnReadAnother = jest.fn();
  const mockOnBedtimeMusic = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    resetAnimationMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Book Opening Animation', () => {
    it('should execute book opening animation on mount', async () => {
      const { getByTestId } = render(
        <StoryBookReader
          story={mockStory}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      // Verify animation functions were called for book opening
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalled();
      
      // Check that the animation sequence is correct
      const timingCalls = mockAnimationFunctions.withTiming.mock.calls;
      
      // Should have multiple timing calls for the two-phase animation
      expect(timingCalls.length).toBeGreaterThan(0);
      
      // Advance through the animation
      await waitForAnimations(1000); // Book opening is 1000ms total
      
      // Story should be visible after animation
      expect(getByTestId('story-content')).toBeTruthy();
    });

    it('should have correct timing for book opening phases', async () => {
      render(
        <StoryBookReader
          story={mockStory}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      // Phase 1: 400ms
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Phase 2: 600ms (total 1000ms)
      act(() => {
        jest.advanceTimersByTime(600);
      });

      // Animation should be complete
      const timingCalls = mockAnimationFunctions.withTiming.mock.calls;
      expect(timingCalls.some(call => call[1]?.duration === 400)).toBe(true);
      expect(timingCalls.some(call => call[1]?.duration === 600)).toBe(true);
    });
  });

  describe('Book Closing Animation', () => {
    it('should execute book closing animation when story completes', async () => {
      const { getByTestId } = render(
        <StoryBookReader
          story={mockStory}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      // Navigate to last page
      const rightTouchArea = getByTestId('right-touch-area');
      fireEvent.press(rightTouchArea); // To page 1
      await waitForAnimations();
      
      fireEvent.press(rightTouchArea); // To page 2
      await waitForAnimations();
      
      // Clear previous animation calls
      mockAnimationFunctions.withTiming.mockClear();
      
      fireEvent.press(rightTouchArea); // Trigger completion
      
      // Should trigger book closing animation
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalled();
      
      // Advance through closing animation (1000ms)
      await waitForAnimations(1000);
    });

    it('should show completion screen after book closing animation', async () => {
      const { getByTestId, getByText } = render(
        <StoryBookReader
          story={mockStory}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      // Navigate to completion
      const rightTouchArea = getByTestId('right-touch-area');
      fireEvent.press(rightTouchArea);
      await waitForAnimations();
      fireEvent.press(rightTouchArea);
      await waitForAnimations();
      fireEvent.press(rightTouchArea);
      
      // Wait for book closing + completion screen entrance
      await waitForAnimations(1300); // 1000ms closing + 300ms entrance
      
      expect(getByText('Story Complete!')).toBeTruthy();
    });
  });

  describe('Completion Screen Animations', () => {
    it('should animate completion screen entrance', async () => {
      const { getByTestId } = render(
        <StoryBookReader
          story={mockStory}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      // Navigate to completion
      const rightTouchArea = getByTestId('right-touch-area');
      fireEvent.press(rightTouchArea);
      await waitForAnimations();
      fireEvent.press(rightTouchArea);
      await waitForAnimations();
      
      // Clear animation calls
      mockAnimationFunctions.withTiming.mockClear();
      
      fireEvent.press(rightTouchArea);
      
      // Wait for book closing
      await waitForAnimations(1000);
      
      // Should have completion screen entrance animation
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 300 })
      );
    });

    it('should animate completion screen exit on close', async () => {
      const { getByTestId, getByText } = render(
        <StoryBookReader
          story={mockStory}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      // Navigate to completion screen
      const rightTouchArea = getByTestId('right-touch-area');
      fireEvent.press(rightTouchArea);
      await waitForAnimations();
      fireEvent.press(rightTouchArea);
      await waitForAnimations();
      fireEvent.press(rightTouchArea);
      await waitForAnimations(1300);

      // Clear animation calls
      mockAnimationFunctions.withTiming.mockClear();

      // Press close button
      const closeButton = getByText('Close');
      fireEvent.press(closeButton);

      // Should trigger fade out animation
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalledWith(
        0,
        expect.objectContaining({ duration: 400 })
      );

      // Wait for fade animation
      await waitForAnimations(400);

      // Should call onExit after animation
      expect(mockOnExit).toHaveBeenCalled();
    });
  });

  describe('Re-read Animation', () => {
    it('should execute book opening animation when re-reading', async () => {
      const { getByTestId, getByText } = render(
        <StoryBookReader
          story={mockStory}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      // Navigate to completion screen
      const rightTouchArea = getByTestId('right-touch-area');
      fireEvent.press(rightTouchArea);
      await waitForAnimations();
      fireEvent.press(rightTouchArea);
      await waitForAnimations();
      fireEvent.press(rightTouchArea);
      await waitForAnimations(1300);

      // Clear animation calls
      mockAnimationFunctions.withTiming.mockClear();

      // Press read again button
      const readAgainButton = getByText('Read Again');
      fireEvent.press(readAgainButton);

      // Should trigger book opening animation
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalled();
      
      // Check for the two-phase animation
      const timingCalls = mockAnimationFunctions.withTiming.mock.calls;
      expect(timingCalls.some(call => call[1]?.duration === 400)).toBe(true);
      expect(timingCalls.some(call => call[1]?.duration === 600)).toBe(true);
    });
  });

  describe('Animation Performance', () => {
    it('should not cause memory leaks during repeated animations', () => {
      const renderComponent = () => render(
        <StoryBookReader
          story={mockStory}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      const performanceResult = testAnimationPerformance(renderComponent, 10);
      
      // Memory increase should be reasonable (less than 10MB for 10 iterations)
      expect(performanceResult.memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle rapid navigation without breaking', async () => {
      const { getByTestId } = render(
        <StoryBookReader
          story={mockStory}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      const rightTouchArea = getByTestId('right-touch-area');
      const leftTouchArea = getByTestId('left-touch-area');

      // Rapid navigation
      for (let i = 0; i < 10; i++) {
        fireEvent.press(rightTouchArea);
        fireEvent.press(leftTouchArea);
      }

      // Should not throw errors
      await waitForAnimations(2000);
      
      // Component should still be functional
      expect(getByTestId('story-content')).toBeTruthy();
    });
  });

  describe('Animation State Management', () => {
    it('should properly reset animation values between stories', async () => {
      const { rerender } = render(
        <StoryBookReader
          story={mockStory}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      // Complete first story
      await waitForAnimations(1000);

      // Clear and render new story
      mockAnimationFunctions.withTiming.mockClear();
      
      const newStory = { ...mockStory, id: 'new-story', title: 'New Story' };
      rerender(
        <StoryBookReader
          story={newStory}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      // Should trigger fresh book opening animation
      expect(mockAnimationFunctions.withTiming).toHaveBeenCalled();
    });
  });
});
