import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StorySelectionScreen } from '@/components/stories/story-selection-screen';
import { MOCK_STORIES, PLACEHOLDER_STORIES, ALL_STORIES } from '@/data/stories';

// Mock the app store
jest.mock('@/store/app-store', () => ({
  useAppStore: () => ({
    requestReturnToMainMenu: jest.fn(),
  }),
}));

// Mock LinearGradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

// Reanimated is mocked globally in jest.setup.js

describe('StorySelectionScreen', () => {
  // First, test the data structure itself
  describe('Story Data Structure', () => {
    it('has correct number of mock stories', () => {
      expect(MOCK_STORIES).toHaveLength(6);
      MOCK_STORIES.forEach(story => {
        expect(story.isAvailable).toBe(true);
        expect(story.title).toBeTruthy();
        expect(story.id).toBeTruthy();
      });
    });

    it('has correct number of placeholder stories', () => {
      expect(PLACEHOLDER_STORIES).toHaveLength(4);
      PLACEHOLDER_STORIES.forEach(story => {
        expect(story.isAvailable).toBe(false);
        expect(story.title).toBe('Coming Soon');
        expect(story.id).toMatch(/^placeholder-\d+$/);
      });
    });

    it('has correct total number of stories', () => {
      expect(ALL_STORIES).toHaveLength(10);
      const availableCount = ALL_STORIES.filter(s => s.isAvailable).length;
      const placeholderCount = ALL_STORIES.filter(s => !s.isAvailable).length;
      expect(availableCount).toBe(6);
      expect(placeholderCount).toBe(4);
    });
  });

  it('renders correctly with title and subtitle', () => {
    const { getByText } = render(<StorySelectionScreen />);

    expect(getByText('Choose a Story!')).toBeTruthy();
    expect(getByText('Tap a book to start your adventure.')).toBeTruthy();
  });

  it('renders all story cards including placeholders', () => {
    const { getAllByText, getByText } = render(<StorySelectionScreen />);

    // Check that available stories are rendered
    MOCK_STORIES.forEach(story => {
      expect(getByText(story.title)).toBeTruthy();
    });

    // Check that ALL placeholder cards are rendered (should be 4)
    const comingSoonCards = getAllByText('Coming Soon');
    expect(comingSoonCards).toHaveLength(4);

    // Verify total card count (6 mock + 4 placeholder = 10)
    const allTitles = [...MOCK_STORIES.map(s => s.title), 'Coming Soon', 'Coming Soon', 'Coming Soon', 'Coming Soon'];
    allTitles.forEach(title => {
      if (title === 'Coming Soon') {
        // Already checked above
        return;
      }
      expect(getByText(title)).toBeTruthy();
    });
  });

  it('renders Surprise Me button', () => {
    const { getByText } = render(<StorySelectionScreen />);
    
    expect(getByText('✨ Surprise Me! ✨')).toBeTruthy();
  });

  it('calls onStorySelect when a story card is pressed', () => {
    const mockOnStorySelect = jest.fn();
    const { getByText } = render(
      <StorySelectionScreen onStorySelect={mockOnStorySelect} />
    );
    
    // Find and press the first available story
    const firstStory = MOCK_STORIES[0];
    const storyCard = getByText(firstStory.title);
    fireEvent.press(storyCard);
    
    expect(mockOnStorySelect).toHaveBeenCalledWith(firstStory);
  });

  it('calls onStorySelect when Surprise Me button is pressed', () => {
    const mockOnStorySelect = jest.fn();
    const { getByText } = render(
      <StorySelectionScreen onStorySelect={mockOnStorySelect} />
    );
    
    const surpriseMeButton = getByText('✨ Surprise Me! ✨');
    fireEvent.press(surpriseMeButton);
    
    // Should call onStorySelect with one of the available stories
    expect(mockOnStorySelect).toHaveBeenCalledTimes(1);
    expect(mockOnStorySelect).toHaveBeenCalledWith(
      expect.objectContaining({
        isAvailable: true
      })
    );
  });

  it('renders back button and handles press', () => {
    const { getByText } = render(<StorySelectionScreen />);
    
    const backButton = getByText('← Back');
    expect(backButton).toBeTruthy();
    
    // Test that pressing back button doesn't crash
    fireEvent.press(backButton);
  });
});
