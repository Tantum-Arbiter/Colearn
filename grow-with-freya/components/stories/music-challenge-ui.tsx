/**
 * MusicChallengeUI - Landscape instrument view with note buttons
 *
 * Two play modes, toggled by user:
 *  🌬️ Blow mode  — mic listens while user holds note buttons
 *  ♫ Press mode — tapping buttons directly plays notes (no mic)
 *
 * Multi-touch: users can hold multiple buttons simultaneously.
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Logger } from '@/utils/logger';
import { useAccessibility } from '@/hooks/use-accessibility';
import type { MusicChallengeHookResult } from '@/hooks/use-music-challenge';
import type { NoteLayoutItem } from '@/services/music-asset-registry';
import { isChordEntry, parseChordEntry } from '@/services/sequence-matcher';

const log = Logger.create('MusicChallengeUI');

type PlayMode = 'blow' | 'press';

interface MusicChallengeUIProps {
  challenge: MusicChallengeHookResult;
  promptText: string;
  requiredSequence: string[];
  noteLayout: NoteLayoutItem[];
  showBreathButton: boolean;
  onSkip?: () => void;
  onContinue?: () => void;
  onMusicSheet?: () => void;
  allowSkip?: boolean;
  /** Called when the instrument rotation state changes (blow mode or manual rotate) */
  onRotationChange?: (isRotated: boolean) => void;
  /** Called when the user toggles between blow/press mode so the parent can start/stop the mic */
  onPlayModeChange?: (mode: PlayMode) => void;
  /** Called when the user toggles the hide/show UI button */
  onVisibilityChange?: (hidden: boolean) => void;
}

/** Individual note button with its own bounce animation */
const NoteButton = React.memo(function NoteButton({
  note,
  color,
  highlighted,
  onPressIn,
  onPressOut,
  playbackActive,
  playbackTick,
  rotationStyle,
  size = 60,
  fontSize = 22,
}: {
  note: string;
  color: string;
  highlighted: boolean;
  onPressIn: (note: string) => void;
  onPressOut: (note: string) => void;
  playbackActive: boolean;
  /** Incrementing counter to force re-trigger even when the same note repeats */
  playbackTick: number;
  /** Animated rotation style applied to just the letter */
  rotationStyle?: { transform: { rotate: string }[] };
  /** Scaled button size */
  size?: number;
  /** Scaled font size */
  fontSize?: number;
}) {
  const bounceScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  // Glow border: 0 = resting (no border), 1 = fully lit (pressed/playback)
  const glowIntensity = useSharedValue(0);
  // Track press start for decay speed
  const pressStartRef = useRef(0);

  // Pulse for highlighted (next expected) note
  useEffect(() => {
    if (highlighted) {
      pulseScale.value = withSequence(
        withTiming(1.1, { duration: 280, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 280, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.04, { duration: 220, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 220, easing: Easing.inOut(Easing.ease) })
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [highlighted, pulseScale]);

  // Playback highlight — keyed on playbackTick so it re-triggers for repeated notes
  useEffect(() => {
    if (playbackActive && playbackTick > 0) {
      bounceScale.value = withSequence(
        withTiming(0.92, { duration: 60 }),
        withSpring(1, { damping: 15, stiffness: 300 })
      );
      // Light up then fade
      glowIntensity.value = withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) })
      );
    }
  }, [playbackTick, playbackActive, bounceScale, glowIntensity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value * bounceScale.value }],
  }));

  // Animated border/shadow glow that fades in on press and out on release
  const glowStyle = useAnimatedStyle(() => ({
    borderWidth: 3 * glowIntensity.value,
    borderColor: `rgba(255, 255, 255, ${glowIntensity.value})`,
    shadowOpacity: 0.8 * glowIntensity.value,
    shadowRadius: 12 * glowIntensity.value,
  }));

  const isPressed = useRef(false);

  const handleTouchStart = useCallback(() => {
    if (isPressed.current) return; // already pressed (duplicate event)
    isPressed.current = true;
    pressStartRef.current = Date.now();
    // Slight depress + glow up instantly — stays glowing while held
    bounceScale.value = withTiming(0.93, { duration: 60 });
    glowIntensity.value = withTiming(1, { duration: 40 });
    onPressIn(note);
  }, [note, onPressIn, bounceScale, glowIntensity]);

  const handleTouchEnd = useCallback(() => {
    if (!isPressed.current) return;
    isPressed.current = false;
    const holdMs = Date.now() - pressStartRef.current;
    // Quick tap = snappy decay, long hold = slower natural fade
    const decayMs = holdMs < 150 ? 250 : 600;
    bounceScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    // Fade the glow out naturally
    glowIntensity.value = withTiming(0, { duration: decayMs, easing: Easing.out(Easing.ease) });
    onPressOut(note);
  }, [note, onPressOut, bounceScale, glowIntensity]);

  return (
    <Animated.View style={animatedStyle}>
      <Animated.View
        style={[
          styles.noteButton,
          { backgroundColor: color, width: size, height: size, borderRadius: size / 2, shadowColor: '#FFF' },
          highlighted && styles.noteButtonHighlighted,
          glowStyle,
        ]}
      >
        <View
          style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          testID={`note-button-${note}`}
        >
          <Animated.Text style={[styles.noteButtonLetter, { fontSize }, rotationStyle]}>
            {note}
          </Animated.Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

export const MusicChallengeUI: React.FC<MusicChallengeUIProps> = ({
  challenge,
  promptText,
  requiredSequence,
  noteLayout,
  showBreathButton,
  onSkip,
  onContinue,
  onMusicSheet,
  allowSkip = false,
  onRotationChange,
  onPlayModeChange,
  onVisibilityChange,
}) => {
  const [playMode, setPlayMode] = useState<PlayMode>('press');
  const [manualRotated, setManualRotated] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const activeNotesRef = useRef<Set<string>>(new Set());
  const { scaledFontSize, scaledButtonSize } = useAccessibility();
  const insets = useSafeAreaInsets();

  // Celebration animation values
  const celebrationScale = useSharedValue(0);
  const celebrationOpacity = useSharedValue(0);
  const shineOffset = useSharedValue(-1);

  // Song playback visualization — which sequence index is currently highlighted
  const [playbackIndex, setPlaybackIndex] = useState(-1);
  // Monotonic counter so NoteButton re-triggers animation even for repeated notes
  const [playbackTick, setPlaybackTick] = useState(0);

  // Rotation for blow mode — instrument faces bottom of phone
  const instrumentRotation = useSharedValue(0);

  const isPlayingSong = challenge.state === 'playing_success_song';
  const isFinished = challenge.isComplete;
  const showCelebration = isPlayingSong || isFinished;

  // Whether rotation is active (user holding phone in portrait orientation)
  const isRotated = playMode === 'blow' || (playMode === 'press' && manualRotated);

  // Report rotation state changes to parent (so music sheet can rotate too)
  useEffect(() => {
    onRotationChange?.(isRotated);
  }, [isRotated, onRotationChange]);

  // In press mode, set breath active permanently
  useEffect(() => {
    if (playMode === 'press') {
      challenge.setBreathActive(true);
    } else {
      challenge.setBreathActive(false);
    }
  }, [playMode]);

  // Animate rotation: automatic in blow mode, manual toggle in press mode
  // Keep rotation active even during celebration so "Amazing!" matches
  useEffect(() => {
    if (playMode === 'blow' || (playMode === 'press' && manualRotated)) {
      instrumentRotation.value = withTiming(-90, { duration: 500, easing: Easing.inOut(Easing.ease) });
    } else {
      instrumentRotation.value = withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) });
    }
  }, [playMode, manualRotated, instrumentRotation]);

  // Reset manual rotation when switching to blow mode
  useEffect(() => {
    if (playMode === 'blow') {
      setManualRotated(false);
    }
  }, [playMode]);

  const instrumentRotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${instrumentRotation.value}deg` }],
  }));

  // Celebration bounce + shine animation
  useEffect(() => {
    if (showCelebration) {
      // Quick bounce-in then settle — one bounce only, high damping to stabilise fast
      celebrationScale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withSpring(1.08, { damping: 12, stiffness: 180 }),
        withSpring(1, { damping: 20, stiffness: 200 })
      );
      celebrationOpacity.value = withTiming(1, { duration: 400 });
      // Single slow shine sweep, then hold — no repeat
      shineOffset.value = withSequence(
        withTiming(-1, { duration: 0 }),
        withTiming(2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      );
    } else {
      celebrationScale.value = 0;
      celebrationOpacity.value = 0;
    }
  }, [showCelebration]);

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationOpacity.value,
  }));

  // In rotated mode the celebration should stay upright at the top of the screen,
  // not rotate with the instrument. Use the same scale/opacity animation without rotation.
  const celebrationRotatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationOpacity.value,
  }));

  // The active sequence — use currentSequence from hook when available (for Go Harder levels)
  const activeSequence = challenge.currentSequence?.length > 0 ? challenge.currentSequence : requiredSequence;

  // Song playback: highlight each note in sequence in time with the audio playback.
  // Holds highlight for the full note duration, then moves directly to the next note.
  // Only inserts a brief "off" gap when two consecutive entries share a note so the
  // user can see the transition.
  useEffect(() => {
    if (isPlayingSong && activeSequence.length > 0) {
      const noteMs = 500;
      const gapMs = 100;
      let cancelled = false;
      let tick = 0;

      const playEntry = (idx: number) => {
        if (cancelled) return;
        const wrappedIdx = idx % activeSequence.length;
        const prevIdx = idx > 0 ? (idx - 1) % activeSequence.length : -1;
        tick++;

        // Check if current entry shares any notes with previous entry
        const needsGap = prevIdx >= 0 &&
          activeSequence[wrappedIdx] === activeSequence[prevIdx];

        const showNote = () => {
          if (cancelled) return;
          setPlaybackIndex(wrappedIdx);
          setPlaybackTick(tick);
          // Hold for the full note duration, then advance
          setTimeout(() => {
            if (!cancelled) playEntry(idx + 1);
          }, noteMs);
        };

        if (needsGap) {
          // Brief off gap so repeated same-note is visually distinct
          setPlaybackIndex(-1);
          setTimeout(showNote, gapMs);
        } else {
          showNote();
        }
      };

      playEntry(0);

      return () => {
        cancelled = true;
        setPlaybackIndex(-1);
        setPlaybackTick(0);
      };
    } else {
      setPlaybackIndex(-1);
      setPlaybackTick(0);
    }
  }, [isPlayingSong, activeSequence]);

  const togglePlayMode = useCallback(() => {
    setPlayMode(prev => {
      const next = prev === 'blow' ? 'press' : 'blow';
      onPlayModeChange?.(next);
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onPlayModeChange]);

  const toggleManualRotation = useCallback(() => {
    setManualRotated(prev => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleNotePressIn = useCallback((note: string) => {
    activeNotesRef.current.add(note);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    challenge.playNote(note);
  }, [challenge]);

  const handleNotePressOut = useCallback((note: string) => {
    activeNotesRef.current.delete(note);
    challenge.stopNote(note);
  }, [challenge]);

  const celebrationFontSize = scaledFontSize(isRotated ? 28 : 36);
  const celebrationSubtextFontSize = scaledFontSize(isRotated ? 12 : 14);

  return (
    <View style={styles.container}>
      {/* Top section: prompt OR celebration */}
      <View style={styles.topSection}>
        {showCelebration ? (
          <Animated.View style={[
            styles.celebrationContainer,
            isRotated && styles.celebrationContainerRotated,
            isRotated ? celebrationRotatedStyle : celebrationStyle,
          ]}>
            <Text style={[styles.celebrationText, { fontSize: celebrationFontSize }]}>Amazing!</Text>
            {challenge.difficultyLevel > 1 && (
              <Text style={[styles.celebrationSubtext, { fontSize: celebrationSubtextFontSize }]}>Level {challenge.difficultyLevel} complete!</Text>
            )}
            {isPlayingSong && (
              <Text style={[styles.celebrationSubtext, { fontSize: celebrationSubtextFontSize }]}>Playing your song...</Text>
            )}
          </Animated.View>
        ) : (
          <View style={[styles.promptContainer, showCelebration && { opacity: 0 }]}>
            <Text style={[styles.promptText, { fontSize: scaledFontSize(16) }]}>{promptText}</Text>
          </View>
        )}
      </View>

      {/* Center section: instrument body (not rotated) */}
      <View style={styles.instrumentBody}>
        <View style={styles.instrumentTube}>
          {/* Rotate button — absolutely positioned at far left, only in press mode */}
          {playMode === 'press' && !isFinished && !isPlayingSong && (
            <View style={styles.rotateButtonWrapper}>
              <Pressable
                style={[styles.rotateButtonCircle, { width: scaledButtonSize(36), height: scaledButtonSize(36), borderRadius: scaledButtonSize(18) }, manualRotated && styles.rotateButtonActive]}
                onPress={toggleManualRotation}
                testID="rotate-button"
              >
                <Text style={[styles.rotateButtonText, { fontSize: scaledFontSize(20) }]}>↻</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.noteButtonsRow}>
            {noteLayout.map((item) => {
              // Disable next-note highlight during playback to avoid double-flash
              // For chord entries like "C+E", highlight all notes in the chord
              const nextNote = challenge.nextExpectedNote;
              const highlighted = !isPlayingSong && nextNote != null && (
                nextNote === item.note ||
                (isChordEntry(nextNote) && parseChordEntry(nextNote).includes(item.note))
              );
              // For chord entries, highlight all notes in the chord during playback
              const playbackEntry = isPlayingSong && playbackIndex >= 0
                ? activeSequence[playbackIndex] : null;
              const isPlaybackNote = playbackEntry != null && (
                playbackEntry === item.note ||
                (isChordEntry(playbackEntry) && parseChordEntry(playbackEntry).includes(item.note))
              );
              return (
                <NoteButton
                  key={item.note}
                  note={item.note}
                  color={item.color}
                  highlighted={highlighted}
                  onPressIn={handleNotePressIn}
                  onPressOut={handleNotePressOut}
                  playbackActive={isPlaybackNote}
                  playbackTick={isPlaybackNote ? playbackTick : 0}
                  rotationStyle={instrumentRotationStyle}
                  size={scaledButtonSize(60)}
                  fontSize={scaledFontSize(22)}
                />
              );
            })}
          </View>
        </View>

        {/* Mouthpiece on the right */}
        <View style={styles.mouthpiece}>
          <View style={styles.mouthpieceInner} />
        </View>
      </View>

      {/* Sequence dots — hidden when UI is toggled off */}
      {/* Sequence dots — use currentSequence from challenge when available (for Go Harder levels) */}
      {(() => {
        const displaySeq = challenge.currentSequence?.length > 0 ? challenge.currentSequence : requiredSequence;
        return (
          <View style={styles.sequenceContainer}>
            <View style={styles.sequenceRow}>
              {displaySeq.map((entry, index) => {
                // For chord entries like "C+E", find the first matching note's color
                const notes = isChordEntry(entry) ? parseChordEntry(entry) : [entry];
                const layoutItem = noteLayout.find(n => notes.includes(n.note));
                const isCompleted = index < challenge.currentNoteIndex;
                const isCurrent = index === challenge.currentNoteIndex;
                // Display label: "C+E" → "C·E" for readability
                const label = isChordEntry(entry)
                  ? parseChordEntry(entry).join('·')
                  : entry;

                return (
                  <View
                    key={`seq-${index}`}
                    style={[
                      styles.sequenceDot,
                      {
                        width: scaledButtonSize(isChordEntry(entry) ? 48 : 32),
                        height: scaledButtonSize(32),
                        borderRadius: scaledButtonSize(16),
                        backgroundColor: isCompleted
                          ? (layoutItem?.color ?? '#81C784')
                          : 'rgba(255,255,255,0.25)',
                        borderColor: isCurrent ? '#FFFFFF' : 'transparent',
                      },
                    ]}
                  >
                    <Animated.Text style={[
                      styles.sequenceDotText,
                      { fontSize: scaledFontSize(isChordEntry(entry) ? 9 : 11) },
                      isCompleted && styles.sequenceDotTextCompleted,
                      instrumentRotationStyle,
                    ]}>
                      {label}
                    </Animated.Text>
                  </View>
                );
              })}
            </View>
            <Animated.Text style={[styles.sequenceProgress, { fontSize: scaledFontSize(12) }, instrumentRotationStyle, (isPlayingSong || isFinished) && { opacity: 0 }]}>
              {Math.min(challenge.currentNoteIndex, displaySeq.length)}/{displaySeq.length}
            </Animated.Text>
          </View>
        );
      })()}

      {/* Bottom section: controls (not rotated) */}
      <View style={styles.bottomSection}>

        {/* Bottom row: controls change based on state */}
        <View style={[styles.bottomRow, isPlayingSong && { opacity: 0 }]}>
          {isFinished ? (
            <>
              <Pressable
                style={styles.retryButton}
                onPress={challenge.retry}
                testID="retry-button"
              >
                <Text style={[styles.retryButtonText, { fontSize: scaledFontSize(15) }]}>↻ Retry</Text>
              </Pressable>
              {!challenge.isMaxDifficulty && (
                <Pressable
                  style={styles.goHarderButton}
                  onPress={challenge.goHarder}
                  testID="go-harder-button"
                >
                  <Text style={[styles.goHarderButtonText, { fontSize: scaledFontSize(15) }]}>
                    <MaterialIcons name="trending-up" size={scaledFontSize(16)} color="#FFFFFF" /> Go Harder{challenge.difficultyLevel > 1 ? ` (Lv ${challenge.difficultyLevel + 1})` : ''}
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={styles.continueButton}
                onPress={onContinue}
                testID="continue-story-button"
              >
                <Text style={[styles.continueButtonText, { fontSize: scaledFontSize(15) }]}>Continue Story →</Text>
              </Pressable>
            </>
          ) : !uiHidden ? (
            <>
              <Pressable
                style={[
                  styles.modeToggleButton,
                  playMode === 'blow' && styles.modeToggleActive,
                ]}
                onPress={togglePlayMode}
                testID="play-mode-toggle"
              >
                <Text style={[styles.modeToggleText, { fontSize: scaledFontSize(14) }]}>
                  {playMode === 'blow' ? '♪ Blow' : '♫ Press'}
                </Text>
              </Pressable>

              {playMode === 'blow' && (
                <Text style={[styles.blowHint, { fontSize: scaledFontSize(12) }]}>
                  {challenge.isBreathActive ? '♪ Blowing!' : 'Blow while holding notes'}
                </Text>
              )}

              {challenge.lastInputCorrect === false && (
                <Text style={[styles.feedbackWrong, { fontSize: scaledFontSize(15) }]}>Try again!</Text>
              )}

              {allowSkip && (
                <Pressable style={styles.skipButton} onPress={onSkip}>
                  <Text style={[styles.skipButtonText, { fontSize: scaledFontSize(13) }]}>Skip →</Text>
                </Pressable>
              )}
            </>
          ) : null}
        </View>
        {isPlayingSong && (
          <View style={styles.listeningOverlay}>
            <Text style={[styles.blowHint, { fontSize: scaledFontSize(12) }]}>Listen to your melody...</Text>
          </View>
        )}
      </View>

      {/* Floating controls — bottom left in landscape, rotate with instrument in portrait */}
      {onMusicSheet && !uiHidden && (
        <Animated.View style={[
          styles.floatingControlsWrapper,
          { bottom: Math.max(insets.bottom + 5, 20), left: Math.max(insets.left + 5, 20) },
          instrumentRotationStyle,
        ]}>
          <Pressable
            style={[styles.floatingControlButton, { width: scaledButtonSize(44), height: scaledButtonSize(44), borderRadius: scaledButtonSize(22) }]}
            onPress={onMusicSheet}
            testID="music-sheet-button"
            accessibilityLabel="Open music sheet"
          >
            <MaterialIcons name="library-music" size={scaledFontSize(22)} color="#FFFFFF" testID="music-sheet-icon" />
          </Pressable>
        </Animated.View>
      )}

      {/* Hide/Unhide button — bottom right, aligned with burger menu */}
      <View style={[
        styles.floatingControlsWrapper,
        { bottom: Math.max(insets.bottom + 5, 20), right: Math.max(insets.right + 5, 20) },
      ]}>
        <Pressable
          style={[styles.floatingControlButton, { width: scaledButtonSize(44), height: scaledButtonSize(44), borderRadius: scaledButtonSize(22) }]}
          onPress={() => {
            const newVal = !uiHidden;
            setUiHidden(newVal);
            onVisibilityChange?.(newVal);
          }}
          testID="hide-ui-button"
          accessibilityLabel={uiHidden ? 'Show controls' : 'Hide controls'}
        >
          <MaterialIcons name={uiHidden ? 'visibility' : 'visibility-off'} size={scaledFontSize(22)} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  // Top section: flex 1.8 to push instrument + sequence lower
  topSection: {
    flex: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  promptContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    maxWidth: '85%',
  },

  // Bottom section: flex 1 so it shares space equally with top, keeping instrument centered
  bottomSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
    gap: 10,
  },
  listeningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Rotate button — absolutely positioned at far left inside tube
  rotateButtonWrapper: {
    position: 'absolute',
    left: 46,
    top: '10%',
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  rotateButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  rotateButtonActive: {
    backgroundColor: 'rgba(129, 199, 132, 0.4)',
    borderColor: 'rgba(129, 199, 132, 0.6)',
  },
  rotateButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
  },

  // Instrument body — horizontal across the screen
  instrumentBody: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  instrumentTube: {
    flex: 1,
    backgroundColor: 'rgba(60, 60, 80, 0.6)',
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minHeight: 90,
    justifyContent: 'center',
  },
  noteButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 26,
  },

  // Mouthpiece on the right
  mouthpiece: {
    width: 32,
    height: 50,
    backgroundColor: 'rgba(80, 80, 100, 0.7)',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -2,
    borderWidth: 2,
    borderLeftWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  mouthpieceInner: {
    width: 10,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 5,
  },

  // Note buttons on the instrument — circular with letter only
  noteButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  noteButtonHighlighted: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FFF',
    shadowOpacity: 0.6,
  },
  noteButtonLetter: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },

  // Sequence progress dots — below instrument
  sequenceContainer: {
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  sequenceRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  sequenceDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  sequenceDotPlayback: {
    borderWidth: 3,
    borderColor: '#FFD700',
    transform: [{ scale: 1.2 }],
  },
  sequenceDotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    opacity: 0.5,
  },
  sequenceDotTextCompleted: {
    opacity: 1,
  },
  sequenceProgress: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },

  // Bottom row — mode toggle, feedback, skip
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  modeToggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  modeToggleActive: {
    backgroundColor: 'rgba(78, 205, 196, 0.5)',
    borderColor: '#4ECDC4',
  },
  modeToggleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  blowHint: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.7,
  },
  feedbackWrong: {
    color: '#FF6B6B',
    fontSize: 15,
    fontWeight: '600',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    opacity: 0.7,
  },
  floatingControlsWrapper: {
    position: 'absolute',
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingControlButton: {
    backgroundColor: 'rgba(80, 60, 140, 0.85)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Celebration (shown above instrument on completion — landscape, no rotation)
  celebrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
  },
  // Celebration when rotated — stays in the top section so it doesn't overlap note buttons
  celebrationContainerRotated: {
    maxWidth: 260,
    paddingVertical: 8,
  },
  celebrationText: {
    color: '#FFD700',
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 3,
    textShadowColor: 'rgba(255, 215, 0, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  celebrationSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  // Retry + Continue buttons
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  goHarderButton: {
    backgroundColor: 'rgba(220, 80, 20, 0.85)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 180, 50, 0.6)',
  },
  goHarderButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  continueButton: {
    backgroundColor: 'rgba(80, 60, 160, 0.9)',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});