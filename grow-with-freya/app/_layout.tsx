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
import { LoginScreen } from '@/components/auth/login-screen';
import { AccountScreen } from '@/components/account/account-screen';
import { MainMenu } from '@/components/main-menu';
import { SimpleStoryScreen } from '@/components/stories/simple-story-screen';
import { StoryBookReader } from '@/components/stories/story-book-reader';
import { MusicScreen } from '@/components/music';
import { EmotionsScreen } from '@/components/emotions';
import { ScreenTimeProvider } from '@/components/screen-time/screen-time-provider';



import { Story } from '@/types/story';
import { preloadCriticalImages, preloadSecondaryImages } from '@/services/image-preloader';
import { EnhancedPageTransition } from '@/components/ui/enhanced-page-transition';

import { StoryTransitionProvider } from '@/contexts/story-transition-context';
import { GlobalSoundProvider } from '@/contexts/global-sound-context';



export default function RootLayout() {
  return (
    <GlobalSoundProvider>
      <ScreenTimeProvider>
        <StoryTransitionProvider>
          <AppContent />
        </StoryTransitionProvider>
      </ScreenTimeProvider>
    </GlobalSoundProvider>
  );
}

// Main app content that can access the story transition context
function AppContent() {
  // No longer using story transition context
  const colorScheme = useColorScheme();
  const {
    isAppReady,
    hasCompletedOnboarding,
    showLoginAfterOnboarding,
    setOnboardingComplete,
    setLoginComplete,
    setShowLoginAfterOnboarding,
    setAppReady,
    setCurrentScreen,
    shouldReturnToMainMenu,
    clearReturnToMainMenu,
    clearPersistedStorage,
    resetAppForTesting
  } = useAppStore();



  // Initialize background music
  const { fadeIn, isLoaded: musicLoaded, isPlaying } = useBackgroundMusic();

  // Track if we've already started background music to prevent auto-restart after manual pause
  const [hasStartedBackgroundMusic, setHasStartedBackgroundMusic] = useState(false);

  type AppView = 'splash' | 'onboarding' | 'login' | 'app' | 'main' | 'stories' | 'story-reader' | 'account';
  type PageKey = 'main' | 'stories' | 'story-reader' | 'emotions' | 'bedtime' | 'account';

  const [currentView, setCurrentView] = useState<AppView>('splash');
  const [currentPage, setCurrentPage] = useState<PageKey>('main');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  // Debug current view changes
  useEffect(() => {
    console.log('📱 Current view changed to:', currentView);
  }, [currentView]);







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



  // TEMPORARY: Force clear persisted state on every app start for debugging
  useEffect(() => {
    const forceReset = async () => {
      console.log('🧹 TEMPORARY: Forcing app reset for debugging...');
      await clearPersistedStorage();
      resetAppForTesting();

      // Give a moment for state to reset
      setTimeout(() => {
        setAppReady(true);
      }, 100);
    };

    forceReset();
  }, []);

  // Initialize app state
  useEffect(() => {
    console.log('🚀 App initializing...');
    console.log('🚀 Initial app state:', {
      isAppReady,
      hasCompletedOnboarding,
      showLoginAfterOnboarding,
      currentView
    });
    // App should start with splash screen
    if (!isAppReady) {
      console.log('🚀 App not ready, showing splash');
    }
  }, []);

  useEffect(() => {
    console.log('🔄 App state check:', { isAppReady, hasCompletedOnboarding, showLoginAfterOnboarding });
    console.log('🔄 Current view will be set based on state...');
    console.log('🔄 Current view before update:', currentView);

    if (!isAppReady) {
      console.log('🔄 Setting view to splash - app not ready');
      setCurrentView('splash');
    } else if (showLoginAfterOnboarding) {
      console.log('🔄 Setting view to login - show login after onboarding');
      setCurrentView('login');
    } else if (!hasCompletedOnboarding) {
      console.log('🔄 Setting view to onboarding - not completed');
      console.log('🔄 About to call setCurrentView("onboarding")');
      setCurrentView('onboarding');
      console.log('🔄 Called setCurrentView("onboarding")');
    } else {
      console.log('🔄 Setting view to app - all conditions met');
      setCurrentView('app');
      setCurrentPage('main');
    }
  }, [isAppReady, hasCompletedOnboarding, showLoginAfterOnboarding]);

  // Start background music once when transitioning from splash (only once!)
  useEffect(() => {
    const startBackgroundMusic = async () => {
      if (musicLoaded && (currentView === 'onboarding' || currentView === 'app') && !isPlaying && !hasStartedBackgroundMusic) {
        try {
          // Start background music with a gentle fade-in - only when first leaving splash
          await fadeIn(3000); // 3 second fade-in
          setHasStartedBackgroundMusic(true); // Mark that we've started music
          console.log('Background music started for the journey');
        } catch (error) {
          console.warn('Failed to start background music:', error);
        }
      }
    };

    // Add a small delay to ensure the screen has rendered
    const timer = setTimeout(startBackgroundMusic, 500);
    return () => clearTimeout(timer);
  }, [currentView, musicLoaded, fadeIn, isPlaying, hasStartedBackgroundMusic]);

  // Sync view with page changes (but don't interfere with onboarding/login flow)
  useEffect(() => {
    // Don't sync if we're in onboarding, login, or splash views
    if (currentView === 'splash' || currentView === 'onboarding' || currentView === 'login') {
      console.log('🔄 Skipping view sync - in flow view:', currentView);
      return;
    }

    // For story-reader, we need a special view
    if (currentPage === 'story-reader' && currentView !== 'story-reader') {
      console.log('🔄 Syncing view to story-reader');
      setCurrentView('story-reader');
    }
    // For all other pages (main, stories, emotions, etc.), use 'app' view
    else if (currentPage !== 'story-reader' && currentView !== 'app') {
      console.log('🔄 Syncing view to app');
      setCurrentView('app');
    }
  }, [currentPage, currentView]);

  // Listen for return to main menu requests
  useEffect(() => {
    if (shouldReturnToMainMenu) {
      handleBackToMainMenu();
      clearReturnToMainMenu();
    }
  }, [shouldReturnToMainMenu, clearReturnToMainMenu]);



  const handleOnboardingComplete = () => {
    console.log('Onboarding completed - going to login');
    setOnboardingComplete(true);
    setShowLoginAfterOnboarding(true);
  };

  const handleLoginSuccess = () => {
    console.log('Login completed - going to app');
    setShowLoginAfterOnboarding(false);
  };

  const handleLoginSkip = () => {
    console.log('Login skipped - going to app');
    setShowLoginAfterOnboarding(false);
  };



  const handleMainMenuNavigate = (destination: string) => {
    console.log('Navigating to:', destination);

    // Map destination strings to PageKey types
    const destinationMap: Record<string, PageKey> = {
      'stories': 'stories',
      'emotions': 'emotions',
      'bedtime': 'bedtime',
      'account': 'account'
    };

    const pageKey = destinationMap[destination];
    if (pageKey) {
      setCurrentPage(pageKey);
      setCurrentScreen(destination);
    }
  };

  const handleAccountBack = () => {
    setCurrentPage('main');
  };



  const handleBackToMainMenu = () => {
    setCurrentPage('main');
    setSelectedStory(null);
  };

  const handleBackToStories = () => {
    setCurrentView('app');
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

  console.log('🎬 RENDER: currentView =', currentView);

  if (currentView === 'splash') {
    console.log('🎬 RENDER: Returning splash screen');
    return <AppSplashScreen />;
  }

  if (currentView === 'onboarding') {
    console.log('🎬 RENDER: Returning onboarding flow');
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (currentView === 'login') {
    console.log('🎬 RENDER: Returning login screen');
    return <LoginScreen onSuccess={handleLoginSuccess} onSkip={handleLoginSkip} />;
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
            main: <MainMenu onNavigate={handleMainMenuNavigate} isActive={currentPage === 'main'} />,
            stories: <SimpleStoryScreen
              onStorySelect={handleStorySelect}
              onStoryTransitionComplete={handleStoryTransitionComplete}
              selectedStory={selectedStory}
              onBack={handleBackToMainMenu}
            />,

            emotions: <EmotionsScreen onBack={handleBackToMainMenu} />,
            bedtime: <MusicScreen onBack={handleBackToMainMenu} />,

            account: <AccountScreen onBack={handleAccountBack} />,
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
