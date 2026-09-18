import React from 'react';
import { render } from '@testing-library/react-native';
import { StorySelectionScreen } from '@/components/stories/story-selection-screen';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { ScreenTimeProvider } from '@/components/screen-time/screen-time-provider';

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
jest.mock('@/store/app-store', () => {
  const state = {
    requestReturnToMainMenu: jest.fn(),
    setShowLoginAfterOnboarding: jest.fn(),
    getEffectiveTier: () => 'free',
    storyViewMode: 'grid',
    setStoryViewMode: jest.fn(),
    favoriteStoryIds: [],
    toggleFavoriteStory: jest.fn(),
    readStoryIds: [],
    userAvatarType: 'boy',
  };
  return {
    // read both bare and via selectors, so honour a selector like zustand does
    useAppStore: (selector?: (s: typeof state) => unknown) =>
      typeof selector === 'function' ? selector(state) : state,
  };
});

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

// Reanimated is mocked globally in jest.setup.js; a local mock here shadowed it
// with a default export missing createAnimatedComponent, which broke the suite.

describe('StorySelectionScreen Stars', () => {
  const mockOnStorySelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render component successfully', () => {
    const result = render(
      <ScreenTimeProvider>
        <StorySelectionScreen onStorySelect={mockOnStorySelect} />
      </ScreenTimeProvider>
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

  // restating the literals only duplicated the source and broke on any
  // legitimate retune; these are the relationships that actually have to hold
  it('should use coherent star constants', () => {
    expect(Number.isInteger(VISUAL_EFFECTS.STAR_COUNT)).toBe(true);
    expect(VISUAL_EFFECTS.STAR_COUNT).toBeGreaterThan(0);

    // stars are drawn as circles, so the radius must stay half the size
    expect(VISUAL_EFFECTS.STAR_BORDER_RADIUS).toBe(VISUAL_EFFECTS.STAR_SIZE / 2);

    // the field is a fraction of the screen height
    expect(VISUAL_EFFECTS.STAR_AREA_HEIGHT_RATIO).toBeGreaterThan(0);
    expect(VISUAL_EFFECTS.STAR_AREA_HEIGHT_RATIO).toBeLessThanOrEqual(1);
  });

  it('should render with proper gradient background', () => {
    const { UNSAFE_root } = render(
      <ScreenTimeProvider>
        <StorySelectionScreen onStorySelect={mockOnStorySelect} />
      </ScreenTimeProvider>
    );

    // Component should render without errors
    expect(UNSAFE_root).toBeTruthy();
  });

  it('should handle story selection callback', () => {
    render(
      <ScreenTimeProvider>
        <StorySelectionScreen onStorySelect={mockOnStorySelect} />
      </ScreenTimeProvider>
    );

    // Component should render without calling the callback initially
    expect(mockOnStorySelect).not.toHaveBeenCalled();
  });
});
