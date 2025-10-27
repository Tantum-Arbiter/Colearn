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

// Environment-aware test setup
const isCI = process.env.CI === 'true';

// CI-specific setup for stability
if (isCI) {
  // Increase default timeout for CI environment
  jest.setTimeout(30000);

  // Disable fake timers globally in CI to prevent timing issues
  beforeEach(() => {
    jest.clearAllMocks();
    // Real timers only in CI
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Force cleanup of any pending operations
    if (global.gc) {
      global.gc();
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
  } else if (isCI) {
    // In CI, use real delays but shorter
    return new Promise(resolve => setTimeout(resolve, 100));
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
    setTimeout(resolve, duration);
  });
};
