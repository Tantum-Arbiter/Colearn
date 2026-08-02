/**
 * Tests for RotatePromptOverlay -the Screen 7 "turn the screen together"
 * prompt shown before the book opens in landscape.
 *
 * Key behaviors tested:
 * 1. Prompt copy renders
 * 2. Physical landscape turn (accelerometer) fires onTurned
 * 3. Fallback button appears only after the delay and fires onOpenAnyway
 * 4. Back button fires onBack
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Accelerometer } from 'expo-sensors';
import { RotatePromptOverlay, FALLBACK_DELAY_MS } from '@/components/stories/rotate-prompt-overlay';
import { TURN_SAMPLES_REQUIRED } from '@/hooks/use-turn-to-landscape';

const emitAccelerometer = (measurement: { x: number; y: number; z: number }) => {
  (Accelerometer as unknown as { __emit: (m: object) => void }).__emit(measurement);
};

function findByText(root: any, text: string) {
  return root.findAll((node: any) =>
    Array.isArray(node.children) &&
    node.children.some((child: unknown) => typeof child === 'string' && (child as string).includes(text))
  );
}

function pressByLabel(root: any, label: string) {
  const matches = root.findAll(
    (node: any) => node.props?.accessibilityLabel === label && typeof node.props?.onPress === 'function'
  );
  expect(matches.length).toBeGreaterThan(0);
  act(() => {
    matches[0].props.onPress();
  });
}

const defaultProps = {
  bookRect: { x: 100, y: 200, width: 180, height: 240 },
  onTurned: jest.fn(),
  onOpenAnyway: jest.fn(),
  onBack: jest.fn(),
};

describe('RotatePromptOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (Accelerometer as unknown as { listeners: Set<unknown> }).listeners.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render the prompt copy', () => {
    const { UNSAFE_root } = render(<RotatePromptOverlay {...defaultProps} />);

    expect(findByText(UNSAFE_root, 'rotatePrompt.ready').length).toBeGreaterThan(0);
    expect(findByText(UNSAFE_root, 'rotatePrompt.turnTogether').length).toBeGreaterThan(0);
    expect(findByText(UNSAFE_root, 'rotatePrompt.openWhenSideways').length).toBeGreaterThan(0);
  });

  it('should fire onTurned when the device physically turns to landscape', () => {
    render(<RotatePromptOverlay {...defaultProps} />);

    act(() => {
      for (let i = 0; i < TURN_SAMPLES_REQUIRED; i++) {
        emitAccelerometer({ x: 0.95, y: 0.05, z: 0.2 });
      }
    });

    expect(defaultProps.onTurned).toHaveBeenCalledTimes(1);
  });

  it('should hide the fallback button before the delay elapses', () => {
    const { UNSAFE_root } = render(<RotatePromptOverlay {...defaultProps} />);

    expect(findByText(UNSAFE_root, 'rotatePrompt.openForMe').length).toBe(0);
  });

  it('should show the fallback button after the delay and fire onOpenAnyway', () => {
    const { UNSAFE_root } = render(<RotatePromptOverlay {...defaultProps} />);

    act(() => {
      jest.advanceTimersByTime(FALLBACK_DELAY_MS + 50);
    });

    expect(findByText(UNSAFE_root, 'rotatePrompt.openForMe').length).toBeGreaterThan(0);
    pressByLabel(UNSAFE_root, 'rotatePrompt.openForMe');

    expect(defaultProps.onOpenAnyway).toHaveBeenCalledTimes(1);
  });

  it('should fire onBack from the back button', () => {
    const { UNSAFE_root } = render(<RotatePromptOverlay {...defaultProps} />);

    pressByLabel(UNSAFE_root, 'common.back');

    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });
});
