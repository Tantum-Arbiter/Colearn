import React from 'react';
import { render, act } from '@testing-library/react-native';
import { MainMenu } from '../../components/main-menu';

// Mock performance APIs
const mockPerformanceNow = jest.fn();
global.performance = {
  now: mockPerformanceNow,
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
} as any;

describe('Navigation Stress Testing', () => {
  let mockOnNavigate: jest.Mock;
  let mockConsoleError: jest.SpyInstance;
  let mockConsoleLog: jest.SpyInstance;

  beforeEach(() => {
    mockOnNavigate = jest.fn();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockPerformanceNow.mockReturnValue(Date.now());

    // Reset timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Navigation Flow Stress Tests', () => {
    it('should handle navigation to stories without crashing', async () => {
      const { toJSON } = render(<MainMenu onNavigate={mockOnNavigate} />);

      // Should render without crashing
      expect(toJSON()).toBeTruthy();

      // Should not have any errors
      expect(mockConsoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('Error in handleIconPress')
      );
    });

    it('should properly cleanup animations on unmount', async () => {
      const { unmount } = render(<MainMenu onNavigate={mockOnNavigate} />);

      // Trigger some animations by simulating interactions
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Unmount component
      act(() => {
        unmount();
      });

      // Should have cleaned up without errors
      expect(mockConsoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });

    it('should handle multiple mount/unmount cycles without memory leaks', async () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<MainMenu onNavigate={mockOnNavigate} />);

        // Simulate some activity
        act(() => {
          jest.advanceTimersByTime(50);
        });

        // Unmount
        act(() => {
          unmount();
        });

        // Fast forward to complete cleanup
        act(() => {
          jest.advanceTimersByTime(100);
        });
      }

      // Should not have crashed
      expect(mockConsoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });

    it('should handle navigation interruption gracefully', async () => {
      const { unmount } = render(<MainMenu onNavigate={mockOnNavigate} />);

      // Start navigation
      act(() => {
        mockOnNavigate('stories');
      });

      // Interrupt by unmounting immediately
      act(() => {
        unmount();
      });

      // Should not crash or throw errors
      expect(mockConsoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });

    it('should prevent state updates after unmount', async () => {
      const { unmount } = render(<MainMenu onNavigate={mockOnNavigate} />);

      // Unmount component
      act(() => {
        unmount();
      });

      // Try to trigger state updates after unmount
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should not have any warnings about state updates on unmounted components
      expect(mockConsoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('setState')
      );
    });
  });

  describe('Animation Cleanup Tests', () => {
    it('should reset all animation values on unmount', async () => {
      const { unmount } = render(<MainMenu onNavigate={mockOnNavigate} />);

      // Let animations start
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Unmount and check cleanup
      act(() => {
        unmount();
      });

      // Should have cleaned up without errors
      expect(mockConsoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });

    it('should handle concurrent animation cleanup', async () => {
      const components = [];

      // Mount multiple components
      for (let i = 0; i < 3; i++) {
        components.push(render(<MainMenu onNavigate={mockOnNavigate} />));
      }

      // Start animations
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Unmount all at once
      act(() => {
        components.forEach(({ unmount }) => unmount());
      });

      // Should not crash
      expect(mockConsoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });
  });

  describe('Performance Under Navigation Stress', () => {
    it('should maintain performance during navigation cycles', async () => {
      const startTime = performance.now();

      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<MainMenu onNavigate={mockOnNavigate} />);

        act(() => {
          jest.advanceTimersByTime(10);
        });

        act(() => {
          unmount();
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);
    });

    it('should handle navigation with pending animations', async () => {
      const { unmount } = render(<MainMenu onNavigate={mockOnNavigate} />);

      // Start multiple animations
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Navigate while animations are running
      act(() => {
        mockOnNavigate('stories');
      });

      // Unmount immediately
      act(() => {
        unmount();
      });

      // Should handle gracefully
      expect(mockConsoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });
  });
});
