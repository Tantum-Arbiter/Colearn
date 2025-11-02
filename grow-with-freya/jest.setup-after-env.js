// Jest setup after environment
require('@testing-library/jest-native/extend-expect');

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

// Environment-aware test setup
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.NODE_ENV === 'test';

console.log(`Jest setup: CI=${process.env.CI}, GITHUB_ACTIONS=${process.env.GITHUB_ACTIONS}, NODE_ENV=${process.env.NODE_ENV}, isCI=${isCI}`);

// Always use real timers in CI for stability
if (isCI) {
  // Increase default timeout for CI environment
  jest.setTimeout(60000); // Increased to 60 seconds

  // Force real timers globally in CI
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    // Ensure real timers are used
    if (jest.isMockFunction(setTimeout)) {
      jest.useRealTimers();
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    // Force cleanup of any pending operations
    if (global.gc) {
      global.gc();
    }
    // Ensure we're back to real timers
    if (jest.isMockFunction(setTimeout)) {
      jest.useRealTimers();
    }
  });
} else {
  // Local development setup with fake timers
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });
}

// Global test utilities - environment aware
global.flushAnimations = () => {
  if (!isCI && jest.isMockFunction(setTimeout)) {
    // Only use fake timers locally
    jest.advanceTimersByTime(5000);
  } else {
    // In CI, use real delays but shorter
    return new Promise(resolve => setTimeout(resolve, 50));
  }
};

// CI-specific error handling
if (isCI) {
  // Suppress console warnings that are expected in test environment
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    const message = args.join(' ');
    // Suppress known test environment warnings
    if (message.includes('Warning: ReactDOM.render is deprecated') ||
        message.includes('Warning: componentWillMount has been renamed') ||
        message.includes('Warning: componentWillReceiveProps has been renamed')) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
}

global.waitForAnimation = (duration = 1000) => {
  return new Promise(resolve => {
    // Use shorter durations in CI
    const actualDuration = isCI ? Math.min(duration, 100) : duration;
    setTimeout(resolve, actualDuration);
  });
};
