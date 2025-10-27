import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TantrumSelectionScreen } from '@/components/music/tantrum-selection-screen';

// Mock the visual effects
jest.mock('@/components/main-menu/constants', () => ({
  VISUAL_EFFECTS: {
    STAR_COUNT: 15,
    STAR_SIZE: 3,
    STAR_BORDER_RADIUS: 1.5,
    GRADIENT_COLORS: ['#1E3A8A', '#3B82F6', '#4ECDC4'],
  },
}));

jest.mock('@/components/main-menu/utils', () => ({
  generateStarPositions: jest.fn(() => [
    { id: 0, left: 10, top: 20, opacity: 0.5 },
    { id: 1, left: 50, top: 100, opacity: 0.7 },
    { id: 2, left: 80, top: 150, opacity: 0.6 },
  ]),
}));

// react-native-reanimated is mocked globally in jest.setup.js

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, testID, ...props }: any) => {
    const { View } = require('react-native');
    return <View testID={testID || 'linear-gradient'} {...props}>{children}</View>;
  },
}));

// Mock MusicControl component
jest.mock('@/components/ui/music-control', () => ({
  MusicControl: ({ testID, ...props }: any) => {
    const { View } = require('react-native');
    return <View testID={testID || 'music-control'} {...props} />;
  },
}));

describe('TantrumSelectionScreen', () => {
  const mockOnBack = jest.fn();
  const mockOnTrackSelect = jest.fn();

  const defaultProps = {
    onBack: mockOnBack,
    onTrackSelect: mockOnTrackSelect,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with all main elements', () => {
      const { queryByText } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      // Header should NOT have title (removed as per requirement)
      expect(queryByText('Tantrum Calming')).toBeNull();

      // Should have collapsible tips section (with arrow indicator)
      expect(queryByText('Tips for Best Results ▶')).toBeTruthy();

      // Should have track selection content
      expect(queryByText('Binaural Beats')).toBeTruthy();
    });

    it('renders correct gradient colors (light to dark)', () => {
      const { getByTestId } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#4ECDC4', '#3B82F6', '#1E3A8A']);
    });

    it('renders animated stars with correct properties', () => {
      const { getAllByTestId } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      // Should render stars based on mocked generateStarPositions
      const stars = getAllByTestId(/^star-/);
      expect(stars).toHaveLength(3);
    });
  });

  describe('Collapsible Tips Section', () => {
    it('renders tips section in collapsed state by default', () => {
      const { getByText, queryByText } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      // Should show collapsed indicator
      expect(getByText(/Tips for Best Results ▶/)).toBeTruthy();
      
      // Tips content should not be visible initially
      expect(queryByText('Use during the early stages of a tantrum')).toBeNull();
    });

    it('expands tips section when header is pressed', () => {
      const { getByText } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      // Press the tips header
      const tipsHeader = getByText(/Tips for Best Results/);
      fireEvent.press(tipsHeader);

      // Should show expanded indicator
      expect(getByText(/Tips for Best Results ▼/)).toBeTruthy();
      
      // Tips content should now be visible
      expect(getByText('Use during the early stages of a tantrum')).toBeTruthy();
      expect(getByText('Create a calm, comfortable environment')).toBeTruthy();
      expect(getByText('Stay with your child and breathe together')).toBeTruthy();
      expect(getByText('For binaural beats, use stereo headphones')).toBeTruthy();
      expect(getByText('Keep volume low and comfortable')).toBeTruthy();
    });

    it('collapses tips section when header is pressed again', () => {
      const { getByText, queryByText } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      // Expand first
      const tipsHeader = getByText(/Tips for Best Results/);
      fireEvent.press(tipsHeader);
      
      // Verify expanded
      expect(getByText('Use during the early stages of a tantrum')).toBeTruthy();

      // Collapse again
      fireEvent.press(tipsHeader);
      
      // Should show collapsed indicator
      expect(getByText(/Tips for Best Results ▶/)).toBeTruthy();
      
      // Tips content should be hidden again
      expect(queryByText('Use during the early stages of a tantrum')).toBeNull();
    });

    it('does not show light bulb emoji in tips section', () => {
      const { queryByText } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      // Should not contain light bulb emoji (removed as per requirement)
      expect(queryByText(/💡/)).toBeNull();
    });
  });

  describe('User Interactions', () => {
    it('renders interactive elements', () => {
      const { queryByText } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      // Should have interactive elements
      expect(queryByText(/Tips for Best Results/)).toBeTruthy();
      expect(queryByText('Binaural Beats')).toBeTruthy();
    });

    it('calls onTrackSelect when a track is selected', () => {
      const { queryByText } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      // Find and press a track button
      const trackButton = queryByText('Binaural Beats');
      if (trackButton) {
        fireEvent.press(trackButton);
        expect(mockOnTrackSelect).toHaveBeenCalled();
      }
    });
  });

  describe('Layout and Styling', () => {
    it('maintains header layout without title', () => {
      const { queryByText } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      // Should not have title (removed as per requirement)
      expect(queryByText('Tantrum Calming')).toBeNull();
    });

    it('renders main content areas', () => {
      const { queryByText } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      // Should have main content sections
      expect(queryByText(/Tips for Best Results/)).toBeTruthy();
      expect(queryByText('Binaural Beats')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('provides proper text content for screen readers', () => {
      const { queryByText } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      // Main elements should have descriptive text
      expect(queryByText(/Tips for Best Results/)).toBeTruthy();
      expect(queryByText('Binaural Beats')).toBeTruthy();
    });

    it('has interactive elements', () => {
      const { queryByText } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      // Should have interactive elements
      expect(queryByText(/Tips for Best Results/)).toBeTruthy();
      expect(queryByText('Binaural Beats')).toBeTruthy();
    });
  });

  describe('Visual Effects', () => {
    it('applies proper gradient background', () => {
      const { getByTestId } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      const gradient = getByTestId('linear-gradient');
      expect(gradient).toBeTruthy();
      expect(gradient.props.colors).toEqual(['#4ECDC4', '#3B82F6', '#1E3A8A']);
    });

    it('renders star background consistently', () => {
      const { getAllByTestId } = render(
        <TantrumSelectionScreen {...defaultProps} />
      );

      const stars = getAllByTestId(/^star-/);
      expect(stars.length).toBeGreaterThan(0);
    });
  });
});
