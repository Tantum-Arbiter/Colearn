import React from 'react';
import { render } from '@testing-library/react-native';
import { MainMenu } from '@/components/main-menu';
import { DefaultPage } from '@/components/default-page';
import { StorySelectionScreen } from '@/components/stories/story-selection-screen';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { renderWithProviders } from '@/__tests__/utils/test-wrapper';

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

// Mock dependencies
jest.mock('@/contexts/story-transition-context', () => ({
  useStoryTransition: () => ({
    startTransition: jest.fn(),
  }),
}));

jest.mock('@/store/app-store', () => ({
  useAppStore: () => ({
    requestReturnToMainMenu: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    useSharedValue: (initial: any) => ({ value: initial }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (value: any) => value,
    withRepeat: (value: any) => value,
    Easing: { linear: 'linear' },
    default: {
      View,
    },
  };
});

describe('Cross-Page Star Consistency', () => {
  const mockOnNavigate = jest.fn();
  const mockOnBack = jest.fn();
  const mockOnStorySelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to extract star components from any page
  const getStarComponents = (getAllByType: any) => {
    const allViews = getAllByType('RCTView');
    return allViews.filter((view: any) => {
      const styles = view.props?.style || [];
      return styles.some((style: any) => 
        style && 
        typeof style === 'object' && 
        style.position === 'absolute' &&
        style.backgroundColor === 'white' &&
        style.width === VISUAL_EFFECTS.STAR_SIZE &&
        style.height === VISUAL_EFFECTS.STAR_SIZE
      );
    });
  };

  // Helper function to validate star properties
  const validateStarProperties = (starComponents: any[]) => {
    expect(starComponents.length).toBe(VISUAL_EFFECTS.STAR_COUNT);

    starComponents.forEach(star => {
      const styles = star.props?.style || [];
      
      // Check for required positioning
      const hasPositioning = styles.some((style: any) => 
        style && 
        typeof style === 'object' && 
        typeof style.left === 'number' && 
        typeof style.top === 'number'
      );
      expect(hasPositioning).toBe(true);

      // Check for opacity
      const hasOpacity = styles.some((style: any) => 
        style && 
        typeof style === 'object' && 
        typeof style.opacity === 'number' &&
        style.opacity > 0 && 
        style.opacity <= 1
      );
      expect(hasOpacity).toBe(true);

      // Check for correct border radius
      const hasCorrectBorderRadius = styles.some((style: any) => 
        style && 
        typeof style === 'object' && 
        style.borderRadius === VISUAL_EFFECTS.STAR_BORDER_RADIUS
      );
      expect(hasCorrectBorderRadius).toBe(true);
    });
  };

  it('should render consistent stars across MainMenu', () => {
    const { UNSAFE_getAllByType } = renderWithProviders(
      <MainMenu onNavigate={mockOnNavigate} />
    );

    const starComponents = getStarComponents(UNSAFE_getAllByType);
    validateStarProperties(starComponents);
  });

  it('should render consistent stars across DefaultPage', () => {
    const { UNSAFE_getAllByType } = renderWithProviders(
      <DefaultPage
        icon="stories-icon"
        title="Stories"
        onBack={mockOnBack}
      />
    );

    const starComponents = getStarComponents(UNSAFE_getAllByType);
    validateStarProperties(starComponents);
  });

  it('should render consistent stars across StorySelectionScreen', () => {
    const { UNSAFE_getAllByType } = renderWithProviders(
      <StorySelectionScreen onStorySelect={mockOnStorySelect} />
    );

    const starComponents = getStarComponents(UNSAFE_getAllByType);
    validateStarProperties(starComponents);
  });

  it('should have identical star count across all pages', () => {
    // Render all three pages
    const mainMenu = renderWithProviders(<MainMenu onNavigate={mockOnNavigate} />);
    const defaultPage = renderWithProviders(<DefaultPage icon="stories-icon" title="Stories" onBack={mockOnBack} />);
    const storySelection = renderWithProviders(<StorySelectionScreen onStorySelect={mockOnStorySelect} />);

    // Get star counts from each page
    const mainMenuStars = getStarComponents(mainMenu.UNSAFE_getAllByType);
    const defaultPageStars = getStarComponents(defaultPage.UNSAFE_getAllByType);
    const storySelectionStars = getStarComponents(storySelection.UNSAFE_getAllByType);

    // All pages should have the same number of stars
    expect(mainMenuStars.length).toBe(VISUAL_EFFECTS.STAR_COUNT);
    expect(defaultPageStars.length).toBe(VISUAL_EFFECTS.STAR_COUNT);
    expect(storySelectionStars.length).toBe(VISUAL_EFFECTS.STAR_COUNT);

    // All should be equal to each other
    expect(mainMenuStars.length).toBe(defaultPageStars.length);
    expect(defaultPageStars.length).toBe(storySelectionStars.length);
  });

  it('should have consistent star styling across all pages', () => {
    // Render all three pages
    const mainMenu = renderWithProviders(<MainMenu onNavigate={mockOnNavigate} />);
    const defaultPage = renderWithProviders(<DefaultPage icon="stories-icon" title="Stories" onBack={mockOnBack} />);
    const storySelection = renderWithProviders(<StorySelectionScreen onStorySelect={mockOnStorySelect} />);

    // Get stars from each page
    const mainMenuStars = getStarComponents(mainMenu.UNSAFE_getAllByType);
    const defaultPageStars = getStarComponents(defaultPage.UNSAFE_getAllByType);
    const storySelectionStars = getStarComponents(storySelection.UNSAFE_getAllByType);

    // Helper to extract consistent style properties
    const getStarStyleProperties = (stars: any[]) => {
      return stars.map(star => {
        const styles = star.props?.style || [];
        const styleObj = styles.find((style: any) => 
          style && 
          typeof style === 'object' && 
          style.position === 'absolute'
        );
        return {
          width: styleObj?.width,
          height: styleObj?.height,
          backgroundColor: styleObj?.backgroundColor,
          borderRadius: styleObj?.borderRadius,
          position: styleObj?.position,
        };
      });
    };

    const mainMenuStyles = getStarStyleProperties(mainMenuStars);
    const defaultPageStyles = getStarStyleProperties(defaultPageStars);
    const storySelectionStyles = getStarStyleProperties(storySelectionStars);

    // All stars should have identical base styling
    const expectedStyle = {
      width: VISUAL_EFFECTS.STAR_SIZE,
      height: VISUAL_EFFECTS.STAR_SIZE,
      backgroundColor: 'white',
      borderRadius: VISUAL_EFFECTS.STAR_BORDER_RADIUS,
      position: 'absolute',
    };

    // Check each page has consistent styling
    mainMenuStyles.forEach(style => {
      expect(style).toEqual(expectedStyle);
    });

    defaultPageStyles.forEach(style => {
      expect(style).toEqual(expectedStyle);
    });

    storySelectionStyles.forEach(style => {
      expect(style).toEqual(expectedStyle);
    });
  });

  it('should use consistent key patterns across pages', () => {
    // Render all three pages
    const mainMenu = renderWithProviders(<MainMenu onNavigate={mockOnNavigate} />);
    const defaultPage = renderWithProviders(<DefaultPage icon="stories-icon" title="Stories" onBack={mockOnBack} />);
    const storySelection = renderWithProviders(<StorySelectionScreen onStorySelect={mockOnStorySelect} />);

    // Get stars from each page
    const mainMenuStars = getStarComponents(mainMenu.UNSAFE_getAllByType);
    const defaultPageStars = getStarComponents(defaultPage.UNSAFE_getAllByType);
    const storySelectionStars = getStarComponents(storySelection.UNSAFE_getAllByType);

    // Extract keys
    const mainMenuKeys = mainMenuStars.map(star => star.key).filter(key => key && key.startsWith('star-'));
    const defaultPageKeys = defaultPageStars.map(star => star.key).filter(key => key && key.startsWith('star-'));
    const storySelectionKeys = storySelectionStars.map(star => star.key).filter(key => key && key.startsWith('star-'));

    // All should have the same number of properly keyed stars
    expect(mainMenuKeys.length).toBe(VISUAL_EFFECTS.STAR_COUNT);
    expect(defaultPageKeys.length).toBe(VISUAL_EFFECTS.STAR_COUNT);
    expect(storySelectionKeys.length).toBe(VISUAL_EFFECTS.STAR_COUNT);

    // Keys should be unique within each page
    expect(new Set(mainMenuKeys).size).toBe(mainMenuKeys.length);
    expect(new Set(defaultPageKeys).size).toBe(defaultPageKeys.length);
    expect(new Set(storySelectionKeys).size).toBe(storySelectionKeys.length);
  });
});
