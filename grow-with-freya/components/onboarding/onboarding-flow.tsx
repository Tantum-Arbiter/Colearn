import React, { useState, useRef, useEffect } from 'react';
import { OnboardingScreen } from './onboarding-screen';
import { useAppStore } from '@/store/app-store';
import { preloadOnboardingImages } from '@/services/image-preloader';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { setOnboardingComplete } = useAppStore();

  // Timeout cleanup refs
  const nextTimeoutRef = useRef<NodeJS.Timeout>();
  const prevTimeoutRef = useRef<NodeJS.Timeout>();

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
      body: "Our product and content is created with input from children development experts and researchers. Every child deserves the best start to their life, that's why we're entirely free.",
      illustration: "parent hugging child",
      buttonLabel: "Let's begin…",
    },
  ];

  const handleNext = () => {
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
