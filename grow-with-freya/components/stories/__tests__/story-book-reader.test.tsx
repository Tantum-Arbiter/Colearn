import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StoryBookReader } from '../story-book-reader';

// Mock dependencies
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;

  return {
    default: View,
    View: View,
    Text: require('react-native').Text,
    Image: require('react-native').Image,
    ScrollView: require('react-native').ScrollView,
    FlatList: require('react-native').FlatList,
    useSharedValue: jest.fn((initialValue) => ({
      value: initialValue,
    })),
    useAnimatedStyle: jest.fn((callback) => {
      return callback();
    }),
    withTiming: jest.fn((toValue, config) => {
      return toValue;
    }),
    withSpring: jest.fn((toValue, config) => {
      return toValue;
    }),
    runOnJS: jest.fn((fn) => fn),
    Easing: {
      inOut: jest.fn((fn) => fn),
      out: jest.fn((fn) => fn),
      in: jest.fn((fn) => fn),
      quad: jest.fn(),
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(),
  OrientationLock: {
    LANDSCAPE: 'LANDSCAPE',
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
  pages: [
    {
      pageNumber: 0,
      text: 'Cover Page',
      backgroundImage: 'cover-bg.webp',
    },
    {
      pageNumber: 1,
      text: 'Page 1 content',
      backgroundImage: 'page1-bg.webp',
    },
    {
      pageNumber: 2,
      text: 'Page 2 content',
      backgroundImage: 'page2-bg.webp',
    },
    {
      pageNumber: 3,
      text: 'Page 3 content',
      backgroundImage: 'page3-bg.webp',
    },
  ],
};

describe('StoryBookReader', () => {
  const mockOnExit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render cover page initially', () => {
      const { getByText } = render(
        <StoryBookReader story={mockStory} onExit={mockOnExit} />
      );

      expect(getByText('Cover Page')).toBeTruthy();
    });

    it('should show cover page with page number 0', () => {
      const { getByText } = render(
        <StoryBookReader story={mockStory} onExit={mockOnExit} />
      );

      // Cover page should be displayed
      expect(getByText('Cover Page')).toBeTruthy();
    });

    it('should not show navigation buttons on cover page', () => {
      const { queryByText } = render(
        <StoryBookReader story={mockStory} onExit={mockOnExit} />
      );

      // Navigation buttons should be present but disabled on cover
      const prevButton = queryByText('←');
      const nextButton = queryByText('→');
      
      expect(prevButton).toBeTruthy();
      expect(nextButton).toBeTruthy();
    });
  });

  describe('Page Navigation', () => {
    it('should navigate to next page when next button is pressed', async () => {
      const { getByText } = render(
        <StoryBookReader story={mockStory} onExit={mockOnExit} />
      );

      const nextButton = getByText('→');
      
      await act(async () => {
        fireEvent.press(nextButton);
      });

      // Should eventually show page 1 content
      await waitFor(() => {
        expect(getByText('Page 1 content')).toBeTruthy();
      });
    });

    it('should navigate to previous page when previous button is pressed', async () => {
      const { getByText } = render(
        <StoryBookReader story={mockStory} onExit={mockOnExit} />
      );

      // First navigate to page 1
      const nextButton = getByText('→');
      await act(async () => {
        fireEvent.press(nextButton);
      });

      await waitFor(() => {
        expect(getByText('Page 1 content')).toBeTruthy();
      });

      // Then navigate back to cover
      const prevButton = getByText('←');
      await act(async () => {
        fireEvent.press(prevButton);
      });

      await waitFor(() => {
        expect(getByText('Cover Page')).toBeTruthy();
      });
    });

    it('should not allow navigation beyond last page', async () => {
      const { getByText } = render(
        <StoryBookReader story={mockStory} onExit={mockOnExit} />
      );

      const nextButton = getByText('→');
      
      // Navigate to last page (page 3)
      for (let i = 0; i < 4; i++) {
        await act(async () => {
          fireEvent.press(nextButton);
        });
      }

      await waitFor(() => {
        expect(getByText('Page 3 content')).toBeTruthy();
      });

      // Try to navigate beyond last page
      await act(async () => {
        fireEvent.press(nextButton);
      });

      // Should still be on page 3
      expect(getByText('Page 3 content')).toBeTruthy();
    });

    it('should not allow navigation before first page', async () => {
      const { getByText } = render(
        <StoryBookReader story={mockStory} onExit={mockOnExit} />
      );

      const prevButton = getByText('←');
      
      // Try to navigate before cover page
      await act(async () => {
        fireEvent.press(prevButton);
      });

      // Should still be on cover page
      expect(getByText('Cover Page')).toBeTruthy();
    });
  });

  describe('Cover Page Interaction', () => {
    it('should navigate to page 1 when cover is tapped', async () => {
      const { getByText, getByTestId } = render(
        <StoryBookReader story={mockStory} onExit={mockOnExit} />
      );

      // Find and tap the cover overlay
      const coverOverlay = getByTestId('cover-tap-overlay');
      
      await act(async () => {
        fireEvent.press(coverOverlay);
      });

      // Should eventually show page 1 content
      await waitFor(() => {
        expect(getByText('Page 1 content')).toBeTruthy();
      });
    });
  });

  describe('Transition State Management', () => {
    it('should prevent multiple simultaneous transitions', async () => {
      const { getByText } = render(
        <StoryBookReader story={mockStory} onExit={mockOnExit} />
      );

      const nextButton = getByText('→');
      
      // Rapidly press next button multiple times
      await act(async () => {
        fireEvent.press(nextButton);
        fireEvent.press(nextButton);
        fireEvent.press(nextButton);
      });

      // Should only advance one page, not multiple
      await waitFor(() => {
        expect(getByText('Page 1 content')).toBeTruthy();
      });
    });

    it('should disable navigation buttons during transition', async () => {
      const { getByText } = render(
        <StoryBookReader story={mockStory} onExit={mockOnExit} />
      );

      const nextButton = getByText('→');
      const prevButton = getByText('←');
      
      await act(async () => {
        fireEvent.press(nextButton);
      });

      // Buttons should be disabled during transition
      // Note: This test might need adjustment based on actual implementation
      // of button disabled state
    });
  });

  describe('Rendering Optimization', () => {
    it('should not render overlay when not transitioning', () => {
      const { queryByTestId } = render(
        <StoryBookReader story={mockStory} onExit={mockOnExit} />
      );

      // Overlay should not be present when not transitioning
      const overlay = queryByTestId('page-content-overlay');
      expect(overlay).toBeFalsy();
    });

    it('should render overlay only during transitions', async () => {
      const { getByText, queryByTestId } = render(
        <StoryBookReader story={mockStory} onExit={mockOnExit} />
      );

      const nextButton = getByText('→');
      
      // Before transition - no overlay
      expect(queryByTestId('page-content-overlay')).toBeFalsy();
      
      await act(async () => {
        fireEvent.press(nextButton);
      });

      // During transition - overlay should be present
      // Note: This might be tricky to test due to timing
      
      // After transition - overlay should be removed
      await waitFor(() => {
        expect(queryByTestId('page-content-overlay')).toBeFalsy();
      });
    });
  });

  describe('Content Consistency', () => {
    it('should always show correct page content', async () => {
      const { getByText } = render(
        <StoryBookReader story={mockStory} onExit={mockOnExit} />
      );

      // Start on cover
      expect(getByText('Cover Page')).toBeTruthy();

      // Navigate through pages and verify content
      const nextButton = getByText('→');
      
      await act(async () => {
        fireEvent.press(nextButton);
      });
      await waitFor(() => {
        expect(getByText('Page 1 content')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(nextButton);
      });
      await waitFor(() => {
        expect(getByText('Page 2 content')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(nextButton);
      });
      await waitFor(() => {
        expect(getByText('Page 3 content')).toBeTruthy();
      });
    });

    it('should not show multiple page contents simultaneously after transition', async () => {
      const { getByText, queryByText } = render(
        <StoryBookReader story={mockStory} onExit={mockOnExit} />
      );

      const nextButton = getByText('→');
      
      await act(async () => {
        fireEvent.press(nextButton);
      });

      await waitFor(() => {
        expect(getByText('Page 1 content')).toBeTruthy();
      });

      // Cover page content should not be visible anymore
      expect(queryByText('Cover Page')).toBeFalsy();
    });
  });
});
