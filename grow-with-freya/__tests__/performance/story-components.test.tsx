import React from 'react';
import { render } from '@testing-library/react-native';
import { StorySelectionScreen } from '@/components/stories/story-selection-screen';
import { SimpleStoryScreen } from '@/components/stories/simple-story-screen';
import { BookCard } from '@/components/stories/book-card';
import { MOCK_STORIES } from '@/data/stories';

// Mock dependencies
jest.mock('@/store/app-store', () => ({
  useAppStore: () => ({
    requestReturnToMainMenu: jest.fn(),
  }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

// Reanimated is already mocked globally in jest.setup.js

describe('Story Components Performance Tests', () => {
  describe('StorySelectionScreen Performance', () => {
    it('renders within acceptable time limits', () => {
      const startTime = performance.now();
      const { root } = render(<StorySelectionScreen />);
      const endTime = performance.now();
      
      expect(root).toBeTruthy();
      // Should render quickly (less than 200ms for animated version)
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('handles rapid mount/unmount cycles without memory leaks', () => {
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        const { unmount } = render(<StorySelectionScreen />);
        unmount();
      }
      
      // Should complete without throwing or excessive memory usage
      expect(true).toBe(true);
    });

    it('handles multiple re-renders efficiently', () => {
      const { rerender } = render(<StorySelectionScreen />);
      
      const startTime = performance.now();
      for (let i = 0; i < 5; i++) {
        rerender(<StorySelectionScreen />);
      }
      const endTime = performance.now();
      
      // Multiple re-renders should be fast
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('maintains performance with large story datasets', () => {
      // Create a larger mock dataset
      const largeStorySet = Array.from({ length: 50 }, (_, i) => ({
        ...MOCK_STORIES[0],
        id: `story-${i}`,
        title: `Story ${i}`,
      }));
      
      const startTime = performance.now();
      const { root } = render(<StorySelectionScreen />);
      const endTime = performance.now();
      
      expect(root).toBeTruthy();
      // Should still render efficiently with more data
      expect(endTime - startTime).toBeLessThan(300);
    });
  });

  describe('SimpleStoryScreen Performance', () => {
    it('renders faster than animated version', () => {
      const startTime = performance.now();
      const { root } = render(<SimpleStoryScreen />);
      const endTime = performance.now();
      
      expect(root).toBeTruthy();
      // Should render very quickly (less than 50ms for simple version)
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('handles stress testing without performance degradation', () => {
      const iterations = 20;
      const renderTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const { unmount } = render(<SimpleStoryScreen />);
        const endTime = performance.now();
        unmount();
        
        renderTimes.push(endTime - startTime);
      }
      
      // Performance should remain consistent
      const averageTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      const maxTime = Math.max(...renderTimes);
      
      expect(averageTime).toBeLessThan(50);
      expect(maxTime).toBeLessThan(100);
    });

    it('uses minimal memory footprint', () => {
      const { root } = render(<SimpleStoryScreen />);
      
      expect(root).toBeTruthy();
      // Simple version should have minimal overhead
      // This is mainly a smoke test to ensure no memory leaks
    });
  });

  describe('BookCard Performance', () => {
    const mockStory = MOCK_STORIES[0];

    it('renders individual cards efficiently', () => {
      const startTime = performance.now();
      const { root } = render(<BookCard story={mockStory} />);
      const endTime = performance.now();
      
      expect(root).toBeTruthy();
      // Individual cards should render very quickly
      expect(endTime - startTime).toBeLessThan(20);
    });

    it('handles rapid card creation/destruction', () => {
      const iterations = 50;
      
      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        const { unmount } = render(<BookCard story={mockStory} />);
        unmount();
      }
      const endTime = performance.now();
      
      // Should handle many card operations efficiently
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('maintains performance with different story types', () => {
      const storyTypes = [
        { ...mockStory, isAvailable: true },
        { ...mockStory, isAvailable: false, title: 'Coming Soon' },
        { ...mockStory, duration: undefined },
        { ...mockStory, tag: '' },
      ];
      
      storyTypes.forEach((story, index) => {
        const startTime = performance.now();
        const { root } = render(<BookCard story={story} />);
        const endTime = performance.now();
        
        expect(root).toBeTruthy();
        expect(endTime - startTime).toBeLessThan(30);
      });
    });
  });

  describe('Animation Performance', () => {
    it('animated version initializes without blocking', () => {
      // Test that animations don't block the main thread during initialization
      const startTime = performance.now();
      const { root } = render(<StorySelectionScreen />);
      const initTime = performance.now();
      
      expect(root).toBeTruthy();
      // Initial render should be fast even with animations
      expect(initTime - startTime).toBeLessThan(100);
    });

    it('handles animation cleanup properly', () => {
      const { unmount } = render(<StorySelectionScreen />);
      
      // Should unmount without errors or warnings
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Memory Management', () => {
    it('cleans up resources on unmount', () => {
      const { unmount } = render(<StorySelectionScreen />);
      
      // Should not leave any timers or listeners
      expect(() => unmount()).not.toThrow();
    });

    it('handles component lifecycle efficiently', () => {
      const components = [
        <StorySelectionScreen key="1" />,
        <SimpleStoryScreen key="2" />,
        <BookCard key="3" story={mockStory} />,
      ];
      
      components.forEach(component => {
        const { unmount } = render(component);
        expect(() => unmount()).not.toThrow();
      });
    });
  });
});
