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
      pageNumber: 0,
      type: 'cover',
      text: 'Test Story',
      backgroundImage: 'test-bg.jpg',
    },
    {
      id: 'page1',
      pageNumber: 1,
      type: 'story',
      text: 'Once upon a time...',
      backgroundImage: 'test-page1.jpg',
    },
    {
      id: 'page2',
      pageNumber: 2,
      type: 'story',
      text: 'The end.',
      backgroundImage: 'test-page2.jpg',
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

  it('renders without crashing', () => {
    const result = render(<StoryBookReader story={mockStory} onExit={mockOnExit} />);
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('renders with onReadAnother prop', () => {
    const mockOnReadAnother = jest.fn();
    const result = render(
      <StoryBookReader
        story={mockStory}
        onExit={mockOnExit}
        onReadAnother={mockOnReadAnother}
      />
    );
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('renders with onBedtimeMusic prop', () => {
    const mockOnBedtimeMusic = jest.fn();
    const result = render(
      <StoryBookReader
        story={mockStory}
        onExit={mockOnExit}
        onBedtimeMusic={mockOnBedtimeMusic}
      />
    );
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('handles story without pages gracefully', () => {
    const storyWithoutPages: Story = {
      ...mockStory,
      pages: undefined,
    };
    const result = render(<StoryBookReader story={storyWithoutPages} onExit={mockOnExit} />);
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('handles empty pages array gracefully', () => {
    const storyWithEmptyPages: Story = {
      ...mockStory,
      pages: [],
    };
    const result = render(<StoryBookReader story={storyWithEmptyPages} onExit={mockOnExit} />);
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });
});
