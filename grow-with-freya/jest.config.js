module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup-after-env.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // Only real suites: helper modules living under __tests__ (test-wrapper,
  // animation-test-utils) are not test files and used to need dummy tests to
  // satisfy Jest.
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'store/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'data/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/__mocks__/**',
    '!**/coverage/**',
  ],
  moduleNameMapper: {
    // Image and asset mocks must come BEFORE the @/ alias to properly intercept
    '\\.(png|jpg|jpeg|gif|webp)$': '<rootDir>/__mocks__/imageMock.js',
    '\\.(svg)$': '<rootDir>/__mocks__/svgMock.tsx',
    '\\.(wav|mp3|m4a|aac|oga)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/$1',
    '^react-native$': 'react-native-web',
    '^expo-screen-orientation$': '<rootDir>/__mocks__/expo-screen-orientation.js',
    '^expo-haptics$': '<rootDir>/__mocks__/expo-haptics.js',
    '^expo-linear-gradient$': '<rootDir>/__mocks__/expo-linear-gradient.js',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/@expo/vector-icons.js',
    '^expo-notifications$': '<rootDir>/__mocks__/expo-notifications.js',
    '^expo-device$': '<rootDir>/__mocks__/expo-device.js',
    '^expo-application$': '<rootDir>/__mocks__/expo-application.js',
    '^@react-native-community/datetimepicker$': '<rootDir>/__mocks__/@react-native-community/datetimepicker.js',
    '^expo/virtual/env$': '<rootDir>/__mocks__/expo-env.js',
    '^expo-constants$': '<rootDir>/__mocks__/expo-constants.js',
    '^lottie-react-native$': '<rootDir>/__mocks__/lottie-react-native.js',
    '^expo-file-system$': '<rootDir>/__mocks__/expo-file-system.js',
    '^expo-file-system/legacy$': '<rootDir>/__mocks__/expo-file-system.js',
    '^expo-image$': '<rootDir>/__mocks__/expo-image.js',
    '^expo-system-ui$': '<rootDir>/__mocks__/expo-system-ui.js',
    '^@react-native-community/slider$': '<rootDir>/__mocks__/@react-native-community/slider.js',
    '^@/services/device-info-service$': '<rootDir>/__mocks__/device-info-service.js',
  },
  // preset: 'jest-expo', // Disabled to avoid prettier dependency issue
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', {
      presets: [
        ['babel-preset-expo', { jsxRuntime: 'automatic' }]
      ],
      plugins: [
        'react-native-reanimated/plugin',
      ],
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|expo|@expo|expo-av|expo-notifications|expo-device|expo-auth-session|expo-apple-authentication|expo-secure-store|expo-crypto|expo-web-browser|expo-constants|expo-modules-core|expo-image|expo-blur|react-native-reanimated|react-native-svg|@react-navigation|zustand|react-native-worklets|react-native-safe-area-context|react-native-purchases)/)',
  ],
  // Temporarily lowered coverage thresholds for CI/CD pipeline setup
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },
  testTimeout: (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.NODE_ENV === 'test') ? 60000 : 10000, // Longer timeout in CI
  maxWorkers: (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.NODE_ENV === 'test') ? 1 : '50%', // Single worker in CI, parallel locally
  // CI-specific optimizations
  ...((process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.NODE_ENV === 'test') && {
    forceExit: true, // Force Jest to exit in CI
    detectOpenHandles: false, // Disable open handle detection in CI
    workerIdleMemoryLimit: '1024MB', // Increased memory limit for CI
    logHeapUsage: true, // Log memory usage in CI
  }),

  // Enhanced reporting - temporarily disabled for CI/CD debugging
  reporters: [
    'default',
    // ['jest-junit', {
    //   outputDirectory: '__tests__/results',
    //   outputName: 'test-results.xml',
    //   suiteName: 'Unit Tests',
    // }],
    // ['jest-html-reporters', {
    //   publicPath: '__tests__/results',
    //   filename: 'test-report.html',
    //   pageTitle: 'Test Report',
    // }],
  ],

  // Collect and report test performance
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageDirectory: 'coverage'
};
