import React, { useCallback, useEffect, useState, useRef } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, BackHandler, Dimensions, View, Platform, DevSettings, Alert, StyleSheet } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SystemUI from 'expo-system-ui';

import 'react-native-reanimated';
import Animated, { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import * as StoreReview from 'expo-store-review';
// Initialize i18n service - must be imported before components that use translations
import '@/services/i18n';
// Import notification service early to register notification handler
// This ensures notifications are handled properly even when app is in background
import '@/services/notification-service';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/store/app-store';
import { useShallow } from 'zustand/react/shallow';
import { Logger } from '@/utils/logger';
import { useBackgroundMusic } from '@/hooks/use-background-music';
import { applyDefaultOrientation } from '@/hooks/use-story-orientation';
import { AppSplashScreen } from '@/components/splash-screen';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { LoginScreen } from '@/components/auth/login-screen';
import { AUTH_GRADIENT } from '@/components/auth/auth-theme';
import { AccountScreen } from '@/components/account/account-screen';
import { accountReturnPage, voyageStaysOut } from '@/constants/page-slide';
import { ALL_STORIES } from '@/data/stories';
import type { PlanLaunch } from '@/types/learning-plan';
import type { PlanCardRect } from '@/components/island/plan-panel';
import { previewActivity } from '@/constants/learning-plan';
import { MainMenu } from '@/components/main-menu';
import { appTreeMounted, authEntrance, authOverlayUp, landsOnMainMenu, menuRevealed, pageAfterAuth, type AppView, type AuthEntrance } from '@/constants/app-shell';
import { AuthOverlay } from '@/components/auth/auth-overlay';
import { ApiClient } from '@/services/api-client';
import { SecureStorage } from '@/services/secure-storage';
import { SimpleStoryScreen } from '@/components/stories/simple-story-screen';
import type { CatalogueSectionRequest } from '@/components/stories/catalogue/story-catalogue-screen';
import { catalogueSectionFor } from '@/constants/catalogue-destinations';
import { StoryBookReader } from '@/components/stories/story-book-reader';
import { PractiseScreen } from '@/components/music/practise-screen';
import { FreeplayScreen } from '@/components/music/freeplay-screen';
import { LearningScreen, type GameType } from '@/components/learning/learning-screen';
import { SpellingGameScreen } from '@/components/games/spelling-game-screen';
import { EmotionsScreen } from '@/components/emotions';
import { ScreenTimeProvider } from '@/components/screen-time/screen-time-provider';
import { Story } from '@/types/story';
import { preloadCriticalImages, preloadSecondaryImages } from '@/services/image-preloader';
import { EnhancedPageTransition } from '@/components/ui/enhanced-page-transition';
import { JourneyBarProvider, JourneyBarOutlet } from '@/components/child-ui/journey-bar-slot';
import { OwlGuideLayer, OwlGuideLayerProvider, guidePages } from '@/components/owl-guide/owl-guide-layer';
import { INSTANT_PAGES, ISLAND_PREWARM_AFTER_MS, PAGE_TRANSITION_DURATION_MS, PREWARMED_FOR_THE_ISLAND, PREWARMED_PAGES, SLIDE_AFTER_SECTION_SWITCH_MS } from '@/constants/page-transition';
import { IslandVoyageProvider, useIslandVoyageController } from '@/contexts/island-voyage-context';
import { IslandScene } from '@/components/island/island-scene';
import { VoyageLayer } from '@/components/island/voyage-layer';
import type { VoyagePage } from '@/constants/island-voyage';

import { StoryTransitionProvider, useStoryTransition } from '@/contexts/story-transition-context';
import { ActivityTransitionProvider, useActivityTransition } from '@/contexts/ActivityTransitionContext';
import { GlobalSoundProvider } from '@/contexts/global-sound-context';
import { OwlGuideProvider } from '@/contexts/owl-guide-context';
import { updateSentryConsent } from '@/services/sentry-service';
import { AnalyticsService } from '@/services/analytics-service';
import i18n from '@/services/i18n';
import { StartupLoadingScreen } from '@/components/startup-loading-screen';
import { BatchSyncService } from '@/services/batch-sync-service';
import { CacheManager } from '@/services/cache-manager';
import { StoryLoader } from '@/services/story-loader';
import { ChildSyncService } from '@/services/child-sync-service';
import { VersionManager } from '@/services/version-manager';
// Import reminder service to trigger initialization and reschedule notifications on app startup
import { reminderService } from '@/services/reminder-service';
import { initialize as initSubscriptions, identifySignedInAccount } from '@/services/subscription-service';
import Constants from 'expo-constants';
import { isE2eAllowed } from '@/services/e2e-state';
import { useE2eLinks } from '@/hooks/use-e2e-links';

// Disable Reanimated strict mode warnings -our shared value reads are all inside
// useAnimatedStyle / useDerivedValue, but Reanimated's heuristic still fires false positives.
configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

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



// The root view behind every React view. iOS shows it in the corners while the
// screen turns, so it wears the night navy the story opening's veil uses --
// otherwise the turn flashes navy-on-black.
const ROOT_BACKGROUND = '#0A0F2C';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: ROOT_BACKGROUND }}>
      <GlobalSoundProvider>
        <OwlGuideProvider>
          <ScreenTimeProvider>
            <StoryTransitionProvider>
              <ActivityTransitionProvider>
                <AppContent />
              </ActivityTransitionProvider>
            </StoryTransitionProvider>
          </ScreenTimeProvider>
        </OwlGuideProvider>
      </GlobalSoundProvider>
    </View>
  );
}

// Main app content that can access the story transition context
function AppContent() {
  useE2eLinks(isE2eAllowed(__DEV__, Constants.expoConfig?.extra));

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(ROOT_BACKGROUND).catch(() => undefined);
  }, []);

  useEffect(() => ChildSyncService.startAutoSync(), []);

  // Access story transition context to know when to show story reader
  const {
    selectedStory: transitionStory,
    selectedMode: transitionMode,
    selectedVoiceOver: transitionVoiceOver,
    setOnBeginCallback,
    setOnReturnToModeSelectionCallback,
    setOnCancelCallback,
    storyOpenRequest,
    requestStoryOpen,
    clearStoryOpen,
    readerRevealStyle,
    startTransition: openStoryCard,
  } = useStoryTransition();

  // Access activity transition context for learning game transitions
  const {
    selectedActivity: transitionActivity,
    setOnBeginCallback: setActivityOnBeginCallback,
    setOnCancelCallback: setActivityOnCancelCallback,
    setOnReturnCallback: setActivityOnReturnCallback,
    exitGame: exitActivityGame,
    isInGame: isInActivityGame,
    startTransition: openActivityCard,
  } = useActivityTransition();

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
  } = useAppStore(
    useShallow((state) => ({
      isAppReady: state.isAppReady,
      hasHydrated: state.hasHydrated,
      hasCompletedOnboarding: state.hasCompletedOnboarding,
      showLoginAfterOnboarding: state.showLoginAfterOnboarding,
      isGuestMode: state.isGuestMode,
      crashReportingEnabled: state.crashReportingEnabled,
      setOnboardingComplete: state.setOnboardingComplete,
      setShowLoginAfterOnboarding: state.setShowLoginAfterOnboarding,
      setGuestMode: state.setGuestMode,
      setCurrentScreen: state.setCurrentScreen,
      shouldReturnToMainMenu: state.shouldReturnToMainMenu,
      clearReturnToMainMenu: state.clearReturnToMainMenu,
    }))
  );

  const consentTimestamp = useAppStore((state) => state.consentTimestamp);

  // Initialize or disable Sentry based on user consent
  // This runs after store hydration and whenever consent changes
  useEffect(() => {
    if (hasHydrated) {
      updateSentryConsent(crashReportingEnabled);
    }
  }, [hasHydrated, crashReportingEnabled]);

  // Initialize analytics (consent-gated, anonymous, session-scoped)
  useEffect(() => {
    if (hasHydrated) {
      const hasConsent = !!consentTimestamp;
      AnalyticsService.initialize(i18n.language || 'en', hasConsent);
    }
    return () => {
      AnalyticsService.destroy();
    };
  }, [hasHydrated, consentTimestamp]);

  // Initialize background music
  const { fadeIn, isLoaded: musicLoaded, isPlaying } = useBackgroundMusic();

  // Track if we've already started background music to prevent auto-restart after manual pause
  const [hasStartedBackgroundMusic, setHasStartedBackgroundMusic] = useState(false);

  type PageKey = 'main' | 'stories' | 'story-reader' | 'account' | 'practise' | 'freeplay' | 'spelling' | 'numbers' | 'feelings' | 'spelling-game' | 'island';

  const [currentView, setCurrentView] = useState<AppView>('splash');
  // The splash stays over whichever page the app opens on until it has faded off it
  const [splashGone, setSplashGone] = useState(false);
  const handleSplashGone = useCallback(() => setSplashGone(true), []);
  const [currentPage, setCurrentPage] = useState<PageKey>('main');
  const accountOpenedFromRef = useRef<PageKey>('main');
  const handleVoyagePage = useCallback((page: VoyagePage) => setCurrentPage(page), []);
  const voyage = useIslandVoyageController(handleVoyagePage);
  const settleVoyageHome = voyage.settleHome;
  const comeBackFromIsland = voyage.comeBack;
  const launchedFromIslandRef = useRef(false);
  const storyCardReturnRef = useRef<PageKey>('stories');
  const leavePlanStep = useAppStore((state) => state.leavePlanStep);

  useEffect(() => {
    if (!voyageStaysOut(currentPage, launchedFromIslandRef.current)) settleVoyageHome();
  }, [currentPage, settleVoyageHome]);

  useEffect(() => {
    if (currentPage !== 'island' && currentPage !== 'main') return;
    launchedFromIslandRef.current = false;
    leavePlanStep();
  }, [currentPage, leavePlanStep]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  // Story being read - kept separate so it persists during book closing animation
  const [storyBeingRead, setStoryBeingRead] = useState<Story | null>(null);
  const [showStoryReader, setShowStoryReader] = useState(false);
  // When false, EnhancedPageTransition sets positions instantly (overlay handles visual transition)
  const [animatePageTransition, setAnimatePageTransition] = useState(true);

  // Track if sync is in progress to prevent premature navigation
  const syncInProgressRef = useRef(false);
  // True while the loading screen is still sliding in after login -keeps login visible behind overlay
  const [showLoginBehindLoading, setShowLoginBehindLoading] = useState(false);
  const [authBaseUp, setAuthBaseUp] = useState(true);
  useEffect(() => {
    if (currentView === 'login') setAuthBaseUp(true);
  }, [currentView]);
  const handleLoginRevealStart = useCallback(() => setAuthBaseUp(false), []);
  const [authVisit, setAuthVisit] = useState<{ from: AppView; entrance: AuthEntrance; returnPage: PageKey | null }>({
    from: 'splash',
    entrance: 'fade',
    returnPage: null,
  });
  if (authOverlayUp(currentView) !== authOverlayUp(authVisit.from) && authOverlayUp(currentView)) {
    setAuthVisit({ from: currentView, entrance: authEntrance(authVisit.from), returnPage: appTreeMounted(authVisit.from) ? currentPage : null });
  } else if (!authOverlayUp(currentView) && currentView !== authVisit.from) {
    setAuthVisit((visit) => ({ ...visit, from: currentView }));
  }



  // Debug current view changes (disabled for performance)
  // useEffect(() => {
  //   console.log('Current view changed to:', currentView);
  // }, [currentView]);







  // Ensure app starts and stays in portrait mode (except for story reader)
  // Note: iPads don't support portrait-only locking, so we allow all orientations on tablets
  useEffect(() => {
    const initializeOrientation = async () => {
      try {
        await applyDefaultOrientation();
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
        if (currentView !== 'story-reader') {
          await applyDefaultOrientation();
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

  // Initialize RevenueCat subscription service (no-op in __DEV__ / Expo Go)
  useEffect(() => {
    initSubscriptions();
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
        setCurrentPage('main');
        setSplashGone(false);
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
        if (landsOnMainMenu(currentView)) setCurrentPage('main');
      } else {
        // If we just logged in or sync is in progress, don't interfere
        // The StartupLoadingScreen will call onComplete() when sync finishes
        if (justLoggedInRef.current || syncInProgressRef.current) {
          log.info('[Auth] Skipping auth check - login/sync in progress, waiting for sync');
          // Don't change view - StartupLoadingScreen handles the transition
          return;
        }

        // Fast local token check -no network, no timeout risk
        try {
          const hasTokens = await SecureStorage.isAuthenticated();
          log.info(`[Layout] Fast local auth check: hasTokens=${hasTokens}`);

          if (!hasTokens) {
            // No tokens stored -user needs to log in
            setShowLoginAfterOnboarding(true);
            setCurrentView('login');
          } else {
            // Tokens exist -check if this is the first-ever sync
            const localVersion = await VersionManager.getLocalVersion();
            const isFirstSync = !localVersion;
            log.info(`[Layout] First sync: ${isFirstSync}, localVersion: ${localVersion?.stories ?? 'none'}`);

            if (isFirstSync) {
              // First install -show loading screen until sync completes
              // so thumbnails and catalog are ready before the user sees them
              log.info('[Layout] First sync detected -showing loading screen');
              setCurrentView('loading');
            } else {
              // Returning user -instant main menu with cached thumbnails (via stable cacheKey).
              // Background sync refreshes signed URLs silently.
              setCurrentView('app');
              if (landsOnMainMenu(currentView)) setCurrentPage('main');

              // Background sync -no loading screen for returning users
              (async () => {
                try {
                  log.info('[Layout] Background sync starting...');
                  // Ensure token is valid (refresh if expired) -in background, no timeout risk
                  try {
                    const isValid = await ApiClient.isAuthenticated();
                    if (!isValid) {
                      log.warn('[Layout] Token refresh failed during background sync -user may need to re-login');
                    }
                  } catch (e) { log.warn('[Layout] Background token validation skipped:', e); }
                  // Sync profile
                  await ChildSyncService.sync();
                  await ChildSyncService.recordConsentIfNeeded();
                  await identifySignedInAccount();
                  // Validate cache
                  await CacheManager.validateAndCleanCache();
                  // Metadata sync
                  await BatchSyncService.performBatchSync();
                  // Refresh story loader cache
                  StoryLoader.invalidateCache();
                  await StoryLoader.getStories();
                  log.info('[Layout] Background sync complete');
                } catch (e) {
                  log.warn('[Layout] Background sync failed (non-critical):', e);
                }
              })();
            }
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
  // Token refresh happens in background - no blocking loading screen
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
        if (currentView !== 'app' && currentView !== 'story-reader') {
          return;
        }

        // Perform token refresh in the background (non-blocking)
        log.info('[AppState] Checking authentication in background...');

        try {
          // App became active - check if tokens need refresh
          const isAuthenticated = await ApiClient.isAuthenticated();

          if (!isAuthenticated && hasCompletedOnboarding) {
            // Tokens expired and couldn't be refreshed - prompt user with options
            log.info('[AppState] Session expired - prompting user');
            Alert.alert(
              'Session Expired',
              'Your session has expired. Would you like to sign in again to sync your data?',
              [
                {
                  text: 'Continue Offline',
                  style: 'cancel',
                  onPress: () => {
                    // Switch to guest mode - changes won't be saved to server
                    log.info('[AppState] User chose to continue offline');
                    setGuestMode(true);
                    // Clear auth data since we're going to guest mode
                    ApiClient.logout().catch(e => log.error('Logout error:', e));
                  },
                },
                {
                  text: 'Sign In',
                  onPress: () => {
                    log.info('[AppState] User chose to sign in');
                    setShowLoginAfterOnboarding(true);
                    setCurrentView('login');
                  },
                },
              ],
              { cancelable: false }
            );
          } else if (isAuthenticated) {
            // Auth successful - retry any pending background saves
            log.info('[AppState] Authentication valid');
            ChildSyncService.requestSync();
          }
          // If not authenticated and no onboarding completed, do nothing
        } catch (error) {
          // On unexpected error, just log it - don't disrupt user experience
          log.error('[AppState] Error checking authentication:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [hasHydrated, hasCompletedOnboarding, isGuestMode, setShowLoginAfterOnboarding, setGuestMode, currentView]);

  // Start background music when main menu loads (after sign in or app restart)
  useEffect(() => {
    const startBackgroundMusic = async () => {
      // Only start music when entering the main app (main menu) - not during onboarding
      if (musicLoaded && currentView === 'app' && !isPlaying && !hasStartedBackgroundMusic) {
        try {
          // Start background music with a gentle fade-in
          await fadeIn(3000); // 3 second fade-in
          setHasStartedBackgroundMusic(true); // Mark that we've started music
          log.debug('Background music started');
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

  // A caller that ran its own opening ritual asks for the reader directly
  useEffect(() => {
    if (!storyOpenRequest) {
      return;
    }

    setStoryBeingRead(storyOpenRequest.story);
    setShowStoryReader(true);
    setCurrentView('story-reader');
    clearStoryOpen();
  }, [storyOpenRequest, clearStoryOpen]);

  // Register callback for when returning to mode selection from story reader
  useEffect(() => {
    const handleReturnToModeSelection = () => {
      // Hide the story reader but keep the story selected
      setShowStoryReader(false);
      // DON'T change currentView here - keep it as 'story-reader' to maintain landscape orientation
      // The mode selection overlay is still showing in landscape, and changing to 'app' would
      // trigger the portrait lock in the orientation useEffect
      // currentView will be set to 'app' when the user actually exits (cancelTransition or selectModeAndBegin)
      setCurrentPage('stories');
      // Don't clear storyBeingRead - we'll need it if they choose to read again
    };

    setOnReturnToModeSelectionCallback(() => () => handleReturnToModeSelection());

    return () => {
      setOnReturnToModeSelectionCallback(null);
    };
  }, [setOnReturnToModeSelectionCallback]);

  // Register callback for when transition is cancelled (user taps X on mode selection)
  useEffect(() => {
    const handleCancel = () => {
      // Restore view state to 'app' when transition is cancelled
      // This is needed because we keep currentView as 'story-reader' during mode selection
      // to maintain landscape orientation
      setCurrentView('app');
      setCurrentPage(storyCardReturnRef.current);
      storyCardReturnRef.current = 'stories';
    };

    setOnCancelCallback(() => () => handleCancel());

    return () => {
      setOnCancelCallback(null);
    };
  }, [setOnCancelCallback]);

  // Activity transition: when user taps "Play" / "Tap to Begin", navigate to story picker
  useEffect(() => {
    if (!transitionActivity) return;

    const handleActivityBegin = () => {
      // The activity transition has already set spellingActivityId via the learning screen callback
      // Skip page animation — the overlay handles the visual slide-up transition
      setAnimatePageTransition(false);
      setCurrentPage('spelling-game');
      // Re-enable animation for subsequent navigations
      setTimeout(() => setAnimatePageTransition(true), 50);
    };

    setActivityOnBeginCallback(() => () => handleActivityBegin());
    return () => { setActivityOnBeginCallback(null); };
  }, [transitionActivity, setActivityOnBeginCallback]);

  // Activity transition: when user cancels (X button), just stay on current page
  useEffect(() => {
    setActivityOnCancelCallback(() => () => {
      // No-op — the cancel animation already handles cleanup
    });
    return () => { setActivityOnCancelCallback(null); };
  }, [setActivityOnCancelCallback]);



  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
    setShowLoginAfterOnboarding(true);
  };

  // Track if we just completed a fresh login to skip redundant auth checks
  const justLoggedInRef = useRef(false);

  const handleLoginSuccess = () => {
    // First-time login -show loading screen so catalog + thumbnails are ready
    // before the user sees the story selection screen
    justLoggedInRef.current = true;
    syncInProgressRef.current = true;
    log.info('[Auth] Login successful -showing loading screen for first sync');

    setShowLoginAfterOnboarding(false);
    // Keep login visible behind the loading overlay during slide-in
    setShowLoginBehindLoading(true);
    setCurrentView('loading');
  };

  const handleLoginSkip = () => {
    setGuestMode(true);
    setShowLoginAfterOnboarding(false);
    setCurrentView('app');
    setCurrentPage(pageAfterAuth(authVisit.returnPage));
  };



  // Track the selected story mode (interactive / music / classic) from main menu
  const [selectedStoryMode, setSelectedStoryMode] = useState<string | null>(null);
  // Which catalogue section the home asked for; the key makes a repeat request re-apply
  const [storiesSection, setStoriesSection] = useState<CatalogueSectionRequest>({ section: 'home', key: 0 });
  // When set, MainMenu should show the specified sub-menu instead of the main carousel
  const [returnToSubMenu, setReturnToSubMenu] = useState<'stories' | 'instruments' | 'learning' | null>(null);

  const handleMainMenuNavigate = async (destination: string) => {
    // Clear returnToSubMenu when navigating away from main menu
    setReturnToSubMenu(null);
    // Handle stories-{mode} destinations from mode card selection
    if (destination.startsWith('stories-')) {
      const mode = destination.replace('stories-', '');
      setSelectedStoryMode(mode);
      setCurrentPage('stories');
      setCurrentScreen(destination);
      return;
    }

    const destinationMap: Record<string, PageKey> = {
      'stories': 'stories',
      'progress': 'stories',
      'search': 'stories',
      'profile': 'stories',
      'account': 'account',
      'practise': 'practise',
      'freeplay': 'freeplay',
      'spelling': 'spelling',
      'numbers': 'numbers',
      'feelings': 'feelings',
    };

    const pageKey = destinationMap[destination];
    if (pageKey) {
      // When navigating to plain 'stories' (not via a mode card), clear any
      // previously selected story mode so all stories are visible.
      const section = catalogueSectionFor(destination);
      if (section) {
        setSelectedStoryMode(null);
        setStoriesSection((current) => ({ section, key: current.key + 1 }));
        setTimeout(() => {
          setCurrentPage(pageKey);
          setCurrentScreen(destination);
        }, SLIDE_AFTER_SECTION_SWITCH_MS);
        return;
      }
      if (pageKey === 'account') accountOpenedFromRef.current = currentPage;
      setCurrentPage(pageKey);
      setCurrentScreen(destination);
    }
  };

  const handleAccountBack = () => {
    setCurrentPage(accountReturnPage(accountOpenedFromRef.current));
  };

  const handleOpenGrownUps = () => {
    accountOpenedFromRef.current = currentPage;
    setCurrentPage('account');
    setCurrentScreen('account');
  };



  const handleBackToMainMenu = () => {
    // If we were on the stories page (came from a mode card), show mode cards on return
    if (currentPage === 'stories' && selectedStoryMode) {
      setReturnToSubMenu('stories');
    }
    setCurrentPage('main');
    setSelectedStory(null);
  };

  const handleBackToInstruments = () => {
    if (launchedFromIslandRef.current) {
      setCurrentPage('island');
      return;
    }
    setReturnToSubMenu('instruments');
    setCurrentPage('main');
  };

  const handleBackToLearning = () => {
    if (launchedFromIslandRef.current) {
      setCurrentPage('island');
      return;
    }
    setReturnToSubMenu('learning');
    setCurrentPage('main');
  };

  const handleBackToStories = () => {
    // Story reader's exit animation has already completed by the time this is called
    // Just clean up and switch views
    setShowStoryReader(false);
    setStoryBeingRead(null);
    setSelectedStory(null);
    setCurrentView('app');
    leavePlanStep();
    // currentPage stays 'stories' - we never change it when entering/exiting story reader

    // Prompt for app rating after returning from reader (not during the story):
    //   - First prompt after reading 2 books
    //   - If dismissed, prompt again every 3 books thereafter
    const { totalStoriesRead, lastRatingPromptBookCount, setLastRatingPromptBookCount } = useAppStore.getState();
    const shouldPrompt =
      (lastRatingPromptBookCount === 0 && totalStoriesRead >= 2) ||
      (lastRatingPromptBookCount > 0 && totalStoriesRead >= lastRatingPromptBookCount + 3);

    if (shouldPrompt) {
      // Small delay so the transition back to stories is settled before the OS prompt appears
      setTimeout(async () => {
        try {
          const isAvailable = await StoreReview.isAvailableAsync();
          if (isAvailable) {
            await StoreReview.requestReview();
          }
        } catch {
          // Silently ignore -review prompt is best-effort
        }
        setLastRatingPromptBookCount(totalStoriesRead);
      }, 1500);
    }
  };

  // Spelling game state
  const [spellingActivityId, setSpellingActivityId] = useState<string | null>(null);
  const [spellingStoryId, setSpellingStoryId] = useState<string | undefined>(undefined);
  const [spellingReturnPage, setSpellingReturnPage] = useState<PageKey>('spelling');


  // Activity transition: when user returns from game, navigate back to learning page
  useEffect(() => {
    setActivityOnReturnCallback(() => () => {
      // Let the page transition animate normally (the overlay is off-screen at this point)
      setCurrentPage(spellingReturnPage);
    });
    return () => { setActivityOnReturnCallback(null); };
  }, [setActivityOnReturnCallback, spellingReturnPage]);

  const handleStartActivity = useCallback((launch: PlanLaunch) => {
    switch (launch.kind) {
      case 'story': {
        const story = ALL_STORIES.find((candidate) => candidate.id === launch.storyId);
        if (story) requestStoryOpen(story, 'read', null);
        return;
      }
      case 'spelling':
        setSpellingActivityId(launch.activityId);
        setSpellingStoryId(undefined);
        setSpellingReturnPage('island');
        launchedFromIslandRef.current = true;
        setCurrentPage('spelling-game');
        return;
      case 'feelings':
        launchedFromIslandRef.current = true;
        setCurrentPage('feelings');
        return;
      case 'music':
        launchedFromIslandRef.current = true;
        setCurrentPage('practise');
    }
  }, [requestStoryOpen]);

  const handlePreviewActivity = useCallback((launch: PlanLaunch, from: PlanCardRect) => {
    if (launch.kind === 'story') {
      const story = ALL_STORIES.find((candidate) => candidate.id === launch.storyId);
      if (!story) return;
      storyCardReturnRef.current = 'island';
      openStoryCard(story.id, from, story);
      return;
    }
    if (launch.kind !== 'spelling') return;
    const activity = previewActivity(launch.activityId);
    if (!activity) return;
    setSpellingActivityId(launch.activityId);
    setSpellingStoryId(undefined);
    setSpellingReturnPage('island');
    launchedFromIslandRef.current = true;
    openActivityCard(activity, from);
  }, [openActivityCard, openStoryCard]);

  // Learning screen activity selection - sets spelling state; the activity
  // transition overlay handles the visual navigation, so we do NOT
  // setCurrentPage here — that happens in handleActivityBegin.
  const handleLearningActivitySelect = useCallback(async (activityId: string, gameType: GameType, storyId?: string, nameKey?: string) => {
    if (gameType === 'spelling') {
      setSpellingActivityId(activityId);
      setSpellingStoryId(undefined);
      setSpellingReturnPage(currentPage as PageKey);
      // Navigation happens via the activity transition's onBegin callback
      return;
    }

    // Fallback: open story reader for 'story', 'choice', 'sorting' (until those screens exist)
    if (!storyId) {
      log.warn(`Activity ${activityId} has no storyId for fallback`);
      return;
    }
    try {
      const stories = await StoryLoader.getStories();
      const story = stories.find(s => s.id === storyId);
      if (story) {
        setStoryBeingRead(story);
        setShowStoryReader(true);
        setCurrentView('story-reader');
      } else {
        log.warn(`Learning story ${storyId} not found in loaded stories`);
      }
    } catch (error) {
      log.error(`Failed to load learning story ${storyId}:`, error);
    }
  }, [currentPage]);

  const handleStorySelect = (story: Story) => {
    setSelectedStory(story);
    // Start thumbnail expansion animation first, then transition to story reader
    // The SimpleStoryScreen will handle the expansion animation and call handleStoryTransitionComplete
  };

  // Android hardware back button support
  // Story reader and account screen handle their own back button internally;
  // this handles top-level page navigation with parent sub-menu awareness.
  // On the main menu, returns false to allow default Android behavior (exit/minimize app).
  const handleHardwareBack = useCallback(() => {
    // Story reader handles its own back button - don't interfere
    if (showStoryReader && storyBeingRead) return false;

    // If on a sub-page, go back to the parent sub-menu or main menu
    if (currentPage !== 'main') {
      // Account screen handles its own internal back navigation
      if (currentPage === 'account') return false;
      if (currentPage === 'island') {
        comeBackFromIsland();
        return true;
      }
      // Practise/freeplay go back to instruments sub-menu
      if (currentPage === 'practise' || currentPage === 'freeplay') {
        handleBackToInstruments();
      } else if (currentPage === 'spelling-game') {
        // Slide overlay back down (book preview), then dismiss to game list
        if (isInActivityGame) {
          exitActivityGame();
        } else {
          setCurrentPage(spellingReturnPage);
        }
      } else if (currentPage === 'spelling' || currentPage === 'numbers' || currentPage === 'feelings') {
        handleBackToLearning();
      } else {
        handleBackToMainMenu();
      }
      return true;
    }

    // On main menu - let Android handle it (exit/minimize app)
    return false;
  }, [currentPage, showStoryReader, storyBeingRead, isInActivityGame, exitActivityGame, comeBackFromIsland]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (currentView !== 'app' && currentView !== 'story-reader') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => subscription.remove();
  }, [currentView, handleHardwareBack]);

  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  if (currentView === 'loading') {
    syncInProgressRef.current = true;
  }

  return (
    <View style={{ flex: 1, backgroundColor: ROOT_BACKGROUND }}>
            {appTreeMounted(currentView) ? renderAppTree() : null}
      {currentView === 'onboarding' ? <OnboardingFlow onComplete={handleOnboardingComplete} /> : null}
      {authOverlayUp(currentView) ? renderAuthOverlay() : null}
      {!splashGone && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 5000 }]}>
          <AppSplashScreen leaving={currentView !== 'splash'} onGone={handleSplashGone} />
        </View>
      )}
    </View>
  );

  function renderAuthOverlay() {
    return (
      <AuthOverlay entrance={authVisit.entrance}>
        <ThemeProvider value={theme}>
          {/* the night base sits behind LoginScreen's fade-in -- an unstyled root
              here flashes white while the screen's opacity ramps up */}
          <View style={{ flex: 1, backgroundColor: authBaseUp ? AUTH_GRADIENT[0] : 'transparent' }} testID="auth-base">
            {/* Login screen -stays mounted during both 'login' and 'loading' views.
                During loading, it sits behind the overlay until the slide-in covers it,
                then gets unmounted once the overlay is fully opaque (onSlideInComplete). */}
            {(currentView === 'login' || showLoginBehindLoading) && (
              <View style={StyleSheet.absoluteFill}>
                <LoginScreen
                  onSuccess={handleLoginSuccess}
                  onSkip={handleLoginSkip}
                  onRevealStart={handleLoginRevealStart}
                  fadeIn={authVisit.entrance === 'fade'}
                />
              </View>
            )}

            {/* Loading overlay (zIndex 10) -slides down over login, then up to reveal menu */}
            {currentView === 'loading' && (
              <StartupLoadingScreen
                onSlideInComplete={() => {
                  log.info('[Layout] Loading slide-in done -login can go');
                  setShowLoginBehindLoading(false);
                  setAuthBaseUp(false);
                }}
                onComplete={() => {
                  syncInProgressRef.current = false;
                  justLoggedInRef.current = false;
                  log.info('[Layout] Sync complete - transitioning to main menu');
                  setCurrentView('app');
                  setCurrentPage(pageAfterAuth(authVisit.returnPage));
                }}
              />
            )}
          </View>
          <StatusBar style="light" />
        </ThemeProvider>
      </AuthOverlay>
    );
  }

  // Handle main app navigation with story reader overlay
  // Story reader is rendered on top of the app view so when it closes,
  // the story selection page is already visible underneath - no flash
  function renderAppTree() {
    return (
      <ThemeProvider value={theme}>
        {/* App navigation always rendered underneath */}
        <IslandVoyageProvider voyage={voyage}>
        <JourneyBarProvider>
        <OwlGuideLayerProvider>
        <EnhancedPageTransition
          currentPage={currentPage as string}
          pages={guidePages({
            main: (
              <MainMenu
                onNavigate={handleMainMenuNavigate}
                isActive={currentPage === 'main'}
                disableTutorial={!menuRevealed(currentView)}
                returnToSubMenu={returnToSubMenu}
              />
            ),
            stories: <SimpleStoryScreen
              onStorySelect={handleStorySelect}
              selectedStory={selectedStory}
              onBack={handleBackToMainMenu}
              initialMode={selectedStoryMode}
              sectionRequest={storiesSection}
              onOpenSettings={handleOpenGrownUps}
              isActive={currentPage === 'stories' && menuRevealed(currentView)}
            />,
            practise: <PractiseScreen onBack={handleBackToInstruments} isActive={currentPage === 'practise'} />,
            freeplay: <FreeplayScreen onBack={handleBackToInstruments} isActive={currentPage === 'freeplay'} />,
            spelling: <LearningScreen mode="spelling" onBack={handleBackToLearning} onActivitySelect={handleLearningActivitySelect} isActive={currentPage === 'spelling'} />,
            numbers: <LearningScreen mode="numbers" onBack={handleBackToLearning} onActivitySelect={handleLearningActivitySelect} isActive={currentPage === 'numbers'} />,
            'spelling-game': spellingActivityId ? (
              <SpellingGameScreen
                activityId={spellingActivityId}
                storyId={spellingStoryId}
                onBack={() => {
                  if (isInActivityGame) {
                    exitActivityGame();
                  } else {
                    setCurrentPage(spellingReturnPage);
                  }
                }}
                isActive={currentPage === 'spelling-game'}
              />
            ) : null,
            feelings: <EmotionsScreen onBack={handleBackToLearning} isActive={currentPage === 'feelings'} />,
            account: <AccountScreen onBack={handleAccountBack} onNavigate={handleMainMenuNavigate} isActive={currentPage === 'account' && menuRevealed(currentView)} />,
            island: <IslandScene isActive={currentPage === 'island' && menuRevealed(currentView)} onStartActivity={handleStartActivity} onPreviewActivity={handlePreviewActivity} />,
          }, currentPage)}
          duration={PAGE_TRANSITION_DURATION_MS}
          animate={animatePageTransition}
          prewarm={voyage.phase === 'home' ? PREWARMED_PAGES : PREWARMED_FOR_THE_ISLAND}
          prewarmAfterMs={voyage.phase === 'leaving' ? ISLAND_PREWARM_AFTER_MS : undefined}
          instant={INSTANT_PAGES}
        />
        <JourneyBarOutlet pageKey={currentPage as string} holdMs={animatePageTransition && currentPage !== 'island' ? PAGE_TRANSITION_DURATION_MS : 0} />
        <VoyageLayer />
        {/* above the bar, so an owl pointing at the bar is not drawn behind it */}
        <OwlGuideLayer />
        </OwlGuideLayerProvider>
        </JourneyBarProvider>
        </IslandVoyageProvider>

        {/* Story reader rendered on top - only loads AFTER mode selection is complete (not during transition) */}
        {/* zIndex 2000 ensures story reader stays above transition overlay (zIndex 1000) during exit animation */}
        {(showStoryReader && storyBeingRead) && (
          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000 }, readerRevealStyle]}>
            <StoryBookReader
              story={storyBeingRead}
              initialMode={transitionMode}
              initialVoiceOver={transitionVoiceOver}
              skipCoverPage={true}
              skipInitialFadeIn={true}
              onExit={handleBackToStories}
            />
          </Animated.View>
        )}

        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }
}
