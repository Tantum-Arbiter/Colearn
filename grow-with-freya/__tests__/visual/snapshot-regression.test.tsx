/**
 * Visual Regression Tests
 * Snapshot testing for UI components to catch visual regressions
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MainMenu } from '@/components/main-menu';
import { StorySelectionScreen } from '@/components/stories/story-selection-screen';
import { StoryBookReader } from '@/components/stories/story-book-reader';
import { Story } from '@/types/story';
import { resetAnimationMocks } from '@/__tests__/utils/animation-test-utils';

// Mock all dependencies
jest.mock('@/contexts/story-transition-context', () => ({
  useStoryTransition: jest.fn(() => ({
    isTransitioning: false,
    transitionStory: null,
    transitionLayout: null,
    completeTransition: jest.fn(),
    startTransition: jest.fn(),
  })),
}));

jest.mock('@/store/app-store', () => {
  const state = {
    requestReturnToMainMenu: jest.fn(),
    setShowLoginAfterOnboarding: jest.fn(),
    getEffectiveTier: () => 'free',
    subscriptionTier: 'free',
    _devSubscriptionOverride: null,
    storyViewMode: 'grid',
    setStoryViewMode: jest.fn(),
    favoriteStoryIds: [],
    toggleFavoriteStory: jest.fn(),
    readStoryIds: [],
    userAvatarType: 'boy',
    useHomeScene: false,
    storyProgress: {},
    getContinueReadingStoryId: jest.fn(() => null),
    // read by StoryBookReader via selectors
    setTextSizeScale: jest.fn(),
    childAgeInMonths: 36,
    setStoryProgress: jest.fn(),
    markStoryCompleted: jest.fn(),
    markStoryAsRead: jest.fn(),
    recordReadingSession: jest.fn(),
    textSizeScale: 1,
    backgroundAnimationState: {
      cloudFloat1: -200,
      cloudFloat2: -400,
      rocketFloat1: 1000,
      rocketFloat2: -200,
    },
    updateBackgroundAnimationState: jest.fn(),
    currentScreen: 'main',
    isAppReady: true,
  };
  return {
    // read both bare and via selectors, so honour a selector like zustand does
    useAppStore: jest.fn((selector?: (s: typeof state) => unknown) =>
      typeof selector === 'function' ? selector(state) : state
    ),
  };
});

// Test story for snapshots
const SNAPSHOT_TEST_STORY: Story = {
  id: 'snapshot-story',
  title: 'Snapshot Test Story',
  category: 'adventure',
  coverImage: 'test-cover.jpg',
  isAvailable: true,
  ageRange: '3-6',
  duration: 2,
  pages: [
    {
      id: 'cover',
      pageNumber: 0,
      type: 'cover',
      text: 'Snapshot Test Story',
      backgroundImage: 'test-bg.jpg',
    },
    {
      id: 'page1',
      pageNumber: 1,
      type: 'story',
      text: 'This is a test page for visual regression testing.',
      backgroundImage: 'test-page1.jpg',
    },
  ],
};

describe('Visual Regression Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    resetAnimationMocks();
    // Force real timers in CI environments
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.NODE_ENV === 'test';
    if (isCI) {
      jest.useRealTimers();
    } else {
      jest.useFakeTimers();
    }
  });

  afterEach(() => {
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.NODE_ENV === 'test';
    if (!isCI) {
      jest.useRealTimers();
    }
    jest.clearAllTimers();
  });

  // Whole-screen snapshots are ruled out by AGENTS.md and are unreviewable in a
  // diff -- react-native-web serialises generated class names like
  // "r-flexBasis-1mlwlqe", so an intentional tweak and a regression look alike.
  // These assert a derived structure instead: the testIDs and accessibility
  // labels a screen exposes. Small, stable against styling churn, and a removed
  // control shows up as one readable line.
  //
  // Written as explicit expectations rather than toMatchSnapshot because
  // .gitignore excludes **/__snapshots__/ and *.snap repo-wide -- an
  // uncommitted snapshot is regenerated on every CI run and can never fail.

  type Node = { props: Record<string, unknown> };

  const structure = (tree: ReturnType<typeof render>): string[] =>
    Array.from(
      new Set<string>(
        tree.UNSAFE_root
          .findAll((n: Node) => typeof n.props.testID === 'string')
          .map((n: Node) => n.props.testID as string)
      )
    ).sort();

  const labels = (tree: ReturnType<typeof render>): string[] =>
    Array.from(
      new Set<string>(
        tree.UNSAFE_root
          .findAll((n: Node) => typeof n.props.accessibilityLabel === 'string')
          .map((n: Node) => n.props.accessibilityLabel as string)
      )
    ).sort();

  const READER_PROPS = { onExit: jest.fn() };

  describe('MainMenu structure', () => {
    it('exposes a stable set of controls', () => {
      const tree = render(<MainMenu onNavigate={jest.fn()} />);

      expect(structure(tree)).toEqual([
        'icon-Ionicons-arrow-back',
        'icon-Ionicons-person-outline',
        'linear-gradient',
        'main-menu-container',
        'menu-carousel',
        'menu-icon-instruments',
        'menu-icon-learning',
        'menu-icon-stories',
        'mode-back-arrow',
        'music-control-button',
        'music-icon-playing',
      ]);
    });

    it('labels every control for screen readers', () => {
      const tree = render(<MainMenu onNavigate={jest.fn()} />);

      expect(labels(tree)).toEqual([
        'Mute background music. Long press for audio settings.',
        'menu.instruments button',
        'menu.learning button',
        'menu.stories button',
      ]);
    });

    it('renders the same structure across re-renders', () => {
      const tree = render(<MainMenu onNavigate={jest.fn()} />);
      const first = structure(tree);

      tree.rerender(<MainMenu onNavigate={jest.fn()} />);

      expect(structure(tree)).toEqual(first);
    });
  });

  describe('StorySelectionScreen structure', () => {
    it('exposes a stable set of controls', () => {
      const tree = render(<StorySelectionScreen />);

      expect(structure(tree)).toEqual([
        'earth-horizon',
        'earth-horizon-clouds',
        'earth-horizon-globe',
        'icon-Ionicons-arrow-back',
        'linear-gradient',
        'music-control-button',
        'music-icon-playing',
      ]);
    });

    it('renders the same structure with or without a selection callback', () => {
      const withoutCallback = structure(render(<StorySelectionScreen />));
      const withCallback = structure(
        render(<StorySelectionScreen onStorySelect={jest.fn()} />)
      );

      expect(withCallback).toEqual(withoutCallback);
    });
  });

  describe('StoryBookReader structure', () => {
    it('exposes a stable set of controls on the cover page', () => {
      const tree = render(
        <StoryBookReader story={SNAPSHOT_TEST_STORY} {...READER_PROPS} />
      );

      expect(structure(tree)).toEqual([
        'cover-tap-overlay',
        'icon-Ionicons-arrow-back',
        'icon-Ionicons-book-outline',
        'icon-Ionicons-headset-outline',
        'icon-Ionicons-menu',
        'icon-Ionicons-mic-outline',
        'linear-gradient',
        'music-control-button',
        'music-icon-playing',
      ]);
    });

    it('renders the story title on the cover', () => {
      const tree = render(
        <StoryBookReader story={SNAPSHOT_TEST_STORY} {...READER_PROPS} />
      );

      expect(JSON.stringify(tree.toJSON())).toContain(SNAPSHOT_TEST_STORY.title);
    });

    it('survives a story with no pages rather than crashing', () => {
      const incompleteStory: Story = { ...SNAPSHOT_TEST_STORY, pages: [] };

      expect(() =>
        render(<StoryBookReader story={incompleteStory} {...READER_PROPS} />)
      ).not.toThrow();
    });

    it('keeps the same structure regardless of page text length', () => {
      // the cover -> page transition is animated and does not settle
      // synchronously, so assert what is deterministic: unusually long copy
      // must not collapse or add controls
      const [cover, ...rest] = SNAPSHOT_TEST_STORY.pages!;
      const longStory: Story = {
        ...SNAPSHOT_TEST_STORY,
        pages: [cover, { ...rest[0], text: 'A very long sentence about the moon. '.repeat(20) }],
      };

      const normal = structure(
        render(<StoryBookReader story={SNAPSHOT_TEST_STORY} {...READER_PROPS} />)
      );
      const long = structure(
        render(<StoryBookReader story={longStory} {...READER_PROPS} />)
      );

      expect(long).toEqual(normal);
    });
  });

  describe('Responsive structure', () => {
    const withDimensions = (width: number, height: number, scale: number) => {
      const Dimensions = require('react-native').Dimensions;
      const original = Dimensions.get;
      Dimensions.get = jest.fn(() => ({ width, height, scale, fontScale: 1 }));
      try {
        return structure(render(<MainMenu onNavigate={jest.fn()} />));
      } finally {
        Dimensions.get = original;
      }
    };

    it('keeps the same controls on phone and tablet dimensions', () => {
      const phone = withDimensions(375, 812, 3);
      const tablet = withDimensions(1024, 768, 2);

      // layout changes with size, but no control may appear or disappear
      expect(tablet).toEqual(phone);
    });
  });
});
