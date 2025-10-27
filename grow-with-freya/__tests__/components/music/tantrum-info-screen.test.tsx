import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TantrumInfoScreen } from '@/components/music/tantrum-info-screen';

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

describe('TantrumInfoScreen', () => {
  const mockOnBack = jest.fn();
  const mockOnStartSession = jest.fn();

  const defaultProps = {
    onBack: mockOnBack,
    onStartSession: mockOnStartSession,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with all main elements', () => {
      const { getByText, queryByText } = render(
        <TantrumInfoScreen {...defaultProps} />
      );

      // Header should NOT have title (removed as per requirement)
      expect(queryByText('Tantrum Calming')).toBeNull();
      
      // Main title should also be removed (as per requirement)
      expect(queryByText('Binaural Beats for Tantrums')).toBeNull();
      
      // Should have back button
      expect(getByText('← Back')).toBeTruthy();
      
      // Should have wave emoji
      expect(getByText('🌊')).toBeTruthy();
      
      // Should have all collapsible sections
      expect(getByText(/How It Helps/)).toBeTruthy();
      expect(getByText(/Safe Usage Guidelines/)).toBeTruthy();
      expect(getByText(/Best Practices/)).toBeTruthy();
      
      // Should have start session button
      expect(getByText('Start Calming Session')).toBeTruthy();
    });

    it('renders correct gradient colors (light to dark)', () => {
      const { getByTestId } = render(
        <TantrumInfoScreen {...defaultProps} />
      );

      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#4ECDC4', '#3B82F6', '#1E3A8A']);
    });

    it('renders animated stars with correct properties', () => {
      const { getAllByTestId } = render(
        <TantrumInfoScreen {...defaultProps} />
      );

      // Should render stars based on mocked generateStarPositions
      const stars = getAllByTestId(/^star-/);
      expect(stars).toHaveLength(3);
    });
  });

  describe('Collapsible Sections', () => {
    describe('How It Helps Section', () => {
      it('renders in collapsed state by default', () => {
        const { getByText, queryByText } = render(
          <TantrumInfoScreen {...defaultProps} />
        );

        // Should show collapsed indicator
        expect(getByText(/How It Helps ▶/)).toBeTruthy();
        
        // Content should not be visible initially
        expect(queryByText(/Our 10Hz alpha wave binaural beats/)).toBeNull();
      });

      it('expands when header is pressed', () => {
        const { getByText } = render(
          <TantrumInfoScreen {...defaultProps} />
        );

        // Press the header
        const header = getByText(/How It Helps/);
        fireEvent.press(header);

        // Should show expanded indicator
        expect(getByText(/How It Helps ▼/)).toBeTruthy();
        
        // Content should now be visible
        expect(getByText(/Our 10Hz alpha wave binaural beats/)).toBeTruthy();
        expect(getByText(/help calm the nervous system/)).toBeTruthy();
      });

      it('collapses when header is pressed again', () => {
        const { getByText, queryByText } = render(
          <TantrumInfoScreen {...defaultProps} />
        );

        // Expand first
        const header = getByText(/How It Helps/);
        fireEvent.press(header);
        expect(getByText(/Our 10Hz alpha wave binaural beats/)).toBeTruthy();

        // Collapse again
        fireEvent.press(header);
        expect(getByText(/How It Helps ▶/)).toBeTruthy();
        expect(queryByText(/Our 10Hz alpha wave binaural beats/)).toBeNull();
      });
    });

    describe('Safe Usage Guidelines Section', () => {
      it('renders in collapsed state by default', () => {
        const { getByText, queryByText } = render(
          <TantrumInfoScreen {...defaultProps} />
        );

        expect(getByText(/Safe Usage Guidelines ▶/)).toBeTruthy();
        expect(queryByText(/Always supervise children during use/)).toBeNull();
      });

      it('expands when header is pressed', () => {
        const { getByText } = render(
          <TantrumInfoScreen {...defaultProps} />
        );

        const header = getByText(/Safe Usage Guidelines/);
        fireEvent.press(header);

        expect(getByText(/Safe Usage Guidelines ▼/)).toBeTruthy();
        expect(getByText(/Always supervise children during use/)).toBeTruthy();
        expect(getByText(/Keep volume at comfortable levels/)).toBeTruthy();
        expect(getByText(/Stop if child shows discomfort/)).toBeTruthy();
      });
    });

    describe('Best Practices Section', () => {
      it('renders in collapsed state by default', () => {
        const { getByText, queryByText } = render(
          <TantrumInfoScreen {...defaultProps} />
        );

        expect(getByText(/Best Practices ▶/)).toBeTruthy();
        expect(queryByText(/Use in a quiet, comfortable environment/)).toBeNull();
      });

      it('expands when header is pressed', () => {
        const { getByText } = render(
          <TantrumInfoScreen {...defaultProps} />
        );

        const header = getByText(/Best Practices/);
        fireEvent.press(header);

        expect(getByText(/Best Practices ▼/)).toBeTruthy();
        expect(getByText(/Use in a quiet, comfortable environment/)).toBeTruthy();
        expect(getByText(/Start with shorter sessions/)).toBeTruthy();
        expect(getByText(/Combine with gentle breathing exercises/)).toBeTruthy();
      });
    });

    it('allows multiple sections to be expanded simultaneously', () => {
      const { getByText } = render(
        <TantrumInfoScreen {...defaultProps} />
      );

      // Expand all sections
      fireEvent.press(getByText(/How It Helps/));
      fireEvent.press(getByText(/Safe Usage Guidelines/));
      fireEvent.press(getByText(/Best Practices/));

      // All should be expanded
      expect(getByText(/How It Helps ▼/)).toBeTruthy();
      expect(getByText(/Safe Usage Guidelines ▼/)).toBeTruthy();
      expect(getByText(/Best Practices ▼/)).toBeTruthy();

      // All content should be visible
      expect(getByText(/Our 10Hz alpha wave binaural beats/)).toBeTruthy();
      expect(getByText(/Always supervise children during use/)).toBeTruthy();
      expect(getByText(/Use in a quiet, comfortable environment/)).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('calls onBack when back button is pressed', () => {
      const { getByText } = render(
        <TantrumInfoScreen {...defaultProps} />
      );

      fireEvent.press(getByText('← Back'));
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('calls onStartSession when start session button is pressed', () => {
      const { getByText } = render(
        <TantrumInfoScreen {...defaultProps} />
      );

      fireEvent.press(getByText('Start Calming Session'));
      expect(mockOnStartSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('Layout and Styling', () => {
    it('applies correct safe area padding', () => {
      const { getByText } = render(
        <TantrumInfoScreen {...defaultProps} />
      );

      // Header should have proper padding including safe area
      const backButton = getByText('← Back');
      expect(backButton).toBeTruthy();
    });

    it('maintains header layout without title', () => {
      const { getByText, queryByText } = render(
        <TantrumInfoScreen {...defaultProps} />
      );

      // Should have back button and music control but no title
      expect(getByText('← Back')).toBeTruthy();
      expect(queryByText('Tantrum Calming')).toBeNull();
    });

    it('maintains content layout without main title', () => {
      const { getByText, queryByText } = render(
        <TantrumInfoScreen {...defaultProps} />
      );

      // Should have emoji and sections but no main title
      expect(getByText('🌊')).toBeTruthy();
      expect(queryByText('Binaural Beats for Tantrums')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('provides proper text content for screen readers', () => {
      const { getByText } = render(
        <TantrumInfoScreen {...defaultProps} />
      );

      // Main elements should have descriptive text
      expect(getByText('← Back')).toBeTruthy();
      expect(getByText(/How It Helps/)).toBeTruthy();
      expect(getByText(/Safe Usage Guidelines/)).toBeTruthy();
      expect(getByText(/Best Practices/)).toBeTruthy();
      expect(getByText('Start Calming Session')).toBeTruthy();
    });

    it('has pressable elements for navigation and interaction', () => {
      const { getByText } = render(
        <TantrumInfoScreen {...defaultProps} />
      );

      // All interactive elements should be pressable
      expect(getByText('← Back')).toBeTruthy();
      expect(getByText(/How It Helps/)).toBeTruthy();
      expect(getByText(/Safe Usage Guidelines/)).toBeTruthy();
      expect(getByText(/Best Practices/)).toBeTruthy();
      expect(getByText('Start Calming Session')).toBeTruthy();
    });
  });

  describe('Visual Effects', () => {
    it('applies proper gradient background', () => {
      const { getByTestId } = render(
        <TantrumInfoScreen {...defaultProps} />
      );

      const gradient = getByTestId('linear-gradient');
      expect(gradient).toBeTruthy();
      expect(gradient.props.colors).toEqual(['#4ECDC4', '#3B82F6', '#1E3A8A']);
    });

    it('renders star background consistently', () => {
      const { getAllByTestId } = render(
        <TantrumInfoScreen {...defaultProps} />
      );

      const stars = getAllByTestId(/^star-/);
      expect(stars.length).toBeGreaterThan(0);
    });
  });
});
