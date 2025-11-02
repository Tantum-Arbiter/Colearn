import { useEffect, useCallback } from 'react';
import { useScreenTime } from '../components/screen-time';

interface UseScreenTimeTrackingOptions {
  activity: 'story' | 'emotions' | 'music';
  autoStart?: boolean;
  autoEnd?: boolean;
}

/**
 * Hook to automatically track screen time for activities
 * 
 * @param options Configuration for screen time tracking
 * @returns Object with manual control functions
 */
export function useScreenTimeTracking({
  activity,
  autoStart = true,
  autoEnd = true,
}: UseScreenTimeTrackingOptions) {
  const { startActivity, endActivity, isTracking, currentActivity } = useScreenTime();

  // Start tracking when component mounts (if autoStart is true)
  useEffect(() => {
    if (autoStart) {
      startActivity(activity);
    }

    // Cleanup: end tracking when component unmounts (if autoEnd is true)
    return () => {
      if (autoEnd && isTracking && currentActivity === activity) {
        endActivity();
      }
    };
  }, [activity, autoStart, autoEnd, startActivity, endActivity, isTracking, currentActivity]);

  // Manual control functions
  const startTracking = useCallback(() => {
    startActivity(activity);
  }, [startActivity, activity]);

  const stopTracking = useCallback(() => {
    if (isTracking && currentActivity === activity) {
      endActivity();
    }
  }, [endActivity, isTracking, currentActivity, activity]);

  return {
    startTracking,
    stopTracking,
    isTracking: isTracking && currentActivity === activity,
  };
}
