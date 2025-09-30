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
  private maxConcurrentAnimations = 5;

  canStartAnimation(id: string): boolean {
    if (this.activeAnimations.size >= this.maxConcurrentAnimations) {
      return false;
    }
    return true;
  }

  startAnimation(id: string): void {
    this.activeAnimations.add(id);
  }

  endAnimation(id: string): void {
    this.activeAnimations.delete(id);
  }

  getActiveCount(): number {
    return this.activeAnimations.size;
  }

  reset(): void {
    this.activeAnimations.clear();
  }
}

export const animationLimiter = new AnimationLimiter();

// Hook for safe animation management
export function useSafeAnimation(animationId: string) {
  const isActiveRef = useRef(false);

  const startAnimation = useCallback(() => {
    if (!animationLimiter.canStartAnimation(animationId)) {
      console.warn(`Animation ${animationId} blocked - too many concurrent animations`);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endAnimation();
    };
  }, [endAnimation]);

  return { startAnimation, endAnimation };
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
