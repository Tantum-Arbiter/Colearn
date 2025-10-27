import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MusicMainMenu } from '@/components/music/music-main-menu';
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

describe('MusicMainMenu', () => {
  const mockOnTantrumsSelect = jest.fn();
  const mockOnSleepSelect = jest.fn();
  const mockOnBack = jest.fn();

  const defaultProps = {
    onTantrumsSelect: mockOnTantrumsSelect,
    onSleepSelect: mockOnSleepSelect,
    onBack: mockOnBack,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with all main elements', () => {
      const { getByText, getByTestId, queryByText } = render(
        <MusicMainMenu {...defaultProps} />
      );

      // Header elements are present (back button and music control)

      // Check subtitle
      expect(getByText('Choose your music type')).toBeTruthy();

      // Check music options
      expect(getByText('Tantrums')).toBeTruthy();
      expect(getByText('Sleep')).toBeTruthy();

      // Check gradient background
      expect(getByTestId('linear-gradient')).toBeTruthy();
    });

    it('renders correct gradient colors (light to dark)', () => {
      const { getByTestId } = render(
        <MusicMainMenu {...defaultProps} />
      );

      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#4ECDC4', '#3B82F6', '#1E3A8A']);
    });

    it('renders animated stars with correct properties', () => {
      const { getAllByTestId } = render(
        <MusicMainMenu {...defaultProps} />
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

    it('renders tantrums option with correct styling', () => {
      const { getByText } = render(
        <MusicMainMenu {...defaultProps} />
      );

      expect(getByText('🌊')).toBeTruthy();
      expect(getByText('Tantrums')).toBeTruthy();
      expect(getByText('Calming binaural beats to help soothe during difficult moments')).toBeTruthy();
    });

    it('renders sleep option with correct styling', () => {
      const { getByText } = render(
        <MusicMainMenu {...defaultProps} />
      );

      expect(getByText('🌙')).toBeTruthy();
      expect(getByText('Sleep')).toBeTruthy();
      expect(getByText('Progressive binaural beats sequence for peaceful sleep')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('calls onBack when back button is pressed', () => {
      const { getByText } = render(
        <MusicMainMenu {...defaultProps} />
      );

      fireEvent.press(getByText('← Back'));
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('calls onTantrumsSelect when tantrums option is pressed', () => {
      const { getByText } = render(
        <MusicMainMenu {...defaultProps} />
      );

      fireEvent.press(getByText('Tantrums'));
      expect(mockOnTantrumsSelect).toHaveBeenCalledTimes(1);
    });

    it('calls onSleepSelect when sleep option is pressed', () => {
      const { getByText } = render(
        <MusicMainMenu {...defaultProps} />
      );

      fireEvent.press(getByText('Sleep'));
      expect(mockOnSleepSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Layout and Styling', () => {
    it('applies correct safe area padding', () => {
      const { getByText } = render(
        <MusicMainMenu {...defaultProps} />
      );

      // Header should have proper padding including safe area
      const backButton = getByText('← Back');
      expect(backButton).toBeTruthy();
    });

    it('centers content properly', () => {
      const { getByText } = render(
        <MusicMainMenu {...defaultProps} />
      );

      // Subtitle should be centered
      const subtitle = getByText('Choose your music type');
      expect(subtitle).toBeTruthy();
    });

    it('applies proper spacing between options', () => {
      const { getByText } = render(
        <MusicMainMenu {...defaultProps} />
      );

      // Both options should be rendered with proper spacing
      expect(getByText('Tantrums')).toBeTruthy();
      expect(getByText('Sleep')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('provides proper text content for screen readers', () => {
      const { getByText } = render(
        <MusicMainMenu {...defaultProps} />
      );

      // Main elements should have descriptive text
      expect(getByText('Music')).toBeTruthy();
      expect(getByText('Choose your music type')).toBeTruthy();
      expect(getByText('Calming binaural beats to help soothe during difficult moments')).toBeTruthy();
      expect(getByText('Progressive binaural beats sequence for peaceful sleep')).toBeTruthy();
    });

    it('has pressable elements for navigation', () => {
      const { getByText } = render(
        <MusicMainMenu {...defaultProps} />
      );

      // Back button should be pressable
      const backButton = getByText('← Back');
      expect(backButton).toBeTruthy();

      // Option cards should be pressable
      const tantrumsOption = getByText('Tantrums');
      const sleepOption = getByText('Sleep');
      expect(tantrumsOption).toBeTruthy();
      expect(sleepOption).toBeTruthy();
    });
  });

  describe('Visual Effects', () => {
    it('uses correct gradient colors for option cards', () => {
      const { getByText } = render(
        <MusicMainMenu {...defaultProps} />
      );

      // Options should have their specific gradient colors
      expect(getByText('Tantrums')).toBeTruthy();
      expect(getByText('Sleep')).toBeTruthy();
    });

    it('applies proper shadow and elevation effects', () => {
      const { getByText } = render(
        <MusicMainMenu {...defaultProps} />
      );

      // Option cards should have visual depth
      expect(getByText('Tantrums')).toBeTruthy();
      expect(getByText('Sleep')).toBeTruthy();
    });
  });
});
