import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  OnboardingProgressBar,
  ONBOARDING_PROGRESS_FILL_MS,
  ONBOARDING_PROGRESS_SHEEN_MS,
  onboardingProgressFraction,
} from '@/components/onboarding/onboarding-progress-bar';
import { PROGRESS_GRADIENT } from '@/components/onboarding/onboarding-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: jest.fn(() => false) }));

type Tree = ReturnType<typeof render>;

function byTestId(tree: Tree, testID: string) {
  return tree.UNSAFE_queryAllByProps({ testID });
}

function flatStyle(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
}

function layoutTrack(tree: Tree, width: number) {
  act(() => {
    fireEvent(byTestId(tree, 'onboarding-progress-track')[0], 'layout', {
      nativeEvent: { layout: { width, height: 6 } },
    });
  });
}

function timingCallsWithDuration(duration: number) {
  return (withTiming as jest.Mock).mock.calls.filter(([, config]) => config?.duration === duration);
}

describe('OnboardingProgressBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useReducedMotion as jest.Mock).mockReturnValue(false);
  });

  describe('onboardingProgressFraction', () => {
    it.each([
      [1, 5, 0.2],
      [2, 5, 0.4],
      [5, 5, 1],
      [0, 5, 0],
      [-1, 5, 0],
      [7, 5, 1],
      [1, 0, 0],
    ])('step %i of %i fills %f of the track', (current, total, expected) => {
      const underTest = onboardingProgressFraction(current, total);

      expect(underTest).toBe(expected);
    });
  });

  it('announces itself as a progress bar with the current step', () => {
    const tree = render(<OnboardingProgressBar currentStep={2} totalSteps={5} />);

    const bar = byTestId(tree, 'onboarding-progress-bar')[0];

    expect(bar.props.accessibilityRole).toBe('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 5, now: 2 });
  });

  it('paints the gradient across the whole track so the colour warms as the bar fills', () => {
    const tree = render(<OnboardingProgressBar currentStep={2} totalSteps={5} />);

    layoutTrack(tree, 300);

    const gradient = byTestId(tree, 'onboarding-progress-gradient')[0];
    expect(gradient.props.colors).toEqual(PROGRESS_GRADIENT);
    expect(flatStyle(gradient.props.style).width).toBe(300);
  });

  describe('expanding', () => {
    it('eases the fill out to the step it has reached', () => {
      render(<OnboardingProgressBar currentStep={2} totalSteps={5} />);

      expect(withTiming).toHaveBeenCalledWith(0.4, expect.objectContaining({ duration: ONBOARDING_PROGRESS_FILL_MS }));
    });

    it('eases the fill again when the step moves on', () => {
      const tree = render(<OnboardingProgressBar currentStep={2} totalSteps={5} />);
      jest.clearAllMocks();

      tree.rerender(<OnboardingProgressBar currentStep={3} totalSteps={5} />);

      expect(withTiming).toHaveBeenCalledWith(0.6, expect.objectContaining({ duration: ONBOARDING_PROGRESS_FILL_MS }));
    });

    it('sweeps a sheen along the fill as it grows', () => {
      const tree = render(<OnboardingProgressBar currentStep={2} totalSteps={5} />);
      jest.clearAllMocks();

      tree.rerender(<OnboardingProgressBar currentStep={3} totalSteps={5} />);

      expect(timingCallsWithDuration(ONBOARDING_PROGRESS_SHEEN_MS)).toHaveLength(1);
      expect(timingCallsWithDuration(ONBOARDING_PROGRESS_SHEEN_MS)[0][0]).toBe(1);
    });

    it('draws back without a sheen when stepping back', () => {
      const tree = render(<OnboardingProgressBar currentStep={3} totalSteps={5} />);
      jest.clearAllMocks();

      tree.rerender(<OnboardingProgressBar currentStep={2} totalSteps={5} />);

      expect(withTiming).toHaveBeenCalledWith(0.4, expect.objectContaining({ duration: ONBOARDING_PROGRESS_FILL_MS }));
      expect(timingCallsWithDuration(ONBOARDING_PROGRESS_SHEEN_MS)).toHaveLength(0);
    });

    it('jumps straight to the step with no sheen when motion is reduced', () => {
      (useReducedMotion as jest.Mock).mockReturnValue(true);

      const tree = render(<OnboardingProgressBar currentStep={2} totalSteps={5} />);
      tree.rerender(<OnboardingProgressBar currentStep={3} totalSteps={5} />);

      expect(withTiming).not.toHaveBeenCalled();
    });
  });

  describe('fill geometry', () => {
    const animatedStyle = useAnimatedStyle as unknown as jest.Mock;
    const sharedValue = useSharedValue as unknown as jest.Mock;

    beforeEach(() => {
      animatedStyle.mockImplementation((worklet: () => unknown) => worklet());
      sharedValue.mockImplementation((initial = 0) => React.useRef({ value: initial }).current);
    });

    afterEach(() => {
      animatedStyle.mockImplementation(() => ({}));
      sharedValue.mockImplementation((initial = 0) => ({ value: initial }));
    });

    function fillWidth(tree: Tree) {
      return flatStyle(byTestId(tree, 'onboarding-progress-fill')[0].props.style).width;
    }

    it('fills the measured track in proportion to the step', () => {
      const tree = render(<OnboardingProgressBar currentStep={2} totalSteps={5} />);

      layoutTrack(tree, 300);

      expect(fillWidth(tree)).toBe(120);
    });

    it('reaches the end of the track on the last step', () => {
      const tree = render(<OnboardingProgressBar currentStep={5} totalSteps={5} />);

      layoutTrack(tree, 300);

      expect(fillWidth(tree)).toBe(300);
    });

    it('draws nothing before the track has been measured', () => {
      const tree = render(<OnboardingProgressBar currentStep={3} totalSteps={5} />);

      expect(fillWidth(tree)).toBe(0);
    });

    it('hides the sheen while it is at rest', () => {
      const tree = render(<OnboardingProgressBar currentStep={2} totalSteps={5} />);

      layoutTrack(tree, 300);

      expect(flatStyle(byTestId(tree, 'onboarding-progress-sheen')[0].props.style).opacity).toBe(0);
    });
  });
});
