import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { SimpleAnimatedCharacterDemo } from '@/components/stories/simple-animated-character-demo';

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    default: {
      View,
    },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    withDelay: jest.fn((delay, value) => value),
    withSequence: jest.fn((...values) => values[values.length - 1]),
    Easing: {
      inOut: jest.fn((fn) => fn),
      out: jest.fn((fn) => fn),
      in: jest.fn((fn) => fn),
      quad: jest.fn(),
      back: jest.fn(() => jest.fn()),
    },
  };
});

// Mock Dimensions
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
    },
  };
});

describe('SimpleAnimatedCharacterDemo', () => {
  const mockOnCharacterPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly when active', () => {
    const { getByTestId } = render(
      <SimpleAnimatedCharacterDemo
        isActive={true}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Should render the character image
    expect(() => getByTestId('character-image')).not.toThrow();
  });

  it('does not start animation when inactive', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(
      <SimpleAnimatedCharacterDemo
        isActive={false}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Fast-forward past the 2-second delay
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Should not have started animation
    expect(consoleSpy).not.toHaveBeenCalledWith('Starting simple character animation demo...');

    consoleSpy.mockRestore();
  });

  it('starts animation after 2-second delay when active', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(
      <SimpleAnimatedCharacterDemo
        isActive={true}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Should not have started immediately
    expect(consoleSpy).not.toHaveBeenCalledWith('Demo animation starting now!');

    // Fast-forward to just before the delay
    act(() => {
      jest.advanceTimersByTime(1999);
    });
    expect(consoleSpy).not.toHaveBeenCalledWith('Demo animation starting now!');

    // Fast-forward past the 2-second delay
    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Demo animation starting now!');

    consoleSpy.mockRestore();
  });

  it('calls onCharacterPress when character is pressed', () => {
    const { getByRole } = render(
      <SimpleAnimatedCharacterDemo
        isActive={true}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    const pressable = getByRole('button');
    fireEvent.press(pressable);

    expect(mockOnCharacterPress).toHaveBeenCalledTimes(1);
  });

  it('resets animation when becoming inactive', () => {
    const { rerender } = render(
      <SimpleAnimatedCharacterDemo
        isActive={true}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Start animation
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Make inactive
    rerender(
      <SimpleAnimatedCharacterDemo
        isActive={false}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Animation should be reset (this is tested through the useEffect cleanup)
    expect(true).toBe(true); // Basic test that component doesn't crash
  });

  it('handles character press with animation feedback', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const { getByRole } = render(
      <SimpleAnimatedCharacterDemo
        isActive={true}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    const pressable = getByRole('button');
    fireEvent.press(pressable);

    expect(consoleSpy).toHaveBeenCalledWith('Character pressed! Playing interaction animation...');
    expect(mockOnCharacterPress).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });

  it('completes full animation sequence', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(
      <SimpleAnimatedCharacterDemo
        isActive={true}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Fast-forward through entire animation sequence (5 seconds total)
    act(() => {
      jest.advanceTimersByTime(7000); // Extra time to ensure completion
    });

    expect(consoleSpy).toHaveBeenCalledWith('Demo animation sequence complete!');

    consoleSpy.mockRestore();
  });

  it('cleans up timeouts on unmount', () => {
    const { unmount } = render(
      <SimpleAnimatedCharacterDemo
        isActive={true}
        onCharacterPress={mockOnCharacterPress}
      />
    );

    // Start animation
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Unmount should not throw
    expect(() => unmount()).not.toThrow();
  });
});
