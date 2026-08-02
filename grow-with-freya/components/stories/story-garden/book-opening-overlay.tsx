import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Story } from '@/types/story';
import type { SupportedLanguage } from '@/services/i18n';
import type { ReadingMode } from '@/contexts/story-transition-context';
import type { VoiceOver } from '@/services/voice-recording-service';
import type { BookOpeningPhase, BookOrigin } from '@/hooks/use-book-opening';
import { STORY_GARDEN_MOTION, STORY_GARDEN_SCALE, motionDuration } from '@/constants/story-garden-motion';
import { FocusedBook } from './focused-book';
import { BookOpeningBridge } from './book-opening-bridge';

export const FOCUS_PHASES: BookOpeningPhase[] = ['lifting', 'focused'];
export const BRIDGE_PHASES: BookOpeningPhase[] = ['expanding', 'preOpen', 'bridging', 'settling'];

export function isOverlayPhase(phase: BookOpeningPhase): boolean {
  return FOCUS_PHASES.includes(phase) || BRIDGE_PHASES.includes(phase);
}

export function scrimOpacityFor(phase: BookOpeningPhase): number {
  if (FOCUS_PHASES.includes(phase)) {
    return STORY_GARDEN_SCALE.environmentDim;
  }

  if (BRIDGE_PHASES.includes(phase)) {
    return 1;
  }

  return 0;
}

export interface BookOpeningOverlayProps {
  story: Story | null;
  phase: BookOpeningPhase;
  origin?: BookOrigin | null;
  showRotationEscape: boolean;
  isLandscape: boolean;
  reduceMotion: boolean;
  language: SupportedLanguage;
  onChoose: (mode: ReadingMode, voiceOver: VoiceOver | null) => void;
  onRecordVoice: () => void;
  onPutBack: () => void;
  onTurnTheScreen: () => void;
  onReadThisWay: () => void;
}

export const BookOpeningOverlay = memo(function BookOpeningOverlay({
  story,
  phase,
  origin = null,
  showRotationEscape,
  isLandscape,
  reduceMotion,
  language,
  onChoose,
  onRecordVoice,
  onPutBack,
  onTurnTheScreen,
  onReadThisWay,
}: BookOpeningOverlayProps) {
  const dim = useSharedValue(0);

  useEffect(() => {
    dim.value = withTiming(scrimOpacityFor(phase), {
      duration: motionDuration(STORY_GARDEN_MOTION.bookLift, reduceMotion) || 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [phase, reduceMotion, dim]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));

  if (!story || !isOverlayPhase(phase)) {
    return null;
  }

  const isBridging = BRIDGE_PHASES.includes(phase);

  return (
    <View style={styles.overlay} testID="book-opening-overlay">
      <Animated.View style={[StyleSheet.absoluteFill, dimStyle]} pointerEvents="none">
        <LinearGradient colors={['#1E3A8A', '#101B3D']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      {isBridging ? (
        <BookOpeningBridge
          story={story}
          phase={phase}
          showRotationEscape={showRotationEscape}
          isLandscape={isLandscape}
          reduceMotion={reduceMotion}
          onTurnTheScreen={onTurnTheScreen}
          onReadThisWay={onReadThisWay}
        />
      ) : (
        <FocusedBook
          story={story}
          origin={origin}
          language={language}
          reduceMotion={reduceMotion}
          onChoose={onChoose}
          onRecordVoice={onRecordVoice}
          onPutBack={onPutBack}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1500,
  },
});
