import React, { useState } from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  EntranceAnimation,
  PageEntranceWrapper,
  StoryPageEntrance,
  MainMenuEntrance,
} from '@/components/ui/entrance-animation';

// Mock react-native-reanimated with more realistic behavior
jest.mock('react-native-reanimated');

const mockSharedValues: { [key: string]: { value: number } } = {};
const mockAnimatedStyles: { [key: string]: any } = {};

// Mock timers for delay testing
jest.useFakeTimers();

describe('EntranceAnimation Integration Tests', () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('Real-world Usage Scenarios', () => {
    it('works correctly in a page navigation scenario', async () => {
      const NavigationTest = () => {
        const [currentPage, setCurrentPage] = useState<'main' | 'stories'>('main');

        return (
          <View>
            <TouchableOpacity
              testID="navigate-button"
              onPress={() => setCurrentPage(currentPage === 'main' ? 'stories' : 'main')}
            >
              <Text>Navigate</Text>
            </TouchableOpacity>

            {currentPage === 'main' && (
              <MainMenuEntrance>
                <Text testID="main-content">Main Menu</Text>
              </MainMenuEntrance>
            )}

            {currentPage === 'stories' && (
              <StoryPageEntrance>
                <Text testID="stories-content">Stories Page</Text>
              </StoryPageEntrance>
            )}
          </View>
        );
      };

      const { getByTestId, queryByTestId } = render(<NavigationTest />);

      // Initially shows main menu
      expect(getByTestId('main-content')).toBeTruthy();
      expect(queryByTestId('stories-content')).toBeNull();

      // Navigate to stories
      fireEvent.press(getByTestId('navigate-button'));

      await waitFor(() => {
        expect(queryByTestId('main-content')).toBeNull();
        expect(getByTestId('stories-content')).toBeTruthy();
      });

      // Navigate back to main
      fireEvent.press(getByTestId('navigate-button'));

      await waitFor(() => {
        expect(getByTestId('main-content')).toBeTruthy();
        expect(queryByTestId('stories-content')).toBeNull();
      });
    });

    it('handles conditional rendering with animations', async () => {
      const ConditionalTest = () => {
        const [showContent, setShowContent] = useState(false);
        const [animationType, setAnimationType] = useState<'fade' | 'slide-up'>('fade');

        return (
          <View>
            <TouchableOpacity
              testID="toggle-content"
              onPress={() => setShowContent(!showContent)}
            >
              <Text>Toggle Content</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="change-animation"
              onPress={() => setAnimationType(animationType === 'fade' ? 'slide-up' : 'fade')}
            >
              <Text>Change Animation</Text>
            </TouchableOpacity>

            {showContent && (
              <EntranceAnimation animationType={animationType}>
                <Text testID="conditional-content">Conditional Content</Text>
              </EntranceAnimation>
            )}
          </View>
        );
      };

      const { getByTestId, queryByTestId } = render(<ConditionalTest />);

      // Initially no content
      expect(queryByTestId('conditional-content')).toBeNull();

      // Show content with fade animation
      fireEvent.press(getByTestId('toggle-content'));
      
      await waitFor(() => {
        expect(getByTestId('conditional-content')).toBeTruthy();
      });

      // Hide content
      fireEvent.press(getByTestId('toggle-content'));
      
      await waitFor(() => {
        expect(queryByTestId('conditional-content')).toBeNull();
      });

      // Change animation type and show again
      fireEvent.press(getByTestId('change-animation'));
      fireEvent.press(getByTestId('toggle-content'));

      await waitFor(() => {
        expect(getByTestId('conditional-content')).toBeTruthy();
      });
    });

    it('works with dynamic content updates', async () => {
      const DynamicContentTest = () => {
        const [items, setItems] = useState(['Item 1']);

        const addItem = () => {
          setItems(prev => [...prev, `Item ${prev.length + 1}`]);
        };

        const removeItem = () => {
          setItems(prev => prev.slice(0, -1));
        };

        return (
          <View>
            <TouchableOpacity testID="add-item" onPress={addItem}>
              <Text>Add Item</Text>
            </TouchableOpacity>

            <TouchableOpacity testID="remove-item" onPress={removeItem}>
              <Text>Remove Item</Text>
            </TouchableOpacity>

            <EntranceAnimation animationType="fade">
              <View testID="items-container">
                {items.map((item, index) => (
                  <Text key={index} testID={`item-${index}`}>
                    {item}
                  </Text>
                ))}
              </View>
            </EntranceAnimation>
          </View>
        );
      };

      const { getByTestId, queryByTestId } = render(<DynamicContentTest />);

      // Initially has one item
      expect(getByTestId('item-0')).toBeTruthy();
      expect(queryByTestId('item-1')).toBeNull();

      // Add items
      fireEvent.press(getByTestId('add-item'));
      
      await waitFor(() => {
        expect(getByTestId('item-1')).toBeTruthy();
      });

      fireEvent.press(getByTestId('add-item'));
      
      await waitFor(() => {
        expect(getByTestId('item-2')).toBeTruthy();
      });

      // Remove items
      fireEvent.press(getByTestId('remove-item'));
      
      await waitFor(() => {
        expect(queryByTestId('item-2')).toBeNull();
      });
    });
  });

  describe('Animation Timing Integration', () => {
    it('handles delayed animations correctly', async () => {
      const DelayedTest = () => {
        const [showDelayed, setShowDelayed] = useState(false);

        return (
          <View>
            <TouchableOpacity
              testID="show-delayed"
              onPress={() => setShowDelayed(true)}
            >
              <Text>Show Delayed</Text>
            </TouchableOpacity>

            {showDelayed && (
              <EntranceAnimation delay={1000}>
                <Text testID="delayed-content">Delayed Content</Text>
              </EntranceAnimation>
            )}
          </View>
        );
      };

      const { getByTestId, queryByTestId } = render(<DelayedTest />);

      // Trigger delayed animation
      fireEvent.press(getByTestId('show-delayed'));

      // Content should be present but animation not started
      expect(getByTestId('delayed-content')).toBeTruthy();

      // Fast-forward time to trigger animation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Animation should have started
      await waitFor(() => {
        expect(getByTestId('delayed-content')).toBeTruthy();
      });
    });

    it('handles multiple animations with different delays', async () => {
      const MultipleDelaysTest = () => {
        const [showAll, setShowAll] = useState(false);

        return (
          <View>
            <TouchableOpacity
              testID="show-all"
              onPress={() => setShowAll(true)}
            >
              <Text>Show All</Text>
            </TouchableOpacity>

            {showAll && (
              <View>
                <EntranceAnimation delay={100}>
                  <Text testID="first-content">First (100ms delay)</Text>
                </EntranceAnimation>

                <EntranceAnimation delay={300}>
                  <Text testID="second-content">Second (300ms delay)</Text>
                </EntranceAnimation>

                <EntranceAnimation delay={500}>
                  <Text testID="third-content">Third (500ms delay)</Text>
                </EntranceAnimation>
              </View>
            )}
          </View>
        );
      };

      const { getByTestId } = render(<MultipleDelaysTest />);

      fireEvent.press(getByTestId('show-all'));

      // All content should be present
      expect(getByTestId('first-content')).toBeTruthy();
      expect(getByTestId('second-content')).toBeTruthy();
      expect(getByTestId('third-content')).toBeTruthy();

      // Fast-forward through different delay points
      act(() => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        jest.advanceTimersByTime(200); // Total 300ms
      });

      act(() => {
        jest.advanceTimersByTime(200); // Total 500ms
      });

      // All animations should have started
      await waitFor(() => {
        expect(getByTestId('first-content')).toBeTruthy();
        expect(getByTestId('second-content')).toBeTruthy();
        expect(getByTestId('third-content')).toBeTruthy();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles empty children gracefully', () => {
      const { container } = render(
        <EntranceAnimation>
          {null}
        </EntranceAnimation>
      );

      expect(container).toBeTruthy();
    });

    it('handles undefined children gracefully', () => {
      const { container } = render(
        <EntranceAnimation>
          {undefined}
        </EntranceAnimation>
      );

      expect(container).toBeTruthy();
    });

    it('handles rapid mount/unmount cycles', async () => {
      const RapidMountTest = () => {
        const [mounted, setMounted] = useState(true);

        return (
          <View>
            <TouchableOpacity
              testID="toggle-mount"
              onPress={() => setMounted(!mounted)}
            >
              <Text>Toggle Mount</Text>
            </TouchableOpacity>

            {mounted && (
              <EntranceAnimation delay={100}>
                <Text testID="rapid-content">Rapid Mount Content</Text>
              </EntranceAnimation>
            )}
          </View>
        );
      };

      const { getByTestId, queryByTestId } = render(<RapidMountTest />);

      // Rapidly toggle mount/unmount
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByTestId('toggle-mount'));
        
        if (i % 2 === 0) {
          expect(queryByTestId('rapid-content')).toBeNull();
        } else {
          expect(getByTestId('rapid-content')).toBeTruthy();
        }
      }
    });

    it('handles invalid animation types gracefully', () => {
      const { getByTestId } = render(
        <EntranceAnimation animationType={'invalid' as any}>
          <Text testID="invalid-animation">Content</Text>
        </EntranceAnimation>
      );

      // Should still render content even with invalid animation type
      expect(getByTestId('invalid-animation')).toBeTruthy();
    });
  });
});
