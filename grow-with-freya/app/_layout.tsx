import React, { useEffect, useState, useRef } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, Dimensions } from 'react-native';
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
import { ApiClient } from '@/services/api-client';
import { backgroundSaveService } from '@/services/background-save-service';
import { StorySyncService } from '@/services/story-sync-service';
import { StoryLoader } from '@/services/story-loader';
import { AssetSyncService } from '@/services/asset-sync-service';
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
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://0de17ab586a0e7cd361706a1054022bb@o4510552687902720.ingest.de.sentry.io/4510552711364688',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});



export default Sentry.wrap(function RootLayout() {
  return (
    <GlobalSoundProvider>
      <ScreenTimeProvider>
        <StoryTransitionProvider>
          <AppContent />
        </StoryTransitionProvider>
      </ScreenTimeProvider>
    </GlobalSoundProvider>
  );
});

// Main app content that can access the story transition context
function AppContent() {
  // No longer using story transition context
  const colorScheme = useColorScheme();
  const {
    isAppReady,
    hasHydrated,
    hasCompletedOnboarding,
    showLoginAfterOnboarding,
    isGuestMode,
    setOnboardingComplete,
    setShowLoginAfterOnboarding,
    setGuestMode,
    setCurrentScreen,
    shouldReturnToMainMenu,
    clearReturnToMainMenu
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

  // Debug current view changes (disabled for performance)
  // useEffect(() => {
  //   console.log('Current view changed to:', currentView);
  // }, [currentView]);







  // Ensure app starts and stays in portrait mode (except for story reader)
  // Note: iPads don't support portrait-only locking, so we allow all orientations on tablets
  useEffect(() => {
    const initializeOrientation = async () => {
      try {
        const { width, height } = Dimensions.get('window');
        const isTablet = Math.min(width, height) >= 768; // iPad and larger

        if (isTablet) {
          // Allow all orientations on tablets
          await ScreenOrientation.unlockAsync();
          console.log('App initialized with unlocked orientation (tablet)');
        } else {
          // Lock to portrait orientation for phones
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          console.log('App initialized in portrait mode (phone)');
        }
      } catch (error) {
        console.warn('Failed to initialize orientation:', error);
      }
    };

    initializeOrientation();
  }, []);

  // Ensure portrait mode when not in story reader (phones only)
  useEffect(() => {
    const handleOrientation = async () => {
      try {
        const { width, height } = Dimensions.get('window');
        const isTablet = Math.min(width, height) >= 768;

        if (currentView !== 'story-reader') {
          if (isTablet) {
            // Allow all orientations on tablets
            await ScreenOrientation.unlockAsync();
            console.log('Unlocked orientation for tablet:', currentView);
          } else {
            // Lock to portrait on phones
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            console.log('Restored portrait mode for phone:', currentView);
          }
        }
      } catch (error) {
        console.warn('Failed to set orientation:', error);
      }
    };

    handleOrientation();
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



  // Initialize app state - logs disabled for performance

  useEffect(() => {
    const checkAuthAndSetView = async () => {
      // Wait for store to be hydrated from AsyncStorage before checking auth
      if (!hasHydrated) {
        console.log('Waiting for store hydration...');
        return;
      }

      if (!isAppReady) {
        setCurrentView('splash');
        return;
      }

      if (showLoginAfterOnboarding) {
        setCurrentView('login');
      } else if (!hasCompletedOnboarding) {
        setCurrentView('onboarding');
      } else if (isGuestMode) {
        // User is in guest mode - allow access without authentication (no backend calls)
        console.log('Guest mode - going to app without backend calls');
        setCurrentView('app');
        setCurrentPage('main');
      } else {
        // Skip auth check if we just completed a fresh login
        if (justLoggedInRef.current) {
          console.log('Skipping auth check - just completed fresh login');
          justLoggedInRef.current = false;
          setCurrentView('app');
          setCurrentPage('main');
          return;
        }

        // Only check authentication when not in guest mode
        try {
          // Add timeout to prevent hanging
          const authPromise = ApiClient.isAuthenticated();
          const timeoutPromise = new Promise<boolean>((resolve) => {
            setTimeout(() => {
              console.warn('Authentication check timeout - assuming not authenticated');
              resolve(false);
            }, 5000);
          });

          const isAuthenticated = await Promise.race([authPromise, timeoutPromise]);
          console.log('Authentication check:', { isAuthenticated, hasCompletedOnboarding });

          if (!isAuthenticated) {
            // User has completed onboarding but is not authenticated - show login screen
            console.log('User not authenticated - showing login');
            setShowLoginAfterOnboarding(true);
            setCurrentView('login');
          } else {
            // User is authenticated - prefetch stories and assets before showing app
            console.log('User authenticated - prefetching stories');
            try {
              await StorySyncService.prefetchStories();
              console.log('[_layout] Stories prefetched successfully');

              // Pre-populate StoryLoader cache for instant story list display
              await StoryLoader.getStories();
              console.log('[_layout] StoryLoader cache populated');

              // Prefetch cover images to ensure they're cached before showing story selection
              try {
                await StorySyncService.prefetchCoverImages();
                console.log('[_layout] Cover images prefetched successfully');

                // If stories were removed (assets no longer available on CMS), refresh the cache
                if (StorySyncService.lastPrefetchRemovedStories) {
                  console.log('[_layout] Stories removed due to unavailable assets, refreshing cache');
                  StoryLoader.invalidateCache();
                  await StoryLoader.getStories();
                }
              } catch (imageError) {
                console.error('[_layout] Cover image prefetch failed:', imageError);
                // Continue anyway - images will be downloaded on-demand
              }
            } catch (syncError) {
              console.error('[_layout] Story prefetch failed, will use offline mode:', syncError);
              // Continue anyway - app will use cached stories or local fallback
            }

            // Prefetch other assets in background (non-blocking)
            try {
              await AssetSyncService.prefetchAssets();
              console.log('[_layout] Assets prefetched successfully');
            } catch (assetError) {
              console.error('[_layout] Asset prefetch failed, will download on-demand:', assetError);
              // Continue anyway - app will download assets on-demand
            }

            // Now go to app
            console.log('User authenticated - going to app');
            setCurrentView('app');
            setCurrentPage('main');
          }
        } catch (error) {
          console.error('Authentication check error:', error);
          // On error, show login screen
          setShowLoginAfterOnboarding(true);
          setCurrentView('login');
        }
      }
    };

    checkAuthAndSetView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAppReady, hasHydrated, hasCompletedOnboarding, showLoginAfterOnboarding, isGuestMode]);

  // Refresh tokens when app comes back from background (skip for guest mode)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Wait for store to be hydrated before checking auth
        if (!hasHydrated) {
          console.log('App became active - waiting for store hydration');
          return;
        }

        // Skip authentication check for guest mode users
        if (isGuestMode) {
          console.log('App became active - guest mode, skipping auth check');
          return;
        }

        // App became active - check if tokens need refresh
        console.log('App became active - checking authentication');
        const isAuthenticated = await ApiClient.isAuthenticated();

        if (!isAuthenticated && hasCompletedOnboarding) {
          // Tokens expired and couldn't be refreshed - show login
          console.log('Authentication expired - showing login');
          setShowLoginAfterOnboarding(true);
          setCurrentView('login');
        } else if (isAuthenticated) {
          console.log('Authentication valid - tokens refreshed if needed');
          // Retry any pending background saves now that we're authenticated
          backgroundSaveService.retryPendingSaves();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [hasHydrated, hasCompletedOnboarding, isGuestMode, setShowLoginAfterOnboarding]);

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
      return;
    }

    // For story-reader, we need a special view
    if (currentPage === 'story-reader' && currentView !== 'story-reader') {
      setCurrentView('story-reader');
    }
    // For all other pages (main, stories, emotions, etc.), use 'app' view
    else if (currentPage !== 'story-reader' && currentView !== 'app') {
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
    setOnboardingComplete(true);
    setShowLoginAfterOnboarding(true);
  };

  // Track if we just completed a fresh login to skip redundant auth checks
  const justLoggedInRef = useRef(false);

  const handleLoginSuccess = () => {
    // Mark that we just logged in - skip the next auth check
    justLoggedInRef.current = true;
    setShowLoginAfterOnboarding(false);
    setCurrentView('app');
    setCurrentPage('main');
  };

  const handleLoginSkip = () => {
    setGuestMode(true);
    setShowLoginAfterOnboarding(false);
    setCurrentView('app');
    setCurrentPage('main');
  };



  const handleMainMenuNavigate = (destination: string) => {
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
    // DEBUG: Log story data to diagnose CMS image issues
    if (story.id.startsWith('cms-')) {
      console.log(`[_layout] DEBUG: Selected CMS story "${story.id}"`);
      console.log(`[_layout]   Cover: ${story.coverImage}`);
      console.log(`[_layout]   Pages: ${story.pages?.length || 0}`);
      story.pages?.forEach((page, idx) => {
        console.log(`[_layout]   Page ${idx}: ${page.backgroundImage || 'NO_IMAGE'}`);
      });
    }
    setSelectedStory(story);
    // Start thumbnail expansion animation first, then transition to story reader
    // The SimpleStoryScreen will handle the expansion animation and call handleStoryTransitionComplete
  };

  const handleStoryTransitionComplete = () => {
    setCurrentView('story-reader');
    setCurrentPage('story-reader');
  };

  const handleReadAnother = (story: Story) => {
    setSelectedStory(story);
    // Stay in story-reader view, just change the story
  };

  const handleBedtimeMusic = () => {
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

  if (currentView === 'login') {
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
          duration={500}
        />

        <StatusBar style="auto" />

      </ThemeProvider>
    );
  }

  // Fallback
  return <MainMenu onNavigate={handleMainMenuNavigate} />;
}