/**
 * Complete User Flow Integration Tests
 * Tests end-to-end user journeys with animations and state management
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StorySelectionScreen } from '@/components/stories/story-selection-screen';
import { StoryBookReader } from '@/components/stories/story-book-reader';
import { MainMenu } from '@/components/main-menu';
import { Story } from '@/types/story';
import { 
  waitForAnimations,
  resetAnimationMocks,
  mockAnimationFunctions 
} from '@/__tests__/utils/animation-test-utils';

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

// Mock data for testing
const MOCK_STORIES: Story[] = [
  {
    id: 'integration-story-1',
    title: 'Integration Test Adventure',
    category: 'adventure',
    tag: '🗺️ Adventure',
    emoji: '🗺️',
    coverImage: 'test-cover.jpg',
    isAvailable: true,
    ageRange: '3-6',
    duration: 3,
    pages: [
      {
        id: 'cover',
        type: 'cover',
        content: {
          title: 'Integration Test Adventure',
          subtitle: 'A complete test journey',
          backgroundImage: 'test-bg.jpg',
        },
      },
      {
        id: 'page1',
        type: 'story',
        content: {
          text: 'The adventure begins with testing...',
          backgroundImage: 'test-page1.jpg',
        },
      },
      {
        id: 'page2',
        type: 'story',
        content: {
          text: 'And ends with successful completion!',
          backgroundImage: 'test-page2.jpg',
        },
      },
    ],
  },
  {
    id: 'integration-story-2',
    title: 'Integration Test Bedtime',
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🌙',
    coverImage: 'test-cover2.jpg',
    isAvailable: true,
    ageRange: '2-5',
    duration: 2,
    pages: [
      {
        id: 'cover',
        type: 'cover',
        content: {
          title: 'Integration Test Bedtime',
          subtitle: 'A peaceful test story',
          backgroundImage: 'test-bg2.jpg',
        },
      },
      {
        id: 'page1',
        type: 'story',
        content: {
          text: 'Time for a peaceful test sleep...',
          backgroundImage: 'test-page1.jpg',
        },
      },
    ],
  },
];

jest.mock('@/data/stories', () => ({
  ALL_STORIES: MOCK_STORIES,
  getStoriesByGenre: jest.fn((genre) => MOCK_STORIES.filter(story => story.category === genre)),
  getGenresWithStories: jest.fn(() => ['adventure', 'bedtime']),
  getRandomStory: jest.fn(() => MOCK_STORIES[0]),
}));

describe('Complete User Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAnimationMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Main Menu → Story Selection → Reading → Completion', () => {
    it('should complete full user journey with animations', async () => {
      // Step 1: Main Menu Navigation
      const mockOnNavigate = jest.fn();
      const { getByTestId: getMainMenuTestId } = render(
        <MainMenu onNavigate={mockOnNavigate} />
      );

      // Press stories button
      const storiesButton = getMainMenuTestId('menu-icon-stories');
      fireEvent.press(storiesButton);

      // Wait for rocket animation
      await waitForAnimations(1000);
      expect(mockOnNavigate).toHaveBeenCalledWith('stories');

      // Step 2: Story Selection
      const mockOnStorySelect = jest.fn();
      const { getByText: getStorySelectionText } = render(
        <StorySelectionScreen onStorySelect={mockOnStorySelect} />
      );

      // Wait for story selection to load
      await waitForAnimations();

      // Select a story
      const storyTitle = getStorySelectionText('Integration Test Adventure');
      fireEvent.press(storyTitle);

      expect(mockOnStorySelect).toHaveBeenCalledWith(MOCK_STORIES[0]);

      // Step 3: Story Reading
      const mockOnExit = jest.fn();
      const mockOnReadAnother = jest.fn();
      const mockOnBedtimeMusic = jest.fn();

      const { 
        getByTestId: getReaderTestId, 
        getByText: getReaderText 
      } = render(
        <StoryBookReader
          story={MOCK_STORIES[0]}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      // Wait for book opening animation
      await waitForAnimations(1000);

      // Verify cover page is shown
      expect(getReaderText('Integration Test Adventure')).toBeTruthy();
      expect(getReaderText('A complete test journey')).toBeTruthy();

      // Navigate through story
      const rightTouchArea = getReaderTestId('right-touch-area');
      
      // Go to page 1
      fireEvent.press(rightTouchArea);
      await waitForAnimations();
      expect(getReaderText('The adventure begins with testing...')).toBeTruthy();

      // Go to page 2
      fireEvent.press(rightTouchArea);
      await waitForAnimations();
      expect(getReaderText('And ends with successful completion!')).toBeTruthy();

      // Go to completion screen
      fireEvent.press(rightTouchArea);
      await waitForAnimations(1300); // Book closing + completion entrance

      // Step 4: Completion Screen
      expect(getReaderText('Story Complete!')).toBeTruthy();

      // Test close functionality
      const closeButton = getReaderText('Close');
      fireEvent.press(closeButton);

      await waitForAnimations(400); // Fade out animation
      expect(mockOnExit).toHaveBeenCalled();
    });

    it('should handle surprise me flow', async () => {
      const mockOnStorySelect = jest.fn();
      const { getByText } = render(
        <StorySelectionScreen onStorySelect={mockOnStorySelect} />
      );

      await waitForAnimations();

      // Use surprise me feature
      const surpriseMeButton = getByText('✨ Surprise Me! ✨');
      fireEvent.press(surpriseMeButton);

      expect(mockOnStorySelect).toHaveBeenCalledTimes(1);
      const selectedStory = mockOnStorySelect.mock.calls[0][0];
      expect(selectedStory.isAvailable).toBe(true);
      expect(MOCK_STORIES).toContain(selectedStory);
    });

    it('should handle read again flow', async () => {
      const mockOnExit = jest.fn();
      const mockOnReadAnother = jest.fn();
      const mockOnBedtimeMusic = jest.fn();

      const { getByTestId, getByText } = render(
        <StoryBookReader
          story={MOCK_STORIES[0]}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      // Navigate to completion screen
      await waitForAnimations(1000); // Book opening

      const rightTouchArea = getByTestId('right-touch-area');
      fireEvent.press(rightTouchArea); // Page 1
      await waitForAnimations();
      fireEvent.press(rightTouchArea); // Page 2
      await waitForAnimations();
      fireEvent.press(rightTouchArea); // Completion
      await waitForAnimations(1300);

      // Press read again
      const readAgainButton = getByText('Read Again');
      fireEvent.press(readAgainButton);

      // Should restart with book opening animation
      await waitForAnimations(1000);

      // Should be back on cover page
      expect(getByText('Integration Test Adventure')).toBeTruthy();
      expect(getByText('A complete test journey')).toBeTruthy();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle rapid navigation without breaking', async () => {
      const mockOnExit = jest.fn();
      const mockOnReadAnother = jest.fn();
      const mockOnBedtimeMusic = jest.fn();

      const { getByTestId } = render(
        <StoryBookReader
          story={MOCK_STORIES[0]}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      await waitForAnimations(1000);

      const rightTouchArea = getByTestId('right-touch-area');
      const leftTouchArea = getByTestId('left-touch-area');

      // Rapid navigation
      for (let i = 0; i < 10; i++) {
        fireEvent.press(rightTouchArea);
        fireEvent.press(leftTouchArea);
      }

      // Should not crash
      await waitForAnimations(2000);
      expect(getByTestId('story-content')).toBeTruthy();
    });

    it('should handle animation interruptions gracefully', async () => {
      const mockOnExit = jest.fn();
      const mockOnReadAnother = jest.fn();
      const mockOnBedtimeMusic = jest.fn();

      const { getByTestId, unmount } = render(
        <StoryBookReader
          story={MOCK_STORIES[0]}
          onExit={mockOnExit}
          onReadAnother={mockOnReadAnother}
          onBedtimeMusic={mockOnBedtimeMusic}
        />
      );

      // Start navigation during animation
      const rightTouchArea = getByTestId('right-touch-area');
      fireEvent.press(rightTouchArea);

      // Unmount during animation
      unmount();

      // Should not cause errors
      await waitForAnimations(1000);
      expect(true).toBe(true); // Test passes if no errors thrown
    });

    it('should handle missing story data gracefully', () => {
      const mockOnExit = jest.fn();
      const mockOnReadAnother = jest.fn();
      const mockOnBedtimeMusic = jest.fn();

      const invalidStory = {
        ...MOCK_STORIES[0],
        pages: [], // Empty pages
      };

      expect(() => {
        render(
          <StoryBookReader
            story={invalidStory}
            onExit={mockOnExit}
            onReadAnother={mockOnReadAnother}
            onBedtimeMusic={mockOnBedtimeMusic}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory during multiple story sessions', async () => {
      const initialMemory = process.memoryUsage();

      for (let i = 0; i < 5; i++) {
        const mockOnExit = jest.fn();
        const mockOnReadAnother = jest.fn();
        const mockOnBedtimeMusic = jest.fn();

        const { unmount } = render(
          <StoryBookReader
            story={MOCK_STORIES[0]}
            onExit={mockOnExit}
            onReadAnother={mockOnReadAnother}
            onBedtimeMusic={mockOnBedtimeMusic}
          />
        );

        await waitForAnimations(1000);
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB for 5 iterations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle concurrent animations efficiently', async () => {
      const mockOnNavigate = jest.fn();
      const { getByTestId } = render(<MainMenu onNavigate={mockOnNavigate} />);

      // Trigger multiple animations simultaneously
      const iconIds = ['stories', 'sensory', 'emotions'];
      
      iconIds.forEach(iconId => {
        const icon = getByTestId(`menu-icon-${iconId}`);
        fireEvent.press(icon);
      });

      // Should handle concurrent animations without errors
      await waitForAnimations(2000);
      expect(getByTestId('main-menu-container')).toBeTruthy();
    });
  });
});
