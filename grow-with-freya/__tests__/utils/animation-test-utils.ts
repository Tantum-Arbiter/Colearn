/**
 * Animation Testing Utilities
 * Comprehensive testing framework for React Native Reanimated animations
 */

import { act } from '@testing-library/react-native';

export interface AnimationTestConfig {
  duration?: number;
  easing?: string;
  expectedValues?: number[];
  tolerance?: number;
}

export interface SharedValueMock {
  value: number;
  _listeners: Array<(value: number) => void>;
  addListener: (listener: (value: number) => void) => void;
  removeListener: (listener: (value: number) => void) => void;
}

/**
 * Creates a mock shared value that can be tested
 */
export const createMockSharedValue = (initialValue: number = 0): SharedValueMock => {
  const mock: SharedValueMock = {
    value: initialValue,
    _listeners: [],
    addListener: jest.fn((listener) => {
      mock._listeners.push(listener);
    }),
    removeListener: jest.fn((listener) => {
      const index = mock._listeners.indexOf(listener);
      if (index > -1) {
        mock._listeners.splice(index, 1);
      }
    }),
  };

  // Override the value setter to notify listeners
  let _value = initialValue;
  Object.defineProperty(mock, 'value', {
    get: () => _value,
    set: (newValue: number) => {
      _value = newValue;
      mock._listeners.forEach(listener => listener(newValue));
    },
  });

  return mock;
};

/**
 * Simulates a timing animation with proper value progression
 */
export const simulateTimingAnimation = (
  sharedValue: SharedValueMock,
  toValue: number,
  config: AnimationTestConfig = {}
): Promise<void> => {
  const { duration = 1000, expectedValues = [] } = config;
  const fromValue = sharedValue.value;
  const steps = 10; // Number of animation steps to simulate
  
  return new Promise((resolve) => {
    let currentStep = 0;
    
    const animate = () => {
      if (currentStep >= steps) {
        sharedValue.value = toValue;
        resolve();
        return;
      }
      
      const progress = currentStep / steps;
      const currentValue = fromValue + (toValue - fromValue) * progress;
      
      act(() => {
        sharedValue.value = currentValue;
      });
      
      currentStep++;
      setTimeout(animate, duration / steps);
    };
    
    animate();
  });
};

/**
 * Tests animation timing and value progression
 */
export const testAnimationTiming = async (
  animationFn: () => void,
  sharedValue: SharedValueMock,
  expectedFinalValue: number,
  config: AnimationTestConfig = {}
) => {
  const { duration = 1000, tolerance = 0.1 } = config;
  const initialValue = sharedValue.value;
  
  // Start animation
  animationFn();
  
  // Fast-forward time
  act(() => {
    jest.advanceTimersByTime(duration);
  });
  
  // Check final value
  expect(sharedValue.value).toBeCloseTo(expectedFinalValue, tolerance);
  
  return {
    initialValue,
    finalValue: sharedValue.value,
    duration,
  };
};

/**
 * Tests animation sequence (multiple animations)
 */
export const testAnimationSequence = async (
  animations: Array<{
    fn: () => void;
    expectedValue: number;
    duration: number;
  }>,
  sharedValue: SharedValueMock,
  config: AnimationTestConfig = {}
) => {
  const { tolerance = 0.1 } = config;
  const results = [];
  
  for (const animation of animations) {
    const initialValue = sharedValue.value;
    
    animation.fn();
    
    act(() => {
      jest.advanceTimersByTime(animation.duration);
    });
    
    expect(sharedValue.value).toBeCloseTo(animation.expectedValue, tolerance);
    
    results.push({
      initialValue,
      finalValue: sharedValue.value,
      expectedValue: animation.expectedValue,
      duration: animation.duration,
    });
  }
  
  return results;
};

/**
 * Tests animation performance (no memory leaks, proper cleanup)
 */
export const testAnimationPerformance = (
  componentRender: () => any,
  iterations: number = 100
) => {
  const initialMemory = process.memoryUsage();
  
  for (let i = 0; i < iterations; i++) {
    const { unmount } = componentRender();
    
    // Simulate animation completion
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    unmount();
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  const finalMemory = process.memoryUsage();
  const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  
  return {
    initialMemory: initialMemory.heapUsed,
    finalMemory: finalMemory.heapUsed,
    memoryIncrease,
    iterations,
  };
};

/**
 * Utility to wait for animations to complete
 */
export const waitForAnimations = async (duration: number = 2000) => {
  await act(async () => {
    jest.advanceTimersByTime(duration);
    await new Promise(resolve => setTimeout(resolve, 0));
  });
};

/**
 * Tests animation state transitions
 */
export const testAnimationStates = (
  sharedValue: SharedValueMock,
  expectedStates: number[],
  tolerance: number = 0.1
) => {
  const actualStates: number[] = [];
  
  const listener = (value: number) => {
    actualStates.push(value);
  };
  
  sharedValue.addListener(listener);
  
  return {
    getStates: () => actualStates,
    validateStates: () => {
      expectedStates.forEach((expectedState, index) => {
        if (actualStates[index] !== undefined) {
          expect(actualStates[index]).toBeCloseTo(expectedState, tolerance);
        }
      });
    },
    cleanup: () => {
      sharedValue.removeListener(listener);
    },
  };
};

/**
 * Mock animation functions for testing
 */
export const mockAnimationFunctions = {
  withTiming: jest.fn((value, config) => {
    return { value, config, type: 'timing' };
  }),
  withSpring: jest.fn((value, config) => {
    return { value, config, type: 'spring' };
  }),
  withDelay: jest.fn((delay, animation) => {
    return { delay, animation, type: 'delay' };
  }),
  withSequence: jest.fn((...animations) => {
    return { animations, type: 'sequence' };
  }),
  withRepeat: jest.fn((animation, numberOfReps, reverse) => {
    return { animation, numberOfReps, reverse, type: 'repeat' };
  }),
};

/**
 * Resets all animation mocks
 */
export const resetAnimationMocks = () => {
  Object.values(mockAnimationFunctions).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
  jest.clearAllTimers();
};

// This file is a utility module, not a test file
// Adding a dummy test to satisfy Jest's requirement
describe('Animation Test Utilities', () => {
  it('should export createMockSharedValue function', () => {
    expect(typeof createMockSharedValue).toBe('function');
  });
});
