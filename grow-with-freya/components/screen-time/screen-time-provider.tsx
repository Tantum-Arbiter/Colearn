import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppStore } from '../../store/app-store';
import ScreenTimeService, { ScreenTimeWarning } from '../../services/screen-time-service';
import NotificationService from '../../services/notification-service';
import { ScreenTimeWarningModal } from './screen-time-warning-modal';

interface ScreenTimeContextType {
  isTracking: boolean;
  currentActivity: 'story' | 'emotions' | 'music' | null;
  todayUsage: number;
  startActivity: (activity: 'story' | 'emotions' | 'music') => Promise<void>;
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
const EXEMPT_SCREENS = ['bedtime', 'music', 'sleep', 'music-player'];

export function ScreenTimeProvider({ children }: ScreenTimeProviderProps) {
  const {
    screenTimeEnabled,
    childAgeInMonths,
    notificationsEnabled,
    currentScreen,
  } = useAppStore();

  const [isTracking, setIsTracking] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<'story' | 'emotions' | 'music' | null>(null);
  const [todayUsage, setTodayUsage] = useState(0);
  const [currentWarning, setCurrentWarning] = useState<ScreenTimeWarning | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  // Track if we're paused due to being on an exempt screen (vs actually stopped)
  const [isPausedForExemptScreen, setIsPausedForExemptScreen] = useState(false);

  const screenTimeService = ScreenTimeService.getInstance();
  const notificationService = NotificationService.getInstance();

  // Check if current screen is exempt from tracking
  const isOnExemptScreen = EXEMPT_SCREENS.some(screen =>
    currentScreen?.toLowerCase().includes(screen.toLowerCase()) ?? false
  );

  // Update today's usage periodically and check for daily reset
  useEffect(() => {
    const updateUsage = async () => {
      if (screenTimeEnabled) {
        // Check if it's a new day and reset daily data if needed
        await screenTimeService.checkAndResetDailyData();

        const usage = await screenTimeService.getTodayUsage();
        setTodayUsage(usage);
      }
    };

    updateUsage();
    const interval = setInterval(updateUsage, 50000); // Update every 50 seconds - reduces battery/CPU usage

    return () => clearInterval(interval);
  }, [screenTimeEnabled]);

  // Set up warning callback
  useEffect(() => {
    const handleWarning = (warning: ScreenTimeWarning) => {
      setCurrentWarning(warning);
      setShowWarningModal(true);
      
      // Send notification if enabled
      if (notificationsEnabled) {
        const notificationType = warning.type === 'limit_reached' ? 'limit_reached' : 'warning';
        notificationService.sendScreenTimeWarning(warning.message, notificationType);
      }
    };

    screenTimeService.onWarning(handleWarning);

    return () => {
      screenTimeService.removeWarningCallback(handleWarning);
    };
  }, [notificationsEnabled]);

  // Auto-start tracking when provider mounts (app opens) and screen time is enabled
  // BUT don't start if we're on an exempt screen (sleep/music)
  useEffect(() => {
    if (screenTimeEnabled && !isTracking && !isOnExemptScreen) {
      console.log('Screen time: Auto-starting session on app mount');
      screenTimeService.startSession('story', childAgeInMonths).then(() => {
        setIsTracking(true);
        setCurrentActivity('story');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenTimeEnabled]);

  // Handle app state changes - end on background, restart on active
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background, end current session
        if (isTracking) {
          console.log('Screen time: Ending session on background');
          await screenTimeService.endSession();
          setIsTracking(false);
          setCurrentActivity(null);
        }
      } else if (nextAppState === 'active') {
        // App becoming active, start a new session if screen time is enabled
        // BUT don't start if we're on an exempt screen (sleep/music)
        if (screenTimeEnabled && !isTracking && !isOnExemptScreen) {
          console.log('Screen time: Starting session on app active');
          await screenTimeService.startSession('story', childAgeInMonths);
          setIsTracking(true);
          setCurrentActivity('story');
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isTracking, screenTimeEnabled, childAgeInMonths, isOnExemptScreen]);

  // Pause/resume tracking based on exempt screens (sleep/music pages)
  useEffect(() => {
    const handleExemptScreenChange = async () => {
      if (isOnExemptScreen && isTracking && !isPausedForExemptScreen) {
        // User navigated to sleep/music screen - pause tracking
        console.log('Screen time: Pausing session for exempt screen:', currentScreen);
        await screenTimeService.endSession();
        setIsTracking(false);
        setCurrentActivity(null);
        setIsPausedForExemptScreen(true);
      } else if (!isOnExemptScreen && isPausedForExemptScreen && screenTimeEnabled) {
        // User left sleep/music screen - resume tracking
        console.log('Screen time: Resuming session after exempt screen:', currentScreen);
        await screenTimeService.startSession('story', childAgeInMonths);
        setIsTracking(true);
        setCurrentActivity('story');
        setIsPausedForExemptScreen(false);
      }
    };

    handleExemptScreenChange();
  }, [isOnExemptScreen, isTracking, isPausedForExemptScreen, screenTimeEnabled, childAgeInMonths, currentScreen]);

  const startActivity = useCallback(async (activity: 'story' | 'emotions' | 'music') => {
    if (!screenTimeEnabled) return;

    try {
      await screenTimeService.startSession(activity, childAgeInMonths);
      setIsTracking(true);
      setCurrentActivity(activity);

      // Immediately update usage when starting a session
      const usage = await screenTimeService.getTodayUsage();
      setTodayUsage(usage);
    } catch (error) {
      console.error('Failed to start screen time session:', error);
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
      console.error('Failed to end screen time session:', error);
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
        console.error('Failed to refresh usage:', error);
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
