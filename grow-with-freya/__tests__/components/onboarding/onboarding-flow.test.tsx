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
  OnboardingScreen: ({ title, buttonLabel, onNext, onSkip, currentStep, totalSteps, customContent, isNextDisabled, backdrop }: any) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID="mock-screen">
        <Text>{title}</Text>
        <Text testID="step-indicator">{`Step ${currentStep} of ${totalSteps}`}</Text>
        {backdrop ? <View testID="mock-backdrop">{backdrop}</View> : null}
        {customContent}
        {onSkip && (
          <Pressable testID="skip-btn" onPress={onSkip}>
            <Text>skip</Text>
          </Pressable>
        )}
        <Pressable
          testID="next-btn"
          onPress={() => { if (!isNextDisabled) onNext(); }}
          disabled={isNextDisabled}
        >
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

/** testIDs of the hero art the shell was handed on its backdrop layer. */
function backdropHeroIds(tree: ReturnType<typeof render>) {
  const holder = tree.UNSAFE_root
    .findAll((n: any) => n.props.testID === 'mock-backdrop')
    .pop();
  if (!holder) return [];
  const ids = holder
    .findAll((n: any) => typeof n.props.testID === 'string' && n.props.testID.endsWith('-hero'))
    .map((n: any) => n.props.testID as string);
  return Array.from(new Set(ids));
}

/** testIDs of any hero art the page rendered inline, outside the backdrop. */
function contentHeroIds(tree: ReturnType<typeof render>) {
  const inBackdrop = new Set<unknown>(
    tree.UNSAFE_root
      .findAll((n: any) => n.props.testID === 'mock-backdrop')
      .flatMap((holder: any) => holder.findAll(() => true))
  );
  const ids = tree.UNSAFE_root
    .findAll((n: any) => typeof n.props.testID === 'string' && n.props.testID.endsWith('-hero'))
    .filter((n: any) => !inBackdrop.has(n))
    .map((n: any) => n.props.testID as string);
  return Array.from(new Set(ids));
}

/** The disabled flag lands on `disabled` or `aria-disabled` depending on which
 *  node of the Pressable is queried. */
function nextIsDisabled(tree: ReturnType<typeof render>) {
  const btn = findByTestId(tree, 'next-btn');
  return btn.props.disabled === true || btn.props['aria-disabled'] === true;
}

/** Step forward `count` times from the first intro screen. */
function renderAtIntroStep(onComplete: jest.Mock, count: number) {
  jest.useFakeTimers();
  const utils = render(<OnboardingFlow onComplete={onComplete} />);
  for (let i = 0; i < count; i += 1) {
    fireEvent.press(findByTestId(utils, 'next-btn'));
    advance();
  }
  return utils;
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

  // Every illustrated step must hand its hero to the shell's backdrop layer, so
  // the art fades in with the header instead of sliding up late with the
  // content -- page 3 used to render its hero inline and entered differently.
  describe('hero backdrops', () => {
    it.each([
      [0, 'together-hero'],
      [1, 'safe-hero'],
      [2, 'ready-hero'],
    ])('hands the shell the hero for intro step %i', (steps, heroId) => {
      const tree = renderAtIntroStep(mockOnComplete, steps as number);

      expect(backdropHeroIds(tree)).toEqual([heroId]);
    });

    it.each([[0], [1], [2]])(
      'renders no hero inline in the content of intro step %i',
      (steps) => {
        const tree = renderAtIntroStep(mockOnComplete, steps as number);

        expect(contentHeroIds(tree)).toEqual([]);
      }
    );

    it('gives the consent step no backdrop', () => {
      const tree = renderAtConsentStep(mockOnComplete);

      expect(backdropHeroIds(tree)).toEqual([]);
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

      expect(nextIsDisabled(tree)).toBe(true);
    });

    it('consent button enables after all three boxes are checked', () => {
      const tree = renderAtConsentStep(mockOnComplete);

      ['consent-checkbox-privacy', 'consent-checkbox-terms', 'consent-checkbox-data'].forEach((tid) => {
        fireEvent.press(findByTestId(tree, tid));
      });

      expect(nextIsDisabled(tree)).toBe(false);
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

    // interpolating the nickname grew the button past the edge of the screen
    it('labels continue plainly rather than naming the child', () => {
      const tree = renderAtProfileStep(mockOnComplete);

      fireEvent.changeText(findByTestId(tree, 'profile-nickname-input'), 'Bartholomewwww');

      const body = toStr(tree);
      expect(body).toContain('onboardingV2.profile.continue');
      // the interpolating key is what grew the button; it must be gone
      expect(body).not.toContain('continueAs');
    });

    it('cannot be skipped', () => {
      const tree = renderAtProfileStep(mockOnComplete);

      const skip = tree.UNSAFE_root.findAll((n: any) => n.props.testID === 'skip-btn');

      expect(skip).toHaveLength(0);
    });

    it('keeps continue disabled until the nickname reaches the minimum length', () => {
      const tree = renderAtProfileStep(mockOnComplete);
      const input = findByTestId(tree, 'profile-nickname-input');

      expect(nextIsDisabled(tree)).toBe(true);

      fireEvent.changeText(input, 'A');
      expect(nextIsDisabled(tree)).toBe(true);

      fireEvent.changeText(input, 'Al');
      expect(nextIsDisabled(tree)).toBe(false);
    });

    it('treats a whitespace-only nickname as missing', () => {
      const tree = renderAtProfileStep(mockOnComplete);

      fireEvent.changeText(findByTestId(tree, 'profile-nickname-input'), '   ');

      expect(nextIsDisabled(tree)).toBe(true);
    });

    it('cannot be completed without a nickname', () => {
      const tree = renderAtProfileStep(mockOnComplete);

      fireEvent.press(findByTestId(tree, 'next-btn'));

      expect(mockSetUserProfile).not.toHaveBeenCalled();
      expect(mockSetOnboardingComplete).not.toHaveBeenCalled();
      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });
});
