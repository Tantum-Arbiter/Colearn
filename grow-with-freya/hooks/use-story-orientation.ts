import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Logger } from '@/utils/logger';

const log = Logger.create('StoryOrientation');

export type StoryOrientation = 'portrait' | 'landscape';

export const ORIENTATION_SETTLE_TIMEOUT_MS = 1500;

const TABLET_SHORT_EDGE = 768;

interface RemovableSubscription {
  remove?: () => void;
}

interface PendingSettle {
  target: StoryOrientation;
  resolve: (orientation: StoryOrientation) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export function isLandscapeOrientation(orientation: ScreenOrientation.Orientation): boolean {
  return (
    orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT
    || orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
  );
}

export function getOrientationFromDimensions(): StoryOrientation {
  const { width, height } = Dimensions.get('window');
  return width > height ? 'landscape' : 'portrait';
}

export function isTabletDevice(): boolean {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) >= TABLET_SHORT_EDGE;
}

export async function applyDefaultOrientation(): Promise<void> {
  if (isTabletDevice()) {
    await ScreenOrientation.unlockAsync();
    return;
  }

  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
}

export interface StoryOrientationController {
  orientation: StoryOrientation;
  isSettling: boolean;
  isTablet: boolean;
  lockLandscape: () => Promise<StoryOrientation>;
  lockPortrait: () => Promise<StoryOrientation>;
}

export function useStoryOrientation(): StoryOrientationController {
  const [orientation, setOrientation] = useState<StoryOrientation>(getOrientationFromDimensions);
  const [isSettling, setIsSettling] = useState(false);
  const pendingRef = useRef<PendingSettle | null>(null);

  const settle = useCallback((next: StoryOrientation) => {
    setOrientation(next);

    const pending = pendingRef.current;
    if (pending && pending.target === next) {
      clearTimeout(pending.timeout);
      pendingRef.current = null;
      setIsSettling(false);
      pending.resolve(next);
    }
  }, []);

  useEffect(() => {
    const orientationSubscription: RemovableSubscription =
      ScreenOrientation.addOrientationChangeListener((event) => {
        settle(isLandscapeOrientation(event.orientationInfo.orientation) ? 'landscape' : 'portrait');
      });

    const dimensionsSubscription: RemovableSubscription | undefined = Dimensions.addEventListener(
      'change',
      () => {
        settle(getOrientationFromDimensions());
      }
    );

    return () => {
      orientationSubscription?.remove?.();
      dimensionsSubscription?.remove?.();

      const pending = pendingRef.current;
      if (pending) {
        clearTimeout(pending.timeout);
        pendingRef.current = null;
      }
    };
  }, [settle]);

  const lockTo = useCallback(async (target: StoryOrientation): Promise<StoryOrientation> => {
    if (getOrientationFromDimensions() === target) {
      setOrientation(target);
      return target;
    }

    setIsSettling(true);

    const settled = new Promise<StoryOrientation>((resolve) => {
      const timeout = setTimeout(() => {
        pendingRef.current = null;
        setIsSettling(false);
        log.warn(`Device did not settle into ${target} within ${ORIENTATION_SETTLE_TIMEOUT_MS}ms`);
        resolve(getOrientationFromDimensions());
      }, ORIENTATION_SETTLE_TIMEOUT_MS);

      pendingRef.current = { target, resolve, timeout };
    });

    try {
      await ScreenOrientation.lockAsync(
        target === 'landscape'
          ? ScreenOrientation.OrientationLock.LANDSCAPE
          : ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    } catch (error) {
      log.warn(`Failed to lock orientation to ${target}:`, error);

      const pending = pendingRef.current;
      if (pending) {
        clearTimeout(pending.timeout);
        pendingRef.current = null;
      }
      setIsSettling(false);

      return getOrientationFromDimensions();
    }

    return settled;
  }, []);

  const lockLandscape = useCallback(() => lockTo('landscape'), [lockTo]);
  const lockPortrait = useCallback(() => lockTo('portrait'), [lockTo]);

  return {
    orientation,
    isSettling,
    isTablet: isTabletDevice(),
    lockLandscape,
    lockPortrait,
  };
}
