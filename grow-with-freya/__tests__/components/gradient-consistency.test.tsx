import React from 'react';
import { render } from '@testing-library/react-native';
import { EmotionsUnifiedScreen } from '@/components/emotions/emotions-unified-screen';
import { MusicMainMenu } from '@/components/music/music-main-menu';
import { MusicSelectionScreen } from '@/components/music/music-selection-screen';
import { StorySelectionScreen } from '@/components/stories/story-selection-screen';

// Mock dependencies

jest.mock('@/components/main-menu/utils', () => ({
  generateStarPositions: jest.fn(() => [
    { id: 0, left: 100, top: 50, opacity: 0.5 },
    { id: 1, left: 200, top: 100, opacity: 0.7 },
  ]),
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

describe('Gradient Consistency Across Submenus', () => {
  const EXPECTED_GRADIENT = ['#4ECDC4', '#3B82F6', '#1E3A8A'];

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

  describe('Light-to-Dark Gradient Direction', () => {
    it('emotions unified screen uses correct gradient direction', () => {
      const { getByTestId } = render(
        <EmotionsUnifiedScreen 
          onStartGame={mockProps.onStartGame}
          onBack={mockProps.onBack}
        />
      );

      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(EXPECTED_GRADIENT);
    });

    it('music main menu uses correct gradient direction', () => {
      const { getByTestId } = render(
        <MusicMainMenu 
          onTantrumsSelect={mockProps.onTantrumsSelect}
          onSleepSelect={mockProps.onSleepSelect}
          onBack={mockProps.onBack}
        />
      );

      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(EXPECTED_GRADIENT);
    });

    it('music selection screen uses correct gradient direction', () => {
      const { getByTestId } = render(
        <MusicSelectionScreen 
          onPlaylistSelect={mockProps.onPlaylistSelect}
          onTrackSelect={mockProps.onTrackSelect}
          onBack={mockProps.onBack}
        />
      );

      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(EXPECTED_GRADIENT);
    });

    it('story selection screen uses correct gradient direction', () => {
      const { getByTestId } = render(
        <StorySelectionScreen 
          onBackToMenu={mockProps.onBackToMenu}
        />
      );

      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(EXPECTED_GRADIENT);
    });
  });

  describe('Gradient Color Validation', () => {
    it('all submenus start with light turquoise color', () => {
      const screens = [
        <EmotionsUnifiedScreen onStartGame={mockProps.onStartGame} onBack={mockProps.onBack} />,
        <MusicMainMenu onTantrumsSelect={mockProps.onTantrumsSelect} onSleepSelect={mockProps.onSleepSelect} onBack={mockProps.onBack} />,
        <MusicSelectionScreen onPlaylistSelect={mockProps.onPlaylistSelect} onTrackSelect={mockProps.onTrackSelect} onBack={mockProps.onBack} />,
        <StorySelectionScreen onBackToMenu={mockProps.onBackToMenu} />,
      ];

      screens.forEach((screen) => {
        const { getByTestId } = render(screen);
        const gradient = getByTestId('linear-gradient');
        expect(gradient.props.colors[0]).toBe('#4ECDC4'); // Light turquoise at top
      });
    });

    it('all submenus end with dark blue color', () => {
      const screens = [
        <EmotionsUnifiedScreen onStartGame={mockProps.onStartGame} onBack={mockProps.onBack} />,
        <MusicMainMenu onTantrumsSelect={mockProps.onTantrumsSelect} onSleepSelect={mockProps.onSleepSelect} onBack={mockProps.onBack} />,
        <MusicSelectionScreen onPlaylistSelect={mockProps.onPlaylistSelect} onTrackSelect={mockProps.onTrackSelect} onBack={mockProps.onBack} />,
        <StorySelectionScreen onBackToMenu={mockProps.onBackToMenu} />,
      ];

      screens.forEach((screen) => {
        const { getByTestId } = render(screen);
        const gradient = getByTestId('linear-gradient');
        const colors = gradient.props.colors;
        expect(colors[colors.length - 1]).toBe('#1E3A8A'); // Dark blue at bottom
      });
    });

    it('all submenus use medium blue as transition color', () => {
      const screens = [
        <EmotionsUnifiedScreen onStartGame={mockProps.onStartGame} onBack={mockProps.onBack} />,
        <MusicMainMenu onTantrumsSelect={mockProps.onTantrumsSelect} onSleepSelect={mockProps.onSleepSelect} onBack={mockProps.onBack} />,
        <MusicSelectionScreen onPlaylistSelect={mockProps.onPlaylistSelect} onTrackSelect={mockProps.onTrackSelect} onBack={mockProps.onBack} />,
        <StorySelectionScreen onBackToMenu={mockProps.onBackToMenu} />,
      ];

      screens.forEach((screen) => {
        const { getByTestId } = render(screen);
        const gradient = getByTestId('linear-gradient');
        expect(gradient.props.colors[1]).toBe('#3B82F6'); // Medium blue in middle
      });
    });
  });

  describe('Visual Consistency Benefits', () => {
    it('ensures consistent header readability across all screens', () => {
      // Light background (#4ECDC4) at top ensures white text is readable
      const screens = [
        { component: <EmotionsUnifiedScreen onStartGame={mockProps.onStartGame} onBack={mockProps.onBack} />, title: 'Express Yourself!' },
        { component: <MusicMainMenu onTantrumsSelect={mockProps.onTantrumsSelect} onSleepSelect={mockProps.onSleepSelect} onBack={mockProps.onBack} />, title: 'Music' },
        { component: <StorySelectionScreen onBackToMenu={mockProps.onBackToMenu} />, title: 'Choose Your Adventure' },
      ];

      screens.forEach(({ component, title }) => {
        const { getByTestId, getByText } = render(component);
        const gradient = getByTestId('linear-gradient');
        
        // Light color at top for header readability
        expect(gradient.props.colors[0]).toBe('#4ECDC4');
        
        // Title should be rendered (indicating good contrast)
        expect(getByText(title)).toBeTruthy();
      });
    });

    it('provides natural top-to-bottom visual flow', () => {
      const screens = [
        <EmotionsUnifiedScreen onStartGame={mockProps.onStartGame} onBack={mockProps.onBack} />,
        <MusicMainMenu onTantrumsSelect={mockProps.onTantrumsSelect} onSleepSelect={mockProps.onSleepSelect} onBack={mockProps.onBack} />,
        <MusicSelectionScreen onPlaylistSelect={mockProps.onPlaylistSelect} onTrackSelect={mockProps.onTrackSelect} onBack={mockProps.onBack} />,
        <StorySelectionScreen onBackToMenu={mockProps.onBackToMenu} />,
      ];

      screens.forEach((screen) => {
        const { getByTestId } = render(screen);
        const gradient = getByTestId('linear-gradient');
        const colors = gradient.props.colors;
        
        // Should progress from light to dark (natural reading flow)
        expect(colors).toEqual(['#4ECDC4', '#3B82F6', '#1E3A8A']);
      });
    });
  });

  describe('Brand Consistency', () => {
    it('maintains unified design language across all submenus', () => {
      const screens = [
        <EmotionsUnifiedScreen onStartGame={mockProps.onStartGame} onBack={mockProps.onBack} />,
        <MusicMainMenu onTantrumsSelect={mockProps.onTantrumsSelect} onSleepSelect={mockProps.onSleepSelect} onBack={mockProps.onBack} />,
        <MusicSelectionScreen onPlaylistSelect={mockProps.onPlaylistSelect} onTrackSelect={mockProps.onTrackSelect} onBack={mockProps.onBack} />,
        <StorySelectionScreen onBackToMenu={mockProps.onBackToMenu} />,
      ];

      // All screens should use identical gradient
      const gradients = screens.map((screen) => {
        const { getByTestId } = render(screen);
        return getByTestId('linear-gradient').props.colors;
      });

      // All gradients should be identical
      gradients.forEach((gradient) => {
        expect(gradient).toEqual(EXPECTED_GRADIENT);
      });
    });

    it('creates seamless navigation experience', () => {
      // When users navigate between submenus, they should see consistent visual cues
      const screens = [
        <EmotionsUnifiedScreen onStartGame={mockProps.onStartGame} onBack={mockProps.onBack} />,
        <MusicMainMenu onTantrumsSelect={mockProps.onTantrumsSelect} onSleepSelect={mockProps.onSleepSelect} onBack={mockProps.onBack} />,
        <StorySelectionScreen onBackToMenu={mockProps.onBackToMenu} />,
      ];

      screens.forEach((screen) => {
        const { getByTestId, getByText } = render(screen);
        
        // Consistent gradient
        const gradient = getByTestId('linear-gradient');
        expect(gradient.props.colors).toEqual(EXPECTED_GRADIENT);
        
        // Consistent back button styling
        expect(getByText('← Back')).toBeTruthy();
      });
    });
  });
});
