import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Logger } from '@/utils/logger';

const log = Logger.create('ReducedMotion');

interface RemovableSubscription {
  remove?: () => void;
}

export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) {
          setReduceMotion(enabled);
        }
      })
      .catch((error: unknown) => {
        log.warn('Could not read the reduce-motion preference:', error);
      });

    const subscription: RemovableSubscription | undefined = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        if (isMounted) {
          setReduceMotion(enabled);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.remove?.();
    };
  }, []);

  return reduceMotion;
}
