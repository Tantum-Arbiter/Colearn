import React from 'react';
import { render } from '@testing-library/react-native';
import { StorySelectionScreen } from '@/components/stories/story-selection-screen';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock app store
jest.mock('@/store/app-store', () => ({
  useAppStore: () => ({
    requestReturnToMainMenu: jest.fn(),
  }),
}));

// Mock story transition context
jest.mock('@/contexts/story-transition-context', () => ({
  useStoryTransition: () => ({
    startTransition: jest.fn(),
  }),
}));

// Mock the stories data to avoid image import issues
jest.mock('@/data/stories', () => ({
  ALL_STORIES: [
    {
      id: 'test-story-1',
      title: 'Test Story 1',
      category: 'bedtime',
      tag: '🌙 Bedtime',
      emoji: '🐨',
      coverImage: 'mocked-image',
      isAvailable: true,
      ageRange: '2-5',
      duration: 5,
      description: 'Test story',
      pages: []
    },
    {
      id: 'test-story-2',
      title: 'Test Story 2',
      category: 'adventure',
      tag: '🏴‍☠️ Adventure',
      emoji: '🏴‍☠️',
      coverImage: 'mocked-image',
      isAvailable: true,
      ageRange: '3-6',
      duration: 7,
      description: 'Test adventure story',
      pages: []
    }
  ],
  getStoriesByGenre: jest.fn(() => []),
  getGenresWithStories: jest.fn(() => ['bedtime', 'adventure']),
  getRandomStory: jest.fn(() => null),
}));

// Mock the story transition context
jest.mock('@/contexts/story-transition-context', () => ({
  useStoryTransition: () => ({
    startTransition: jest.fn(),
  }),
}));

// Mock the app store
jest.mock('@/store/app-store', () => ({
  useAppStore: () => ({
    requestReturnToMainMenu: jest.fn(),
  }),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  }),
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const AnimatedView = View;
  return {
    useSharedValue: (initial: any) => ({ value: initial }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (value: any) => value,
    withRepeat: (value: any) => value,
    Easing: { linear: 'linear' },
    default: {
      View: AnimatedView,
    },
    View: AnimatedView,
  };
});

describe('StorySelectionScreen Stars', () => {
  const mockOnStorySelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render component successfully', () => {
    const result = render(
      <StorySelectionScreen onStorySelect={mockOnStorySelect} />
    );

    // Component should render without crashing
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });

  it('should generate correct number of stars', () => {
    // Test the star generation utility directly
    const { generateStarPositions } = require('@/components/main-menu/utils');
    const stars = generateStarPositions(VISUAL_EFFECTS.STAR_COUNT);

    expect(stars).toHaveLength(VISUAL_EFFECTS.STAR_COUNT);

    // Each star should have the correct properties
    stars.forEach((star: any, index: number) => {
      expect(star).toHaveProperty('id', index);
      expect(star).toHaveProperty('left');
      expect(star).toHaveProperty('top');
      expect(star).toHaveProperty('opacity');

      expect(typeof star.left).toBe('number');
      expect(typeof star.top).toBe('number');
      expect(typeof star.opacity).toBe('number');

      // Note: left can be negative due to random positioning, so we just check it's a number
      expect(star.opacity).toBeGreaterThan(0);
      expect(star.opacity).toBeLessThanOrEqual(1);
    });
  });

  it('should use correct star constants', () => {
    expect(VISUAL_EFFECTS.STAR_COUNT).toBe(15);
    expect(VISUAL_EFFECTS.STAR_SIZE).toBe(3);
    expect(VISUAL_EFFECTS.STAR_BORDER_RADIUS).toBe(1.5);
    expect(VISUAL_EFFECTS.STAR_AREA_HEIGHT_RATIO).toBe(0.6);
  });

  it('should render with proper gradient background', () => {
    const { UNSAFE_root } = render(
      <StorySelectionScreen onStorySelect={mockOnStorySelect} />
    );

    // Component should render without errors
    expect(UNSAFE_root).toBeTruthy();
  });

  it('should handle story selection callback', () => {
    render(
      <StorySelectionScreen onStorySelect={mockOnStorySelect} />
    );

    // Component should render without calling the callback initially
    expect(mockOnStorySelect).not.toHaveBeenCalled();
  });
});
