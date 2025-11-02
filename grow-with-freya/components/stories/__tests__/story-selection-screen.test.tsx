import React from 'react';
import { render } from '@testing-library/react-native';
import { StorySelectionScreen } from '../story-selection-screen';
import { ScreenTimeProvider } from '../../screen-time/screen-time-provider';

// Mock all dependencies to prevent import errors
jest.mock('@/data/stories', () => ({
  ALL_STORIES: [],
  getStoriesByGenre: jest.fn(() => []),
  getGenresWithStories: jest.fn(() => []),
  getRandomStory: jest.fn(() => null)
}));

jest.mock('@/store/app-store', () => ({
  useAppStore: () => ({
    requestReturnToMainMenu: jest.fn(),
  }),
}));

jest.mock('@/contexts/story-transition-context', () => ({
  useStoryTransition: () => ({
    startTransition: jest.fn(),
  }),
}));

jest.mock('@/components/main-menu/utils', () => ({
  generateStarPositions: jest.fn(() => []),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('StorySelectionScreen', () => {
  it('renders without crashing', () => {
    const result = render(
      <ScreenTimeProvider>
        <StorySelectionScreen />
      </ScreenTimeProvider>
    );
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('renders with onStorySelect prop', () => {
    const mockOnStorySelect = jest.fn();
    const result = render(
      <ScreenTimeProvider>
        <StorySelectionScreen onStorySelect={mockOnStorySelect} />
      </ScreenTimeProvider>
    );
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });
});
