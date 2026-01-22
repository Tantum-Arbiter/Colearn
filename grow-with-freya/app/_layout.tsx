import React, { useEffect, useState, useRef } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, Dimensions, View, Platform, DevSettings } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import 'react-native-reanimated';
// Initialize i18n service - must be imported before components that use translations
import '@/services/i18n';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store/app-store';
import { Logger } from '@/utils/logger';
import { useBackgroundMusic } from '@/hooks/use-background-music';
import { AppSplashScreen } from '@/components/splash-screen';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { LoginScreen } from '@/components/auth/login-screen';
import { AccountScreen } from '@/components/account/account-screen';
import { MainMenu } from '@/components/main-menu';
import { ApiClient } from '@/services/api-client';
import { backgroundSaveService } from '@/services/background-save-service';
import { SimpleStoryScreen } from '@/components/stories/simple-story-screen';
import { StoryBookReader } from '@/components/stories/story-book-reader';
import { MusicScreen } from '@/components/music';
import { EmotionsScreen } from '@/components/emotions';
import { ScreenTimeProvider } from '@/components/screen-time/screen-time-provider';
import { Story } from '@/types/story';
import { preloadCriticalImages, preloadSecondaryImages } from '@/services/image-preloader';
import { EnhancedPageTransition } from '@/components/ui/enhanced-page-transition';
import { StoryTransitionProvider, useStoryTransition } from '@/contexts/story-transition-context';
import { GlobalSoundProvider } from '@/contexts/global-sound-context';
import { TutorialProvider } from '@/contexts/tutorial-context';
import { updateSentryConsent } from '@/services/sentry-service';
import { StartupLoadingScreen } from '@/components/startup-loading-screen';
import { AuthCheckingScreen } from '@/components/auth/auth-checking-screen';
// Import notification service early to register notification handler
// This ensures notifications are handled properly even when app is in background
import '@/services/notification-service';
// Import reminder service to trigger initialization and reschedule notifications on app startup
import { reminderService } from '@/services/reminder-service';

// On Android in dev mode, disable Fast Refresh to prevent ExoPlayer threading errors
// ExoPlayer callbacks fire on background threads which crash during Fast Refresh
if (__DEV__ && Platform.OS === 'android') {
  try {
    // DevSettings is available in dev mode but has incomplete TypeScript types
    const devSettings = DevSettings as { setHotLoadingEnabled?: (enabled: boolean) => void };
    if (devSettings && devSettings.setHotLoadingEnabled) {
      devSettings.setHotLoadingEnabled(false);
    }
  } catch {
    // Ignore if DevSettings is not available
  }
}

const log = Logger.create('Layout');

// Force initialization of reminder service (loads reminders and reschedules notifications)
// This is a no-op reference to ensure the singleton is created at app startup
void reminderService;

// Note: Sentry is now initialized conditionally based on user consent
// See sentry-service.ts for the implementation



export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <GlobalSoundProvider>
        <TutorialProvider>
          <ScreenTimeProvider>
            <StoryTransitionProvider>
              <AppContent />
            </StoryTransitionProvider>
          </ScreenTimeProvider>
        </TutorialProvider>
      </GlobalSoundProvider>
    </View>
  );
}

// Main app content that can access the story transition context
function AppContent() {
  // Access story transition context to know when to show story reader
  const {
    selectedStory: transitionStory,
    selectedMode: transitionMode,
    selectedVoiceOver: transitionVoiceOver,
    setOnBeginCallback,
    setOnReturnToModeSelectionCallback
  } = useStoryTransition();

  const colorScheme = useColorScheme();
  const {
    isAppReady,
    hasHydrated,
    hasCompletedOnboarding,
    showLoginAfterOnboarding,
    isGuestMode,
    crashReportingEnabled,
    setOnboardingComplete,
    setShowLoginAfterOnboarding,
    setGuestMode,
    setCurrentScreen,
    shouldReturnToMainMenu,
    clearReturnToMainMenu
  } = useAppStore();

  // Initialize or disable Sentry based on user consent
  // This runs after store hydration and whenever consent changes
  useEffect(() => {
    if (hasHydrated) {
      updateSentryConsent(crashReportingEnabled);
    }
  }, [hasHydrated, crashReportingEnabled]);



  // Initialize background music
  const { fadeIn, isLoaded: musicLoaded, isPlaying } = useBackgroundMusic();

  // Track if we've already started background music to prevent auto-restart after manual pause
  const [hasStartedBackgroundMusic, setHasStartedBackgroundMusic] = useState(false);

  type AppView = 'splash' | 'onboarding' | 'login' | 'loading' | 'checking-auth' | 'app' | 'main' | 'stories' | 'story-reader' | 'account';
  type PageKey = 'main' | 'stories' | 'story-reader' | 'emotions' | 'bedtime' | 'account';

  const [currentView, setCurrentView] = useState<AppView>('splash');
  const [currentPage, setCurrentPage] = useState<PageKey>('main');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  // Story being read - kept separate so it persists during book closing animation
  const [storyBeingRead, setStoryBeingRead] = useState<Story | null>(null);
  const [showStoryReader, setShowStoryReader] = useState(false);

  // Track if sync is in progress to prevent premature navigation
  const syncInProgressRef = useRef(false);

  // Track the previous view before checking auth (to restore if auth succeeds)
  const previousViewRef = useRef<AppView>('app');

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
        } else {
          // Lock to portrait orientation for phones
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }
      } catch (error) {
        log.warn('Failed to initialize orientation:', error);
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
          } else {
            // Lock to portrait on phones
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          }
        }
      } catch (error) {
        log.warn('Failed to set orientation:', error);
      }
    };

    handleOrientation();
  }, [currentView]);



  // Preload critical images immediately when app starts
  useEffect(() => {
    const initializeImagePreloading = async () => {
      try {
        // Preload critical images first (including bear image)
        await preloadCriticalImages();

        // Preload secondary images in background after a short delay
        setTimeout(async () => {
          await preloadSecondaryImages();
        }, 3000); // PERFORMANCE: Increased delay to prevent blocking
      } catch (error) {
        log.warn('Image preloading failed:', error);
      }
    };

    initializeImagePreloading();
  }, []);



  // Initialize app state - logs disabled for performance

  useEffect(() => {
    const checkAuthAndSetView = async () => {
      // Wait for store to be hydrated from AsyncStorage before checking auth
      if (!hasHydrated) {
        return;
      }

      if (!isAppReady) {
        setCurrentView('splash');
        return;
      }

      // Don't interfere with the loading screen - it handles its own transition
      // This prevents race conditions where the auth check fires during sync
      // Use both state and ref checks for maximum safety
      if (currentView === 'loading' || syncInProgressRef.current) {
        log.debug('[Auth] Sync in progress - skipping auth check');
        return;
      }

      if (showLoginAfterOnboarding) {
        setCurrentView('login');
      } else if (!hasCompletedOnboarding) {
        setCurrentView('onboarding');
      } else if (isGuestMode) {
        // User is in guest mode - allow access without authentication (no backend calls)
        setCurrentView('app');
        setCurrentPage('main');
      } else {
        // If we just logged in or sync is in progress, don't interfere
        // The StartupLoadingScreen will call onComplete() when sync finishes
        if (justLoggedInRef.current || syncInProgressRef.current) {
          log.info('[Auth] Skipping auth check - login/sync in progress, waiting for sync');
          // Don't change view - StartupLoadingScreen handles the transition
          return;
        }

        // Only check authentication when not in guest mode
        try {
          // Add timeout to prevent hanging
          const authPromise = ApiClient.isAuthenticated();
          const timeoutPromise = new Promise<boolean>((resolve) => {
            setTimeout(() => {
              log.warn('[Layout] Authentication check timeout - assuming not authenticated');
              resolve(false);
            }, 5000);
          });

          const isAuthenticated = await Promise.race([authPromise, timeoutPromise]);

          if (!isAuthenticated) {
            // User has completed onboarding but is not authenticated - show login screen
            setShowLoginAfterOnboarding(true);
            setCurrentView('login');
          } else {
            // User is authenticated - show loading screen with sync animation
            // StartupLoadingScreen handles the sync and transitions to main menu on complete
            setCurrentView('loading');
          }
        } catch (error) {
          log.error('Authentication check error:', error);
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
          return;
        }

        // Skip authentication check for guest mode users
        if (isGuestMode) {
          return;
        }

        // Skip if we just logged in or sync is in progress
        // Avoid race conditions where AppState changes during login/sync flow
        if (justLoggedInRef.current || syncInProgressRef.current) {
          log.info('[AppState] Skipping auth check - login/sync in progress');
          return;
        }

        // Skip if we're not in the app view (e.g., already on login, splash, onboarding)
        // Only show auth checking screen when we're resuming from actual app usage
        if (currentView !== 'app' && currentView !== 'story-reader') {
          return;
        }

        // Store current view so we can restore it after successful auth check
        previousViewRef.current = currentView;

        // Show loading screen while checking authentication
        log.info('[AppState] Checking authentication after resume...');
        setCurrentView('checking-auth');

        try {
          // App became active - check if tokens need refresh
          const isAuthenticated = await ApiClient.isAuthenticated();

          if (!isAuthenticated && hasCompletedOnboarding) {
            // Tokens expired and couldn't be refreshed - show login
            log.info('[AppState] Not authenticated after resume - redirecting to login');
            setShowLoginAfterOnboarding(true);
            setCurrentView('login');
          } else if (isAuthenticated) {
            // Auth successful - restore previous view
            log.info('[AppState] Authentication valid - restoring app view');
            setCurrentView(previousViewRef.current);
            // Retry any pending background saves now that we're authenticated
            backgroundSaveService.retryPendingSaves();
          } else {
            // Edge case: not authenticated but no onboarding completed
            // Just restore previous view
            setCurrentView(previousViewRef.current);
          }
        } catch (error) {
          // On any unexpected error, restore previous view to prevent getting stuck
          log.error('[AppState] Error checking authentication:', error);
          setCurrentView(previousViewRef.current);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [hasHydrated, hasCompletedOnboarding, isGuestMode, setShowLoginAfterOnboarding, currentView]);

  // Start background music when main menu loads (after sign in or app restart)
  useEffect(() => {
    const startBackgroundMusic = async () => {
      // Only start music when entering the main app (main menu) - not during onboarding
      if (musicLoaded && currentView === 'app' && !isPlaying && !hasStartedBackgroundMusic) {
        try {
          // Start background music with a gentle fade-in
          await fadeIn(3000); // 3 second fade-in
          setHasStartedBackgroundMusic(true); // Mark that we've started music
          console.log('[BackgroundMusic] Started playing on main menu load');
        } catch (error) {
          log.warn('Failed to start background music:', error);
        }
      }
    };

    // Add a small delay to ensure the screen has rendered
    const timer = setTimeout(startBackgroundMusic, 500);
    return () => clearTimeout(timer);
  }, [currentView, musicLoaded, fadeIn, isPlaying, hasStartedBackgroundMusic]);

  // Sync view with page changes (but don't interfere with onboarding/login flow or story reader)
  useEffect(() => {
    // Don't interfere with these views - they manage their own transitions
    if (currentView === 'splash' || currentView === 'onboarding' || currentView === 'login' || currentView === 'loading') {
      return;
    }

    // Don't interfere with story reader - it manages its own view state
    if (showStoryReader || currentView === 'story-reader') {
      return;
    }

    // For all other cases, ensure we're in 'app' view
    if (currentView !== 'app') {
      setCurrentView('app');
    }
  }, [currentPage, currentView, showStoryReader]);

  // Listen for return to main menu requests
  useEffect(() => {
    if (shouldReturnToMainMenu) {
      handleBackToMainMenu();
      clearReturnToMainMenu();
    }
  }, [shouldReturnToMainMenu, clearReturnToMainMenu]);

  // Register callback for when user taps "Begin" in mode selection
  useEffect(() => {
    const handleBegin = () => {
      // Use the transition's selected story for the story reader
      if (transitionStory) {
        setStoryBeingRead(transitionStory);
        setShowStoryReader(true);
        setCurrentView('story-reader');
      }
    };

    // Use wrapper to avoid React's setState(fn) behavior interpreting handleBegin as an updater
    setOnBeginCallback(() => () => handleBegin());

    return () => {
      setOnBeginCallback(null);
    };
  }, [transitionStory, setOnBeginCallback]);

  // Register callback for when returning to mode selection from story reader
  useEffect(() => {
    const handleReturnToModeSelection = () => {
      // Hide the story reader but keep the story selected
      setShowStoryReader(false);
      setCurrentView('app');
      // Ensure we're on the stories page (not main menu)
      setCurrentPage('stories');
      // Don't clear storyBeingRead - we'll need it if they choose to read again
    };

    setOnReturnToModeSelectionCallback(() => () => handleReturnToModeSelection());

    return () => {
      setOnReturnToModeSelectionCallback(null);
    };
  }, [setOnReturnToModeSelectionCallback]);

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
    setShowLoginAfterOnboarding(true);
  };

  // Track if we just completed a fresh login to skip redundant auth checks
  const justLoggedInRef = useRef(false);

  const handleLoginSuccess = () => {
    // Mark that we just logged in and sync is starting
    // This prevents race conditions on Android where AppState changes during login
    justLoggedInRef.current = true;
    syncInProgressRef.current = true;
    log.info('[Auth] Login successful - starting sync');

    setShowLoginAfterOnboarding(false);
    // Show StartupLoadingScreen which runs BatchSyncService for efficient batch sync
    // The loading screen's onComplete will clear both flags
    setCurrentView('loading');
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
    // Story reader's exit animation has already completed by the time this is called
    // Just clean up and switch views
    setShowStoryReader(false);
    setStoryBeingRead(null);
    setSelectedStory(null);
    setCurrentView('app');
    // currentPage stays 'stories' - we never change it when entering/exiting story reader
  };

  const handleStorySelect = (story: Story) => {
    setSelectedStory(story);
    // Start thumbnail expansion animation first, then transition to story reader
    // The SimpleStoryScreen will handle the expansion animation and call handleStoryTransitionComplete
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

  // Loading screen shown during content sync after app restart
  // Shows spinning circle → checkmark animation, then transitions to main menu
  if (currentView === 'loading') {
    // Set ref immediately when loading screen renders
    syncInProgressRef.current = true;
    return (
      <StartupLoadingScreen
        onComplete={() => {
          syncInProgressRef.current = false;
          justLoggedInRef.current = false; // Clear login flag now that sync is done
          log.info('[Layout] Sync complete - transitioning to main menu');
          setCurrentView('app');
          setCurrentPage('main');
        }}
      />
    );
  }

  // Auth checking screen shown when app resumes from background
  // Shows spinning circle while verifying/refreshing tokens
  if (currentView === 'checking-auth') {
    return <AuthCheckingScreen />;
  }

  // Handle main app navigation with story reader overlay
  // Story reader is rendered on top of the app view so when it closes,
  // the story selection page is already visible underneath - no flash
  if (currentView === 'app' || currentView === 'story-reader') {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* App navigation always rendered underneath */}
        <EnhancedPageTransition
          currentPage={currentPage as string}
          pages={{
            main: <MainMenu onNavigate={handleMainMenuNavigate} isActive={currentPage === 'main'} />,
            stories: <SimpleStoryScreen
              onStorySelect={handleStorySelect}
              selectedStory={selectedStory}
              onBack={handleBackToMainMenu}
            />,

            emotions: <EmotionsScreen onBack={handleBackToMainMenu} />,
            bedtime: <MusicScreen onBack={handleBackToMainMenu} isActive={currentPage === 'bedtime'} />,

            account: <AccountScreen onBack={handleAccountBack} isActive={currentPage === 'account'} />,
          }}
          duration={500}
        />

        {/* Story reader rendered on top - only loads AFTER mode selection is complete (not during transition) */}
        {/* zIndex 2000 ensures story reader stays above transition overlay (zIndex 1000) during exit animation */}
        {(showStoryReader && storyBeingRead) && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000 }}>
            <StoryBookReader
              story={storyBeingRead}
              initialMode={transitionMode}
              initialVoiceOver={transitionVoiceOver}
              skipCoverPage={true}
              skipInitialFadeIn={true}
              onExit={handleBackToStories}
            />
          </View>
        )}

        <StatusBar style="auto" />

      </ThemeProvider>
    );
  }

  // Fallback
  return <MainMenu onNavigate={handleMainMenuNavigate} />;
}

