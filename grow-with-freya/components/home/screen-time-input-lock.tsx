import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SCREEN_TIME_GLANCE } from '@/constants/screen-time-ring';

export interface ScreenTimeLock {
  held: boolean;
  isHeld: () => boolean;
  hold: () => void;
  release: () => void;
}

export function useScreenTimeLock(): ScreenTimeLock {
  const heldNow = useRef(false);
  const [held, setHeld] = useState(false);

  const hold = useCallback(() => {
    heldNow.current = true;
    setHeld(true);
  }, []);

  const release = useCallback(() => {
    heldNow.current = false;
    setHeld(false);
  }, []);

  const isHeld = useCallback(() => heldNow.current, []);

  return { held, isHeld, hold, release };
}

export function ScreenTimeInputLock({ held }: { held: boolean }) {
  if (!held) return null;
  return <View testID="screen-time-input-lock" pointerEvents="auto" style={styles.lock} />;
}

const styles = StyleSheet.create({
  lock: {
    ...StyleSheet.absoluteFill,
    zIndex: SCREEN_TIME_GLANCE.layer + 1,
    elevation: SCREEN_TIME_GLANCE.layer + 1,
  },
});
