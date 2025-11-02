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

export function ScreenTimeProvider({ children }: ScreenTimeProviderProps) {
  const {
    screenTimeEnabled,
    childAgeInMonths,
    notificationsEnabled,
  } = useAppStore();

  const [isTracking, setIsTracking] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<'story' | 'emotions' | 'music' | null>(null);
  const [todayUsage, setTodayUsage] = useState(0);
  const [currentWarning, setCurrentWarning] = useState<ScreenTimeWarning | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const screenTimeService = ScreenTimeService.getInstance();
  const notificationService = NotificationService.getInstance();

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
    const interval = setInterval(updateUsage, 1000); // Update every 1 second for real-time tracking

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

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background, end current session
        if (isTracking) {
          await endActivity();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isTracking]);

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
