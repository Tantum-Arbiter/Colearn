import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store/app-store';
import { AppSplashScreen } from '@/components/splash-screen';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { MainMenu } from '@/components/main-menu';
import { SimpleStoryScreen } from '@/components/stories/simple-story-screen';
import { Story } from '@/types/story';
import { preloadCriticalImages, preloadSecondaryImages } from '@/services/image-preloader';
import { VerticalPageTransition } from '@/components/ui/coordinated-scroll-transition';



export default function RootLayout() {
  const colorScheme = useColorScheme();
  const {
    isAppReady,
    hasCompletedOnboarding,
    setCurrentScreen,
    shouldReturnToMainMenu,
    clearReturnToMainMenu
  } = useAppStore();
  const [currentView, setCurrentView] = useState<'splash' | 'onboarding' | 'main' | 'stories'>('splash');
  const [currentPage, setCurrentPage] = useState<'main' | 'stories'>('main');



  // Preload critical images immediately when app starts
  useEffect(() => {
    const initializeImagePreloading = async () => {
      try {
        // Preload critical images first (including bear image)
        const criticalResult = await preloadCriticalImages();
        console.log('Critical images preloaded:', criticalResult);

        // Preload secondary images in background after a short delay
        setTimeout(async () => {
          const secondaryResult = await preloadSecondaryImages();
          console.log('Secondary images preloaded:', secondaryResult);
        }, 1000);
      } catch (error) {
        console.warn('Image preloading failed:', error);
      }
    };

    initializeImagePreloading();
  }, []);

  useEffect(() => {
    if (!isAppReady) {
      setCurrentView('splash');
    } else if (!hasCompletedOnboarding) {
      setCurrentView('onboarding');
    } else {
      setCurrentView('main');
      setCurrentPage('main');
    }
  }, [isAppReady, hasCompletedOnboarding]);

  // Sync currentView with currentPage for main app navigation
  useEffect(() => {
    if (currentPage === 'main' && currentView !== 'main') {
      setCurrentView('main');
    } else if (currentPage === 'stories' && currentView !== 'stories') {
      setCurrentView('stories');
    }
  }, [currentPage]);

  // Listen for return to main menu requests
  useEffect(() => {
    if (shouldReturnToMainMenu) {
      handleBackToMainMenu();
      clearReturnToMainMenu();
    }
  }, [shouldReturnToMainMenu]);

  const handleOnboardingComplete = () => {
    setCurrentView('main');
  };

  const handleMainMenuNavigate = (destination: string) => {
    if (destination === 'stories') {
      setCurrentPage('stories');
      setCurrentScreen('stories');
    }
  };

  const handleBackToMainMenu = () => {
    setCurrentPage('main');
  };

  const handleStorySelect = (story: Story) => {
    console.log('Selected story:', story.title);
    // TODO: Navigate to story reader/player
  };

  if (currentView === 'splash') {
    return <AppSplashScreen />;
  }

  if (currentView === 'onboarding') {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Handle main app navigation with coordinated scroll transitions
  if (currentView === 'main' || currentView === 'stories') {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <VerticalPageTransition
          currentPage={currentPage}
          pages={{
            main: <MainMenu onNavigate={handleMainMenuNavigate} />,
            stories: <SimpleStoryScreen onStorySelect={handleStorySelect} onBack={handleBackToMainMenu} />
          }}
          duration={800}
        />
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  // Fallback
  return <MainMenu onNavigate={handleMainMenuNavigate} />;
}
