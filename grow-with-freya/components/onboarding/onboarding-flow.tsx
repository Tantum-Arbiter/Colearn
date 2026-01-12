import React, { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
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

  // Timeout cleanup refs
  const nextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onboardingScreens = [
    {
      title: "Welcome!",
      body: "Help your child's early development with our stories and activities",
      illustration: "family reading together",
      buttonLabel: "Next",
    },
    {
      title: "Why we limit screen time",
      body: "We encourage parents to use this app together with their child.",
      illustration: "parent hugging two children",
      buttonLabel: "Next",
    },
    {
      title: "Lets make it about them!",
      body: "What's your name? Personalize the experience by entering your name and creating an avatar!",
      illustration: "two children avatars (Tina and Bruno)",
      buttonLabel: "Next",
    },
    {
      title: "Record your voice!",
      body: "Narrate your stories with your voice. Comfort your child whilst you're not there.",
      illustration: "adult holding phone speaking",
      buttonLabel: "Next",
    },
    {
      title: "Backed by Research!",
      body: "This app is developed as part of a Masters degree study on child development, exploring how digital exercises can support a healthy parent-child relationship. Research suggests co-engagement and short usage sessions provide the greatest benefits.",
      illustration: "parent hugging child",
      buttonLabel: "Next",
    },
    {
      title: "Please Note",
      body: "This app is in active development. Some features may not work - please screenshot issues with a timestamp.\n\nThe backend sleeps when unused. If sign-in fails, wait 30 seconds. Story loading varies by network.\n\nStory content includes original works, AI-generated stories, and children's books used for educational research.",
      illustration: "disclaimer",
      buttonLabel: "Next",
    },
    {
      title: "Your Privacy",
      body: "Your data is secure. No personal information is collected or stored.\n\nSigning in via Google or Apple is safe and pseudonymized - we only receive an anonymous identifier, not your email or personal details.\n\nSession syncing across devices is fully anonymized. All data follows best security practices with encryption in transit and at rest.\n\nThis app is designed with privacy-first principles for you and your family.",
      illustration: "privacy",
      buttonLabel: "Next",
    },
    {
      title: "Help Us Improve",
      body: "Would you like to help us improve the app by sharing anonymous crash reports?\n\nCrash reports help us identify and fix issues quickly. They contain only technical information about what went wrong - no personal data, photos, or content.\n\nYou can change this setting anytime in Settings.",
      illustration: "crash-reporting",
      buttonLabel: "Next",
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
