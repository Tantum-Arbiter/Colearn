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
import { MultiPageTransition } from '@/components/ui/coordinated-scroll-transition';
import { DefaultPage } from '@/components/default-page';



export default function RootLayout() {
  const colorScheme = useColorScheme();
  const {
    isAppReady,
    hasCompletedOnboarding,
    setCurrentScreen,
    shouldReturnToMainMenu,
    clearReturnToMainMenu
  } = useAppStore();
  type AppView = 'splash' | 'onboarding' | 'app';
  type PageKey = 'main' | 'stories' | 'sensory' | 'emotions' | 'bedtime' | 'screen_time' | 'settings';

  const [currentView, setCurrentView] = useState<AppView>('splash');
  const [currentPage, setCurrentPage] = useState<PageKey>('main');



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
      setCurrentView('app');
      setCurrentPage('main');
    }
  }, [isAppReady, hasCompletedOnboarding]);

  // Listen for return to main menu requests
  useEffect(() => {
    if (shouldReturnToMainMenu) {
      handleBackToMainMenu();
      clearReturnToMainMenu();
    }
  }, [shouldReturnToMainMenu]);

  const handleOnboardingComplete = () => {
    setCurrentView('app');
    setCurrentPage('main');
  };

  const handleMainMenuNavigate = (destination: string) => {
    // Map destination strings to PageKey types
    const destinationMap: Record<string, PageKey> = {
      'stories': 'stories',
      'sensory': 'sensory',
      'emotions': 'emotions',
      'bedtime': 'bedtime',
      'screen_time': 'screen_time',
      'settings': 'settings'
    };

    const pageKey = destinationMap[destination];
    if (pageKey) {
      setCurrentPage(pageKey);
      setCurrentScreen(destination);
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
  if (currentView === 'app') {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <MultiPageTransition
          currentPage={currentPage}
          pages={{
            main: <MainMenu onNavigate={handleMainMenuNavigate} />,
            stories: <SimpleStoryScreen onStorySelect={handleStorySelect} onBack={handleBackToMainMenu} />,
            sensory: <DefaultPage icon="sensory-icon" title="Sensory" onBack={handleBackToMainMenu} />,
            emotions: <DefaultPage icon="emotions-icon" title="Emotions" onBack={handleBackToMainMenu} />,
            bedtime: <DefaultPage icon="bedtime-icon" title="Bedtime" onBack={handleBackToMainMenu} />,
            screen_time: <DefaultPage icon="screentime-icon" title="Screen Time" onBack={handleBackToMainMenu} />,
            settings: <DefaultPage icon="gear" title="Settings" onBack={handleBackToMainMenu} />
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
