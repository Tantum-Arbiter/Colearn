/**
 * End-to-end test of the "choose a book, open a world" journey.
 *
 * Every phase has unit tests, but nothing covered the wiring BETWEEN them:
 * shelf tap → lift → focused book → chosen mode → landscape requested →
 * reader mounted with the right story, mode and voice. That handoff spans four
 * files and is the highest-risk path in this work.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, act, type RenderResult } from '@testing-library/react-native';
import { STORY_GARDEN_MOTION, STORY_GARDEN_DELAYS } from '@/constants/story-garden-motion';
import type { Story } from '@/types/story';

const mockRequestGardenOpen = jest.fn();
const mockLockLandscape = jest.fn();
const mockLockPortrait = jest.fn();
let mockOrientation: 'portrait' | 'landscape' = 'portrait';

const mockStoreState = {
  requestReturnToMainMenu: jest.fn(),
  userAvatarType: null,
  userNickname: 'Freya',
  storyProgress: {},
  getContinueReadingStoryId: (): string | null => null,
};

jest.mock('@/store/app-store', () => ({
  useAppStore: (selector?: (state: unknown) => unknown) =>
    (selector ? selector(mockStoreState) : mockStoreState),
}));

jest.mock('@/contexts/story-transition-context', () => ({
  useStoryTransition: () => ({
    requestGardenOpen: mockRequestGardenOpen,
    startTransition: jest.fn(),
    isTransitioning: false,
    shouldShowStoryReader: false,
    isExpandingToReader: false,
  }),
}));

jest.mock('@/hooks/use-story-orientation', () => ({
  useStoryOrientation: () => ({
    orientation: mockOrientation,
    isSettling: false,
    isTablet: false,
    lockLandscape: mockLockLandscape,
    lockPortrait: mockLockPortrait,
  }),
}));

jest.mock('@/components/ui/page-header', () => ({ PageHeader: () => null }));
jest.mock('@/components/ui/parents-only-modal', () => ({ ParentsOnlyModal: () => null }));

jest.mock('@/services/voice-recording-service', () => ({
  voiceRecordingService: { getVoiceOversForStory: () => Promise.resolve([]) },
}));

const mockStories = [
  { id: 'moon', title: 'Moonlight', description: 'A quiet story.', category: 'bedtime', isAvailable: true },
] as Story[];

jest.mock('@/services/story-loader', () => ({
  StoryLoader: {
    getCachedStories: () => mockStories,
    getStories: () => Promise.resolve(mockStories),
  },
}));

jest.mock('@/data/stories', () => ({ ALL_STORIES: [] }));

import { StoryGardenScreen } from '@/components/stories/story-garden/story-garden-screen';

function byTestId(view: RenderResult, testID: string) {
  return view.UNSAFE_queryAllByProps({ testID });
}

function textContents(view: RenderResult): string[] {
  return view
    .UNSAFE_queryAllByType(Text)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === 'string');
}

function advance(ms: number): void {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

const TO_FOCUSED =
  STORY_GARDEN_MOTION.bookLift.duration + STORY_GARDEN_MOTION.focusSettle.duration;
const TO_LANDSCAPE_REQUEST =
  STORY_GARDEN_MOTION.coverExpansion.duration + STORY_GARDEN_MOTION.preOpen.duration;

describe('the Story Garden journey', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockOrientation = 'portrait';
    mockLockLandscape.mockResolvedValue('landscape');
    mockLockPortrait.mockResolvedValue('portrait');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('picking a book off the shelf', () => {
    it('should show no book-opening overlay until a book is chosen', () => {
      const view = render(<StoryGardenScreen />);

      expect(byTestId(view, 'book-opening-overlay')).toHaveLength(0);
    });

    it('should bring up the focused book after the lift', () => {
      const view = render(<StoryGardenScreen />);

      fireEvent.press(byTestId(view, 'shelf-book-moon')[0]);
      advance(TO_FOCUSED);

      expect(byTestId(view, 'focused-book').length).toBeGreaterThan(0);
    });

    it('should offer the two reading choices once focused', () => {
      const view = render(<StoryGardenScreen />);

      fireEvent.press(byTestId(view, 'shelf-book-moon')[0]);
      advance(TO_FOCUSED);

      expect(textContents(view)).toContain('storyGarden.readTogether');
      expect(textContents(view)).toContain('storyGarden.listen');
    });

    it('should not have touched orientation while the child is choosing', () => {
      const view = render(<StoryGardenScreen />);

      fireEvent.press(byTestId(view, 'shelf-book-moon')[0]);
      advance(TO_FOCUSED);

      expect(mockLockLandscape).not.toHaveBeenCalled();
    });

    it('should put the book back and clear the overlay', () => {
      const view = render(<StoryGardenScreen />);

      fireEvent.press(byTestId(view, 'shelf-book-moon')[0]);
      advance(TO_FOCUSED);
      fireEvent.press(byTestId(view, 'focused-book-put-back')[0]);

      expect(byTestId(view, 'book-opening-overlay')).toHaveLength(0);
    });
  });

  describe('opening the book', () => {
    function openTheBook(view: RenderResult) {
      fireEvent.press(byTestId(view, 'shelf-book-moon')[0]);
      advance(TO_FOCUSED);
      fireEvent.press(byTestId(view, 'focused-book-read-together')[0]);
    }

    it('should ask for landscape only after the book has begun opening', () => {
      const view = render(<StoryGardenScreen />);

      openTheBook(view);
      advance(STORY_GARDEN_MOTION.coverExpansion.duration);

      expect(mockLockLandscape).not.toHaveBeenCalled();

      advance(STORY_GARDEN_MOTION.preOpen.duration);

      expect(mockLockLandscape).toHaveBeenCalledTimes(1);
    });

    it('should keep the same book rendered across the bridge', () => {
      const view = render(<StoryGardenScreen />);

      openTheBook(view);
      advance(TO_LANDSCAPE_REQUEST);

      expect(byTestId(view, 'book-opening-bridge-book').length).toBeGreaterThan(0);
    });

    it('should hand the story to the reader once landscape settles', async () => {
      const view = render(<StoryGardenScreen />);

      openTheBook(view);
      await act(async () => {
        jest.advanceTimersByTime(TO_LANDSCAPE_REQUEST);
      });
      await act(async () => {
        jest.advanceTimersByTime(STORY_GARDEN_MOTION.landscapeSettle.duration);
      });

      expect(mockRequestGardenOpen).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'moon' }),
        'read',
        null
      );
    });
  });

  describe('when nobody turns the device', () => {
    it('should offer a way out rather than trapping the family', () => {
      const view = render(<StoryGardenScreen />);

      fireEvent.press(byTestId(view, 'shelf-book-moon')[0]);
      advance(TO_FOCUSED);
      fireEvent.press(byTestId(view, 'focused-book-read-together')[0]);
      advance(TO_LANDSCAPE_REQUEST + STORY_GARDEN_DELAYS.rotationPrompt);

      expect(textContents(view)).toContain('storyGarden.readThisWay');
    });
  });
});
