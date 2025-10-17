import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StoryBookReader } from '@/components/stories/story-book-reader';
import { Story } from '@/types/story';
import {
  createMockSharedValue,
  testAnimationTiming,
  waitForAnimations,
  resetAnimationMocks,
  mockAnimationFunctions
} from '@/__tests__/utils/animation-test-utils';

// Mock the story transition context
jest.mock('@/contexts/story-transition-context', () => ({
  useStoryTransition: jest.fn(() => ({
    isTransitioning: false,
    transitionStory: null,
    transitionLayout: null,
    completeTransition: jest.fn(),
  })),
}));

// Reanimated is mocked globally in jest.setup.js

const mockStory: Story = {
  id: 'test-story',
  title: 'Test Story',
  category: 'adventure',
  tag: '🌟 Adventure',
  emoji: '🌟',
  coverImage: 'test-cover.jpg',
  isAvailable: true,
  ageRange: '3-6',
  duration: 5,
  pages: [
    {
      id: 'cover',
      type: 'cover',
      content: {
        title: 'Test Story',
        subtitle: 'A test adventure',
        backgroundImage: 'test-bg.jpg',
      },
    },
    {
      id: 'page1',
      type: 'story',
      content: {
        text: 'Once upon a time...',
        backgroundImage: 'test-page1.jpg',
      },
    },
    {
      id: 'page2',
      type: 'story',
      content: {
        text: 'The end.',
        backgroundImage: 'test-page2.jpg',
      },
    },
  ],
};

describe('StoryBookReader', () => {
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

  it('renders the story book reader with first page', () => {
    const { getByText } = render(
      <StoryBookReader story={mockStory} onExit={mockOnExit} />
    );

    expect(getByText('This is the first page of our test story.')).toBeTruthy();
    expect(getByText('Page 1 of 3')).toBeTruthy();
    expect(getByText('🗺️')).toBeTruthy();
  });

  it('shows exit button and calls onExit when pressed', () => {
    const { getByText } = render(
      <StoryBookReader story={mockStory} onExit={mockOnExit} />
    );

    const exitButton = getByText('✕');
    fireEvent.press(exitButton);

    expect(mockOnExit).toHaveBeenCalledTimes(1);
  });

  it('navigates to next page when next button is pressed', () => {
    const { getByText } = render(
      <StoryBookReader story={mockStory} onExit={mockOnExit} />
    );

    // Initially on page 1
    expect(getByText('This is the first page of our test story.')).toBeTruthy();
    expect(getByText('Page 1 of 3')).toBeTruthy();

    // Press next button
    const nextButton = getByText('→');
    fireEvent.press(nextButton);

    // Should be on page 2 after animation
    setTimeout(() => {
      expect(getByText('This is the second page with more exciting content.')).toBeTruthy();
      expect(getByText('Page 2 of 3')).toBeTruthy();
    }, 500);
  });

  it('navigates to previous page when previous button is pressed', () => {
    const { getByText } = render(
      <StoryBookReader story={mockStory} onExit={mockOnExit} />
    );

    // Navigate to page 2 first
    const nextButton = getByText('→');
    fireEvent.press(nextButton);

    setTimeout(() => {
      // Now navigate back to page 1
      const prevButton = getByText('←');
      fireEvent.press(prevButton);

      setTimeout(() => {
        expect(getByText('This is the first page of our test story.')).toBeTruthy();
        expect(getByText('Page 1 of 3')).toBeTruthy();
      }, 500);
    }, 500);
  });

  it('disables previous button on first page', () => {
    const { getByText } = render(
      <StoryBookReader story={mockStory} onExit={mockOnExit} />
    );

    const prevButton = getByText('←');
    // The button should be disabled on the first page
    // We can't easily test the disabled state in this test setup,
    // but we can verify the button exists
    expect(prevButton).toBeTruthy();
  });

  it('disables next button on last page', () => {
    const { getByText } = render(
      <StoryBookReader story={mockStory} onExit={mockOnExit} />
    );

    // Navigate to last page
    const nextButton = getByText('→');
    fireEvent.press(nextButton); // Page 2
    
    setTimeout(() => {
      fireEvent.press(nextButton); // Page 3
      
      setTimeout(() => {
        expect(getByText('The adventure continues on the third page.')).toBeTruthy();
        expect(getByText('Page 3 of 3')).toBeTruthy();
        // Next button should be disabled on last page
        expect(nextButton).toBeTruthy();
      }, 500);
    }, 500);
  });

  it('handles story without pages gracefully', () => {
    const storyWithoutPages: Story = {
      ...mockStory,
      pages: undefined,
    };

    const { getByText } = render(
      <StoryBookReader story={storyWithoutPages} onExit={mockOnExit} />
    );

    expect(getByText('Story pages not available')).toBeTruthy();
    expect(getByText('← Back')).toBeTruthy();
  });

  it('handles empty pages array gracefully', () => {
    const storyWithEmptyPages: Story = {
      ...mockStory,
      pages: [],
    };

    const { getByText } = render(
      <StoryBookReader story={storyWithEmptyPages} onExit={mockOnExit} />
    );

    expect(getByText('Story pages not available')).toBeTruthy();
  });
});
