/**
 * Setup file for entrance animation tests
 * Configures mocks, utilities, and global test environment for animation testing
 */

import 'react-native-gesture-handler/jestSetup';

// Mock react-native-reanimated with enhanced functionality for testing
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');

  // Enhanced mocks for better testing
  const mockSharedValues = new Map();
  const mockAnimatedStyles = new Map();

  Reanimated.useSharedValue = jest.fn((initialValue: number) => {
    const id = Math.random().toString();
    const sharedValue = { value: initialValue };
    mockSharedValues.set(id, sharedValue);
    return sharedValue;
  });

  Reanimated.useAnimatedStyle = jest.fn((styleFunction: () => any) => {
    const id = Math.random().toString();
    const style = styleFunction();
    mockAnimatedStyles.set(id, style);
    return style;
  });

  Reanimated.withTiming = jest.fn((value, config) => {
    // Simulate timing animation with callback support
    if (config?.callback) {
      setTimeout(config.callback, config.duration || 0);
    }
    return value;
  });

  Reanimated.withDelay = jest.fn((delay, animation) => {
    // Simulate delay
    return animation;
  });

  Reanimated.Easing = {
    out: jest.fn((easing) => easing),
    in: jest.fn((easing) => easing),
    inOut: jest.fn((easing) => easing),
    cubic: jest.fn(),
    bezier: jest.fn(),
    linear: jest.fn(),
  };

  // Add test utilities
  Reanimated.__TEST_UTILS__ = {
    getMockSharedValues: () => mockSharedValues,
    getMockAnimatedStyles: () => mockAnimatedStyles,
    clearMocks: () => {
      mockSharedValues.clear();
      mockAnimatedStyles.clear();
    },
  };

  return Reanimated;
});

// Mock expo-haptics for animation feedback testing
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock React Native components that might interfere with animation testing
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      timing: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback()),
      })),
      spring: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback()),
      })),
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        interpolate: jest.fn(),
      })),
    },
    LayoutAnimation: {
      configureNext: jest.fn(),
      create: jest.fn(),
      Types: {
        easeInEaseOut: 'easeInEaseOut',
        linear: 'linear',
        spring: 'spring',
      },
      Properties: {
        opacity: 'opacity',
        scaleX: 'scaleX',
        scaleY: 'scaleY',
      },
    },
  };
});

// Global test utilities for animation testing
global.animationTestUtils = {
  /**
   * Wait for animations to complete
   */
  waitForAnimations: async (duration: number = 1000): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, duration));
  },

  /**
   * Mock performance.now for consistent timing tests
   */
  mockPerformanceNow: (mockTime: number = 0): jest.SpyInstance => {
    return jest.spyOn(performance, 'now').mockReturnValue(mockTime);
  },

  /**
   * Create a mock animation callback
   */
  createMockAnimationCallback: (): jest.Mock => {
    return jest.fn((finished?: boolean) => {
      // Mock animation completion
    });
  },

  /**
   * Simulate animation frame
   */
  simulateAnimationFrame: (): Promise<void> => {
    return new Promise(resolve => {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 16); // ~60fps
      }
    });
  },
};

// Performance monitoring setup
global.performanceMonitor = {
  measurements: new Map<string, number>(),
  
  start: (label: string): void => {
    global.performanceMonitor.measurements.set(`${label}_start`, performance.now());
  },
  
  end: (label: string): number => {
    const startTime = global.performanceMonitor.measurements.get(`${label}_start`);
    if (startTime === undefined) {
      throw new Error(`Performance measurement '${label}' was not started`);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    global.performanceMonitor.measurements.set(label, duration);
    return duration;
  },
  
  get: (label: string): number | undefined => {
    return global.performanceMonitor.measurements.get(label);
  },
  
  clear: (): void => {
    global.performanceMonitor.measurements.clear();
  },
  
  report: (): string => {
    const measurements = Array.from(global.performanceMonitor.measurements.entries())
      .filter(([key]) => !key.endsWith('_start'));
    
    if (measurements.length === 0) {
      return 'No performance measurements recorded';
    }
    
    let report = 'Performance Measurements:\n';
    measurements.forEach(([label, duration]) => {
      const status = duration > 100 ? '🐌' : duration > 50 ? '⚡' : '🚀';
      report += `  ${status} ${label}: ${duration.toFixed(2)}ms\n`;
    });
    
    return report;
  },
};

// Console override for test output control
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn((...args) => {
    if (process.env.JEST_VERBOSE === 'true') {
      originalConsole.log(...args);
    }
  }),
  warn: jest.fn((...args) => {
    if (process.env.JEST_VERBOSE === 'true') {
      originalConsole.warn(...args);
    }
  }),
  error: originalConsole.error, // Always show errors
};

// Test environment cleanup
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
  
  // Clear performance measurements
  global.performanceMonitor.clear();
  
  // Clear reanimated test utils if available
  const Reanimated = require('react-native-reanimated');
  if (Reanimated.__TEST_UTILS__) {
    Reanimated.__TEST_UTILS__.clearMocks();
  }
});

// Global test configuration
beforeAll(() => {
  // Set up fake timers for animation testing
  jest.useFakeTimers();
});

afterAll(() => {
  // Clean up fake timers
  jest.useRealTimers();
  
  // Generate final performance report if verbose
  if (process.env.JEST_VERBOSE === 'true') {
    console.log('\n' + global.performanceMonitor.report());
  }
});

// Type declarations for global utilities
declare global {
  var animationTestUtils: {
    waitForAnimations: (duration?: number) => Promise<void>;
    mockPerformanceNow: (mockTime?: number) => jest.SpyInstance;
    createMockAnimationCallback: () => jest.Mock;
    simulateAnimationFrame: () => Promise<void>;
  };
  
  var performanceMonitor: {
    measurements: Map<string, number>;
    start: (label: string) => void;
    end: (label: string) => number;
    get: (label: string) => number | undefined;
    clear: () => void;
    report: () => string;
  };
}
