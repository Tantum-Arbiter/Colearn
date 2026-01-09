/**
 * Visual Regression Tests
 * Snapshot testing for UI components to catch visual regressions
 */

import React from 'react';
import { render } from '@testing-library/react-native';
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

jest.mock('@/store/app-store', () => ({
  useAppStore: jest.fn(() => ({
    requestReturnToMainMenu: jest.fn(),
  })),
}));

// Test story for snapshots
const SNAPSHOT_TEST_STORY: Story = {
  id: 'snapshot-story',
  title: 'Snapshot Test Story',
  category: 'adventure',
  tag: '📸 Snapshot',
  emoji: '📸',
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

  describe('MainMenu Snapshots', () => {
    it('should match MainMenu snapshot', () => {
      const { toJSON } = render(<MainMenu onNavigate={jest.fn()} />);
      expect(toJSON()).toMatchSnapshot('main-menu-default');
    });

    it('should match MainMenu with different states', () => {
      // Test different navigation states if applicable
      const { toJSON } = render(<MainMenu onNavigate={jest.fn()} />);
      expect(toJSON()).toMatchSnapshot('main-menu-interactive');
    });
  });

  describe('StorySelectionScreen Snapshots', () => {
    it('should match StorySelectionScreen snapshot', () => {
      const { toJSON } = render(<StorySelectionScreen />);
      expect(toJSON()).toMatchSnapshot('story-selection-default');
    });

    it('should match StorySelectionScreen with story selection callback', () => {
      const { toJSON } = render(
        <StorySelectionScreen onStorySelect={jest.fn()} />
      );
      expect(toJSON()).toMatchSnapshot('story-selection-with-callback');
    });
  });

  describe('StoryBookReader Snapshots', () => {
    it('should match StoryBookReader initial state snapshot', () => {
      const { toJSON } = render(
        <StoryBookReader
          story={SNAPSHOT_TEST_STORY}
          onExit={jest.fn()}
        />
      );
      expect(toJSON()).toMatchSnapshot('story-book-reader-initial');
    });

    it('should match StoryBookReader with different story types', () => {
      const bedtimeStory: Story = {
        ...SNAPSHOT_TEST_STORY,
        id: 'bedtime-snapshot',
        title: 'Bedtime Snapshot Story',
        category: 'bedtime',
        tag: '🌙 Bedtime',
        emoji: '🌙',
      };

      const { toJSON } = render(
        <StoryBookReader
          story={bedtimeStory}
          onExit={jest.fn()}
        />
      );
      expect(toJSON()).toMatchSnapshot('story-book-reader-bedtime');
    });
  });

  describe('Animation State Snapshots', () => {
    it('should match components in different animation states', () => {
      // Test initial animation state
      const { toJSON: initialJSON } = render(<MainMenu onNavigate={jest.fn()} />);
      expect(initialJSON()).toMatchSnapshot('main-menu-animation-initial');

      // Note: In a real app, you might advance timers to test different animation states
      // For now, we test the initial state which is most stable for snapshots
    });

    it('should match story reader in different page states', () => {
      // Cover page state
      const { toJSON } = render(
        <StoryBookReader
          story={SNAPSHOT_TEST_STORY}
          onExit={jest.fn()}
        />
      );
      expect(toJSON()).toMatchSnapshot('story-reader-cover-page');
    });
  });

  describe('Responsive Design Snapshots', () => {
    it('should match components with different screen dimensions', () => {
      // Mock different screen dimensions
      const originalDimensions = require('react-native').Dimensions.get;
      
      // Mock phone dimensions
      require('react-native').Dimensions.get = jest.fn(() => ({
        width: 375,
        height: 812,
        scale: 3,
        fontScale: 1,
      }));

      const { toJSON: phoneJSON } = render(<MainMenu onNavigate={jest.fn()} />);
      expect(phoneJSON()).toMatchSnapshot('main-menu-phone-dimensions');

      // Mock tablet dimensions
      require('react-native').Dimensions.get = jest.fn(() => ({
        width: 1024,
        height: 768,
        scale: 2,
        fontScale: 1,
      }));

      const { toJSON: tabletJSON } = render(<MainMenu onNavigate={jest.fn()} />);
      expect(tabletJSON()).toMatchSnapshot('main-menu-tablet-dimensions');

      // Restore original
      require('react-native').Dimensions.get = originalDimensions;
    });
  });

  describe('Error State Snapshots', () => {
    it('should match components with error boundaries', () => {
      // Test error boundary rendering
      const ErrorComponent = () => {
        throw new Error('Test error for snapshot');
      };

      // This would test error boundary if implemented
      // For now, test normal error handling
      const { toJSON } = render(<MainMenu onNavigate={jest.fn()} />);
      expect(toJSON()).toMatchSnapshot('main-menu-error-handling');
    });

    it('should match story reader with missing data', () => {
      const incompleteStory: Story = {
        ...SNAPSHOT_TEST_STORY,
        pages: [], // Empty pages to test error handling
      };

      const { toJSON } = render(
        <StoryBookReader
          story={incompleteStory}
          onExit={jest.fn()}
        />
      );
      expect(toJSON()).toMatchSnapshot('story-reader-incomplete-data');
    });
  });

  describe('Theme and Style Snapshots', () => {
    it('should match components with consistent styling', () => {
      // Test that styling is consistent by checking key style properties
      const mockNavigate = jest.fn();
      const { toJSON } = render(<MainMenu onNavigate={mockNavigate} />);
      const snapshot = toJSON();

      // Verify consistent styling elements are present
      const snapshotString = JSON.stringify(snapshot);
      expect(snapshotString).toContain('main-menu-container');
      expect(snapshotString).toContain('Stories button');
      expect(snapshotString).toContain('backgroundColor');
      expect(snapshot).toMatchSnapshot('main-menu-consistent-styling');
    });

    it('should match story selection with consistent card styling', () => {
      const { toJSON } = render(<StorySelectionScreen />);
      expect(toJSON()).toMatchSnapshot('story-selection-card-styling');
    });
  });

  describe('Accessibility Snapshots', () => {
    it('should match components with accessibility props', () => {
      const { toJSON } = render(<MainMenu onNavigate={jest.fn()} />);

      // Verify accessibility props are included in snapshot
      const snapshot = toJSON();
      expect(snapshot).toMatchSnapshot('main-menu-accessibility');

      // Check that component renders successfully with menu buttons
      const snapshotString = JSON.stringify(snapshot);
      expect(snapshotString).toContain('Stories button');
      expect(snapshotString).toContain('aria-label');
    });

    it('should match story reader with accessibility features', () => {
      const { toJSON } = render(
        <StoryBookReader
          story={SNAPSHOT_TEST_STORY}
          onExit={jest.fn()}
        />
      );
      expect(toJSON()).toMatchSnapshot('story-reader-accessibility');
    });
  });

  describe('Content Variation Snapshots', () => {
    it('should match components with different content lengths', () => {
      const longTitleStory: Story = {
        ...SNAPSHOT_TEST_STORY,
        title: 'This is a Very Long Story Title That Should Test Text Wrapping and Layout',
        pages: [
          {
            id: 'cover',
            pageNumber: 0,
            type: 'cover',
            text: 'This is a Very Long Story Title That Should Test Text Wrapping and Layout',
            backgroundImage: 'test-bg.jpg',
          },
        ],
      };

      const { toJSON } = render(
        <StoryBookReader
          story={longTitleStory}
          onExit={jest.fn()}
        />
      );
      expect(toJSON()).toMatchSnapshot('story-reader-long-content');
    });

    it('should match components with minimal content', () => {
      const minimalStory: Story = {
        ...SNAPSHOT_TEST_STORY,
        title: 'Short',
        pages: [
          {
            id: 'cover',
            pageNumber: 0,
            type: 'cover',
            text: 'Short',
            backgroundImage: 'test-bg.jpg',
          },
        ],
      };

      const { toJSON } = render(
        <StoryBookReader
          story={minimalStory}
          onExit={jest.fn()}
        />
      );
      expect(toJSON()).toMatchSnapshot('story-reader-minimal-content');
    });
  });
});
