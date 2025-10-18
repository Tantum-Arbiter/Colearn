/**
 * Test Wrapper Component
 * Provides all necessary context providers for testing components
 */

import React from 'react';

// Simple test wrapper that just renders children
// All context providers are mocked globally in jest.setup.js
export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

/**
 * Custom render function that wraps components with TestWrapper
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: any
) => {
  const { render } = require('@testing-library/react-native');

  return render(
    <TestWrapper>
      {ui}
    </TestWrapper>,
    options
  );
};

/**
 * Mock story transition context values for different test scenarios
 */
export const mockStoryTransitionContexts = {
  default: {
    isTransitioning: false,
    selectedStoryId: null,
    selectedStory: null,
    cardPosition: null,
    startTransition: jest.fn(),
    completeTransition: jest.fn(),
    transitionScale: { value: 1 },
    transitionX: { value: 0 },
    transitionY: { value: 0 },
    transitionOpacity: { value: 1 },
    transitionAnimatedStyle: {},
  },

  transitioning: {
    isTransitioning: true,
    transitionStory: {
      id: 'test-story',
      title: 'Test Story',
      category: 'adventure',
    },
    transitionLayout: {
      x: 100,
      y: 100,
      width: 200,
      height: 200,
    },
    completeTransition: jest.fn(),
    startTransition: jest.fn(),
  },

  withStory: {
    isTransitioning: false,
    transitionStory: {
      id: 'test-story',
      title: 'Test Story',
      category: 'adventure',
    },
    transitionLayout: null,
    completeTransition: jest.fn(),
    startTransition: jest.fn(),
  },
};

/**
 * Helper function to create mock story data for tests
 */
export const createMockStory = (overrides = {}) => ({
  id: 'test-story',
  title: 'Test Story',
  category: 'adventure',
  tag: '🗺️ Adventure',
  emoji: '🗺️',
  coverImage: 'test-cover.jpg',
  isAvailable: true,
  ageRange: '3-6',
  duration: 3,
  pages: [
    {
      id: 'cover',
      type: 'cover',
      content: {
        title: 'Test Story',
        subtitle: 'A test story',
        backgroundImage: 'test-bg.jpg',
      },
    },
    {
      id: 'page1',
      type: 'story',
      content: {
        text: 'This is a test page.',
        backgroundImage: 'test-page1.jpg',
      },
    },
  ],
  ...overrides,
});

/**
 * Helper function to create mock navigation props
 */
export const createMockNavigation = (overrides = {}) => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getId: jest.fn(() => 'test-screen'),
  getParent: jest.fn(),
  getState: jest.fn(() => ({
    key: 'test-key',
    index: 0,
    routeNames: ['test'],
    routes: [{ key: 'test-route', name: 'test' }],
  })),
  ...overrides,
});

/**
 * Helper function to create mock route props
 */
export const createMockRoute = (overrides = {}) => ({
  key: 'test-route',
  name: 'test',
  params: {},
  ...overrides,
});

/**
 * Helper to reset all mocks in test contexts
 */
export const resetAllMocks = () => {
  Object.values(mockStoryTransitionContexts).forEach(context => {
    if (jest.isMockFunction(context.completeTransition)) {
      context.completeTransition.mockClear();
    }
    if (jest.isMockFunction(context.startTransition)) {
      context.startTransition.mockClear();
    }
  });
};

/**
 * Helper to wait for component updates
 */
export const waitForUpdate = async (ms = 0) => {
  const { act } = require('@testing-library/react-native');
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, ms));
  });
};

/**
 * Helper to simulate user interaction delays
 */
export const simulateUserDelay = async (ms = 100) => {
  await waitForUpdate(ms);
};

/**
 * Export commonly used testing utilities
 */
export { act, fireEvent, waitFor } from '@testing-library/react-native';
export { jest } from '@jest/globals';

// This file is a utility module, not a test file
// Adding a dummy test to satisfy Jest's requirement
describe('Test Wrapper Utilities', () => {
  it('should export renderWithProviders function', () => {
    expect(typeof renderWithProviders).toBe('function');
  });
});
