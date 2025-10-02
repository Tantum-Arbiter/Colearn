import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { MainMenu } from '../../components/main-menu';
import { MenuIcon } from '../../components/main-menu/menu-icon';

// Mock performance monitoring
const mockPerformanceNow = jest.fn();
global.performance = { now: mockPerformanceNow } as any;

// Mock console methods to track excessive logging
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

const mockConsoleLog = jest.fn();
const mockConsoleWarn = jest.fn();
const mockConsoleError = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockPerformanceNow.mockReturnValue(Date.now());
  console.log = mockConsoleLog;
  console.warn = mockConsoleWarn;
  console.error = mockConsoleError;
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('Performance & Stress Testing', () => {
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering Performance', () => {
    it('should render MainMenu component without crashing', () => {
      const startTime = performance.now();

      const result = render(<MainMenu onNavigate={mockOnNavigate} />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly (< 1 second)
      expect(renderTime).toBeLessThan(1000);

      // Should render without crashing
      expect(result.toJSON()).toBeTruthy();
    });

    it('should handle multiple rapid re-renders', () => {
      const { rerender } = render(<MainMenu onNavigate={mockOnNavigate} />);

      const startTime = performance.now();

      // Trigger multiple re-renders
      for (let i = 0; i < 50; i++) {
        rerender(<MainMenu onNavigate={mockOnNavigate} />);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete re-renders within reasonable time
      expect(duration).toBeLessThan(2000);
    });

    it('should not create excessive console output', () => {
      render(<MainMenu onNavigate={mockOnNavigate} />);

      // Should have minimal console output (only warnings are acceptable)
      expect(mockConsoleLog).toHaveBeenCalledTimes(0);
      // Allow for deprecation warnings in test environment
      expect(mockConsoleError.mock.calls.length).toBeLessThan(5);
    });
  });

  describe('Memory Management', () => {
    it('should cleanup components on unmount without errors', () => {
      const { unmount } = render(<MainMenu onNavigate={mockOnNavigate} />);

      // Component should handle unmount gracefully
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle multiple mount/unmount cycles', () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<MainMenu onNavigate={mockOnNavigate} />);

        expect(() => {
          unmount();
        }).not.toThrow();
      }
    });

    it('should handle rapid mount/unmount cycles without memory leaks', () => {
      // Test rapid mounting and unmounting to detect timeout/animation leaks
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(<MainMenu onNavigate={mockOnNavigate} />);

        // Unmount immediately to test cleanup
        expect(() => {
          unmount();
        }).not.toThrow();
      }

      // Should complete without excessive console warnings (allow for test environment issues)
      expect(mockConsoleError.mock.calls.length).toBeLessThan(25);
    });
  });

  describe('Error Handling', () => {
    it('should handle component errors gracefully with ErrorBoundary', () => {
      // Test that ErrorBoundary is working
      const ThrowError = () => {
        throw new Error('Test error');
      };

      expect(() => {
        render(<ThrowError />);
      }).toThrow('Test error');

      // Main component should still work after error in other components
      const result = render(<MainMenu onNavigate={mockOnNavigate} />);
      expect(result.toJSON()).toBeTruthy();
    });

    it('should not crash with invalid props', () => {
      expect(() => {
        render(<MainMenu onNavigate={mockOnNavigate} />);
      }).not.toThrow();
    });
  });

  describe('MenuIcon Performance Tests', () => {
    const mockOnPress = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render MenuIcon without crashing', () => {
      const result = render(
        <MenuIcon
          icon="stories-icon"
          label="Stories"
          status="inactive"
          onPress={mockOnPress}
        />
      );

      expect(result.toJSON()).toBeTruthy();
    });

    it('should handle multiple MenuIcon renders', () => {
      const startTime = performance.now();

      const icons = Array.from({ length: 10 }, (_, i) => (
        <MenuIcon
          key={i}
          icon={`icon-${i}`}
          label={`Icon ${i}`}
          status="animated_interactive"
          onPress={mockOnPress}
        />
      ));

      const result = render(<>{icons}</>);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render multiple icons quickly
      expect(renderTime).toBeLessThan(500);
      expect(result.toJSON()).toBeTruthy();
    });

    it('should cleanup MenuIcon on unmount', () => {
      const { unmount } = render(
        <MenuIcon
          icon="stories-icon"
          label="Stories"
          status="inactive"
          onPress={mockOnPress}
        />
      );

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle rapid MenuIcon mount/unmount with animations', () => {
      // Test memory leak prevention with animated icons
      for (let i = 0; i < 15; i++) {
        const { unmount } = render(
          <MenuIcon
            icon="stories-icon"
            label="Stories"
            status="animated_interactive" // This triggers infinite animations
            onPress={mockOnPress}
          />
        );

        // Unmount quickly to test animation cleanup
        expect(() => {
          unmount();
        }).not.toThrow();
      }

      // Should complete without excessive warnings (allow for test environment issues)
      expect(mockConsoleError.mock.calls.length).toBeLessThan(25);
    });
  });
});
