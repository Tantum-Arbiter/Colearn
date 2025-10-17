// Jest setup after environment
import '@testing-library/jest-native/extend-expect';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock timers for animation testing
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

// Global test utilities
global.flushAnimations = () => {
  jest.advanceTimersByTime(5000); // Advance by 5 seconds to complete most animations
};

global.waitForAnimation = (duration = 1000) => {
  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
};
