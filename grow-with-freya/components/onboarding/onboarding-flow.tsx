import React, { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OnboardingScreen } from './onboarding-screen';
import { useAppStore } from '@/store/app-store';
import { preloadOnboardingImages } from '@/services/image-preloader';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { setOnboardingComplete, setCrashReportingEnabled } = useAppStore();
  const { t } = useTranslation();

  // Timeout cleanup refs
  const nextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Screen keys for translation lookup
  const screenKeys = ['welcome', 'screenTime', 'personalize', 'voiceRecording', 'research', 'disclaimer', 'privacy', 'crashReporting'];

  const onboardingScreens = [
    {
      title: t('onboarding.screens.welcome.title'),
      body: t('onboarding.screens.welcome.body'),
      illustration: "family reading together",
      buttonLabel: t('onboarding.screens.welcome.button'),
    },
    {
      title: t('onboarding.screens.screenTime.title'),
      body: t('onboarding.screens.screenTime.body'),
      illustration: "parent hugging two children",
      buttonLabel: t('onboarding.screens.screenTime.button'),
    },
    {
      title: t('onboarding.screens.personalize.title'),
      body: t('onboarding.screens.personalize.body'),
      illustration: "two children avatars (Tina and Bruno)",
      buttonLabel: t('onboarding.screens.personalize.button'),
    },
    {
      title: t('onboarding.screens.voiceRecording.title'),
      body: t('onboarding.screens.voiceRecording.body'),
      illustration: "adult holding phone speaking",
      buttonLabel: t('onboarding.screens.voiceRecording.button'),
    },
    {
      title: t('onboarding.screens.research.title'),
      body: t('onboarding.screens.research.body'),
      illustration: "parent hugging child",
      buttonLabel: t('onboarding.screens.research.button'),
    },
    {
      title: t('onboarding.screens.disclaimer.title'),
      body: t('onboarding.screens.disclaimer.body'),
      illustration: "disclaimer",
      buttonLabel: t('onboarding.screens.disclaimer.button'),
    },
    {
      title: t('onboarding.screens.privacy.title'),
      body: t('onboarding.screens.privacy.body'),
      illustration: "privacy",
      buttonLabel: t('onboarding.screens.privacy.button'),
    },
    {
      title: t('onboarding.screens.crashReporting.title'),
      body: t('onboarding.screens.crashReporting.body'),
      illustration: "crash-reporting",
      buttonLabel: t('onboarding.screens.crashReporting.button'),
      showCrashReportingDialog: true,
    },
  ];

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
        'Enable Crash Reports?',
        'Anonymous crash reports help us fix bugs and improve the app. No personal data is collected.\n\nYou can change this anytime in Settings.',
        [
          {
            text: 'No Thanks',
            style: 'cancel',
            onPress: () => {
              setCrashReportingEnabled(false);
              console.log('[Onboarding] User declined crash reporting');
              proceedToNext();
            },
          },
          {
            text: 'Enable',
            style: 'default',
            onPress: () => {
              setCrashReportingEnabled(true);
              console.log('[Onboarding] User enabled crash reporting');
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
        console.log('Onboarding images preloaded:', result);
      } catch (error) {
        console.warn('Failed to preload onboarding images:', error);
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
    />
  );
}
