/**
 * Jest configuration specifically for entrance animation tests
 * This configuration optimizes test running for animation components
 */

module.exports = {
  // Extend the main Jest configuration
  ...require('./jest.config.js'),

  // Test name pattern for entrance animation tests
  displayName: 'Entrance Animation Tests',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/entrance-animation*.test.{js,jsx,ts,tsx}',
    '**/__tests__/**/entrance-animation-*.test.{js,jsx,ts,tsx}',
  ],

  // Setup files for animation testing
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/entrance-animation-setup.ts',
  ],

  // Module name mapping for animation components
  moduleNameMapping: {
    '^@/components/ui/entrance-animation$': '<rootDir>/components/ui/entrance-animation.tsx',
  },

  // Test environment optimized for React Native animations
  testEnvironment: 'jsdom',

  // Transform configuration for animation files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        '@babel/preset-react',
      ],
      plugins: [
        'react-native-reanimated/plugin',
      ],
    }],
  },

  // Coverage configuration for animation components
  collectCoverageFrom: [
    'components/ui/entrance-animation.tsx',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],

  // Coverage thresholds specific to animation components
  coverageThreshold: {
    'components/ui/entrance-animation.tsx': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },

  // Test timeout for animation tests (longer due to timing)
  testTimeout: 10000,

  // Verbose output for detailed animation test results
  verbose: true,

  // Performance monitoring
  detectOpenHandles: true,
  detectLeaks: true,

  // Custom reporters for animation test results
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '__tests__/results',
      outputName: 'entrance-animation-results.xml',
      suiteName: 'Entrance Animation Tests',
    }],
    ['jest-html-reporters', {
      publicPath: '__tests__/results',
      filename: 'entrance-animation-report.html',
      pageTitle: 'Entrance Animation Test Report',
    }],
  ],

  // Global test configuration for animations
  globals: {
    __DEV__: true,
    __TEST__: true,
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },

  // Mock configuration for animation dependencies
  moduleNameMapping: {
    ...require('./jest.config.js').moduleNameMapping,
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.js',
    '^expo-haptics$': '<rootDir>/__mocks__/expo-haptics.js',
  },
};
