import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';

import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store/app-store';
import { useBackgroundMusic } from '@/hooks/use-background-music';
import { AppSplashScreen } from '@/components/splash-screen';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { MainMenu } from '@/components/main-menu';
import { SimpleStoryScreen } from '@/components/stories/simple-story-screen';
import { StoryBookReader } from '@/components/stories/story-book-reader';
import { Story } from '@/types/story';
import { preloadCriticalImages, preloadSecondaryImages } from '@/services/image-preloader';
import { MultiPageTransition } from '@/components/ui/coordinated-scroll-transition';
import { EnhancedPageTransition } from '@/components/ui/enhanced-page-transition';
import { DefaultPage } from '@/components/default-page';
import { StoryTransitionProvider } from '@/contexts/story-transition-context';



export default function RootLayout() {
  return (
    <StoryTransitionProvider>
      <AppContent />
    </StoryTransitionProvider>
  );
}

// Main app content that can access the story transition context
function AppContent() {
  // No longer using story transition context
  const colorScheme = useColorScheme();
  const {
    isAppReady,
    hasCompletedOnboarding,
    setCurrentScreen,
    shouldReturnToMainMenu,
    clearReturnToMainMenu
  } = useAppStore();

  // Initialize background music
  const { fadeIn, isLoaded: musicLoaded, isPlaying } = useBackgroundMusic();

  type AppView = 'splash' | 'onboarding' | 'app' | 'main' | 'stories' | 'story-reader';
  type PageKey = 'main' | 'stories' | 'story-reader' | 'sensory' | 'emotions' | 'bedtime' | 'screen_time' | 'settings';

  const [currentView, setCurrentView] = useState<AppView>('splash');
  const [currentPage, setCurrentPage] = useState<PageKey>('main');
  const [currentScreen, setCurrentScreenState] = useState<string>('main');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  // Ensure app starts and stays in portrait mode (except for story reader)
  useEffect(() => {
    const initializeOrientation = async () => {
      try {
        // Lock to portrait orientation for the main app
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        console.log('App initialized in portrait mode');
      } catch (error) {
        console.warn('Failed to initialize portrait orientation:', error);
      }
    };

    initializeOrientation();
  }, []);

  // Ensure portrait mode when not in story reader
  useEffect(() => {
    if (currentView !== 'story-reader') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
        .then(() => console.log('Restored portrait mode for:', currentView))
        .catch(error => console.warn('Failed to restore portrait mode:', error));
    }
  }, [currentView]);



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
        }, 3000); // PERFORMANCE: Increased delay to prevent blocking
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

  // Start background music once when transitioning from splash (only once!)
  useEffect(() => {
    const startBackgroundMusic = async () => {
      if (musicLoaded && currentView === 'onboarding' && !isPlaying) {
        try {
          // Start background music with a gentle fade-in - only when first leaving splash
          await fadeIn(3000); // 3 second fade-in
          console.log('Background music started for the journey');
        } catch (error) {
          console.warn('Failed to start background music:', error);
        }
      }
    };

    // Add a small delay to ensure the screen has rendered
    const timer = setTimeout(startBackgroundMusic, 500);
    return () => clearTimeout(timer);
  }, [currentView, musicLoaded, fadeIn, isPlaying]);

  // Sync view with page changes
  useEffect(() => {
    if (currentPage === 'main' && currentView !== 'main') {
      setCurrentView('main');
    } else if (currentPage === 'stories' && currentView !== 'stories') {
      setCurrentView('stories');
    } else if (currentPage === 'story-reader' && currentView !== 'story-reader') {
      setCurrentView('story-reader');
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
    setCurrentView('app');
    setCurrentPage('main');
  };

  const handleMainMenuNavigate = (destination: string) => {
    console.log('Navigating to:', destination);

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
      setCurrentScreenState(destination);
      setCurrentScreen(destination);

      // Ensure currentView is set correctly for stories
      if (destination === 'stories') {
        setCurrentView('stories');
      }
    }
  };

  // Helper function to create DefaultPage components
  const createDefaultPage = (icon: string, title: string) => (
    <DefaultPage
      icon={icon}
      title={title}
      onBack={handleBackToMainMenu}
    />
  );

  const handleBackToMainMenu = () => {
    setCurrentPage('main');
    setSelectedStory(null);
  };

  const handleBackToStories = () => {
    setCurrentView('stories');
    setCurrentPage('stories');
    setSelectedStory(null);
  };

  const handleStorySelect = (story: Story) => {
    console.log('Selected story with transition:', story.title);
    setSelectedStory(story);

    // Start thumbnail expansion animation first, then transition to story reader
    // The SimpleStoryScreen will handle the expansion animation and call handleStoryTransitionComplete
  };

  const handleStoryTransitionComplete = () => {
    console.log('Thumbnail expansion complete - transitioning to story reader');
    setCurrentView('story-reader');
    setCurrentPage('story-reader');
  };

  const handleReadAnother = (story: Story) => {
    console.log('Reading another story:', story.title);
    setSelectedStory(story);
    // Stay in story-reader view, just change the story
  };

  const handleBedtimeMusic = () => {
    console.log('Opening bedtime music from story completion');
    setCurrentView('main');
    setCurrentPage('main');
    setSelectedStory(null);
    // The main menu will handle navigation to bedtime
  };

  if (currentView === 'splash') {
    return <AppSplashScreen />;
  }

  if (currentView === 'onboarding') {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Handle story reader view
  if (currentView === 'story-reader' && selectedStory) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StoryBookReader
          story={selectedStory}
          onExit={handleBackToStories}
          onReadAnother={handleReadAnother}
          onBedtimeMusic={handleBedtimeMusic}
        />
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  // Handle main app navigation with coordinated scroll transitions
  if (currentView === 'app') {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <EnhancedPageTransition
          currentPage={currentPage as string}
          pages={{
            main: <MainMenu onNavigate={handleMainMenuNavigate} />,
            stories: <SimpleStoryScreen
              onStorySelect={handleStorySelect}
              onStoryTransitionComplete={handleStoryTransitionComplete}
              selectedStory={selectedStory}
              onBack={handleBackToMainMenu}
            />,
            sensory: createDefaultPage('brain', 'Sensory'),
            emotions: createDefaultPage('heart', 'Emotions'),
            bedtime: createDefaultPage('moon', 'Bedtime Music'),
            screen_time: createDefaultPage('clock', 'Screen Time'),
            settings: createDefaultPage('gear', 'Settings'),
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
