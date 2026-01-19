import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StoryBookReader } from '../story-book-reader';
import { Story } from '@/types/story';

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

jest.mock('@/hooks/use-accessibility', () => ({
  useAccessibility: () => ({
    scaledFontSize: (size: number) => size,
    scaledButtonSize: (size: number) => size,
    textSizeScale: 1,
  }),
  TEXT_SIZE_OPTIONS: [
    { labelKey: 'common.small', value: 0.85 },
    { labelKey: 'common.default', value: 1.0 },
    { labelKey: 'common.large', value: 1.15 },
    { labelKey: 'common.extraLarge', value: 1.3 },
  ],
}));

jest.mock('@/hooks/use-parents-only-challenge', () => ({
  useParentsOnlyChallenge: () => ({
    isModalVisible: false,
    showModal: jest.fn(),
    hideModal: jest.fn(),
    verifyCode: jest.fn(() => true),
    currentCode: '1234',
  }),
}));

jest.mock('@/store/app-store', () => ({
  useAppStore: () => ({
    setTextSizeScale: jest.fn(),
  }),
}));

jest.mock('@/services/voice-recording-service', () => ({
  voiceRecordingService: {
    initialize: jest.fn(() => Promise.resolve()),
    getVoiceOversForStory: jest.fn(() => Promise.resolve([])),
    deleteVoiceOver: jest.fn(() => Promise.resolve()),
  },
  VoiceOver: {},
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('@/contexts/global-sound-context', () => ({
  useGlobalSound: () => ({
    playSound: jest.fn(),
    stopSound: jest.fn(),
  }),
}));

jest.mock('@/components/ui/music-control', () => ({
  MusicControl: () => null,
}));

jest.mock('@/components/ui/parents-only-modal', () => ({
  ParentsOnlyModal: () => null,
}));

jest.mock('@/components/ui/authenticated-image', () => ({
  AuthenticatedImage: ({ testID, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID, ...props });
  },
}));

jest.mock('@/utils/logger', () => ({
  Logger: {
    create: () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockImage = ({ testID, ...props }: any) => {
    return React.createElement(View, { testID, ...props });
  };
  MockImage.prefetch = jest.fn(() => Promise.resolve());
  return { Image: MockImage };
});

// Define __DEV__ for tests
(global as any).__DEV__ = true;

// Mock story data
const mockStory: Story = {
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
    const result = render(
      <StoryBookReader
        story={mockStory}
        onExit={mockOnExit}
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

describe('StoryBookReader Scroll Indicators', () => {
  const mockOnExit = jest.fn();

  // Story with short text (1-2 lines) - should NOT show scroll indicator
  const shortTextStory: Story = {
    id: 'short-text-story',
    title: 'Short Text Story',
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🌙',
    isAvailable: true,
    pages: [
      {
        id: 'cover',
        pageNumber: 0,
        text: 'Short Cover',
        backgroundImage: 'cover-bg.webp',
      },
      {
        id: 'page1',
        pageNumber: 1,
        text: 'Short text.',
        backgroundImage: 'page1-bg.webp',
      },
      {
        id: 'page2',
        pageNumber: 2,
        text: 'Also short.',
        backgroundImage: 'page2-bg.webp',
      },
    ],
  };

  // Story with long text (more than 2 lines) - should show scroll indicator
  const longTextStory: Story = {
    id: 'long-text-story',
    title: 'Long Text Story',
    category: 'bedtime',
    tag: '🌙 Bedtime',
    emoji: '🌙',
    isAvailable: true,
    pages: [
      {
        id: 'cover',
        pageNumber: 0,
        text: 'Cover',
        backgroundImage: 'cover-bg.webp',
      },
      {
        id: 'page1',
        pageNumber: 1,
        text: 'This is a very long text that spans multiple lines. It should definitely be more than two lines when rendered on screen. We need to ensure that the scroll indicator appears when there is too much text to fit in the visible area of the text box.',
        backgroundImage: 'page1-bg.webp',
      },
      {
        id: 'page2',
        pageNumber: 2,
        text: 'Short page 2.',
        backgroundImage: 'page2-bg.webp',
      },
      {
        id: 'page3',
        pageNumber: 3,
        text: 'Another very long text that goes on and on. The quick brown fox jumps over the lazy dog. This text is meant to exceed two lines and trigger the scroll indicator to appear at the bottom of the text box.',
        backgroundImage: 'page3-bg.webp',
      },
    ],
  };

  // Story with mixed text lengths per page
  const mixedTextStory: Story = {
    id: 'mixed-text-story',
    title: 'Mixed Text Story',
    category: 'adventure',
    tag: '🗺️ Adventure',
    emoji: '🗺️',
    isAvailable: true,
    pages: [
      {
        id: 'cover',
        pageNumber: 0,
        text: 'Mixed Story',
        backgroundImage: 'cover-bg.webp',
      },
      {
        id: 'page1',
        pageNumber: 1,
        text: 'Very short.',
        backgroundImage: 'page1-bg.webp',
      },
      {
        id: 'page2',
        pageNumber: 2,
        text: 'This page has much longer text that should wrap to multiple lines and require scrolling to see all of the content. The scroll indicator should appear here.',
        backgroundImage: 'page2-bg.webp',
      },
      {
        id: 'page3',
        pageNumber: 3,
        text: 'Back to short.',
        backgroundImage: 'page3-bg.webp',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders story with short text without scroll indicators initially', () => {
    const { queryByText } = render(
      <StoryBookReader story={shortTextStory} onExit={mockOnExit} />
    );
    // Scroll indicators use ↓ and ↑ arrows
    // Initially should not show scroll indicator for short text
    // Note: The indicator visibility depends on onTextLayout firing
    expect(queryByText('↓')).toBeNull();
    expect(queryByText('↑')).toBeNull();
  });

  it('renders story with long text', () => {
    const result = render(
      <StoryBookReader story={longTextStory} onExit={mockOnExit} />
    );
    expect(result).toBeTruthy();
  });

  it('renders mixed text story correctly', () => {
    const result = render(
      <StoryBookReader story={mixedTextStory} onExit={mockOnExit} />
    );
    expect(result).toBeTruthy();
  });

  it('has hidden measurement text for line counting', () => {
    const { UNSAFE_getAllByType } = render(
      <StoryBookReader story={longTextStory} onExit={mockOnExit} />
    );
    // There should be Text components in the render tree
    const textComponents = UNSAFE_getAllByType(require('react-native').Text);
    expect(textComponents.length).toBeGreaterThan(0);
  });

  it('renders with skipCoverPage prop', () => {
    const result = render(
      <StoryBookReader story={mixedTextStory} onExit={mockOnExit} skipCoverPage={true} />
    );
    expect(result).toBeTruthy();
  });

  it('scroll indicator state defaults to hidden', () => {
    // When there's no text overflow, scroll indicators should not be shown
    const { queryByText } = render(
      <StoryBookReader story={shortTextStory} onExit={mockOnExit} skipCoverPage={true} />
    );
    // Neither up nor down arrow should be visible for short text
    expect(queryByText('↑')).toBeNull();
    expect(queryByText('↓')).toBeNull();
  });

  it('resets scroll state on story load', () => {
    // On initial load, scroll should be at top (no up arrow)
    const { queryByText } = render(
      <StoryBookReader story={mixedTextStory} onExit={mockOnExit} skipCoverPage={true} />
    );
    // Up arrow should not be visible on initial load
    expect(queryByText('↑')).toBeNull();
  });
});

describe('StoryBookReader Text Rendering with Newlines', () => {
  const mockOnExit = jest.fn();

  it('renders text with newlines correctly', () => {
    // Story with text containing newline characters
    const storyWithNewlines: Story = {
      id: 'newline-story',
      title: 'Newline Story',
      category: 'bedtime',
      tag: '🌙 Bedtime',
      emoji: '🌙',
      isAvailable: true,
      pages: [
        {
          id: 'cover',
          pageNumber: 0,
          text: 'Cover Title\n\nSubtitle',
          backgroundImage: 'cover-bg.webp',
        },
        {
          id: 'page1',
          pageNumber: 1,
          text: 'First sentence.\nSecond sentence.\nThird sentence.',
          backgroundImage: 'page1-bg.webp',
        },
      ],
    };

    const result = render(
      <StoryBookReader story={storyWithNewlines} onExit={mockOnExit} skipCoverPage={true} />
    );
    expect(result).toBeTruthy();
    // Verify that the component renders without crashing
    expect(() => result.toJSON()).not.toThrow();
  });

  it('renders text with localized newlines correctly', () => {
    // Story with localized text containing newline characters
    const storyWithLocalizedNewlines: Story = {
      id: 'localized-newline-story',
      title: 'Localized Newline Story',
      category: 'bedtime',
      tag: '🌙 Bedtime',
      emoji: '🌙',
      isAvailable: true,
      pages: [
        {
          id: 'page1',
          pageNumber: 1,
          text: 'English text.\nMore English.',
          localizedText: {
            en: 'English text.\nMore English.',
            pl: 'Tekst polski.\nWięcej polskiego.',
            es: 'Texto español.\nMás español.',
          },
          backgroundImage: 'page1-bg.webp',
        },
      ],
    };

    const result = render(
      <StoryBookReader story={storyWithLocalizedNewlines} onExit={mockOnExit} skipCoverPage={true} />
    );
    expect(result).toBeTruthy();
    expect(() => result.toJSON()).not.toThrow();
  });
});
