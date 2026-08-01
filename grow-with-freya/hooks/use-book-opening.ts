import { useCallback, useEffect, useRef, useState } from 'react';
import { Story } from '@/types/story';
import type { ReadingMode } from '@/contexts/story-transition-context';
import type { VoiceOver } from '@/services/voice-recording-service';
import { useStoryOrientation } from '@/hooks/use-story-orientation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  STORY_GARDEN_MOTION,
  STORY_GARDEN_DELAYS,
  motionDuration,
} from '@/constants/story-garden-motion';

export type BookOpeningPhase =
  | 'idle'
  | 'lifting'
  | 'focused'
  | 'expanding'
  | 'preOpen'
  | 'bridging'
  | 'settling'
  | 'open'
  | 'openPortrait';

export interface BookOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BookOpeningController {
  phase: BookOpeningPhase;
  story: Story | null;
  origin: BookOrigin | null;
  mode: ReadingMode | null;
  voiceOver: VoiceOver | null;
  showRotationEscape: boolean;
  isLandscape: boolean;
  reduceMotion: boolean;
  pickUp: (story: Story, origin?: BookOrigin | null) => void;
  putBack: () => void;
  choose: (mode: ReadingMode, voiceOver: VoiceOver | null) => void;
  readThisWay: () => void;
  reset: () => void;
}

export function useBookOpening(): BookOpeningController {
  const { orientation, lockLandscape, lockPortrait } = useStoryOrientation();
  const reduceMotion = useReducedMotion();

  const [phase, setPhase] = useState<BookOpeningPhase>('idle');
  const [story, setStory] = useState<Story | null>(null);
  const [origin, setOrigin] = useState<BookOrigin | null>(null);
  const [mode, setMode] = useState<ReadingMode | null>(null);
  const [voiceOver, setVoiceOver] = useState<VoiceOver | null>(null);
  const [showRotationEscape, setShowRotationEscape] = useState(false);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMountedRef = useRef(true);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        callback();
      }
    }, delay);
    timersRef.current.push(timer);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setPhase('idle');
    setStory(null);
    setOrigin(null);
    setMode(null);
    setVoiceOver(null);
    setShowRotationEscape(false);
  }, [clearTimers]);

  const pickUp = useCallback(
    (chosen: Story, chosenOrigin: BookOrigin | null = null) => {
      clearTimers();
      setStory(chosen);
      setOrigin(chosenOrigin);
      setMode(null);
      setVoiceOver(null);
      setShowRotationEscape(false);
      setPhase('lifting');

      const liftDuration =
        motionDuration(STORY_GARDEN_MOTION.bookLift, reduceMotion)
        + motionDuration(STORY_GARDEN_MOTION.focusSettle, reduceMotion);

      schedule(() => setPhase('focused'), liftDuration);
    },
    [clearTimers, schedule, reduceMotion]
  );

  const putBack = useCallback(() => {
    reset();
  }, [reset]);

  const enterLandscape = useCallback(() => {
    setPhase('bridging');

    if (orientation !== 'landscape') {
      schedule(() => setShowRotationEscape(true), STORY_GARDEN_DELAYS.rotationPrompt);
    }

    lockLandscape()
      .then((settled) => {
        if (!isMountedRef.current || settled !== 'landscape') {
          return;
        }
        setShowRotationEscape(false);
        setPhase('settling');
        schedule(
          () => setPhase('open'),
          motionDuration(STORY_GARDEN_MOTION.landscapeSettle, reduceMotion)
        );
      })
      .catch(() => undefined);
  }, [orientation, lockLandscape, schedule, reduceMotion]);

  const choose = useCallback(
    (chosenMode: ReadingMode, chosenVoiceOver: VoiceOver | null) => {
      clearTimers();
      setMode(chosenMode);
      setVoiceOver(chosenVoiceOver);
      setPhase('expanding');

      const expansion = motionDuration(STORY_GARDEN_MOTION.coverExpansion, reduceMotion);
      const preOpen = motionDuration(STORY_GARDEN_MOTION.preOpen, reduceMotion);

      if (preOpen === 0) {
        schedule(enterLandscape, expansion);
        return;
      }

      schedule(() => {
        setPhase('preOpen');
        schedule(enterLandscape, preOpen);
      }, expansion);
    },
    [clearTimers, schedule, reduceMotion, enterLandscape]
  );

  const readThisWay = useCallback(() => {
    clearTimers();
    setShowRotationEscape(false);
    setPhase('openPortrait');
    lockPortrait().catch(() => undefined);
  }, [clearTimers, lockPortrait]);

  return {
    phase,
    story,
    origin,
    mode,
    voiceOver,
    showRotationEscape,
    isLandscape: orientation === 'landscape',
    reduceMotion,
    pickUp,
    putBack,
    choose,
    readThisWay,
    reset,
  };
}
