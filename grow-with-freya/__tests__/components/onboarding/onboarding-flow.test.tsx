import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';

const mockSetOnboardingComplete = jest.fn();
const mockSetCrashReportingEnabled = jest.fn();
const mockSetConsent = jest.fn();

// Mock the app store
jest.mock('@/store/app-store', () => ({
  useAppStore: () => ({
    setOnboardingComplete: mockSetOnboardingComplete,
    setCrashReportingEnabled: mockSetCrashReportingEnabled,
    setConsent: mockSetConsent,
  }),
}));

// Mock legal content components (used inside modal)
jest.mock('@/components/account/privacy-policy-screen', () => ({
  PrivacyPolicyContent: () => {
    const { View, Text } = require('react-native');
    return <View><Text>Privacy Policy Content</Text></View>;
  },
}));

jest.mock('@/components/account/terms-conditions-screen', () => ({
  TermsConditionsContent: () => {
    const { View, Text } = require('react-native');
    return <View><Text>Terms Content</Text></View>;
  },
}));

// Mock OnboardingScreen -passes through customContent, isNextDisabled, and
// buttonLabel so we can test the consent checkboxes rendered by OnboardingFlow.
jest.mock('@/components/onboarding/onboarding-screen', () => ({
  OnboardingScreen: ({ title, buttonLabel, onNext, currentStep, totalSteps, customContent, isNextDisabled }: any) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID="mock-screen">
        <Text>{title}</Text>
        <Text testID="step-indicator">{`Step ${currentStep} of ${totalSteps}`}</Text>
        {customContent}
        <Pressable testID="next-btn" onPress={onNext} disabled={isNextDisabled}>
          <Text>{buttonLabel}</Text>
        </Pressable>
      </View>
    );
  },
}));

// Silence Alert.alert for the crash reporting dialog
jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(
  ((...args: any[]) => {
    const buttons = args[2] as any[];
    buttons?.[1]?.onPress?.();
  }) as any
);

/** Serialise the rendered tree to a string for content assertions. */
function toStr(tree: ReturnType<typeof render>) {
  return JSON.stringify(tree.toJSON());
}

/** Find the mock's "Next" button via UNSAFE_root testID lookup. */
function findNextBtn(tree: ReturnType<typeof render>) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'next-btn').pop()!;
}

/**
 * Helper: navigate to the consent screen (step 4/4).
 * Uses fake timers to advance past the 300ms transition setTimeout.
 */
function renderAtConsentStep(onComplete: jest.Mock) {
  jest.useFakeTimers();
  const utils = render(<OnboardingFlow onComplete={onComplete} />);

  for (let i = 0; i < 3; i++) {
    const btn = findNextBtn(utils);
    fireEvent.press(btn);
    // Wrap timer advancement in act() so React flushes state updates
    act(() => { jest.advanceTimersByTime(400); });
  }

  return utils;
}

describe('OnboardingFlow', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the first screen with step 1/4', () => {
    const tree = render(<OnboardingFlow onComplete={mockOnComplete} />);
    expect(toStr(tree)).toContain('Step 1 of 4');
  });

  it('navigates to the consent screen (step 4/4)', () => {
    const tree = renderAtConsentStep(mockOnComplete);
    expect(toStr(tree)).toContain('Step 4 of 4');
  });

  describe('Consent screen (step 4)', () => {
    it('shows all three consent checkbox labels', () => {
      const tree = renderAtConsentStep(mockOnComplete);
      const s = toStr(tree);

      expect(s).toContain('onboarding.screens.consent.checkboxes.privacy');
      expect(s).toContain('onboarding.screens.consent.checkboxes.terms');
      expect(s).toContain('onboarding.screens.consent.checkboxes.data');
    });

    it('shows view-policy links for privacy and terms', () => {
      const tree = renderAtConsentStep(mockOnComplete);
      const s = toStr(tree);

      expect(s).toContain('onboarding.screens.consent.links.privacyPolicy');
      expect(s).toContain('onboarding.screens.consent.links.termsConditions');
    });

    it('consent button is disabled until all boxes are checked', () => {
      const tree = renderAtConsentStep(mockOnComplete);
      const nextBtn = findNextBtn(tree);
      // RN Pressable renders disabled as aria-disabled in test env
      const isDisabled = nextBtn.props.disabled === true || nextBtn.props['aria-disabled'] === true;
      expect(isDisabled).toBe(true);
    });

    it('consent button enables after all three boxes are checked', () => {
      const tree = renderAtConsentStep(mockOnComplete);

      // Press each checkbox using their testIDs
      ['consent-checkbox-privacy', 'consent-checkbox-terms', 'consent-checkbox-data'].forEach((tid) => {
        const cb = tree.UNSAFE_root.findAll((n: any) => n.props.testID === tid).pop()!;
        fireEvent.press(cb);
      });

      const nextBtn = findNextBtn(tree);
      expect(nextBtn.props.disabled).toBeFalsy();
    });

    it('button label is the consent button translation key', () => {
      const tree = renderAtConsentStep(mockOnComplete);
      // i18n mock returns raw key -in production this resolves to "I Agree"
      expect(toStr(tree)).toContain('onboarding.screens.consent.button');
    });

    it('opens privacy policy when link is tapped', () => {
      const tree = renderAtConsentStep(mockOnComplete);

      const link = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'consent-link-privacy').pop()!;
      act(() => { fireEvent.press(link); });

      expect(toStr(tree)).toContain('Privacy Policy Content');
    });

    it('opens terms screen when link is tapped', () => {
      const tree = renderAtConsentStep(mockOnComplete);

      const link = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'consent-link-terms').pop()!;
      act(() => { fireEvent.press(link); });

      expect(toStr(tree)).toContain('Terms Content');
    });
  });
});
