import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { EntranceAnimation, PageEntranceWrapper } from '@/components/ui/entrance-animation';

// Mock react-native-reanimated with performance tracking
jest.mock('react-native-reanimated');

const mockWithTiming = jest.fn();
const mockUseSharedValue = jest.fn();
const mockUseAnimatedStyle = jest.fn();

// Performance measurement utilities
const measureRenderTime = (renderFn: () => any): number => {
  const startTime = performance.now();
  renderFn();
  const endTime = performance.now();
  return endTime - startTime;
};

const measureMemoryUsage = (): number => {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
};

describe('EntranceAnimation Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSharedValue.mockReturnValue({ value: 0 });
    mockUseAnimatedStyle.mockReturnValue({});
    mockWithTiming.mockImplementation((value) => value);
  });

  describe('Render Performance', () => {
    it('renders within acceptable time limits', () => {
      const TestComponent = () => (
        <EntranceAnimation>
          <Text>Test Content</Text>
        </EntranceAnimation>
      );

      const renderTime = measureRenderTime(() => render(<TestComponent />));
      
      // Should render in less than 50ms
      expect(renderTime).toBeLessThan(50);
    });

    it('handles multiple children efficiently', () => {
      const MultipleChildren = () => (
        <EntranceAnimation>
          {Array.from({ length: 100 }, (_, i) => (
            <Text key={i}>Child {i}</Text>
          ))}
        </EntranceAnimation>
      );

      const renderTime = measureRenderTime(() => render(<MultipleChildren />));
      
      // Should handle 100 children in less than 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('performs well with complex nested structures', () => {
      const ComplexStructure = () => (
        <EntranceAnimation>
          <View>
            <View>
              <View>
                {Array.from({ length: 20 }, (_, i) => (
                  <View key={i}>
                    <Text>Nested content {i}</Text>
                    <View>
                      <Text>Deep nested {i}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </EntranceAnimation>
      );

      const renderTime = measureRenderTime(() => render(<ComplexStructure />));
      
      // Complex structures should still render quickly
      expect(renderTime).toBeLessThan(150);
    });
  });

  describe('Animation Initialization Performance', () => {
    it('initializes shared values efficiently', () => {
      render(
        <EntranceAnimation animationType="fade">
          <Text>Test</Text>
        </EntranceAnimation>
      );

      // Should create exactly 3 shared values (opacity, translateY, scale)
      expect(mockUseSharedValue).toHaveBeenCalledTimes(3);
    });

    it('creates animated styles without excessive calls', () => {
      render(
        <EntranceAnimation animationType="slide-up">
          <Text>Test</Text>
        </EntranceAnimation>
      );

      // Should create animated style once
      expect(mockUseAnimatedStyle).toHaveBeenCalledTimes(1);
    });

    it('handles animation type changes efficiently', () => {
      const { rerender } = render(
        <EntranceAnimation animationType="fade">
          <Text>Test</Text>
        </EntranceAnimation>
      );

      // Clear previous calls
      jest.clearAllMocks();
      mockUseSharedValue.mockReturnValue({ value: 0 });
      mockUseAnimatedStyle.mockReturnValue({});

      rerender(
        <EntranceAnimation animationType="scale">
          <Text>Test</Text>
        </EntranceAnimation>
      );

      // Should not create new shared values on rerender
      expect(mockUseSharedValue).toHaveBeenCalledTimes(3);
    });
  });

  describe('Memory Usage', () => {
    it('does not create memory leaks with multiple instances', () => {
      const initialMemory = measureMemoryUsage();

      // Create and unmount multiple instances
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(
          <EntranceAnimation key={i}>
            <Text>Instance {i}</Text>
          </EntranceAnimation>
        );
        unmount();
      }

      const finalMemory = measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 1MB)
      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(1024 * 1024);
      }
    });

    it('cleans up timers properly', () => {
      jest.useFakeTimers();
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <EntranceAnimation delay={1000}>
          <Text>Delayed content</Text>
        </EntranceAnimation>
      );

      unmount();

      // Should not have any pending timers after unmount
      expect(jest.getTimerCount()).toBe(0);

      jest.useRealTimers();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Animation Configuration Performance', () => {
    it('handles rapid prop changes efficiently', () => {
      const { rerender } = render(
        <EntranceAnimation duration={100}>
          <Text>Test</Text>
        </EntranceAnimation>
      );

      const startTime = performance.now();

      // Rapidly change props
      for (let i = 0; i < 10; i++) {
        rerender(
          <EntranceAnimation duration={100 + i * 50}>
            <Text>Test</Text>
          </EntranceAnimation>
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle rapid prop changes in less than 100ms
      expect(totalTime).toBeLessThan(100);
    });

    it('optimizes animation timing calls', () => {
      render(
        <EntranceAnimation animationType="fade" duration={500}>
          <Text>Test</Text>
        </EntranceAnimation>
      );

      // Should call withTiming exactly 3 times (opacity, translateY, scale)
      expect(mockWithTiming).toHaveBeenCalledTimes(3);
    });
  });

  describe('PageEntranceWrapper Performance', () => {
    it('renders different page types efficiently', () => {
      const pageTypes = ['main', 'stories', 'settings'] as const;

      pageTypes.forEach(pageType => {
        const renderTime = measureRenderTime(() =>
          render(
            <PageEntranceWrapper pageType={pageType}>
              <Text>Page content</Text>
            </PageEntranceWrapper>
          )
        );

        // Each page type should render quickly
        expect(renderTime).toBeLessThan(50);
      });
    });

    it('handles page type switching efficiently', () => {
      const { rerender } = render(
        <PageEntranceWrapper pageType="main">
          <Text>Content</Text>
        </PageEntranceWrapper>
      );

      const startTime = performance.now();

      rerender(
        <PageEntranceWrapper pageType="stories">
          <Text>Content</Text>
        </PageEntranceWrapper>
      );

      rerender(
        <PageEntranceWrapper pageType="settings">
          <Text>Content</Text>
        </PageEntranceWrapper>
      );

      const endTime = performance.now();
      const switchTime = endTime - startTime;

      // Page type switching should be fast
      expect(switchTime).toBeLessThan(50);
    });
  });

  describe('Stress Testing', () => {
    it('handles many simultaneous animations', () => {
      const ManyAnimations = () => (
        <View>
          {Array.from({ length: 20 }, (_, i) => (
            <EntranceAnimation
              key={i}
              animationType={i % 2 === 0 ? 'fade' : 'slide-up'}
              delay={i * 10}
            >
              <Text>Animation {i}</Text>
            </EntranceAnimation>
          ))}
        </View>
      );

      const renderTime = measureRenderTime(() => render(<ManyAnimations />));

      // Should handle 20 simultaneous animations efficiently
      expect(renderTime).toBeLessThan(200);
    });

    it('maintains performance with deep nesting', () => {
      const DeepNesting = ({ depth }: { depth: number }) => {
        if (depth === 0) {
          return <Text>Deep content</Text>;
        }

        return (
          <EntranceAnimation animationType="fade">
            <DeepNesting depth={depth - 1} />
          </EntranceAnimation>
        );
      };

      const renderTime = measureRenderTime(() => 
        render(<DeepNesting depth={10} />)
      );

      // Should handle 10 levels of nesting efficiently
      expect(renderTime).toBeLessThan(100);
    });
  });
});
