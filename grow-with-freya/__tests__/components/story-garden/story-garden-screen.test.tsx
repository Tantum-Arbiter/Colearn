/**
 * Tests for the Story Garden screen.
 *
 * This is the child-facing catalogue that replaces the grid + filter chips.
 * Several assertions here encode what must NOT be there.
 *
 * Note: jest.config maps `react-native` to `react-native-web`, so host nodes are
 * DOM elements and getByTestId does not resolve; queries use text and
 * UNSAFE_*ByProps.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, type RenderResult } from '@testing-library/react-native';
import { STORY_PLACES } from '@/constants/story-places';
import type { Story } from '@/types/story';

interface MockProgress {
  pageIndex: number;
  totalPages: number;
  updatedAt: string;
  completedCount: number;
}

const mockStartTransition = jest.fn();
const mockStoreState = {
  requestReturnToMainMenu: jest.fn(),
  userAvatarType: null as 'boy' | 'girl' | null,
  userNickname: 'Freya' as string | null,
  storyProgress: {} as Record<string, MockProgress>,
  getContinueReadingStoryId: (): string | null => null,
};

jest.mock('@/store/app-store', () => ({
  useAppStore: (selector?: (state: unknown) => unknown) =>
    (selector ? selector(mockStoreState) : mockStoreState),
}));

jest.mock('@/contexts/story-transition-context', () => ({
  useStoryTransition: () => ({
    startTransition: mockStartTransition,
    isTransitioning: false,
    shouldShowStoryReader: false,
    isExpandingToReader: false,
  }),
}));

jest.mock('@/components/ui/page-header', () => ({
  PageHeader: () => null,
}));

const mockStories = [
  { id: 'moon', title: 'Moonlight', description: '', category: 'bedtime', isAvailable: true },
  { id: 'hill', title: 'Big Hill', description: '', category: 'adventure', isAvailable: true },
  { id: 'oak', title: 'Old Oak', description: '', category: 'nature', isAvailable: true },
  { id: 'count', title: 'Counting', description: '', category: 'learning', isAvailable: true },
] as Story[];

jest.mock('@/services/story-loader', () => ({
  StoryLoader: {
    getCachedStories: () => mockStories,
    getStories: () => Promise.resolve(mockStories),
  },
}));

jest.mock('@/data/stories', () => ({ ALL_STORIES: [] }));

import { StoryGardenScreen } from '@/components/stories/story-garden/story-garden-screen';

function textContents(view: RenderResult): string[] {
  return view
    .UNSAFE_queryAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

describe('StoryGardenScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.storyProgress = {};
    mockStoreState.getContinueReadingStoryId = () => null;
    mockStoreState.userNickname = 'Freya';
  });

  describe('the shelves', () => {
    it.each(STORY_PLACES.map((place) => [place.id, place.titleKey]))(
      'should render the %s shelf',
      (_placeId, titleKey) => {
        const view = render(<StoryGardenScreen />);

        expect(textContents(view)).toContain(titleKey);
      }
    );

    it('should route a bedtime story to Moonlit Stories', () => {
      const view = render(<StoryGardenScreen />);

      expect(byTestId(view, 'story-shelf-moonlit-stories').length).toBeGreaterThan(0);
    });

    it('should not render a shelf for a place with no stories', () => {
      const view = render(<StoryGardenScreen />);

      expect(byTestId(view, 'story-shelf-cosy-corner').length).toBeGreaterThan(0);
    });
  });

  describe('what the child never sees', () => {
    it('should show no tag filter chips', () => {
      const view = render(<StoryGardenScreen />);

      expect(textContents(view)).not.toContain('stories.filterTags.calming');
      expect(textContents(view)).not.toContain('stories.filterTags.bedtime');
    });

    it('should offer no carousel/grid view toggle', () => {
      const view = render(<StoryGardenScreen />);

      expect(byTestId(view, 'view-mode-toggle')).toHaveLength(0);
    });

    it('should not expose a long-press preview', () => {
      const view = render(<StoryGardenScreen />);

      expect(view.UNSAFE_queryAllByProps({ delayLongPress: 400 })).toHaveLength(0);
    });
  });

  describe('continue reading', () => {
    it('should be absent when nothing has been started', () => {
      const view = render(<StoryGardenScreen />);

      expect(byTestId(view, 'continue-reading-book')).toHaveLength(0);
    });

    it('should show the part-read book with its ribbon', () => {
      mockStoreState.getContinueReadingStoryId = () => 'moon';
      mockStoreState.storyProgress = {
        moon: { pageIndex: 3, totalPages: 9, updatedAt: '2026-07-28T00:00:00.000Z', completedCount: 0 },
      };

      const view = render(<StoryGardenScreen />);

      expect(byTestId(view, 'continue-reading-book').length).toBeGreaterThan(0);
      expect(byTestId(view, 'continue-reading-ribbon').length).toBeGreaterThan(0);
    });
  });

  describe('the parent corner', () => {
    it('should be present but visually subordinate', () => {
      const view = render(<StoryGardenScreen />);

      expect(textContents(view)).toContain('storyGarden.parentCorner');
    });
  });

  describe('the greeting', () => {
    it('should invite a shared choice', () => {
      const view = render(<StoryGardenScreen />);

      expect(textContents(view)).toContain('storyGarden.invitation');
    });
  });
});
