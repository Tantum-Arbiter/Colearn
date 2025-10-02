import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BookCard } from '@/components/stories/book-card';
import { Story } from '@/types/story';

// Mock LinearGradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

// Reanimated is already mocked globally in jest.setup.js

const mockAvailableStory: Story = {
  id: '1',
  title: 'Test Story',
  category: 'adventure',
  tag: '🗺️ Adventure',
  emoji: '🗺️',
  isAvailable: true,
  ageRange: '3-6',
  duration: 10,
  description: 'A test story'
};

const mockPlaceholderStory: Story = {
  id: 'placeholder-1',
  title: 'Coming Soon',
  category: 'adventure',
  tag: '',
  emoji: '',
  isAvailable: false,
  description: 'More stories coming soon!'
};

describe('BookCard', () => {
  it('renders available story correctly', () => {
    const { getByText } = render(
      <BookCard story={mockAvailableStory} />
    );
    
    expect(getByText('Test Story')).toBeTruthy();
    expect(getByText('🗺️ Adventure')).toBeTruthy();
    expect(getByText('10 min')).toBeTruthy();
  });

  it('renders placeholder story correctly', () => {
    const { getByText } = render(
      <BookCard story={mockPlaceholderStory} />
    );
    
    expect(getByText('Coming Soon')).toBeTruthy();
    // Placeholder stories should not show tags or duration
    expect(() => getByText('🗺️ Adventure')).toThrow();
    expect(() => getByText('10 min')).toThrow();
  });

  it('calls onPress when available story is pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <BookCard story={mockAvailableStory} onPress={mockOnPress} />
    );
    
    const storyCard = getByText('Test Story');
    fireEvent.press(storyCard);
    
    expect(mockOnPress).toHaveBeenCalledWith(mockAvailableStory);
  });

  it('does not call onPress when placeholder story is pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <BookCard story={mockPlaceholderStory} onPress={mockOnPress} />
    );
    
    const placeholderCard = getByText('Coming Soon');
    fireEvent.press(placeholderCard);
    
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('displays story emoji for available stories', () => {
    const { getByText } = render(
      <BookCard story={mockAvailableStory} />
    );
    
    expect(getByText('🗺️')).toBeTruthy();
  });

  it('displays placeholder icon for unavailable stories', () => {
    const { getByText } = render(
      <BookCard story={mockPlaceholderStory} />
    );
    
    expect(getByText('📚')).toBeTruthy();
  });
});
