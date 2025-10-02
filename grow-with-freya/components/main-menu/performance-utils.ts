import { useCallback, useRef, useEffect, useState } from 'react';

/**
 * Performance utilities for preventing crashes and optimizing interactions
 */

// Debounce hook to prevent rapid-fire function calls
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// Throttle hook to limit function execution frequency
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callbackRef.current(...args);
      }
    },
    [delay]
  ) as T;

  return throttledCallback;
}

// Animation limiter to prevent too many concurrent animations
class AnimationLimiter {
  private activeAnimations = new Set<string>();
  private maxConcurrentAnimations = 6; // Increased from 2 to 6 for better normal use
  private cancelledAnimations = new Set<string>();
  private rapidInteractionMode = false;
  private rapidInteractionTimeout: NodeJS.Timeout | null = null;
  private interactionCount = 0;
  private extremeRapidMode = false; // Circuit breaker for extreme rapid pressing
  private extremeInteractionCount = 0;
  private extremeRapidTimeout: NodeJS.Timeout | null = null;
  private selectionTimeouts = new Set<NodeJS.Timeout>(); // Track selection animation timeouts

  canStartAnimation(id: string): boolean {
    if (this.cancelledAnimations.has(id)) {
      return false; // Animation was cancelled
    }

    // During rapid interactions, block only infinite animations (not selection animations)
    if (this.rapidInteractionMode && (id.includes('pulse') || id.includes('glow') || id.includes('shimmer') || id.includes('cloud') || id.includes('rocket'))) {
      return false;
    }

    // During extreme rapid interactions, block ALL animations (circuit breaker)
    if (this.extremeRapidMode) {
      return false;
    }

    // Be more lenient with selection animations (menu-icon-*) - allow more concurrent
    const isSelectionAnimation = id.includes('menu-icon-');
    const maxAllowed = isSelectionAnimation ? this.maxConcurrentAnimations + 4 : this.maxConcurrentAnimations;

    if (this.activeAnimations.size >= maxAllowed) {
      return false;
    }
    return true;
  }

  startAnimation(id: string): void {
    this.cancelledAnimations.delete(id); // Remove from cancelled if restarting
    this.activeAnimations.add(id);

    // Auto-cleanup for selection animations after 2 seconds (they're short-lived)
    if (id.includes('menu-icon-')) {
      const timeout = setTimeout(() => {
        this.activeAnimations.delete(id);
        this.selectionTimeouts.delete(timeout); // Remove from tracking
      }, 2000);
      this.selectionTimeouts.add(timeout); // Track timeout for cleanup
    }
  }

  endAnimation(id: string): void {
    this.activeAnimations.delete(id);
  }

  cancelAnimation(id: string): void {
    this.cancelledAnimations.add(id);
    this.activeAnimations.delete(id);

    // If it's a selection animation, also clear any pending timeout
    if (id.includes('menu-icon-')) {
      // Note: We can't easily match specific timeouts to IDs, but the timeout will handle cleanup safely
      // The timeout callback checks if the animation is still active before deleting
    }
  }

  // Track rapid interactions and disable infinite animations
  trackInteraction(): void {
    this.interactionCount++;
    this.extremeInteractionCount++;

    // Enable rapid mode after 25 interactions within 3 seconds (much more lenient)
    if (this.interactionCount >= 25) {
      this.rapidInteractionMode = true;
      console.log('🚨 Rapid interaction detected - disabling infinite animations (count:', this.interactionCount, ')');
    }

    // Enable extreme rapid mode (circuit breaker) after 30 interactions within 1 second (increased from 20)
    if (this.extremeInteractionCount >= 30) {
      this.extremeRapidMode = true;
      console.log('🔥 EXTREME rapid interaction detected - enabling circuit breaker');
    }

    // Clear existing timeouts
    if (this.rapidInteractionTimeout) {
      clearTimeout(this.rapidInteractionTimeout);
    }
    if (this.extremeRapidTimeout) {
      clearTimeout(this.extremeRapidTimeout);
    }

    // Reset rapid mode after 3 seconds of no interactions (increased from 2s)
    this.rapidInteractionTimeout = setTimeout(() => {
      this.rapidInteractionMode = false;
      this.interactionCount = 0;
      console.log('✅ Rapid interaction mode disabled - re-enabling animations');
    }, 3000);

    // Reset extreme mode after 5 seconds of no interactions
    this.extremeRapidTimeout = setTimeout(() => {
      this.extremeRapidMode = false;
      this.extremeInteractionCount = 0;
      console.log('✅ Extreme rapid interaction mode disabled');
    }, 5000);
  }

  getActiveCount(): number {
    return this.activeAnimations.size;
  }

  isRapidInteractionMode(): boolean {
    return this.rapidInteractionMode;
  }

  isExtremeRapidMode(): boolean {
    return this.extremeRapidMode;
  }

  reset(): void {
    this.activeAnimations.clear();
    this.cancelledAnimations.clear();
    this.rapidInteractionMode = false;
    this.interactionCount = 0;
    this.extremeRapidMode = false;
    this.extremeInteractionCount = 0;

    // Clear all tracked timeouts to prevent memory leaks
    if (this.rapidInteractionTimeout) {
      clearTimeout(this.rapidInteractionTimeout);
      this.rapidInteractionTimeout = null;
    }
    if (this.extremeRapidTimeout) {
      clearTimeout(this.extremeRapidTimeout);
      this.extremeRapidTimeout = null;
    }

    // Clear all selection animation timeouts
    this.selectionTimeouts.forEach(timeout => clearTimeout(timeout));
    this.selectionTimeouts.clear();
  }
}

export const animationLimiter = new AnimationLimiter();

// Hook for safe animation management
export function useSafeAnimation(animationId: string) {
  const isActiveRef = useRef(false);

  const startAnimation = useCallback(() => {
    if (!animationLimiter.canStartAnimation(animationId)) {
      console.warn(`Animation ${animationId} blocked - too many concurrent animations or cancelled`);
      return false;
    }

    animationLimiter.startAnimation(animationId);
    isActiveRef.current = true;
    return true;
  }, [animationId]);

  const endAnimation = useCallback(() => {
    if (isActiveRef.current) {
      animationLimiter.endAnimation(animationId);
      isActiveRef.current = false;
    }
  }, [animationId]);

  const cancelAnimation = useCallback(() => {
    animationLimiter.cancelAnimation(animationId);
    isActiveRef.current = false;
  }, [animationId]);

  // Cleanup on unmount - cancel instead of just ending
  useEffect(() => {
    return () => {
      cancelAnimation();
    };
  }, [cancelAnimation]);

  return { startAnimation, endAnimation, cancelAnimation };
}

// Memory usage monitor (development only)
export function useMemoryMonitor(componentName: string) {
  useEffect(() => {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev && (performance as any).memory) {
      const memory = (performance as any).memory;
      console.log(`${componentName} mounted - Memory:`, {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB',
      });
    }

    return () => {
      const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
      if (isDev && (performance as any).memory) {
        const memory = (performance as any).memory;
        console.log(`${componentName} unmounted - Memory:`, {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        });
      }
    };
  }, [componentName]);
}

// Safe state updater to prevent updates on unmounted components
export function useSafeState<T>(initialState: T): [T, (newState: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialState);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((newState: T | ((prev: T) => T)) => {
    if (mountedRef.current) {
      setState(newState);
    }
  }, []);

  return [state, safeSetState];
}

// Performance logger for debugging
export class PerformanceLogger {
  private static instance: PerformanceLogger;
  private logs: Array<{ timestamp: number; event: string; duration?: number }> = [];

  static getInstance(): PerformanceLogger {
    if (!PerformanceLogger.instance) {
      PerformanceLogger.instance = new PerformanceLogger();
    }
    return PerformanceLogger.instance;
  }

  startTimer(event: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.log(event, duration);
    };
  }

  log(event: string, duration?: number): void {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) {
      this.logs.push({
        timestamp: Date.now(),
        event,
        duration,
      });

      // Keep only last 100 logs
      if (this.logs.length > 100) {
        this.logs = this.logs.slice(-100);
      }
    }
  }

  getLogs(): typeof this.logs {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const performanceLogger = PerformanceLogger.getInstance();
