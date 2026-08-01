import { useCallback, useEffect, useRef, useState } from 'react';
import { STORY_GARDEN_DELAYS } from '@/constants/story-garden-motion';

export interface AutoHideControls {
  visible: boolean;
  reveal: () => void;
  hide: () => void;
  keepAlive: () => void;
  toggle: () => void;
}

export interface AutoHideControlsOptions {
  autoHideDelay?: number;
  initiallyVisible?: boolean;
  enabled?: boolean;
}

export function useAutoHideControls(options: AutoHideControlsOptions = {}): AutoHideControls {
  const {
    autoHideDelay = STORY_GARDEN_DELAYS.controlsAutoHide,
    initiallyVisible = false,
    enabled = true,
  } = options;

  const [visible, setVisible] = useState(initiallyVisible);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setVisible(false);
    }, autoHideDelay);
  }, [clearTimer, autoHideDelay]);

  const reveal = useCallback(() => {
    if (!enabled) {
      return;
    }
    setVisible(true);
    startTimer();
  }, [enabled, startTimer]);

  const hide = useCallback(() => {
    clearTimer();
    setVisible(false);
  }, [clearTimer]);

  const keepAlive = useCallback(() => {
    if (!enabled || !visible) {
      return;
    }
    startTimer();
  }, [enabled, visible, startTimer]);

  const toggle = useCallback(() => {
    if (visible) {
      hide();
      return;
    }
    reveal();
  }, [visible, hide, reveal]);

  useEffect(() => {
    if (initiallyVisible && enabled) {
      startTimer();
    }

    return clearTimer;
  }, [initiallyVisible, enabled, startTimer, clearTimer]);

  return { visible, reveal, hide, keepAlive, toggle };
}
