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
import { View, Text, StyleSheet, Pressable, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NoteLayoutItem } from '@/services/music-asset-registry';
import type { HoldPlan } from '@/services/hold-plan';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SceneBackground } from '@/components/ui/scene-background';
import { MusicBackdrop } from '@/components/music/music-backdrop';
import { ArcText, estimateArcTextWidth } from '@/components/ui/arc-text';
import { BlobPanel } from '@/components/ui/blob-panel';
import { MusicStaffStrip } from '@/components/music/music-staff-strip';
import { STAFF_ASPECT_RATIO, STAFF_PAPER_BOTTOM, STAFF_PAPER_TOP } from '@/services/staff-notation';
import { cueMaskedAtMs } from '@/services/sheet-transition';
import {
  PANEL_EXIT_MS,
  SHEET_FLIGHT_MS,
  flightPose,
  type SheetRect,
} from '@/services/sheet-flight';

/**
 * The same panel and night sky the instrument picker uses, so choosing an
 * instrument and reading its song are plainly two pages of one book.
 */
const COLORS = {
  panel: 'rgba(49, 58, 112, 0.62)',
  panelBorder: 'rgba(255, 255, 255, 0.12)',
  title: '#FFF8EB',
  subtitle: '#CCD3FB',
  ctaFrom: '#FFEFAE',
  ctaTo: '#FBC55F',
  ctaLabel: '#4A3410',
  ctaSparkle: '#FFF6D5',
  glassFill: 'rgba(30, 45, 110, 0.55)',
  glassBorder: 'rgba(200, 212, 255, 0.55)',
};

/** Share of the screen the panel takes, and the most it ever grows to. */
const PANEL_WIDTH_FRACTION = 0.84;
const PANEL_MAX_WIDTH = 700;
/** Breathing room between the panel's edge and the sheet inside it. */
const PANEL_PADDING = 18;

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
  /** Tempo hint in BPM -controls preview playback speed (default: 120) */
  bpm?: number;
  /**
   * How long each note is held. Given one, the sheet here is drawn exactly as
   * the sheet over the instrument is -- highlights behind the notes and all --
   * rather than as bare heads that look like a different song.
   */
  holdPlan?: HoldPlan;
  /**
   * Where the sheet is to fly to, in the screen's coordinates. The instrument
   * view has to be mounted and measured before this is known, which is a few
   * frames after the press, so the sheet waits in place for it.
   */
  flightTarget?: SheetRect | null;
  /**
   * Set on the press itself: the panel starts leaving straight away and the
   * sheet is held where it stood until a target arrives. Cleared with no target
   * when the instrument turns out to have no staff, and the sheet simply goes.
   */
  awaitingFlight?: boolean;
  /**
   * Called once the sheet has finished leaving and is off screen. A caller that
   * hides its own controls behind the sheet uses this to bring them back, so
   * they return when the sheet has actually gone rather than when it was asked
   * to go.
   */
  onLeft?: () => void;
  /**
   * What to stand the panel on. 'music' is the same night meadow the instrument
   * stands on, so moving between the two changes nothing behind them -- and it
   * covers the instrument while the sheet is being read over it.
   */
  backdrop?: 'scene' | 'music' | 'none';
  /** The arrival's own progress, shared with the view the sheet is flying into. */
  enterProgress?: SharedValue<number>;
}

/**
 * How long the sheet takes to open and to close.
 *
 * Exported because a caller that swaps the sheet out for something else has to
 * wait for the close before it unmounts the sheet -- otherwise the animation
 * below never runs and the sheet vanishes between frames.
 */
export const MUSIC_SHEET_ANIM_MS = 300;

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
  holdPlan,
  flightTarget,
  awaitingFlight = false,
  backdrop = 'scene',
  onLeft,
  enterProgress,
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
  const [panelFrame, setPanelFrame] = useState({ x: 0, y: 0 });
  const [sheetFrame, setSheetFrame] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [flight, setFlight] = useState<{ from: SheetRect; to: SheetRect | null } | null>(null);
  const flightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // Playback preview state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(-1);
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Ticks when the sheet should clear itself and come back at the first note --
   * which is what the end of a preview is. The sheet fades the notes out on the
   * change and the score is put back behind them, so the song does not simply
   * reappear at the start.
   */
  const [replayCue, setReplayCue] = useState(0);
  const isPlayingRef = useRef(false); // avoid stale closure
  const playbackIndexRef = useRef(-1); // avoid stale closure in stopPlayback

  // Keep the ref in sync with state
  useEffect(() => {
    playbackIndexRef.current = playbackIndex;
  }, [playbackIndex]);

  // Stop playback -release any held note and reset.
  // Uses playbackIndexRef to always have the current value (avoids stale closures).
  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (releaseTimerRef.current) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
    // Release any note that was being held (use ref for current value)
    const idx = playbackIndexRef.current;
    if (idx >= 0 && idx < requiredSequence.length) {
      onNotePressOut?.(requiredSequence[idx]);
    }
    // The sheet stays where the preview left it until the cue has hidden the
    // notes, and only then goes back to the first one. Putting it back straight
    // away is what made the song reappear at the start rather than fade in.
    setReplayCue(prev => prev + 1);
    if (cueTimerRef.current) clearTimeout(cueTimerRef.current);
    cueTimerRef.current = setTimeout(() => {
      cueTimerRef.current = null;
      playbackIndexRef.current = -1;
      setPlaybackIndex(-1);
    }, cueMaskedAtMs('replay'));
  }, [requiredSequence, onNotePressOut]);

  // Step through the sequence one note at a time
  const playStep = useCallback((idx: number) => {
    if (!isPlayingRef.current) return;

    if (idx >= requiredSequence.length) {
      // Sequence complete -stop
      stopPlayback();
      return;
    }

    const note = requiredSequence[idx];

    // Each note sounds for its own length and the next begins when its slot is
    // up -- the same two figures the reward melody uses. A beat per note,
    // whatever the note, made a two-beat note as short as a one-beat one and
    // cut the closing four-beat note to a quarter of itself.
    const target = holdPlan?.targets[idx];
    const beatMs = Math.round(60000 / Math.max(bpm, 30));
    const slotMs = target?.slotMs ?? beatMs;
    const soundMs = Math.min(target?.holdMs ?? beatMs, slotMs);

    playbackIndexRef.current = idx;
    setPlaybackIndex(idx);
    onNotePressIn?.(note);

    // Let go when the note has sounded its length; the gap left before the next
    // one is what lets a repeated note articulate.
    releaseTimerRef.current = setTimeout(() => {
      onNotePressOut?.(note);
    }, soundMs);

    playbackTimerRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return;
      playStep(idx + 1);
    }, slotMs);
  }, [requiredSequence, onNotePressIn, onNotePressOut, stopPlayback, bpm, holdPlan]);

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

  // Cleanup on unmount -ensure no dangling timers AND release held notes.
  // Uses the ref so we always call the latest stopPlayback (with current
  // onNotePressOut and requiredSequence) rather than a stale closure.
  useEffect(() => {
    return () => {
      stopPlaybackRef.current();
      // stopPlayback leaves a timer behind to put the sheet back behind the
      // fade; on the way out there is no sheet left to put back.
      if (cueTimerRef.current) {
        clearTimeout(cueTimerRef.current);
        cueTimerRef.current = null;
      }
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
      overlayOpacity.value = withTiming(1, { duration: MUSIC_SHEET_ANIM_MS, easing: Easing.out(Easing.ease) });
      slideY.value = withTiming(0, { duration: MUSIC_SHEET_ANIM_MS, easing: Easing.out(Easing.ease) });
    } else if (isRendered) {
      if ((awaitingFlight || flightTarget) && sheetFrame.width > 0) {
        setFlight({
          from: {
            x: panelFrame.x + sheetFrame.x,
            y: panelFrame.y + sheetFrame.y,
            width: sheetFrame.width,
            height: sheetFrame.height,
          },
          to: flightTarget ?? null,
        });
        overlayOpacity.value = withTiming(0, { duration: PANEL_EXIT_MS, easing: Easing.in(Easing.ease) });
      } else if (fadeOutOnly) {
        // Fade out only (no slide) -used when transitioning to instrument view
        overlayOpacity.value = withTiming(
          0,
          { duration: MUSIC_SHEET_ANIM_MS, easing: Easing.in(Easing.ease) },
          (finished) => {
            if (finished) {
              runOnJS(setIsRendered)(false);
            }
          }
        );
      } else {
        // Slide down off screen, then unmount
        overlayOpacity.value = withTiming(0, { duration: MUSIC_SHEET_ANIM_MS });
        slideY.value = withTiming(
          screenHeight,
          { duration: MUSIC_SHEET_ANIM_MS, easing: Easing.in(Easing.cubic) },
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

  const restingProgress = useSharedValue(0);
  const flightProgress = enterProgress ?? restingProgress;

  const flightStyle = useAnimatedStyle(() => {
    if (!flight?.to) return {};
    const pose = flightPose(flightProgress.value, flight.from, flight.to);
    return {
      transform: [
        { translateX: pose.translateX },
        { translateY: pose.translateY },
        { scale: pose.scale },
      ],
    };
  }, [flightProgress, flight]);

  const handlePanelFrameLayout = useCallback((event: LayoutChangeEvent) => {
    const { x = 0, y = 0 } = event.nativeEvent.layout;
    setPanelFrame(prev => (prev.x === x && prev.y === y ? prev : { x, y }));
  }, []);

  const handleSheetFrameLayout = useCallback((event: LayoutChangeEvent) => {
    const { x = 0, y = 0, width, height } = event.nativeEvent.layout;
    setSheetFrame(prev => (
      prev.x === x && prev.y === y && prev.width === width && prev.height === height
        ? prev
        : { x, y, width, height }
    ));
  }, []);

  // The staff's whereabouts land a few frames after the press, so the flight
  // itself starts here rather than with the panel's exit. With no staff to fly
  // to, the sheet has nothing left to do and goes.
  useEffect(() => {
    if (!flight || flight.to) return;
    if (flightTarget) {
      setFlight(current => (current ? { ...current, to: flightTarget } : current));
      if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
      flightTimerRef.current = setTimeout(() => {
        flightTimerRef.current = null;
        setFlight(null);
        setIsRendered(false);
      }, SHEET_FLIGHT_MS);
    } else if (!awaitingFlight) {
      setFlight(null);
      setIsRendered(false);
    }
  }, [flight, flightTarget, awaitingFlight]);

  const onLeftRef = useRef(onLeft);
  onLeftRef.current = onLeft;
  const wasRenderedRef = useRef(isRendered);
  useEffect(() => {
    if (wasRenderedRef.current && !isRendered) onLeftRef.current?.();
    wasRenderedRef.current = isRendered;
  }, [isRendered]);

  useEffect(() => () => {
    if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
  }, []);

  // Calculate max height for the ScrollView so it doesn't collapse to 0.
  // The container is content-sized (window mode), so the ScrollView cannot use

  /**
   * Whether the song can be heard at all. The notes themselves are not
   * something to press -- this is a sheet to read, and a child reaching for a
   * note on it would be reaching for the wrong thing -- so the preview is the
   * one way to hear it.
   */
  const canPreview = Boolean(onNotePressIn || onNotePressOut);

  if (!isRendered && !visible) return null;

  const playPauseButton = canPreview ? (
    <Pressable
      style={styles.previewButton}
      onPress={togglePlayback}
      testID="music-sheet-play-button"
      accessibilityLabel={isPlaying ? t('music.pause') : t('music.preview')}
    >
      <MaterialIcons
        name={isPlaying ? 'pause' : 'play-arrow'}
        size={18}
        color="#FFFFFF"
      />
      <Text style={styles.previewButtonText}>
        {isPlaying ? t('music.pause') : t('music.preview')}
      </Text>
    </Pressable>
  ) : null;

  // The sheet is drawn to the panel's inner width; its height follows the
  // banner artwork, so the panel takes whatever that comes to.
  const panelWidth = Math.min(screenWidth * PANEL_WIDTH_FRACTION, PANEL_MAX_WIDTH);
  const sheetWidth = Math.max(0, panelWidth - PANEL_PADDING * 2);
  const sheetHeight = sheetWidth / STAFF_ASPECT_RATIO;
  const titleFontSize = isLandscape ? 20 : 22;
  const titleWidth = Math.min(
    panelWidth - PANEL_PADDING * 2,
    estimateArcTextWidth(t('music.musicSheet'), titleFontSize) + 24,
  );

  const staffElement = requiredSequence.length > 0 ? (
    <MusicStaffStrip
      sequence={requiredSequence}
      noteLayout={noteLayout}
      holdPlan={holdPlan}
      // The whole song from its first note, and no ring on any of it:
      // this is the song to read, not a playhead to follow. The
      // preview is the one thing that does point at a note, so it
      // takes the ring back while it runs.
      // The song from its first note, and nothing marked on it --
      // until the preview runs, when the sheet follows the melody and
      // runs each note's hold, so the song is seen the way it is
      // heard.
      currentIndex={0}
      // Not gated on `isPlaying`: when a preview ends the sheet holds
      // its place until the cue has hidden the notes, then goes back
      // to the first one behind them.
      playbackIndex={playbackIndex}
      replayCue={replayCue}
      holdingCurrent={isPlaying}
      markCurrent={isPlaying}
      width={sheetWidth}
      title={promptText}
      testID="music-sheet-staff"
    />
  ) : null;

  return (
    <View style={styles.overlay} testID="music-sheet-overlay">
      <Animated.View style={[StyleSheet.absoluteFill, styles.centred, animatedStyle]}>
      {backdrop === 'scene' && <SceneBackground blurIntensity={26} scrimOpacity={0.42} />}
      {backdrop === 'music' && <MusicBackdrop />}

      <View style={styles.content}>
        <Pressable
          style={[styles.glassCircle, {
            top: insets.top + 12,
            left: insets.left + 12,
          }]}
          onPress={onClose}
          testID="music-sheet-close-button"
          accessibilityLabel={t('music.close', { defaultValue: 'Close' })}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>

        <View onLayout={handlePanelFrameLayout} testID="music-sheet-panel-frame">
        <BlobPanel
          fill={COLORS.panel}
          stroke={COLORS.panelBorder}
          style={[styles.panel, { width: panelWidth }]}
          testID="music-sheet-panel"
        >
          <View style={{ width: titleWidth }}>
            <ArcText
              width={titleWidth}
              fontSize={titleFontSize}
              color={COLORS.title}
              testID="music-sheet-title"
            >
              {t('music.musicSheet')}
            </ArcText>
          </View>

          {instrumentName ? (
            <Text style={styles.instrumentName} testID="music-sheet-instrument-name">
              {instrumentName}
            </Text>
          ) : null}

          {/* The song itself, written the way it is written over the
              instrument -- but here the notes can be pressed to hear them, and
              the preview walks the sheet through the whole song. */}
          {requiredSequence.length > 0 && (
            // The banner is paper with transparent air above and below it, so
            // its box is a fifth taller than the paper at each end. Pulled in by
            // most of that, the panel hugs the sheet instead of the artwork's
            // empty margins.
            <View
              style={{
                width: sheetWidth,
                height: sheetHeight,
                marginTop: -sheetHeight * (STAFF_PAPER_TOP - 0.04),
                marginBottom: -sheetHeight * (1 - STAFF_PAPER_BOTTOM - 0.04),
                opacity: flight ? 0 : 1,
              }}
              onLayout={handleSheetFrameLayout}
              testID="music-sheet-frame"
            >
              {staffElement}
            </View>
          )}

          {isPlaying && (
            <Text style={styles.subtitle} testID="music-sheet-hint">
              {t('music.playingPreview')}
            </Text>
          )}

          <View style={styles.actionRow}>
            {playPauseButton}
            {onReadyToPlay && (
              <Pressable
                style={styles.readyButton}
                onPress={onReadyToPlay}
                testID="ready-to-play-button"
                accessibilityLabel={t('music.readyToPlay')}
              >
                <LinearGradient
                  colors={[COLORS.ctaFrom, COLORS.ctaTo]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.readyGradient}
                >
                  <Ionicons name="musical-notes" size={16} color={COLORS.ctaLabel} />
                  <Text style={styles.readyButtonText}>{t('music.readyToPlay')}</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>

          {successSongName ? (
            <Text style={styles.songName} testID="music-sheet-song-name">{successSongName}</Text>
          ) : null}
        </BlobPanel>
        </View>
        </View>
      </Animated.View>
      {sheetFrame.width > 0 && (
        <Animated.View
          style={[
            styles.flyingSheet,
            {
              left: panelFrame.x + sheetFrame.x,
              top: panelFrame.y + sheetFrame.y,
              width: sheetFrame.width,
              height: sheetFrame.height,
              opacity: flight ? 1 : 0,
            },
            flightStyle,
          ]}
          pointerEvents="none"
          testID="music-sheet-flight"
        >
          {staffElement}
        </Animated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centred: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flyingSheet: {
    position: 'absolute',
    zIndex: 2,
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassCircle: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.glassFill,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  panel: {
    paddingTop: 14,
    paddingBottom: PANEL_PADDING,
    paddingHorizontal: PANEL_PADDING,
    alignItems: 'center',
  },
  instrumentName: {
    marginTop: 2,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.title,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.subtitle,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 14,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.glassFill,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  previewButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  readyButton: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  readyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  readyButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.ctaLabel,
  },
  songName: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.subtitle,
    textAlign: 'center',
  },
});
