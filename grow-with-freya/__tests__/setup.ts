import '@testing-library/jest-native/extend-expect';

// Mock global fetch
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  Alert: {
    alert: jest.fn(),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  StatusBar: {
    setBarStyle: jest.fn(),
    setBackgroundColor: jest.fn(),
  },
}));

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        googleClientId: 'mock-google-client-id',
        googleIosClientId: 'mock-google-ios-client-id',
        googleAndroidClientId: 'mock-google-android-client-id',
        googleWebClientId: 'mock-google-web-client-id',
        appleClientId: 'mock-apple-client-id',
        gatewayUrl: 'https://mock-gateway.example.com',
      },
    },
  },
}));

// Mock Zustand persist
jest.mock('zustand/middleware', () => ({
  persist: jest.fn((fn) => fn),
  createJSONStorage: jest.fn(() => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  })),
}));

// Setup test environment
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset fetch mock
  (global.fetch as jest.Mock).mockClear();
  
  // Reset console mocks
  (console.log as jest.Mock).mockClear();
  (console.warn as jest.Mock).mockClear();
  (console.error as jest.Mock).mockClear();
});

// Global test utilities
global.btoa = global.btoa || ((str: string) => Buffer.from(str).toString('base64'));
global.atob = global.atob || ((str: string) => Buffer.from(str, 'base64').toString());

// Mock timers for tests that need them
jest.useFakeTimers();

export {};
