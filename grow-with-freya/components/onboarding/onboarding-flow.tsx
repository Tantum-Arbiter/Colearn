import React, { useState, useRef, useEffect } from 'react';
import { Alert, View, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OnboardingScreen } from './onboarding-screen';
import { useAppStore } from '@/store/app-store';
import { preloadOnboardingImages } from '@/services/image-preloader';
import { ThemedText } from '../themed-text';
import { PrivacyPolicyScreen } from '@/components/account/privacy-policy-screen';
import { TermsConditionsScreen } from '@/components/account/terms-conditions-screen';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentData, setConsentData] = useState(false);
  const [legalView, setLegalView] = useState<'none' | 'privacy' | 'terms'>('none');
  const { setOnboardingComplete, setCrashReportingEnabled, setConsent } = useAppStore();
  const { t } = useTranslation();

  // Timeout cleanup refs
  const nextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onboardingScreens = [
    {
      title: t('onboarding.screens.welcome.title'),
      body: t('onboarding.screens.welcome.body'),
      illustration: 'family reading together',
      buttonLabel: t('onboarding.screens.welcome.button'),
    },
    {
      title: t('onboarding.screens.howItWorks.title'),
      body: t('onboarding.screens.howItWorks.body'),
      illustration: 'how-it-works',
      buttonLabel: t('onboarding.screens.howItWorks.button'),
    },
    {
      title: t('onboarding.screens.family.title'),
      body: t('onboarding.screens.family.body'),
      illustration: 'parent hugging child',
      buttonLabel: t('onboarding.screens.family.button'),
    },
    {
      title: t('onboarding.screens.privacy.title'),
      body: t('onboarding.screens.privacy.body'),
      illustration: 'privacy',
      buttonLabel: t('onboarding.screens.privacy.button'),
      showCrashReportingDialog: true,
    },
    {
      title: t('onboarding.screens.consent.title'),
      body: t('onboarding.screens.consent.body'),
      illustration: 'consent',
      buttonLabel: t('onboarding.screens.consent.button'),
    },
  ];

  const allConsentsChecked = consentPrivacy && consentTerms && consentData;
  const isConsentStep = currentStep === onboardingScreens.length - 1;

  // Proceed to next step (or complete onboarding)
  const proceedToNext = () => {
    setIsTransitioning(true);
    if (nextTimeoutRef.current) {
      clearTimeout(nextTimeoutRef.current);
    }
    nextTimeoutRef.current = setTimeout(() => {
      if (currentStep < onboardingScreens.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Store parental consent before completing
        const policyVersion = t('onboarding.screens.consent.policyVersion');
        setConsent(policyVersion);
        setOnboardingComplete(true);
        onComplete();
      }
      setIsTransitioning(false);
    }, 300);
  };

  const handleNext = () => {
    const currentScreenData = onboardingScreens[currentStep];

    // Show crash reporting consent dialog on that specific screen
    if (currentScreenData.showCrashReportingDialog) {
      Alert.alert(
        t('onboarding.crashReportingDialog.title'),
        t('onboarding.crashReportingDialog.body'),
        [
          {
            text: t('onboarding.crashReportingDialog.noThanks'),
            style: 'cancel',
            onPress: () => {
              setCrashReportingEnabled(false);
              // User declined crash reporting
              proceedToNext();
            },
          },
          {
            text: t('onboarding.crashReportingDialog.enable'),
            style: 'default',
            onPress: () => {
              setCrashReportingEnabled(true);
              // User enabled crash reporting
              proceedToNext();
            },
          },
        ],
        { cancelable: false }
      );
      return;
    }

    proceedToNext();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setIsTransitioning(true);
      if (prevTimeoutRef.current) {
        clearTimeout(prevTimeoutRef.current);
      }
      prevTimeoutRef.current = setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  // Preload onboarding images when component mounts
  useEffect(() => {
    const loadOnboardingImages = async () => {
      try {
        const result = await preloadOnboardingImages();
        // Onboarding images preloaded
      } catch (error) {
        // Non-critical: images will load on demand
      }
    };

    loadOnboardingImages();
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (nextTimeoutRef.current) {
        clearTimeout(nextTimeoutRef.current);
      }
      if (prevTimeoutRef.current) {
        clearTimeout(prevTimeoutRef.current);
      }
    };
  }, []);

  const currentScreen = onboardingScreens[currentStep];

  // Render consent checkboxes for the final screen
  const renderConsentContent = () => {
    const checkboxItems = [
      { key: 'privacy' as const, checked: consentPrivacy, toggle: () => setConsentPrivacy(!consentPrivacy), link: () => setLegalView('privacy') },
      { key: 'terms' as const, checked: consentTerms, toggle: () => setConsentTerms(!consentTerms), link: () => setLegalView('terms') },
      { key: 'data' as const, checked: consentData, toggle: () => setConsentData(!consentData) },
    ];

    return (
      <View style={consentStyles.container}>
        {checkboxItems.map((item) => (
          <Pressable
            key={item.key}
            style={consentStyles.checkboxRow}
            onPress={item.toggle}
          >
            <View style={[consentStyles.checkbox, item.checked && consentStyles.checkboxChecked]}>
              {item.checked && <ThemedText style={consentStyles.checkmark}>✓</ThemedText>}
            </View>
            <View style={consentStyles.checkboxTextContainer}>
              <ThemedText style={consentStyles.checkboxLabel}>
                {t(`onboarding.screens.consent.checkboxes.${item.key}`)}
              </ThemedText>
              {item.link && (
                <Pressable onPress={item.link}>
                  <ThemedText style={consentStyles.linkText}>
                    {t(`onboarding.screens.consent.links.${item.key === 'privacy' ? 'privacyPolicy' : 'termsConditions'}`)}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  // Show legal screens when user taps a link
  if (legalView === 'privacy') {
    return <PrivacyPolicyScreen onBack={() => setLegalView('none')} />;
  }
  if (legalView === 'terms') {
    return <TermsConditionsScreen onBack={() => setLegalView('none')} />;
  }

  return (
    <OnboardingScreen
      title={currentScreen.title}
      body={currentScreen.body}
      illustration={currentScreen.illustration}
      buttonLabel={currentScreen.buttonLabel}
      onNext={handleNext}
      onPrevious={handlePrevious}
      currentStep={currentStep + 1}
      totalSteps={onboardingScreens.length}
      isTransitioning={isTransitioning}
      customContent={isConsentStep ? renderConsentContent() : undefined}
      isNextDisabled={isConsentStep && !allConsentsChecked}
    />
  );
}

const consentStyles = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4ECDC4',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabel: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
  linkText: {
    color: '#4ECDC4',
    fontSize: 13,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
});
