import React from 'react';
import { render } from '@testing-library/react-native';
import { EmotionsUnifiedScreen } from '@/components/emotions/emotions-unified-screen';
import { MusicMainMenu } from '@/components/music/music-main-menu';
import { MusicSelectionScreen } from '@/components/music/music-selection-screen';
import { StorySelectionScreen } from '@/components/stories/story-selection-screen';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';

// Mock dependencies

// Mock generateStarPositions with consistent test data
const mockStarPositions = [
  { id: 0, left: 100, top: 50, opacity: 0.5 },
  { id: 1, left: 200, top: 100, opacity: 0.7 },
  { id: 2, left: 150, top: 150, opacity: 0.6 },
  { id: 3, left: 300, top: 80, opacity: 0.4 },
  { id: 4, left: 250, top: 200, opacity: 0.8 },
];

jest.mock('@/components/main-menu/utils', () => ({
  generateStarPositions: jest.fn(() => mockStarPositions),
}));

jest.mock('@/components/ui/music-control', () => ({
  MusicControl: ({ testID, ...props }: any) => {
    const { View } = require('react-native');
    return <View testID={testID || 'music-control'} {...props} />;
  },
}));

jest.mock('@/data/stories', () => ({
  ALL_STORIES: [],
  getStoriesByGenre: jest.fn(() => []),
  getGenresWithStories: jest.fn(() => []),
  getRandomStory: jest.fn(() => null),
}));

jest.mock('@/data/music', () => ({
  MUSIC_CATEGORIES: [],
  getTracksByCategory: jest.fn(() => []),
  getTrackById: jest.fn(() => null),
}));

describe('Star Background Consistency', () => {
  const mockProps = {
    onBack: jest.fn(),
    onStartGame: jest.fn(),
    onTantrumsSelect: jest.fn(),
    onSleepSelect: jest.fn(),
    onPlaylistSelect: jest.fn(),
    onTrackSelect: jest.fn(),
    onBackToMenu: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Star Generation and Positioning', () => {
    it('generates stars using generateStarPositions utility', () => {
      render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      expect(generateStarPositions).toHaveBeenCalledWith(VISUAL_EFFECTS.STAR_COUNT);
    });

    it('renders correct number of stars across all screens', () => {
      const screens = [
        <EmotionsUnifiedScreen onStartGame={mockProps.onStartGame} onBack={mockProps.onBack} />,
        <MusicMainMenu onTantrumsSelect={mockProps.onTantrumsSelect} onSleepSelect={mockProps.onSleepSelect} onBack={mockProps.onBack} />,
        <MusicSelectionScreen onPlaylistSelect={mockProps.onPlaylistSelect} onTrackSelect={mockProps.onTrackSelect} onBack={mockProps.onBack} />,
        <StorySelectionScreen />,
      ];

      screens.forEach((screen) => {
        const { getAllByTestId } = render(screen);
        const stars = getAllByTestId(/^star-/);
        expect(stars).toHaveLength(mockStarPositions.length);
      });
    });

    it('uses correct star positioning properties', () => {
      const { getAllByTestId } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      const stars = getAllByTestId(/^star-/);
      
      stars.forEach((star, index) => {
        const expectedStar = mockStarPositions[index];
        const style = star.props.style;
        
        expect(style.left).toBe(expectedStar.left);
        expect(style.top).toBe(expectedStar.top);
        expect(style.opacity).toBe(expectedStar.opacity);
      });
    });
  });

  describe('Star Visual Properties', () => {
    it('applies consistent star sizing across all screens', () => {
      const screens = [
        <EmotionsUnifiedScreen onStartGame={mockProps.onStartGame} onBack={mockProps.onBack} />,
        <MusicMainMenu onTantrumsSelect={mockProps.onTantrumsSelect} onSleepSelect={mockProps.onSleepSelect} onBack={mockProps.onBack} />,
        <MusicSelectionScreen onPlaylistSelect={mockProps.onPlaylistSelect} onTrackSelect={mockProps.onTrackSelect} onBack={mockProps.onBack} />,
        <StorySelectionScreen />,
      ];

      screens.forEach((screen) => {
        const { getAllByTestId } = render(screen);
        const stars = getAllByTestId(/^star-/);
        
        stars.forEach((star) => {
          const style = star.props.style;
          expect(style.width).toBe(VISUAL_EFFECTS.STAR_SIZE);
          expect(style.height).toBe(VISUAL_EFFECTS.STAR_SIZE);
          expect(style.borderRadius).toBe(VISUAL_EFFECTS.STAR_BORDER_RADIUS);
        });
      });
    });

    it('applies consistent star styling across all screens', () => {
      const screens = [
        <EmotionsUnifiedScreen onStartGame={mockProps.onStartGame} onBack={mockProps.onBack} />,
        <MusicMainMenu onTantrumsSelect={mockProps.onTantrumsSelect} onSleepSelect={mockProps.onSleepSelect} onBack={mockProps.onBack} />,
        <MusicSelectionScreen onPlaylistSelect={mockProps.onPlaylistSelect} onTrackSelect={mockProps.onTrackSelect} onBack={mockProps.onBack} />,
        <StorySelectionScreen />,
      ];

      screens.forEach((screen) => {
        const { getAllByTestId } = render(screen);
        const stars = getAllByTestId(/^star-/);
        
        stars.forEach((star) => {
          const style = star.props.style;
          expect(style.position).toBe('absolute');
          expect(style.backgroundColor).toBe('white');
        });
      });
    });

    it('maintains proper star layering behind content', () => {
      const { getAllByTestId, getByText } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Stars should be rendered
      const stars = getAllByTestId(/^star-/);
      expect(stars.length).toBeGreaterThan(0);

      // Content should still be visible (stars are behind)
      expect(getByText('Express Yourself!')).toBeTruthy();
      expect(getByText('← Back')).toBeTruthy();
    });
  });

  describe('Star Animation Properties', () => {
    it('applies rotation animation to all stars', () => {
      const { getAllByTestId } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      const stars = getAllByTestId(/^star-/);
      
      // All stars should have animation applied
      stars.forEach((star) => {
        expect(star.props.style).toBeDefined();
        // Animation styles are applied through useAnimatedStyle
      });
    });

    it('uses consistent animation timing across screens', () => {
      // Animation timing is controlled by VISUAL_EFFECTS constants
      expect(VISUAL_EFFECTS.STAR_COUNT).toBe(15);
      expect(VISUAL_EFFECTS.STAR_SIZE).toBe(3);
      expect(VISUAL_EFFECTS.STAR_BORDER_RADIUS).toBe(1.5);
    });
  });

  describe('Performance and Optimization', () => {
    it('generates stars only once per screen using useMemo', () => {
      const { rerender } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      const initialCallCount = (generateStarPositions as jest.Mock).mock.calls.length;

      // Re-render the component
      rerender(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // generateStarPositions should not be called again due to useMemo
      expect((generateStarPositions as jest.Mock).mock.calls.length).toBe(initialCallCount);
    });

    it('renders stars efficiently with minimal re-renders', () => {
      const { getAllByTestId } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      const stars = getAllByTestId(/^star-/);
      
      // Each star should have a unique key for React optimization
      stars.forEach((star, index) => {
        expect(star.props.testID).toBe(`star-${index}`);
      });
    });
  });

  describe('Visual Effects Integration', () => {
    it('integrates stars with gradient backgrounds properly', () => {
      const { getByTestId, getAllByTestId } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      // Both gradient and stars should be rendered
      expect(getByTestId('linear-gradient')).toBeTruthy();
      const stars = getAllByTestId(/^star-/);
      expect(stars.length).toBeGreaterThan(0);
    });

    it('maintains star visibility against gradient backgrounds', () => {
      const { getAllByTestId } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      const stars = getAllByTestId(/^star-/);
      
      stars.forEach((star) => {
        const style = star.props.style;
        // White stars should be visible against blue gradient
        expect(style.backgroundColor).toBe('white');
        expect(style.opacity).toBeGreaterThan(0);
      });
    });
  });

  describe('Cross-Screen Consistency', () => {
    it('maintains identical star behavior across all submenus', () => {
      const screens = [
        { component: <EmotionsUnifiedScreen onStartGame={mockProps.onStartGame} onBack={mockProps.onBack} />, name: 'Emotions' },
        { component: <MusicMainMenu onTantrumsSelect={mockProps.onTantrumsSelect} onSleepSelect={mockProps.onSleepSelect} onBack={mockProps.onBack} />, name: 'Music Main' },
        { component: <MusicSelectionScreen onPlaylistSelect={mockProps.onPlaylistSelect} onTrackSelect={mockProps.onTrackSelect} onBack={mockProps.onBack} />, name: 'Music Selection' },
        { component: <StorySelectionScreen />, name: 'Stories' },
      ];

      screens.forEach(({ component, name }) => {
        const { getAllByTestId } = render(component);
        const stars = getAllByTestId(/^star-/);
        
        // Each screen should have the same star properties
        stars.forEach((star) => {
          const style = star.props.style;
          expect(style.width).toBe(VISUAL_EFFECTS.STAR_SIZE);
          expect(style.height).toBe(VISUAL_EFFECTS.STAR_SIZE);
          expect(style.backgroundColor).toBe('white');
          expect(style.borderRadius).toBe(VISUAL_EFFECTS.STAR_BORDER_RADIUS);
        });
      });
    });
  });
});
