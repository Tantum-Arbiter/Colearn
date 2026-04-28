/**
 * MusicSheetOverlay
 *
 * Semi-transparent overlay displaying the music sheet / note sequence for a
 * music challenge page. Shows the required notes as large colored circles
 * matching the instrument's noteLayout theme, with the note labels inside.
 *
 * Features:
 * - X button top-right to dismiss (returns to page, user can click next or re-enter)
 * - Coexists with burger menu (this overlay is z-index 150, burger menu is z-index 200+)
 * - Shows instrument name and prompt text
 * - Highlights completed notes vs upcoming notes
 * - Animates in/out with fade + slide
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { NoteLayoutItem } from '@/services/music-asset-registry';

interface MusicSheetOverlayProps {
  visible: boolean;
  onClose: () => void;
  /** The required note sequence for this page's challenge */
  requiredSequence: string[];
  /** Note layout from the selected instrument (maps note → color/label/icon) */
  noteLayout: NoteLayoutItem[];
  /** How many notes the user has completed so far (0-based progress) */
  completedNoteCount: number;
  /** Instrument display name */
  instrumentName: string;
  /** Prompt text from the challenge config */
  promptText?: string;
  /** Song name for the success track */
  successSongName?: string;
  /** If provided, shows a "Ready to Play" button at the bottom (preview mode) */
  onReadyToPlay?: () => void;
  /** Optional note preview handlers for UX */
  onNotePressIn?: (note: string) => void;
  onNotePressOut?: (note: string) => void;
  /** Whether the instrument is currently rotated (blow mode / manual rotate) */
  isRotated?: boolean;
}

export const MusicSheetOverlay = React.memo(function MusicSheetOverlay({
  visible,
  onClose,
  requiredSequence,
  noteLayout,
  completedNoteCount,
  instrumentName,
  promptText,
  successSongName,
  onReadyToPlay,
  onNotePressIn,
  onNotePressOut,
  isRotated = false,
}: MusicSheetOverlayProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const overlayOpacity = useSharedValue(0);
  const slideY = useSharedValue(40);

  // Playback preview state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(-1);
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false); // avoid stale closure
  const playbackIndexRef = useRef(-1); // avoid stale closure in stopPlayback

  // Keep the ref in sync with state
  useEffect(() => {
    playbackIndexRef.current = playbackIndex;
  }, [playbackIndex]);

  // Stop playback — release any held note and reset.
  // Uses playbackIndexRef to always have the current value (avoids stale closures).
  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    // Release any note that was being held (use ref for current value)
    const idx = playbackIndexRef.current;
    if (idx >= 0 && idx < requiredSequence.length) {
      onNotePressOut?.(requiredSequence[idx]);
    }
    playbackIndexRef.current = -1;
    setPlaybackIndex(-1);
  }, [requiredSequence, onNotePressOut]);

  // Step through the sequence one note at a time
  const playStep = useCallback((idx: number) => {
    if (!isPlayingRef.current) return;

    if (idx >= requiredSequence.length) {
      // Sequence complete — stop
      stopPlayback();
      return;
    }

    const note = requiredSequence[idx];
    const prevNote = idx > 0 ? requiredSequence[idx - 1] : null;

    // Release previous note
    if (prevNote) {
      onNotePressOut?.(prevNote);
    }

    // Brief gap if same note repeats, otherwise play immediately
    const gapMs = note === prevNote ? 100 : 0;

    playbackTimerRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return;
      playbackIndexRef.current = idx;
      setPlaybackIndex(idx);
      onNotePressIn?.(note);

      // Hold for the note duration, then advance
      playbackTimerRef.current = setTimeout(() => {
        if (!isPlayingRef.current) return;
        playStep(idx + 1);
      }, 500);
    }, gapMs);
  }, [requiredSequence, onNotePressIn, onNotePressOut, stopPlayback]);

  // Toggle play/pause
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      isPlayingRef.current = true;
      setIsPlaying(true);
      playStep(0);
    }
  }, [isPlaying, stopPlayback, playStep]);

  // Stop playback when overlay closes or sequence changes
  useEffect(() => {
    if (!visible) {
      stopPlayback();
    }
  }, [visible, stopPlayback]);

  // Cleanup on unmount — ensure no dangling timers or held notes
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
      slideY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      slideY.value = withTiming(40, { duration: 200 });
    }
  }, [visible, overlayOpacity, slideY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ translateY: slideY.value }],
  }));

  // Build a lookup from note name → layout item for quick access
  const noteMap = new Map<string, NoteLayoutItem>();
  noteLayout.forEach(item => noteMap.set(item.note, item));

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.overlay, animatedStyle]}
      testID="music-sheet-overlay"
    >
      <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />

      <View style={[
        styles.container,
        isRotated && {
          transform: [{ rotate: '-90deg' }],
          width: screenHeight * 0.85,
          maxWidth: screenHeight * 0.85,
          maxHeight: screenWidth * 0.8,
        },
      ]}>
        {/* Header with title and close button */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>♪ Music Sheet</Text>
            <Text style={styles.instrumentLabel}>{instrumentName}</Text>
          </View>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            testID="music-sheet-close-button"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        {/* Scrollable body so "Ready to Play" is always reachable */}
        <ScrollView
          showsVerticalScrollIndicator={true}
          bounces={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Prompt text */}
          {promptText && (
            <Text style={styles.promptText}>{promptText}</Text>
          )}

          {/* Note sequence — horizontal scrollable row */}
          <View style={styles.sheetSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>
                Notes to Play ({completedNoteCount}/{requiredSequence.length})
              </Text>
              {/* Play/Pause preview button */}
              {(onNotePressIn || onNotePressOut) && (
                <Pressable
                  style={[styles.playButton, isPlaying && styles.playButtonActive]}
                  onPress={togglePlayback}
                  testID="music-sheet-play-button"
                >
                  <MaterialIcons
                    name={isPlaying ? 'pause' : 'play-arrow'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.playButtonText}>
                    {isPlaying ? 'Pause' : 'Preview'}
                  </Text>
                </Pressable>
              )}
            </View>
            {(onNotePressIn || onNotePressOut) && !isPlaying && (
              <Text style={styles.sectionHint}>Tap and hold notes to hear them</Text>
            )}
            {isPlaying && (
              <Text style={styles.sectionHint}>Playing preview… tap Pause to stop</Text>
            )}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.noteRow}
            >
              {requiredSequence.map((note, index) => {
                const layout = noteMap.get(note);
                const isCompleted = index < completedNoteCount;
                const isCurrent = index === completedNoteCount && !isPlaying;
                const isPlaybackHighlight = isPlaying && index === playbackIndex;
                const noteColor = layout?.color || '#888';

                return (
                  <View key={`${note}-${index}`} style={styles.noteWrapper}>
                    {/* Connection line between notes */}
                    {index > 0 && (
                      <View style={[
                        styles.noteLine,
                        (isCompleted || (isPlaying && index <= playbackIndex)) && styles.noteLineCompleted,
                      ]} />
                    )}
                    <View
                      style={[
                        styles.noteCircle,
                        {
                          backgroundColor: (isCompleted || isPlaybackHighlight) ? noteColor : 'transparent',
                          borderColor: noteColor,
                          borderWidth: 3,
                        },
                        (isCurrent || isPlaybackHighlight) && styles.noteCircleCurrent,
                      ]}
                      onTouchStart={() => { if (!isPlaying) onNotePressIn?.(note); }}
                      onTouchEnd={() => { if (!isPlaying) onNotePressOut?.(note); }}
                      onTouchCancel={() => { if (!isPlaying) onNotePressOut?.(note); }}
                      testID={`music-sheet-note-${index}`}
                    >
                      <Text style={[
                        styles.noteLetter,
                        (isCompleted || isPlaybackHighlight) && styles.noteLetterCompleted,
                      ]}>
                        {note}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Success song info */}
          {successSongName && (
            <View style={styles.songSection}>
              <Text style={styles.songLabel}>♫ Success Song</Text>
              <Text style={styles.songName}>{successSongName}</Text>
            </View>
          )}

          {/* Ready to Play button — shown in preview mode */}
          {onReadyToPlay && (
            <Pressable
              style={styles.readyToPlayButton}
              onPress={onReadyToPlay}
              testID="ready-to-play-button"
            >
              <Text style={styles.readyToPlayText}>♫ Ready to Play</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Animated.View>
  );
});

// ============================================================================
// Styles
// ============================================================================

const NOTE_CIRCLE_SIZE = 56;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 150, // Below burger menu (z-index 200+) so menu can appear on top
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: 'rgba(20, 20, 50, 0.92)',
    borderRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    maxHeight: '95%',
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    flexGrow: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  instrumentLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  promptText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
  },
  sheetSection: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 0,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(80, 60, 160, 0.8)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 4,
  },
  playButtonActive: {
    backgroundColor: 'rgba(200, 60, 80, 0.8)',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHint: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 12,
    marginBottom: 12,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  noteWrapper: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  noteLine: {
    width: 16,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 2,
  },
  noteLineCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  noteCircle: {
    width: NOTE_CIRCLE_SIZE,
    height: NOTE_CIRCLE_SIZE,
    borderRadius: NOTE_CIRCLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteCircleCurrent: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },

  noteLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: '#999',
  },
  noteLetterCompleted: {
    color: '#FFFFFF',
  },
  songSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  songLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    marginRight: 8,
  },
  songName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  readyToPlayButton: {
    backgroundColor: 'rgba(80, 60, 160, 0.9)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignSelf: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  readyToPlayText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});

