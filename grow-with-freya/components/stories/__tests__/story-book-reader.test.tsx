import React from 'react';
import { render } from '@testing-library/react-native';
import { StoryBookReader } from '../story-book-reader';

// Mock all dependencies
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(() => Promise.resolve()),
  unlockAsync: jest.fn(() => Promise.resolve()),
  OrientationLock: {
    LANDSCAPE: 'LANDSCAPE',
    PORTRAIT_UP: 'PORTRAIT_UP',
  },
}));

jest.mock('../../../contexts/story-transition-context', () => ({
  useStoryTransition: () => ({
    isTransitioning: false,
    completeTransition: jest.fn(),
  }),
}));

// Mock story data
const mockStory = {
  id: 'test-story',
  title: 'Test Story',
  category: 'bedtime',
  tag: '🌙 Bedtime',
  emoji: '🌙',
  isAvailable: true,
  pages: [
    {
      id: 'cover',
      pageNumber: 0,
      text: 'Cover Page',
      backgroundImage: 'cover-bg.webp',
    },
    {
      id: 'page1',
      pageNumber: 1,
      text: 'Page 1 content',
      backgroundImage: 'page1-bg.webp',
    },
  ],
};

describe('StoryBookReader', () => {
  const mockOnExit = jest.fn();

  it('renders without crashing', () => {
    const result = render(<StoryBookReader story={mockStory} onExit={mockOnExit} />);
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('renders with all required props', () => {
    const mockOnReadAnother = jest.fn();
    const mockOnBedtimeMusic = jest.fn();
    const result = render(
      <StoryBookReader
        story={mockStory}
        onExit={mockOnExit}
        onReadAnother={mockOnReadAnother}
        onBedtimeMusic={mockOnBedtimeMusic}
      />
    );
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('handles story without pages', () => {
    const storyWithoutPages = { ...mockStory, pages: undefined };
    const result = render(<StoryBookReader story={storyWithoutPages} onExit={mockOnExit} />);
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('handles story with empty pages array', () => {
    const storyWithEmptyPages = { ...mockStory, pages: [] };
    const result = render(<StoryBookReader story={storyWithEmptyPages} onExit={mockOnExit} />);
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });
});
