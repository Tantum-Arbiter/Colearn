import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GenreCarousel } from '../genre-carousel';
import { Story, StoryCategory } from '@/types/story';

// Mock data
const mockStories: Story[] = [
  {
    id: '1',
    title: 'Test Story 1',
    category: 'bedtime' as StoryCategory,
    description: 'A test bedtime story',
    emoji: '🌙',
    tag: '🌙 Bedtime',
    ageRange: '2-5',
    duration: 5,
    isAvailable: true,
    coverImage: 'test-image-1',
    pages: []
  },
  {
    id: '2',
    title: 'Test Story 2',
    category: 'bedtime' as StoryCategory,
    description: 'Another test bedtime story',
    emoji: '🐨',
    tag: '🌙 Bedtime',
    ageRange: '2-5',
    duration: 7,
    isAvailable: true,
    coverImage: 'test-image-2',
    pages: []
  },
  {
    id: '3',
    title: 'Adventure Story',
    category: 'adventure' as StoryCategory,
    description: 'A test adventure story',
    emoji: '🗺️',
    tag: '🗺️ Adventure',
    ageRange: '3-6',
    duration: 10,
    isAvailable: true,
    coverImage: 'test-image-3',
    pages: []
  }
];

describe('GenreCarousel', () => {
  const mockOnStoryPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders genre header with correct emoji and title', () => {
    const { getByText } = render(
      <GenreCarousel
        genre="bedtime"
        stories={mockStories}
        onStoryPress={mockOnStoryPress}
      />
    );

    expect(getByText('Bedtime')).toBeTruthy();
    expect(getByText(/2.*stories/)).toBeTruthy();
  });

  it('filters stories by genre correctly', () => {
    const { getAllByText, queryByText } = render(
      <GenreCarousel
        genre="bedtime"
        stories={mockStories}
        onStoryPress={mockOnStoryPress}
      />
    );

    // Should show bedtime stories (there might be multiple elements with same text)
    expect(getAllByText('Test Story 1').length).toBeGreaterThan(0);
    expect(getAllByText('Test Story 2').length).toBeGreaterThan(0);

    // Should not show adventure story
    expect(queryByText('Adventure Story')).toBeNull();
  });

  it('does not render when no stories match genre', () => {
    const { queryByText } = render(
      <GenreCarousel
        genre="fantasy"
        stories={mockStories}
        onStoryPress={mockOnStoryPress}
      />
    );

    // Should not render anything
    expect(queryByText('Fantasy')).toBeNull();
  });

  it('calls onStoryPress when story thumbnail is pressed', () => {
    const { getAllByText } = render(
      <GenreCarousel
        genre="bedtime"
        stories={mockStories}
        onStoryPress={mockOnStoryPress}
      />
    );

    const storyThumbnails = getAllByText('Test Story 1');
    fireEvent.press(storyThumbnails[0]);

    expect(mockOnStoryPress).toHaveBeenCalledWith(mockStories[0]);
  });

  it('renders horizontal FlatList for story thumbnails', () => {
    const { getByTestId, getAllByText } = render(
      <GenreCarousel
        genre="bedtime"
        stories={mockStories}
        onStoryPress={mockOnStoryPress}
      />
    );

    // Check that the carousel container is present
    expect(getByTestId('genre-carousel-bedtime')).toBeTruthy();

    // Check that stories are rendered
    expect(getAllByText('Test Story 1').length).toBeGreaterThan(0);
    expect(getAllByText('Test Story 2').length).toBeGreaterThan(0);
  });

  it('shows correct story count in header', () => {
    const { getByText } = render(
      <GenreCarousel
        genre="adventure"
        stories={mockStories}
        onStoryPress={mockOnStoryPress}
      />
    );

    expect(getByText(/1.*stories/)).toBeTruthy();
  });
});
