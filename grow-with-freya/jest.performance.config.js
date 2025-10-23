module.exports = {
  displayName: 'Performance Tests',
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup-after-env.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '**/__tests__/performance/**/*.(ts|tsx|js)',
    '**/*.performance.(test|spec).(ts|tsx|js)',
  ],
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'store/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/__mocks__/**',
    '!**/coverage/**',
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(png|jpg|jpeg|gif|webp)$': '<rootDir>/__mocks__/imageMock.js',
    '\\.(svg)$': '<rootDir>/__mocks__/svgMock.tsx',
    '\\.(wav|mp3|m4a|aac|oga)$': 'identity-obj-proxy',
    '^react-native$': 'react-native-web',
    '^expo-screen-orientation$': '<rootDir>/__mocks__/expo-screen-orientation.js',
    '^expo-haptics$': '<rootDir>/__mocks__/expo-haptics.js',
    '^expo-linear-gradient$': '<rootDir>/__mocks__/expo-linear-gradient.js',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/@expo/vector-icons.js',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|expo-av|react-native-reanimated|react-native-svg|@react-navigation|zustand|react-native-worklets|react-native-safe-area-context)/)',
  ],
  testEnvironment: 'jsdom',
  testTimeout: 30000, // Longer timeout for performance tests
  maxWorkers: 1, // Single worker for consistent performance measurements
  
  // Performance-specific configuration
  globals: {
    __DEV__: false,
    __PERFORMANCE_TEST__: true,
  },
  
  // Custom reporters for performance test results
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '__tests__/results',
      outputName: 'performance-results.xml',
      suiteName: 'Performance Tests',
    }],
    ['jest-html-reporters', {
      publicPath: '__tests__/results',
      filename: 'performance-report.html',
      pageTitle: 'Performance Test Report',
    }],
  ],
  
  // Verbose output for detailed performance results
  verbose: true,
  
  // Performance monitoring
  detectOpenHandles: true,
  detectLeaks: true,
};
