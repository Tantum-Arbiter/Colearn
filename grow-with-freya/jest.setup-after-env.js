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

// Mock timers for animation testing - temporarily disabled for CI/CD stability
// beforeEach(() => {
//   jest.useFakeTimers();
// });

// afterEach(() => {
//   jest.runOnlyPendingTimers();
//   jest.useRealTimers();
//   jest.clearAllMocks();
// });

// Simplified cleanup for CI/CD stability
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities - updated for CI/CD stability
global.flushAnimations = () => {
  // Only advance timers if fake timers are active
  if (jest.isMockFunction(setTimeout)) {
    jest.advanceTimersByTime(5000); // Advance by 5 seconds to complete most animations
  }
};

global.waitForAnimation = (duration = 1000) => {
  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
};
