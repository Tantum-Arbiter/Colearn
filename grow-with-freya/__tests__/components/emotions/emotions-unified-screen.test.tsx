import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { EmotionsUnifiedScreen } from '@/components/emotions/emotions-unified-screen';
import { EMOTION_THEMES } from '@/data/emotion-themes';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';

// Mock dependencies

jest.mock('@/components/main-menu/utils', () => ({
  generateStarPositions: jest.fn(() => [
    { id: 0, left: 100, top: 50, opacity: 0.5 },
    { id: 1, left: 200, top: 100, opacity: 0.7 },
    { id: 2, left: 150, top: 150, opacity: 0.6 },
  ]),
}));

jest.mock('@/components/ui/music-control', () => ({
  MusicControl: ({ testID, ...props }: any) => {
    const { View } = require('react-native');
    return <View testID={testID || 'music-control'} {...props} />;
  },
}));

describe('EmotionsUnifiedScreen', () => {
  const mockOnStartGame = jest.fn();
  const mockOnBack = jest.fn();

  const defaultProps = {
    onStartGame: mockOnStartGame,
    onBack: mockOnBack,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with all main elements', () => {
      const renderResult = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      // Check that component renders without errors
      expect(renderResult).toBeTruthy();
    });

    it('renders all emotion themes', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      // Check all theme names are rendered
      Object.values(EMOTION_THEMES).forEach((theme) => {
        expect(getByText(theme.name)).toBeTruthy();
      });
    });

    it('renders correct gradient colors (light to dark)', () => {
      const { getByTestId } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#4ECDC4', '#3B82F6', '#1E3A8A']);
    });

    it('renders animated stars with correct properties', () => {
      const { getAllByTestId } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      // Should render stars based on mocked generateStarPositions
      const stars = getAllByTestId(/^star-/);
      expect(stars).toHaveLength(3);

      // Check star properties are applied correctly
      stars.forEach((star) => {
        const style = star.props.style;
        expect(style).toMatchObject({
          position: 'absolute',
          width: VISUAL_EFFECTS.STAR_SIZE,
          height: VISUAL_EFFECTS.STAR_SIZE,
          backgroundColor: 'white',
          borderRadius: VISUAL_EFFECTS.STAR_BORDER_RADIUS,
        });
      });
    });
  });

  describe('Theme Selection', () => {
    it('starts with emoji theme selected by default', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      // Check default theme description is shown
      const emojiTheme = EMOTION_THEMES.emoji;
      expect(getByText(emojiTheme.description)).toBeTruthy();
    });

    it('updates selected theme when theme card is pressed', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      // Press animals theme
      fireEvent.press(getByText('Animals'));

      // Check animals theme description is now shown
      const animalsTheme = EMOTION_THEMES.animals;
      expect(getByText(animalsTheme.description)).toBeTruthy();
    });

    it('updates start button text when theme changes', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      // Initially shows emoji theme
      expect(getByText('Express with Emoji!')).toBeTruthy();

      // Change to bear theme
      fireEvent.press(getByText('Bear'));

      // Button text should update
      expect(getByText('Express with Bear!')).toBeTruthy();
    });
  });

  describe('How to Play Section', () => {
    it('shows collapsed state initially', () => {
      const { getByText, queryByText } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      // Should show collapsed indicator
      expect(getByText('How to Play ▶')).toBeTruthy();

      // Instructions should not be visible
      expect(queryByText('Look at the picture')).toBeNull();
    });

    it('expands when how to play header is pressed', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      // Press the how to play header
      fireEvent.press(getByText('How to Play ▶'));

      // Should show expanded indicator
      expect(getByText('How to Play ▼')).toBeTruthy();

      // Instructions should be visible
      expect(getByText(/Look and react to the emotion together/)).toBeTruthy();
      expect(getByText(/Make the face - exaggerate and be silly/)).toBeTruthy();
      expect(getByText(/Take turns copying each other/)).toBeTruthy();
      expect(getByText(/Celebrate every attempt/)).toBeTruthy();
    });

    it('collapses when pressed again', () => {
      const { getByText, queryByText } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      // Expand first
      fireEvent.press(getByText('How to Play ▶'));
      expect(getByText('How to Play ▼')).toBeTruthy();

      // Collapse again
      fireEvent.press(getByText('How to Play ▼'));
      expect(getByText('How to Play ▶')).toBeTruthy();

      // Instructions should be hidden
      expect(queryByText('Look at the picture')).toBeNull();
    });
  });

  describe('User Interactions', () => {
    it('calls onBack when back button is pressed', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      fireEvent.press(getByText('← Back'));
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('calls onStartGame with selected theme when start button is pressed', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      // Change to animals theme
      fireEvent.press(getByText('Animals'));

      // Press start button
      fireEvent.press(getByText('Express with Animals!'));

      expect(mockOnStartGame).toHaveBeenCalledWith('animals');
    });

    it('calls onStartGame with default theme if no theme selected', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      // Press start button without changing theme
      fireEvent.press(getByText('Express with Emoji!'));

      expect(mockOnStartGame).toHaveBeenCalledWith('emoji');
    });
  });

  describe('Toddler-Friendly Features', () => {
    it('uses simple, toddler-friendly language in instructions', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      // Expand instructions
      fireEvent.press(getByText('How to Play ▶'));

      // Check for parent-engaging, encouraging language
      expect(getByText(/Look and react to the emotion together/)).toBeTruthy();
      expect(getByText(/Make the face - exaggerate and be silly/)).toBeTruthy();
      expect(getByText(/Take turns copying each other/)).toBeTruthy();
      expect(getByText(/Celebrate every attempt/)).toBeTruthy();
    });

    it('has clean button text without emojis', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      const startButton = getByText('Express with Emoji!');
      expect(startButton.children[0]).not.toMatch(/🎮/);
    });
  });

  describe('Accessibility', () => {
    it('provides proper text content for screen readers', () => {
      const { getByText } = render(
        <EmotionsUnifiedScreen {...defaultProps} />
      );

      // Main elements should have descriptive text
      expect(getByText('Express Yourself!')).toBeTruthy();
      expect(getByText('Choose your style and learn about emotions')).toBeTruthy();
      expect(getByText('Pick Your Style')).toBeTruthy();
    });
  });
});
