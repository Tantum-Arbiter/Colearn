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
import { StyleSheet } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { RotatePromptOverlay, FALLBACK_DELAY_MS, ROTATE_PROMPT_BACK } from '@/components/stories/rotate-prompt-overlay';
import { TURN_SAMPLES_REQUIRED, TURN_SETTLE_MS } from '@/hooks/use-turn-to-landscape';

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

  it('should fire onTurned once the device has physically turned and settled', () => {
    render(<RotatePromptOverlay {...defaultProps} />);

    act(() => {
      for (let i = 0; i < TURN_SAMPLES_REQUIRED; i++) {
        emitAccelerometer({ x: 0.95, y: 0.05, z: 0.2 });
      }
    });

    expect(defaultProps.onTurned).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(TURN_SETTLE_MS);
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

  describe('the heading', () => {
    function styleOf(root: any, testID: string) {
      return StyleSheet.flatten(root.findAll((node: any) => node.props?.testID === testID && node.props?.style !== undefined)[0].props.style);
    }

    it('should stand the title on the back button\'s line, both centred in one row the button\'s height', () => {
      const { UNSAFE_root } = render(<RotatePromptOverlay {...defaultProps} />);

      const row = styleOf(UNSAFE_root, 'rotate-prompt-header');
      const back = styleOf(UNSAFE_root, 'rotate-prompt-back');
      const title = styleOf(UNSAFE_root, 'rotate-prompt-title');

      expect(row.height).toBe(ROTATE_PROMPT_BACK);
      expect(back).toEqual(expect.objectContaining({ width: ROTATE_PROMPT_BACK, height: ROTATE_PROMPT_BACK }));
      expect(title).toEqual(expect.objectContaining({ top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }));
    });

    it('should keep the title clear of the back button on both sides, so it stays centred', () => {
      const { UNSAFE_root } = render(<RotatePromptOverlay {...defaultProps} />);

      const title = styleOf(UNSAFE_root, 'rotate-prompt-title');
      const back = styleOf(UNSAFE_root, 'rotate-prompt-back-wrap');

      expect(title.left).toBe(title.right);
      expect(title.left).toBeGreaterThanOrEqual((back.left as number) + ROTATE_PROMPT_BACK);
    });

    it('should hold the title to one line, shrinking a long one rather than wrapping it under the button', () => {
      const { UNSAFE_root } = render(<RotatePromptOverlay {...defaultProps} />);

      const text = UNSAFE_root.findAll((node: any) => node.props?.adjustsFontSizeToFit === true)[0];

      expect(text.props.numberOfLines).toBe(1);
      expect(text.props.minimumFontScale).toBeLessThanOrEqual(0.75);
      expect(findByText(text, 'rotatePrompt.ready').length).toBeGreaterThan(0);
    });
  });

  it('should fire onBack from the back button', () => {
    const { UNSAFE_root } = render(<RotatePromptOverlay {...defaultProps} />);

    pressByLabel(UNSAFE_root, 'common.back');

    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });
});
