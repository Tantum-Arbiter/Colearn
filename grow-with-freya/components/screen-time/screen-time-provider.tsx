import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppStore } from '../../store/app-store';
import ScreenTimeService, { ScreenTimeWarning } from '../../services/screen-time-service';
import NotificationService from '../../services/notification-service';
import { ScreenTimeWarningModal } from './screen-time-warning-modal';
import { Logger } from '@/utils/logger';

const log = Logger.create('ScreenTime');

interface ScreenTimeContextType {
  isTracking: boolean;
  currentActivity: 'story' | null;
  todayUsage: number;
  startActivity: (activity: 'story') => Promise<void>;
  endActivity: () => Promise<void>;
  showWarning: (warning: ScreenTimeWarning) => void;
  refreshUsage: () => Promise<void>;
}

const ScreenTimeContext = createContext<ScreenTimeContextType | null>(null);

export const useScreenTime = () => {
  const context = useContext(ScreenTimeContext);
  if (!context) {
    throw new Error('useScreenTime must be used within a ScreenTimeProvider');
  }
  return context;
};

interface ScreenTimeProviderProps {
  children: React.ReactNode;
}

// Screens where screen time tracking should be paused (passive listening, not active use)
const EXEMPT_SCREENS = ['sleep'];

// Immersive screens where warning modals should NOT interrupt the user.
// Warnings are queued and shown when the user returns to a non-immersive screen.
const IMMERSIVE_SCREENS = ['story-reader', 'practise', 'freeplay'];

export function ScreenTimeProvider({ children }: ScreenTimeProviderProps) {
  const {
    screenTimeEnabled,
    childAgeInMonths,
    notificationsEnabled,
    currentScreen,
  } = useAppStore();

  const [isTracking, setIsTracking] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<'story' | null>(null);
  const [todayUsage, setTodayUsage] = useState(0);
  const [currentWarning, setCurrentWarning] = useState<ScreenTimeWarning | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  // Track if we're paused due to being on an exempt screen (vs actually stopped)
  const [isPausedForExemptScreen, setIsPausedForExemptScreen] = useState(false);
  // Queued warning that arrived during an immersive screen — shown on exit
  const [pendingWarning, setPendingWarning] = useState<ScreenTimeWarning | null>(null);

  // Refs mirror React state so AppState/interval callbacks always read the
  // current value — avoids stale-closure bugs where a backgrounded app skips
  // endSession() because the handler captured an outdated `isTracking`.
  const isTrackingRef = useRef(isTracking);
  isTrackingRef.current = isTracking;

  // Track whether the app is in the foreground so we can pause polling in the background.
  const isAppActiveRef = useRef(AppState.currentState === 'active');

  const screenTimeService = ScreenTimeService.getInstance();
  const notificationService = NotificationService.getInstance();

  // Check if current screen is exempt from tracking
  const isOnExemptScreen = EXEMPT_SCREENS.some(screen =>
    currentScreen?.toLowerCase().includes(screen.toLowerCase()) ?? false
  );

  // Check if user is on an immersive screen where warnings should be deferred
  const isOnImmersiveScreen = IMMERSIVE_SCREENS.some(screen =>
    currentScreen?.toLowerCase() === screen.toLowerCase()
  );

  // When leaving an immersive screen, show any pending warning
  useEffect(() => {
    if (!isOnImmersiveScreen && pendingWarning) {
      setCurrentWarning(pendingWarning);
      setShowWarningModal(true);
      setPendingWarning(null);
    }
  }, [isOnImmersiveScreen, pendingWarning]);

  // Update today's usage periodically and check for daily reset.
  // The interval ONLY fires when the app is in the foreground — the AppState
  // handler below sets isAppActiveRef and the callback short-circuits otherwise.
  useEffect(() => {
    const updateUsage = async () => {
      // Skip work when the app is backgrounded — saves CPU/battery.
      if (!isAppActiveRef.current) return;
      if (!screenTimeEnabled) return;

      // Check if it's a new day and reset daily data if needed
      await screenTimeService.checkAndResetDailyData();

      const usage = await screenTimeService.getTodayUsage();
      setTodayUsage(usage);
    };

    updateUsage();
    const interval = setInterval(updateUsage, 50000); // Update every 50 seconds - reduces battery/CPU usage

    return () => clearInterval(interval);
  }, [screenTimeEnabled]);

  // Set up warning callback
  useEffect(() => {
    const handleWarning = (warning: ScreenTimeWarning) => {
      // If user is on an immersive screen, queue the warning for later
      if (IMMERSIVE_SCREENS.some(s => currentScreen?.toLowerCase() === s.toLowerCase())) {
        setPendingWarning(warning);
      } else {
        setCurrentWarning(warning);
        setShowWarningModal(true);
      }

      // Send notification if enabled (always — notifications appear outside the app)
      if (notificationsEnabled) {
        const notificationType = warning.type === 'limit_reached' ? 'limit_reached' : 'warning';
        notificationService.sendScreenTimeWarning(warning.message, notificationType);
      }
    };

    screenTimeService.onWarning(handleWarning);

    return () => {
      screenTimeService.removeWarningCallback(handleWarning);
    };
  }, [notificationsEnabled, currentScreen]);

  // Auto-start tracking when provider mounts (app opens) and screen time is enabled
  // BUT don't start if we're on an exempt screen (sleep/music)
  useEffect(() => {
    if (screenTimeEnabled && !isTracking && !isOnExemptScreen) {
      log.debug('Auto-starting session');
      screenTimeService.startSession('story', childAgeInMonths).then(() => {
        setIsTracking(true);
        setCurrentActivity('story');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenTimeEnabled]);

  // Handle app state changes — end session on background, restart on foreground.
  // Uses refs instead of React state so the handler never has a stale closure.
  // The dependency array is intentionally empty — the handler reads current
  // values from refs / zustand at call time.
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        isAppActiveRef.current = false;

        // End the current session so background time is never counted.
        if (isTrackingRef.current) {
          log.debug('Ending session (background)');
          await screenTimeService.endSession();
          setIsTracking(false);
          setCurrentActivity(null);
        }
      } else if (nextAppState === 'active') {
        isAppActiveRef.current = true;

        // Restart a session if screen time is still enabled and we're not on
        // an exempt screen. Read fresh values from zustand to avoid staleness.
        const {
          screenTimeEnabled: stEnabled,
          childAgeInMonths: age,
          currentScreen: screen,
        } = useAppStore.getState();

        const exempt = EXEMPT_SCREENS.some(s =>
          screen?.toLowerCase().includes(s.toLowerCase()) ?? false
        );

        if (stEnabled && !isTrackingRef.current && !exempt) {
          log.debug('Starting session (active)');
          await screenTimeService.startSession('story', age);
          setIsTracking(true);
          setCurrentActivity('story');
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause/resume tracking based on exempt screens (sleep/music pages)
  useEffect(() => {
    const handleExemptScreenChange = async () => {
      if (isOnExemptScreen && isTracking && !isPausedForExemptScreen) {
        // User navigated to sleep/music screen - pause tracking
        log.debug('Pausing for exempt screen:', currentScreen);
        await screenTimeService.endSession();
        setIsTracking(false);
        setCurrentActivity(null);
        setIsPausedForExemptScreen(true);
      } else if (!isOnExemptScreen && isPausedForExemptScreen && screenTimeEnabled) {
        // User left sleep/music screen - resume tracking
        log.debug('Resuming after exempt screen:', currentScreen);
        await screenTimeService.startSession('story', childAgeInMonths);
        setIsTracking(true);
        setCurrentActivity('story');
        setIsPausedForExemptScreen(false);
      }
    };

    handleExemptScreenChange();
  }, [isOnExemptScreen, isTracking, isPausedForExemptScreen, screenTimeEnabled, childAgeInMonths, currentScreen]);

  const startActivity = useCallback(async (activity: 'story') => {
    if (!screenTimeEnabled) return;

    try {
      await screenTimeService.startSession(activity, childAgeInMonths);
      setIsTracking(true);
      setCurrentActivity(activity);

      // Immediately update usage when starting a session
      const usage = await screenTimeService.getTodayUsage();
      setTodayUsage(usage);
    } catch (error) {
      log.error('Failed to start session:', error);
    }
  }, [screenTimeEnabled, childAgeInMonths]);

  const endActivity = useCallback(async () => {
    if (!screenTimeEnabled || !isTracking) return;

    try {
      await screenTimeService.endSession();
      setIsTracking(false);
      setCurrentActivity(null);
      
      // Update usage after ending session
      const usage = await screenTimeService.getTodayUsage();
      setTodayUsage(usage);
    } catch (error) {
      log.error('Failed to end session:', error);
    }
  }, [screenTimeEnabled, isTracking]);

  const showWarning = useCallback((warning: ScreenTimeWarning) => {
    setCurrentWarning(warning);
    setShowWarningModal(true);
  }, []);

  const refreshUsage = useCallback(async () => {
    if (screenTimeEnabled) {
      try {
        const usage = await screenTimeService.getTodayUsage();
        setTodayUsage(usage);
      } catch (error) {
        log.error('Failed to refresh usage:', error);
      }
    }
  }, [screenTimeEnabled]);

  const handleContinue = useCallback(() => {
    setShowWarningModal(false);
    setCurrentWarning(null);
  }, []);

  const handleCloseApp = useCallback(async () => {
    setShowWarningModal(false);
    setCurrentWarning(null);
    
    // End current activity
    if (isTracking) {
      await endActivity();
    }
    
    // In a real app, you might want to minimize the app or show a "time to stop" screen
    // For now, we'll just end the session
  }, [isTracking, endActivity]);

  const handleDismiss = useCallback(() => {
    setShowWarningModal(false);
    setCurrentWarning(null);
  }, []);

  const contextValue: ScreenTimeContextType = {
    isTracking,
    currentActivity,
    todayUsage,
    startActivity,
    endActivity,
    showWarning,
    refreshUsage,
  };

  return (
    <ScreenTimeContext.Provider value={contextValue}>
      {children}
      
      <ScreenTimeWarningModal
        visible={showWarningModal}
        warning={currentWarning}
        onDismiss={handleDismiss}
      />
    </ScreenTimeContext.Provider>
  );
}
