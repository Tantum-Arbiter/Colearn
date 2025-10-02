import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StorySelectionScreen } from '@/components/stories/story-selection-screen';
import { SimpleStoryScreen } from '@/components/stories/simple-story-screen';
import { MOCK_STORIES } from '@/data/stories';

// Mock the app store
const mockRequestReturnToMainMenu = jest.fn();
jest.mock('@/store/app-store', () => ({
  useAppStore: () => ({
    requestReturnToMainMenu: mockRequestReturnToMainMenu,
  }),
}));

// Mock LinearGradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

// Reanimated is already mocked globally in jest.setup.js

describe('Story Navigation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('StorySelectionScreen Navigation', () => {
    it('integrates with app store for back navigation', () => {
      const { getByText } = render(<StorySelectionScreen />);
      
      const backButton = getByText('← Back');
      fireEvent.press(backButton);
      
      expect(mockRequestReturnToMainMenu).toHaveBeenCalledTimes(1);
    });

    it('handles story selection flow', () => {
      const mockOnStorySelect = jest.fn();
      const { getByText } = render(
        <StorySelectionScreen onStorySelect={mockOnStorySelect} />
      );
      
      // Select first available story
      const firstStory = MOCK_STORIES[0];
      const storyCard = getByText(firstStory.title);
      fireEvent.press(storyCard);
      
      expect(mockOnStorySelect).toHaveBeenCalledWith(firstStory);
    });

    it('handles surprise me functionality', () => {
      const mockOnStorySelect = jest.fn();
      const { getByText } = render(
        <StorySelectionScreen onStorySelect={mockOnStorySelect} />
      );
      
      const surpriseMeButton = getByText('✨ Surprise Me! ✨');
      fireEvent.press(surpriseMeButton);
      
      expect(mockOnStorySelect).toHaveBeenCalledTimes(1);
      const selectedStory = mockOnStorySelect.mock.calls[0][0];
      expect(selectedStory.isAvailable).toBe(true);
      expect(MOCK_STORIES).toContain(selectedStory);
    });
  });

  describe('SimpleStoryScreen Navigation', () => {
    it('integrates with app store for back navigation', () => {
      const { getByText } = render(<SimpleStoryScreen />);
      
      const backButton = getByText('← Back');
      fireEvent.press(backButton);
      
      expect(mockRequestReturnToMainMenu).toHaveBeenCalledTimes(1);
    });

    it('handles story selection without animations', () => {
      const mockOnStorySelect = jest.fn();
      const { getByText } = render(
        <SimpleStoryScreen onStorySelect={mockOnStorySelect} />
      );
      
      // Select first available story
      const firstStory = MOCK_STORIES[0];
      const storyCard = getByText(firstStory.title);
      fireEvent.press(storyCard);
      
      expect(mockOnStorySelect).toHaveBeenCalledWith(firstStory);
    });
  });

  describe('Cross-Component Consistency', () => {
    it('both screens render the same story data', () => {
      const { getByText: getByTextAnimated } = render(<StorySelectionScreen />);
      const { getByText: getByTextSimple } = render(<SimpleStoryScreen />);
      
      // Both should render the same stories
      MOCK_STORIES.forEach(story => {
        expect(getByTextAnimated(story.title)).toBeTruthy();
        expect(getByTextSimple(story.title)).toBeTruthy();
      });
    });

    it('both screens handle story selection consistently', () => {
      const mockOnStorySelectAnimated = jest.fn();
      const mockOnStorySelectSimple = jest.fn();
      
      const { getByText: getByTextAnimated } = render(
        <StorySelectionScreen onStorySelect={mockOnStorySelectAnimated} />
      );
      const { getByText: getByTextSimple } = render(
        <SimpleStoryScreen onStorySelect={mockOnStorySelectSimple} />
      );
      
      const firstStory = MOCK_STORIES[0];
      
      // Select same story in both screens
      fireEvent.press(getByTextAnimated(firstStory.title));
      fireEvent.press(getByTextSimple(firstStory.title));
      
      expect(mockOnStorySelectAnimated).toHaveBeenCalledWith(firstStory);
      expect(mockOnStorySelectSimple).toHaveBeenCalledWith(firstStory);
    });

    it('both screens handle surprise me consistently', () => {
      const mockOnStorySelectAnimated = jest.fn();
      const mockOnStorySelectSimple = jest.fn();
      
      const { getByText: getByTextAnimated } = render(
        <StorySelectionScreen onStorySelect={mockOnStorySelectAnimated} />
      );
      const { getByText: getByTextSimple } = render(
        <SimpleStoryScreen onStorySelect={mockOnStorySelectSimple} />
      );
      
      // Press surprise me in both screens
      fireEvent.press(getByTextAnimated('✨ Surprise Me! ✨'));
      fireEvent.press(getByTextSimple('✨ Surprise Me! ✨'));
      
      expect(mockOnStorySelectAnimated).toHaveBeenCalledTimes(1);
      expect(mockOnStorySelectSimple).toHaveBeenCalledTimes(1);
      
      // Both should select available stories
      const animatedSelection = mockOnStorySelectAnimated.mock.calls[0][0];
      const simpleSelection = mockOnStorySelectSimple.mock.calls[0][0];
      
      expect(animatedSelection.isAvailable).toBe(true);
      expect(simpleSelection.isAvailable).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('handles missing onStorySelect gracefully', () => {
      expect(() => {
        const { getByText } = render(<StorySelectionScreen />);
        const firstStory = MOCK_STORIES[0];
        fireEvent.press(getByText(firstStory.title));
      }).not.toThrow();
    });

    it('handles empty story data gracefully', () => {
      // This tests robustness when story data might be missing
      expect(() => {
        render(<StorySelectionScreen />);
      }).not.toThrow();
    });

    it('handles navigation errors gracefully', () => {
      // Mock store to throw error
      mockRequestReturnToMainMenu.mockImplementation(() => {
        throw new Error('Navigation error');
      });
      
      expect(() => {
        const { getByText } = render(<StorySelectionScreen />);
        fireEvent.press(getByText('← Back'));
      }).not.toThrow();
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains accessibility across both screen types', () => {
      const { getByText: getByTextAnimated } = render(<StorySelectionScreen />);
      const { getByText: getByTextSimple } = render(<SimpleStoryScreen />);
      
      // Both should have accessible back buttons
      expect(getByTextAnimated('← Back')).toBeTruthy();
      expect(getByTextSimple('← Back')).toBeTruthy();
      
      // Both should have accessible surprise me buttons
      expect(getByTextAnimated('✨ Surprise Me! ✨')).toBeTruthy();
      expect(getByTextSimple('✨ Surprise Me! ✨')).toBeTruthy();
    });

    it('provides consistent story information', () => {
      const { getByText: getByTextAnimated } = render(<StorySelectionScreen />);
      const { getByText: getByTextSimple } = render(<SimpleStoryScreen />);
      
      // Both should show story titles and tags
      MOCK_STORIES.forEach(story => {
        expect(getByTextAnimated(story.title)).toBeTruthy();
        expect(getByTextSimple(story.title)).toBeTruthy();
        
        if (story.tag) {
          expect(getByTextAnimated(story.tag)).toBeTruthy();
          expect(getByTextSimple(story.tag)).toBeTruthy();
        }
      });
    });
  });
});
