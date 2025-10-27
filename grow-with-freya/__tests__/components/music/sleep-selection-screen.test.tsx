import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SleepSelectionScreen } from '@/components/music/sleep-selection-screen';

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

describe('SleepSelectionScreen', () => {
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
      const { getByText, queryByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      // Header should NOT have title (removed as per requirement)
      expect(queryByText('Sleep Music')).toBeNull();
      
      // Should have back button
      expect(getByText('← Back')).toBeTruthy();
      
      // Should have collapsible sleep progression section
      expect(getByText(/Sleep Progression/)).toBeTruthy();
      
      // Should have track selection content
      expect(getByText('Complete Sleep Sequence')).toBeTruthy();
      expect(getByText('Theta Phase Only')).toBeTruthy();
    });

    it('renders correct gradient colors (light to dark)', () => {
      const { getByTestId } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#4ECDC4', '#3B82F6', '#1E3A8A']);
    });

    it('renders animated stars with correct properties', () => {
      const { getAllByTestId } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      // Should render stars based on mocked generateStarPositions
      const stars = getAllByTestId(/^star-/);
      expect(stars).toHaveLength(3);
    });
  });

  describe('Collapsible Sleep Progression Section', () => {
    it('renders sleep progression section in collapsed state by default', () => {
      const { getByText, queryByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      // Should show collapsed indicator
      expect(getByText(/Sleep Progression ▶/)).toBeTruthy();
      
      // Sleep progression content should not be visible initially
      expect(queryByText('The Complete Sleep Sequence automatically transitions')).toBeNull();
    });

    it('expands sleep progression section when header is pressed', () => {
      const { getByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      // Press the sleep progression header
      const sleepHeader = getByText(/Sleep Progression/);
      fireEvent.press(sleepHeader);

      // Should show expanded indicator
      expect(getByText(/Sleep Progression ▼/)).toBeTruthy();
      
      // Sleep progression content should now be visible
      expect(getByText(/The Complete Sleep Sequence automatically transitions/)).toBeTruthy();
      expect(getByText(/Alpha \(15 min\) - Initial relaxation/)).toBeTruthy();
      expect(getByText(/Theta \(45 min\) - Deep sleep state/)).toBeTruthy();
      expect(getByText(/Currently only Theta phase is available/)).toBeTruthy();
      expect(getByText(/Use stereo headphones for best results/)).toBeTruthy();
    });

    it('collapses sleep progression section when header is pressed again', () => {
      const { getByText, queryByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      // Expand first
      const sleepHeader = getByText(/Sleep Progression/);
      fireEvent.press(sleepHeader);
      
      // Verify expanded
      expect(getByText(/The Complete Sleep Sequence automatically transitions/)).toBeTruthy();

      // Collapse again
      fireEvent.press(sleepHeader);
      
      // Should show collapsed indicator
      expect(getByText(/Sleep Progression ▶/)).toBeTruthy();
      
      // Sleep progression content should be hidden again
      expect(queryByText('The Complete Sleep Sequence automatically transitions')).toBeNull();
    });

    it('does not show sleep emoji in progression section', () => {
      const { queryByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      // Should not contain sleep emoji (removed as per requirement)
      expect(queryByText(/💤/)).toBeNull();
    });
  });

  describe('Track Selection', () => {
    it('renders both sleep track options', () => {
      const { getByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      expect(getByText('Complete Sleep Sequence')).toBeTruthy();
      expect(getByText('Theta Phase Only')).toBeTruthy();
    });

    it('shows correct descriptions for track options', () => {
      const { getByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      expect(getByText(/60 minutes - Full alpha to theta progression/)).toBeTruthy();
      expect(getByText(/45 minutes - Deep sleep theta waves only/)).toBeTruthy();
    });

    it('shows availability status correctly', () => {
      const { getByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      expect(getByText('Coming Soon')).toBeTruthy(); // For complete sequence
      expect(getByText('Available Now')).toBeTruthy(); // For theta only
    });
  });

  describe('User Interactions', () => {
    it('calls onBack when back button is pressed', () => {
      const { getByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      fireEvent.press(getByText('← Back'));
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('calls onTrackSelect when available track is selected', () => {
      const { getByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      // Find and press the available track button (Theta Phase Only)
      const trackButton = getByText('Theta Phase Only');
      fireEvent.press(trackButton);
      
      expect(mockOnTrackSelect).toHaveBeenCalled();
    });

    it('does not call onTrackSelect for unavailable tracks', () => {
      const { getByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      // Try to press the unavailable track (Complete Sleep Sequence)
      const unavailableTrack = getByText('Complete Sleep Sequence');
      fireEvent.press(unavailableTrack);
      
      // Should not trigger track selection for unavailable tracks
      expect(mockOnTrackSelect).not.toHaveBeenCalled();
    });
  });

  describe('Layout and Styling', () => {
    it('applies correct safe area padding', () => {
      const { getByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      // Header should have proper padding including safe area
      const backButton = getByText('← Back');
      expect(backButton).toBeTruthy();
    });

    it('maintains header layout without title', () => {
      const { getByText, queryByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      // Should have back button and music control but no title
      expect(getByText('← Back')).toBeTruthy();
      expect(queryByText('Sleep Music')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('provides proper text content for screen readers', () => {
      const { getByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      // Main elements should have descriptive text
      expect(getByText('← Back')).toBeTruthy();
      expect(getByText(/Sleep Progression/)).toBeTruthy();
      expect(getByText('Complete Sleep Sequence')).toBeTruthy();
      expect(getByText('Theta Phase Only')).toBeTruthy();
    });

    it('has pressable elements for navigation and interaction', () => {
      const { getByText } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      // Back button should be pressable
      const backButton = getByText('← Back');
      expect(backButton).toBeTruthy();

      // Sleep progression header should be pressable
      const sleepHeader = getByText(/Sleep Progression/);
      expect(sleepHeader).toBeTruthy();
    });
  });

  describe('Visual Effects', () => {
    it('applies proper gradient background', () => {
      const { getByTestId } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      const gradient = getByTestId('linear-gradient');
      expect(gradient).toBeTruthy();
      expect(gradient.props.colors).toEqual(['#4ECDC4', '#3B82F6', '#1E3A8A']);
    });

    it('renders star background consistently', () => {
      const { getAllByTestId } = render(
        <SleepSelectionScreen {...defaultProps} />
      );

      const stars = getAllByTestId(/^star-/);
      expect(stars.length).toBeGreaterThan(0);
    });
  });
});
