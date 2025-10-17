import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-wrapper';
import { StorySelectionScreen } from '../story-selection-screen';
import { Story } from '@/types/story';

// Mock the GenreCarousel component
jest.mock('../genre-carousel', () => ({
  GenreCarousel: ({ genre, onStoryPress }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    
    return React.createElement(View, { testID: `genre-carousel-${genre}` }, [
      React.createElement(Text, { key: 'title' }, `${genre} Genre`),
      React.createElement(
        TouchableOpacity,
        {
          key: 'story-button',
          testID: `story-button-${genre}`,
          onPress: () => onStoryPress({ id: `test-${genre}`, title: `Test ${genre} Story` })
        },
        React.createElement(Text, null, `Test ${genre} Story`)
      )
    ]);
  }
}));

// Mock the data
jest.mock('@/data/stories', () => ({
  ALL_STORIES: [
    {
      id: '1',
      title: 'Bedtime Story',
      category: 'bedtime',
      description: 'A test bedtime story',
      emoji: '🌙',
      tag: '🌙 Bedtime',
      ageRange: '2-5',
      duration: 5,
      isAvailable: true,
      coverImage: 'test-image',
      pages: []
    },
    {
      id: '2',
      title: 'Adventure Story',
      category: 'adventure',
      description: 'A test adventure story',
      emoji: '🗺️',
      tag: '🗺️ Adventure',
      ageRange: '3-6',
      duration: 10,
      isAvailable: true,
      coverImage: 'test-image',
      pages: []
    }
  ],
  getGenresWithStories: () => ['bedtime', 'adventure']
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 })
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  }
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  return {
    useSharedValue: (value: any) => ({ value }),
    useAnimatedStyle: (fn: any) => ({}),
    withTiming: (value: any) => value,
    Easing: { bezier: () => {} },
    default: {
      View: ({ children, ...props }: any) => React.createElement(View, props, children)
    }
  };
});

describe('StorySelectionScreen', () => {
  const mockOnStorySelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main title', () => {
    const { getByText } = renderWithProviders(
      <StorySelectionScreen onStorySelect={mockOnStorySelect} />
    );

    expect(getByText('Choose a Story')).toBeTruthy();
  });

  it('renders genre carousels for available genres', () => {
    const { getByTestId } = renderWithProviders(
      <StorySelectionScreen onStorySelect={mockOnStorySelect} />
    );

    expect(getByTestId('genre-carousel-bedtime')).toBeTruthy();
    expect(getByTestId('genre-carousel-adventure')).toBeTruthy();
  });

  it('calls onStorySelect when a story is pressed', () => {
    const { getByTestId } = renderWithProviders(
      <StorySelectionScreen onStorySelect={mockOnStorySelect} />
    );

    const storyButton = getByTestId('story-button-bedtime');
    fireEvent.press(storyButton);

    expect(mockOnStorySelect).toHaveBeenCalledWith({
      id: 'test-bedtime',
      title: 'Test bedtime Story'
    });
  });

  it('renders surprise me button', () => {
    const { getByText } = renderWithProviders(
      <StorySelectionScreen onStorySelect={mockOnStorySelect} />
    );

    expect(getByText('✨ Surprise Me! ✨')).toBeTruthy();
  });

  it('handles surprise me button press', () => {
    const { getByText } = renderWithProviders(
      <StorySelectionScreen onStorySelect={mockOnStorySelect} />
    );

    const surpriseButton = getByText('✨ Surprise Me! ✨');
    fireEvent.press(surpriseButton);

    // Should call onStorySelect with a random story
    expect(mockOnStorySelect).toHaveBeenCalled();
  });

  it('shows empty state when no stories available', () => {
    // Mock empty stories
    jest.doMock('@/data/stories', () => ({
      ALL_STORIES: [],
      getGenresWithStories: () => []
    }));

    const { getByText } = renderWithProviders(
      <StorySelectionScreen onStorySelect={mockOnStorySelect} />
    );

    expect(getByText('No stories available')).toBeTruthy();
    expect(getByText('Check back soon for new adventures!')).toBeTruthy();
  });
});
