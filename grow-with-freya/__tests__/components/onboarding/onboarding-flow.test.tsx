import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';

const mockSetOnboardingComplete = jest.fn();
const mockSetCrashReportingEnabled = jest.fn();
const mockSetConsent = jest.fn();
const mockSetUserProfile = jest.fn();
const mockSetChildAge = jest.fn();

jest.mock('@/store/app-store', () => ({
  useAppStore: () => ({
    setOnboardingComplete: mockSetOnboardingComplete,
    setCrashReportingEnabled: mockSetCrashReportingEnabled,
    setConsent: mockSetConsent,
    setUserProfile: mockSetUserProfile,
    setChildAge: mockSetChildAge,
  }),
}));

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

// Mock OnboardingScreen -passes through customContent, isNextDisabled, onSkip and
// buttonLabel so we can drive the flow from the tests.
jest.mock('@/components/onboarding/onboarding-screen', () => ({
  OnboardingScreen: ({ title, buttonLabel, onNext, onSkip, currentStep, totalSteps, customContent, isNextDisabled }: any) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID="mock-screen">
        <Text>{title}</Text>
        <Text testID="step-indicator">{`Step ${currentStep} of ${totalSteps}`}</Text>
        {customContent}
        {onSkip && (
          <Pressable testID="skip-btn" onPress={onSkip}>
            <Text>skip</Text>
          </Pressable>
        )}
        <Pressable testID="next-btn" onPress={onNext} disabled={isNextDisabled}>
          <Text>{buttonLabel}</Text>
        </Pressable>
      </View>
    );
  },
}));

// Silence Alert.alert for the crash reporting dialog -auto-press "enable"
jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(
  ((...args: any[]) => {
    const buttons = args[2] as any[];
    buttons?.[1]?.onPress?.();
  }) as any
);

const TOTAL_STEPS = 5;
const CONSENT_STEP = 4;

function toStr(tree: ReturnType<typeof render>) {
  return JSON.stringify(tree.toJSON());
}

function findByTestId(tree: ReturnType<typeof render>, testID: string) {
  return tree.UNSAFE_root.findAll((n: any) => n.props.testID === testID).pop()!;
}

function advance() {
  act(() => { jest.advanceTimersByTime(400); });
}

/** Navigate to the consent step by pressing Skip on the intro. */
function renderAtConsentStep(onComplete: jest.Mock) {
  jest.useFakeTimers();
  const utils = render(<OnboardingFlow onComplete={onComplete} />);
  fireEvent.press(findByTestId(utils, 'skip-btn'));
  advance();
  return utils;
}

/** Navigate all the way to the profile step (consent accepted). */
function renderAtProfileStep(onComplete: jest.Mock) {
  const utils = renderAtConsentStep(onComplete);
  ['consent-checkbox-privacy', 'consent-checkbox-terms', 'consent-checkbox-data'].forEach((tid) => {
    fireEvent.press(findByTestId(utils, tid));
  });
  fireEvent.press(findByTestId(utils, 'next-btn'));
  advance();
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

  describe('navigation', () => {
    it('renders the first screen with step 1 of 5', () => {
      const tree = render(<OnboardingFlow onComplete={mockOnComplete} />);
      expect(toStr(tree)).toContain(`Step 1 of ${TOTAL_STEPS}`);
    });

    it('advances through the intro screens one at a time', () => {
      jest.useFakeTimers();
      const tree = render(<OnboardingFlow onComplete={mockOnComplete} />);

      fireEvent.press(findByTestId(tree, 'next-btn'));
      advance();

      expect(toStr(tree)).toContain(`Step 2 of ${TOTAL_STEPS}`);
    });

    it('skips the intro straight to the consent step', () => {
      const tree = renderAtConsentStep(mockOnComplete);
      expect(toStr(tree)).toContain(`Step ${CONSENT_STEP} of ${TOTAL_STEPS}`);
    });
  });

  describe('consent screen', () => {
    it('shows all three consent checkbox labels', () => {
      const s = toStr(renderAtConsentStep(mockOnComplete));

      expect(s).toContain('onboarding.screens.consent.checkboxes.privacy');
      expect(s).toContain('onboarding.screens.consent.checkboxes.terms');
      expect(s).toContain('onboarding.screens.consent.checkboxes.data');
    });

    it('shows view-policy links for privacy and terms', () => {
      const s = toStr(renderAtConsentStep(mockOnComplete));

      expect(s).toContain('onboarding.screens.consent.links.privacyPolicy');
      expect(s).toContain('onboarding.screens.consent.links.termsConditions');
    });

    it('cannot be skipped', () => {
      const tree = renderAtConsentStep(mockOnComplete);

      const skip = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'skip-btn');

      expect(skip).toHaveLength(0);
    });

    it('consent button is disabled until all boxes are checked', () => {
      const tree = renderAtConsentStep(mockOnComplete);
      const nextBtn = findByTestId(tree, 'next-btn');
      const isDisabled = nextBtn.props.disabled === true || nextBtn.props['aria-disabled'] === true;
      expect(isDisabled).toBe(true);
    });

    it('consent button enables after all three boxes are checked', () => {
      const tree = renderAtConsentStep(mockOnComplete);

      ['consent-checkbox-privacy', 'consent-checkbox-terms', 'consent-checkbox-data'].forEach((tid) => {
        fireEvent.press(findByTestId(tree, tid));
      });

      expect(findByTestId(tree, 'next-btn').props.disabled).toBeFalsy();
    });

    it('records parental consent when the consent step is completed', () => {
      renderAtProfileStep(mockOnComplete);

      expect(mockSetConsent).toHaveBeenCalledTimes(1);
    });

    it('opens privacy policy when link is tapped', () => {
      const tree = renderAtConsentStep(mockOnComplete);

      act(() => { fireEvent.press(findByTestId(tree, 'consent-link-privacy')); });

      expect(toStr(tree)).toContain('Privacy Policy Content');
    });

    it('opens terms screen when link is tapped', () => {
      const tree = renderAtConsentStep(mockOnComplete);

      act(() => { fireEvent.press(findByTestId(tree, 'consent-link-terms')); });

      expect(toStr(tree)).toContain('Terms Content');
    });
  });

  describe('profile screen', () => {
    it('is the final step', () => {
      const tree = renderAtProfileStep(mockOnComplete);
      expect(toStr(tree)).toContain(`Step ${TOTAL_STEPS} of ${TOTAL_STEPS}`);
    });

    it('saves the profile and completes onboarding when a nickname is entered', () => {
      const tree = renderAtProfileStep(mockOnComplete);

      fireEvent.changeText(findByTestId(tree, 'profile-nickname-input'), 'Freya');
      fireEvent.press(findByTestId(tree, 'next-btn'));

      expect(mockSetUserProfile).toHaveBeenCalledWith('Freya', 'girl', 'bear');
      expect(mockSetChildAge).toHaveBeenCalled();
      expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('stores the selected age range', () => {
      const tree = renderAtProfileStep(mockOnComplete);

      fireEvent.press(findByTestId(tree, 'age-select'));
      fireEvent.press(findByTestId(tree, 'age-option-4-6'));
      fireEvent.changeText(findByTestId(tree, 'profile-nickname-input'), 'Sam');
      fireEvent.press(findByTestId(tree, 'next-btn'));

      expect(mockSetChildAge).toHaveBeenCalledWith(60);
    });

    it('stores the selected avatar', () => {
      const tree = renderAtProfileStep(mockOnComplete);

      fireEvent.press(findByTestId(tree, 'avatar-option-dino'));
      fireEvent.changeText(findByTestId(tree, 'profile-nickname-input'), 'Sam');
      fireEvent.press(findByTestId(tree, 'next-btn'));

      expect(mockSetUserProfile).toHaveBeenCalledWith('Sam', 'girl', 'dino');
    });

    it('completes without saving a profile when set up later is chosen', () => {
      const tree = renderAtProfileStep(mockOnComplete);

      fireEvent.press(findByTestId(tree, 'skip-btn'));

      expect(mockSetUserProfile).not.toHaveBeenCalled();
      expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('does not save an empty nickname', () => {
      const tree = renderAtProfileStep(mockOnComplete);

      fireEvent.press(findByTestId(tree, 'next-btn'));

      expect(mockSetUserProfile).not.toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });
});
