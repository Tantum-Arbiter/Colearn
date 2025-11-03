import { useEffect, useRef, useState, useCallback } from 'react';
import { useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

interface AnimationTimingState {
  isActive: boolean;
  hasStarted: boolean;
  isPaused: boolean;
  startTime: number | null;
  pauseTime: number | null;
}

interface AnimationTimingConfig {
  startDelay: number; // Delay before animation starts (default: 2000ms)
  autoStart: boolean; // Whether to start automatically when active
  resetOnInactive: boolean; // Whether to reset when page becomes inactive
}

interface UseCharacterAnimationTimingProps {
  isPageActive: boolean;
  config?: Partial<AnimationTimingConfig>;
  onAnimationStart?: () => void;
  onAnimationReset?: () => void;
}

/**
 * Hook for managing character animation timing
 * Handles 2-second delays, page transitions, and reset functionality
 */
export function useCharacterAnimationTiming({
  isPageActive,
  config = {},
  onAnimationStart,
  onAnimationReset,
}: UseCharacterAnimationTimingProps) {
  const defaultConfig: AnimationTimingConfig = {
    startDelay: 2000,
    autoStart: true,
    resetOnInactive: true,
  };

  const finalConfig = { ...defaultConfig, ...config };

  // State management
  const [timingState, setTimingState] = useState<AnimationTimingState>({
    isActive: false,
    hasStarted: false,
    isPaused: false,
    startTime: null,
    pauseTime: null,
  });

  // Refs for cleanup
  const startTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationProgressRef = useRef<number>(0);

  // Shared values for animations
  const animationProgress = useSharedValue(0);
  const isAnimationActive = useSharedValue(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
    animationProgressRef.current = 0;
    animationProgress.value = 0;
    isAnimationActive.value = false;
  }, [animationProgress, isAnimationActive]);

  // Reset animation state
  const resetAnimation = useCallback(() => {
    cleanup();
    setTimingState({
      isActive: false,
      hasStarted: false,
      isPaused: false,
      startTime: null,
      pauseTime: null,
    });
    onAnimationReset?.();
  }, [cleanup, onAnimationReset]);

  // Start animation with delay
  const startAnimation = useCallback(() => {
    if (timingState.hasStarted || !isPageActive) return;

    const startTime = Date.now();
    setTimingState(prev => ({
      ...prev,
      isActive: true,
      startTime,
    }));

    // Start animation after delay
    startTimeoutRef.current = setTimeout(() => {
      if (!isPageActive) return; // Double-check page is still active

      setTimingState(prev => ({
        ...prev,
        hasStarted: true,
      }));

      isAnimationActive.value = true;
      animationProgress.value = withTiming(1, {
        duration: 1000, // Progress animation duration
      }, (finished) => {
        if (finished) {
          runOnJS(onAnimationStart)?.();
        }
      });
    }, finalConfig.startDelay);
  }, [
    timingState.hasStarted,
    isPageActive,
    finalConfig.startDelay,
    isAnimationActive,
    animationProgress,
    onAnimationStart,
  ]);

  // Pause animation
  const pauseAnimation = useCallback(() => {
    if (!timingState.isActive || timingState.isPaused) return;

    const pauseTime = Date.now();
    setTimingState(prev => ({
      ...prev,
      isPaused: true,
      pauseTime,
    }));

    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
  }, [timingState.isActive, timingState.isPaused]);

  // Resume animation
  const resumeAnimation = useCallback(() => {
    if (!timingState.isPaused || !isPageActive) return;

    const now = Date.now();
    const pauseDuration = timingState.pauseTime ? now - timingState.pauseTime : 0;
    const elapsedTime = timingState.startTime ? now - timingState.startTime - pauseDuration : 0;
    const remainingDelay = Math.max(0, finalConfig.startDelay - elapsedTime);

    setTimingState(prev => ({
      ...prev,
      isPaused: false,
      pauseTime: null,
    }));

    if (!timingState.hasStarted && remainingDelay > 0) {
      startTimeoutRef.current = setTimeout(() => {
        if (!isPageActive) return;

        setTimingState(prev => ({
          ...prev,
          hasStarted: true,
        }));

        isAnimationActive.value = true;
        animationProgress.value = withTiming(1, {
          duration: 1000,
        }, (finished) => {
          if (finished) {
            runOnJS(onAnimationStart)?.();
          }
        });
      }, remainingDelay);
    } else if (!timingState.hasStarted) {
      // Start immediately if delay has already passed
      setTimingState(prev => ({
        ...prev,
        hasStarted: true,
      }));

      isAnimationActive.value = true;
      animationProgress.value = withTiming(1, {
        duration: 1000,
      }, (finished) => {
        if (finished) {
          runOnJS(onAnimationStart)?.();
        }
      });
    }
  }, [
    timingState.isPaused,
    timingState.hasStarted,
    timingState.startTime,
    timingState.pauseTime,
    isPageActive,
    finalConfig.startDelay,
    isAnimationActive,
    animationProgress,
    onAnimationStart,
  ]);

  // Handle page active state changes
  useEffect(() => {
    if (isPageActive) {
      if (finalConfig.autoStart && !timingState.hasStarted && !timingState.isActive) {
        startAnimation();
      } else if (timingState.isPaused) {
        resumeAnimation();
      }
    } else {
      if (finalConfig.resetOnInactive) {
        resetAnimation();
      } else {
        pauseAnimation();
      }
    }
  }, [
    isPageActive,
    finalConfig.autoStart,
    finalConfig.resetOnInactive,
    timingState.hasStarted,
    timingState.isActive,
    timingState.isPaused,
    startAnimation,
    resumeAnimation,
    resetAnimation,
    pauseAnimation,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Calculate timing information
  const getTimingInfo = useCallback(() => {
    const now = Date.now();
    let elapsedTime = 0;
    let remainingDelay = finalConfig.startDelay;

    if (timingState.startTime) {
      const pauseDuration = timingState.pauseTime && timingState.isPaused
        ? now - timingState.pauseTime
        : 0;
      elapsedTime = now - timingState.startTime - pauseDuration;
      remainingDelay = Math.max(0, finalConfig.startDelay - elapsedTime);
    }

    return {
      elapsedTime,
      remainingDelay,
      progress: elapsedTime / finalConfig.startDelay,
      isInDelay: !timingState.hasStarted && timingState.isActive,
      willStart: remainingDelay <= 0 && !timingState.hasStarted,
    };
  }, [
    timingState.startTime,
    timingState.pauseTime,
    timingState.isPaused,
    timingState.hasStarted,
    timingState.isActive,
    finalConfig.startDelay,
  ]);

  return {
    // State
    isActive: timingState.isActive,
    hasStarted: timingState.hasStarted,
    isPaused: timingState.isPaused,
    
    // Shared values for animations
    animationProgress,
    isAnimationActive,
    
    // Control functions
    startAnimation,
    pauseAnimation,
    resumeAnimation,
    resetAnimation,
    
    // Timing information
    getTimingInfo,
    
    // Configuration
    config: finalConfig,
  };
}

/**
 * Hook for managing multiple character animations with staggered timing
 */
export function useMultipleCharacterAnimationTiming(
  characters: Array<{
    id: string;
    startDelay?: number;
    isPageActive: boolean;
  }>,
  onCharacterAnimationStart?: (characterId: string) => void
) {
  const characterTimings = characters.map(character => {
    return useCharacterAnimationTiming({
      isPageActive: character.isPageActive,
      config: {
        startDelay: character.startDelay || 2000,
        autoStart: true,
        resetOnInactive: true,
      },
      onAnimationStart: () => onCharacterAnimationStart?.(character.id),
    });
  });

  const resetAllAnimations = useCallback(() => {
    characterTimings.forEach(timing => timing.resetAnimation());
  }, [characterTimings]);

  const pauseAllAnimations = useCallback(() => {
    characterTimings.forEach(timing => timing.pauseAnimation());
  }, [characterTimings]);

  const resumeAllAnimations = useCallback(() => {
    characterTimings.forEach(timing => timing.resumeAnimation());
  }, [characterTimings]);

  return {
    characterTimings,
    resetAllAnimations,
    pauseAllAnimations,
    resumeAllAnimations,
  };
}
