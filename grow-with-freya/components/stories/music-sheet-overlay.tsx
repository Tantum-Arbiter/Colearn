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

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { NoteLayoutItem } from '@/services/music-asset-registry';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  /** When true, closing the overlay fades out instead of sliding down */
  fadeOutOnly?: boolean;
  /** Tempo hint in BPM — controls preview playback speed (default: 120) */
  bpm?: number;
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
  fadeOutOnly = false,
  bpm = 120,
}: MusicSheetOverlayProps) {
  const { t } = useTranslation();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = screenWidth > screenHeight;
  // Initialise shared values based on the initial `visible` prop so that when
  // the component mounts already-visible (e.g. practise preview phase) the
  // overlay is shown immediately without relying on the useEffect animation.
  const overlayOpacity = useSharedValue(visible ? 1 : 0);
  const slideY = useSharedValue(visible ? 0 : screenHeight);
  // Keep overlay rendered during close animation
  const [isRendered, setIsRendered] = useState(visible);

  // Carousel state (landscape only)
  const carouselRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

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

    // Derive note duration from BPM (one beat per note)
    const noteMs = Math.round(60000 / Math.max(bpm, 30));
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
      }, noteMs);
    }, gapMs);
  }, [requiredSequence, onNotePressIn, onNotePressOut, stopPlayback, bpm]);

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

  // Keep a ref to stopPlayback so the unmount cleanup always calls the
  // latest version (avoids stale closures capturing old onNotePressOut).
  const stopPlaybackRef = useRef(stopPlayback);
  stopPlaybackRef.current = stopPlayback;

  // Stop playback when overlay closes or sequence changes
  useEffect(() => {
    if (!visible) {
      stopPlaybackRef.current();
    }
  }, [visible]);

  // Cleanup on unmount — ensure no dangling timers AND release held notes.
  // Uses the ref so we always call the latest stopPlayback (with current
  // onNotePressOut and requiredSequence) rather than a stale closure.
  useEffect(() => {
    return () => {
      stopPlaybackRef.current();
    };
  }, []);

  // Track whether this is the initial mount so we can skip redundant animations.
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      // Skip animation on first mount if already initialised to visible
      if (isFirstRenderRef.current && overlayOpacity.value === 1) {
        isFirstRenderRef.current = false;
        return;
      }
      isFirstRenderRef.current = false;
      overlayOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
      slideY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    } else if (isRendered) {
      if (fadeOutOnly) {
        // Fade out only (no slide) — used when transitioning to instrument view
        overlayOpacity.value = withTiming(
          0,
          { duration: 300, easing: Easing.in(Easing.ease) },
          (finished) => {
            if (finished) {
              runOnJS(setIsRendered)(false);
            }
          }
        );
      } else {
        // Slide down off screen, then unmount
        overlayOpacity.value = withTiming(0, { duration: 300 });
        slideY.value = withTiming(
          screenHeight,
          { duration: 300, easing: Easing.in(Easing.cubic) },
          (finished) => {
            if (finished) {
              runOnJS(setIsRendered)(false);
            }
          }
        );
      }
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ translateY: slideY.value }],
  }));

  // Calculate max height for the ScrollView so it doesn't collapse to 0.
  // The container is content-sized (window mode), so the ScrollView cannot use
  // flex: 1. Instead we give it an explicit maxHeight based on the screen,
  // reserving space for header (~70px), button (~60px), and safe-area insets.
  const scrollMaxHeight = screenHeight * 0.85 - 70 - 60 - insets.top - insets.bottom;

  // Build a lookup from note name → layout item for quick access
  const noteMap = new Map<string, NoteLayoutItem>();
  noteLayout.forEach(item => noteMap.set(item.note, item));

  // Landscape carousel: calculate how many notes fit per page
  const circleSize = isLandscape ? LANDSCAPE_NOTE_SIZE : NOTE_CIRCLE_SIZE;
  const noteGap = 8;
  // Container width for landscape carousel (card takes ~75% of screen, minus padding + arrow buttons)
  const cardWidth = isLandscape ? Math.min(screenWidth * 0.75, 640) : screenWidth * 0.9;
  const carouselPadding = 20; // horizontal padding inside card
  const arrowWidth = 36; // width of each arrow button
  const availableWidth = cardWidth - (carouselPadding * 2) - (arrowWidth * 2) - 16; // 16 = gap between arrows and notes
  const notesPerPage = isLandscape
    ? Math.max(1, Math.floor((availableWidth + noteGap) / (circleSize + noteGap)))
    : requiredSequence.length; // portrait shows all in grid

  const pages = useMemo(() => {
    if (!isLandscape) return [requiredSequence];
    const result: string[][] = [];
    for (let i = 0; i < requiredSequence.length; i += notesPerPage) {
      result.push(requiredSequence.slice(i, i + notesPerPage));
    }
    return result;
  }, [requiredSequence, notesPerPage, isLandscape]);

  const totalPages = pages.length;

  // Auto-scroll carousel to follow playback
  useEffect(() => {
    if (!isLandscape || !isPlaying || playbackIndex < 0) return;
    const targetPage = Math.floor(playbackIndex / notesPerPage);
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
      carouselRef.current?.scrollTo({ x: targetPage * availableWidth, animated: true });
    }
  }, [playbackIndex, isLandscape, isPlaying, notesPerPage, currentPage, availableWidth]);

  const handleCarouselScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / availableWidth);
    setCurrentPage(page);
  }, [availableWidth]);

  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(0, Math.min(page, totalPages - 1));
    setCurrentPage(clamped);
    carouselRef.current?.scrollTo({ x: clamped * availableWidth, animated: true });
  }, [totalPages, availableWidth]);

  if (!isRendered && !visible) return null;

  // Render a single note circle
  const renderNote = (note: string, index: number) => {
    const layout = noteMap.get(note);
    const isCompleted = index < completedNoteCount;
    const isCurrent = index === completedNoteCount && !isPlaying;
    const isPlaybackHighlight = isPlaying && index === playbackIndex;
    const noteColor = layout?.color || '#888';

    return (
      <View key={`${note}-${index}`} style={[styles.noteGridItem, isLandscape && styles.noteGridItemLandscape]}>
        <View
          style={[
            styles.noteCircle,
            isLandscape && styles.noteCircleLandscape,
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
            isLandscape && styles.noteLetterLandscape,
            (isCompleted || isPlaybackHighlight) && styles.noteLetterCompleted,
          ]}>
            {note}
          </Text>
        </View>
        <Text style={styles.noteIndex}>{index + 1}</Text>
      </View>
    );
  };

  // Play/pause button (shared between portrait & landscape)
  const playPauseButton = (onNotePressIn || onNotePressOut) ? (
    <Pressable
      style={[styles.playButton, isPlaying && styles.playButtonActive]}
      onPress={togglePlayback}
      testID="music-sheet-play-button"
    >
      <MaterialIcons
        name={isPlaying ? 'pause' : 'play-arrow'}
        size={isLandscape ? 16 : 20}
        color="#FFFFFF"
      />
      <Text style={[styles.playButtonText, isLandscape && { fontSize: 11 }]}>
        {isPlaying ? t('music.pause') : t('music.preview')}
      </Text>
    </Pressable>
  ) : null;

  return (
    <Animated.View
      style={[styles.overlay, animatedStyle]}
      testID="music-sheet-overlay"
    >
      <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />

      <View style={[
        styles.container,
        isLandscape && [styles.containerLandscape, { maxWidth: cardWidth }],
      ]}>
        {/* Header with title and close button */}
        <View style={[styles.header, isLandscape && styles.headerLandscape]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, isLandscape && styles.titleLandscape]}>
              {t('music.musicSheet')}
            </Text>
            {!isLandscape && (
              <Text style={styles.instrumentLabel}>{instrumentName}</Text>
            )}
          </View>
          {/* Play button in header for landscape */}
          {isLandscape && playPauseButton}
          <Pressable
            style={[styles.closeButton, isLandscape && styles.closeButtonLandscape]}
            onPress={onClose}
            testID="music-sheet-close-button"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        {isLandscape ? (
          /* ========== LANDSCAPE: Horizontal paging carousel ========== */
          <>
            {/* Hint text */}
            {(onNotePressIn || onNotePressOut) && !isPlaying && (
              <Text style={[styles.sectionHint, styles.sectionHintLandscape]}>{t('music.tapAndHoldNotes')}</Text>
            )}
            {isPlaying && (
              <Text style={[styles.sectionHint, styles.sectionHintLandscape]}>{t('music.playingPreview')}</Text>
            )}

            {/* Carousel row: arrow – notes – arrow */}
            <View style={styles.carouselRow}>
              {/* Left arrow */}
              <Pressable
                style={[styles.carouselArrow, currentPage === 0 && styles.carouselArrowDisabled]}
                onPress={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
              >
                <Ionicons name="chevron-back" size={24} color={currentPage === 0 ? 'rgba(255,255,255,0.2)' : '#FFFFFF'} />
              </Pressable>

              {/* Paging ScrollView */}
              <ScrollView
                ref={carouselRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onMomentumScrollEnd={handleCarouselScroll}
                style={[styles.carouselScroll, { width: availableWidth }]}
                contentContainerStyle={styles.carouselContent}
              >
                {pages.map((pageNotes, pageIdx) => (
                  <View
                    key={`page-${pageIdx}`}
                    style={[styles.carouselPage, { width: availableWidth }]}
                  >
                    {pageNotes.map((note, noteIdx) => {
                      const globalIdx = pageIdx * notesPerPage + noteIdx;
                      return renderNote(note, globalIdx);
                    })}
                  </View>
                ))}
              </ScrollView>

              {/* Right arrow */}
              <Pressable
                style={[styles.carouselArrow, currentPage >= totalPages - 1 && styles.carouselArrowDisabled]}
                onPress={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
              >
                <Ionicons name="chevron-forward" size={24} color={currentPage >= totalPages - 1 ? 'rgba(255,255,255,0.2)' : '#FFFFFF'} />
              </Pressable>
            </View>

            {/* Page indicator dots */}
            {totalPages > 1 && (
              <View style={styles.pageIndicator}>
                {pages.map((_, i) => (
                  <View
                    key={`dot-${i}`}
                    style={[styles.pageDot, i === currentPage && styles.pageDotActive]}
                  />
                ))}
              </View>
            )}

            {/* Bottom row: song info + ready button */}
            <View style={styles.landscapeBottomRow}>
              {successSongName && (
                <View style={[styles.songSection, styles.songSectionLandscape]}>
                  <Text style={styles.songLabel}>{t('music.successSong')}</Text>
                  <Text style={styles.songName}>{successSongName}</Text>
                </View>
              )}
              {onReadyToPlay && (
                <Pressable
                  style={[styles.readyToPlayButton, styles.readyToPlayButtonLandscape]}
                  onPress={onReadyToPlay}
                  testID="ready-to-play-button"
                >
                  <Text style={[styles.readyToPlayText, styles.readyToPlayTextLandscape]}>
                    {t('music.readyToPlay')}
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        ) : (
          /* ========== PORTRAIT: Original wrapping grid in vertical scroll ========== */
          <>
            <ScrollView
              showsVerticalScrollIndicator={true}
              bounces={false}
              style={[styles.scrollView, { maxHeight: scrollMaxHeight }]}
              contentContainerStyle={styles.scrollContent}
            >
              {promptText && (
                <Text style={styles.promptText}>{promptText}</Text>
              )}

              <View style={styles.sheetSection}>
                <View style={styles.sectionHeader}>
                  {playPauseButton}
                </View>
                {(onNotePressIn || onNotePressOut) && !isPlaying && (
                  <Text style={styles.sectionHint}>{t('music.tapAndHoldNotes')}</Text>
                )}
                {isPlaying && (
                  <Text style={styles.sectionHint}>{t('music.playingPreview')}</Text>
                )}
                <View style={styles.noteGrid}>
                  {requiredSequence.map((note, index) => renderNote(note, index))}
                </View>
              </View>

              {successSongName && (
                <View style={styles.songSection}>
                  <Text style={styles.songLabel}>{t('music.successSong')}</Text>
                  <Text style={styles.songName}>{successSongName}</Text>
                </View>
              )}
            </ScrollView>

            {/* Ready button fixed at the bottom, outside ScrollView */}
            {onReadyToPlay && (
              <Pressable
                style={styles.readyToPlayButton}
                onPress={onReadyToPlay}
                testID="ready-to-play-button"
              >
                <Text style={styles.readyToPlayText}>{t('music.readyToPlay')}</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </Animated.View>
  );
});

// ============================================================================
// Styles
// ============================================================================

const NOTE_CIRCLE_SIZE = 56;
const LANDSCAPE_NOTE_SIZE = 50;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 150,
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
    maxHeight: '85%',
    overflow: 'hidden',
  },
  containerLandscape: {
    width: '75%',
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 14,
    maxHeight: '94%',
  },
  scrollView: {
    // Do NOT use flex: 1 here — the parent container is content-sized (no
    // explicit height), so flex: 1 would collapse the ScrollView to 0 height.
    // Instead we omit flex and apply a calculated maxHeight inline (see render).
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLandscape: {
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  titleLandscape: {
    fontSize: 18,
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
  closeButtonLandscape: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 8,
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
  sectionHintLandscape: {
    fontSize: 11,
    marginBottom: 6,
    textAlign: 'center',
  },
  noteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  noteGridItem: {
    alignItems: 'center',
    marginBottom: 4,
  },
  noteGridItemLandscape: {
    marginBottom: 0,
    marginHorizontal: 4,
  },
  noteIndex: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  noteCircle: {
    width: NOTE_CIRCLE_SIZE,
    height: NOTE_CIRCLE_SIZE,
    borderRadius: NOTE_CIRCLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteCircleLandscape: {
    width: LANDSCAPE_NOTE_SIZE,
    height: LANDSCAPE_NOTE_SIZE,
    borderRadius: LANDSCAPE_NOTE_SIZE / 2,
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
  noteLetterLandscape: {
    fontSize: 16,
  },
  noteLetterCompleted: {
    color: '#FFFFFF',
  },

  // Landscape carousel
  carouselRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  carouselArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselArrowDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  carouselScroll: {
    flexGrow: 0,
    marginHorizontal: 8,
  },
  carouselContent: {
    alignItems: 'center',
  },
  carouselPage: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  pageDotActive: {
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  landscapeBottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },

  songSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  songSectionLandscape: {
    padding: 8,
    flex: 1,
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  readyToPlayButtonLandscape: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: 0,
  },
  readyToPlayText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  readyToPlayTextLandscape: {
    fontSize: 14,
  },
});

