/**
 * PractiseScreen
 *
 * Flow: instrument picker → song library → music sheet preview → music challenge UI (guided mode).
 * The user picks an instrument, then selects a song from a filtered library,
 * then previews the music sheet, then plays through the notes in the MusicChallengeUI.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';


import { MusicChallengeUI } from '@/components/stories/music-challenge-ui';
import { MusicSheetOverlay } from '@/components/stories/music-sheet-overlay';
import { InstrumentCarousel } from '@/components/music/instrument-carousel';
import { MusicControl } from '@/components/ui/music-control';
import { PageHeader } from '@/components/ui/page-header';
import { BearTopImage } from '@/components/main-menu/animated-components';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { mainMenuStyles } from '@/components/main-menu/styles';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useMusicChallenge } from '@/hooks/use-music-challenge';
import { useBreathDetector } from '@/hooks/use-breath-detector';
import {
  getInstrument,
  getAvailableInstrumentIds,
  getPracticeSongsForInstrument,
} from '@/services/music-asset-registry';
import type { PracticeSong, PracticeSongDifficulty } from '@/services/music-asset-registry';
import type { MusicChallenge } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { useGlobalSound } from '@/contexts/global-sound-context';
import { SubscriptionOverlay } from '@/components/ui/subscription-overlay';
import { StoryAccessService } from '@/services/story-access-service';

// Pre-generate star positions at module level (same as story selection screen)
const STAR_POSITIONS = generateStarPositions(VISUAL_EFFECTS.STAR_COUNT);

type PlayMode = 'blow' | 'press';

// Phases of the practise screen
// songs → preview (music sheet) → playing (instrument UI)
type PractisePhase = 'songs' | 'preview' | 'playing';

interface PractiseScreenProps {
  onBack: () => void;
}

const DIFFICULTY_COLORS: Record<PracticeSongDifficulty, string> = {
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#F44336',
};

const DIFFICULTY_STARS: Record<PracticeSongDifficulty, string> = {
  easy: '⭐',
  medium: '⭐⭐',
  hard: '⭐⭐⭐',
};

export function PractiseScreen({ onBack }: PractiseScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, textSizeScale } = useAccessibility();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Phase state -start directly on songs with first instrument selected
  const [phase, setPhase] = useState<PractisePhase>('songs');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>(
    () => {
      // Default to the first unlocked instrument (flute for basic+)
      const ids = getAvailableInstrumentIds();
      return ids.find(id => StoryAccessService.isInstrumentUnlocked(id)) ?? ids[0] ?? 'flute';
    }
  );
  const [selectedSong, setSelectedSong] = useState<PracticeSong | null>(null);
  const [showMusicSheet, setShowMusicSheet] = useState(false);
  const [instrumentIsRotated, setInstrumentIsRotated] = useState(false);
  const [musicUiHidden, setMusicUiHidden] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Remap portrait safe-area insets for the 90° CSS-rotated container.
  // Inside the rotated view: top←left, bottom←right, left←bottom, right←top
  const rotatedInsets = useMemo(() => ({
    top: insets.left,
    bottom: insets.right,
    left: insets.bottom,
    right: insets.top,
  }), [insets.top, insets.bottom, insets.left, insets.right]);

  // Fade-in animation for the rotated instrument overlay.
  // The overlay is rotated 90° to simulate landscape within the portrait screen.
  // Only the content fades in -the blur background stays visible throughout.
  const instrumentContentOpacity = useSharedValue(0);
  const instrumentOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: instrumentContentOpacity.value,
    // Position the oversized element so its center aligns with the screen center,
    // then rotate 90° so the landscape-sized rect fills the portrait screen.
    left: (screenWidth - screenHeight) / 2,
    top: (screenHeight - screenWidth) / 2,
    width: screenHeight,
    height: screenWidth,
    transform: [{ rotate: '90deg' }],
  }));

  // Music challenge config built from the selected song
  const musicChallengeConfig = useMemo<MusicChallenge | undefined>(() => {
    if (!selectedSong || !selectedInstrumentId) return undefined;
    return {
      enabled: true,
      instrumentId: selectedInstrumentId,
      promptText: '',
      mode: 'guided',
      requiredSequence: selectedSong.sequence,
      successSongId: '',
      autoPlaySuccessSong: false,
      allowSkip: true,
      micRequired: true,           // Needed so blow mode gates notes behind breath detection
      fallbackAllowed: true,
      hintLevel: 'standard',
    };
  }, [selectedSong, selectedInstrumentId]);

  const breathDetector = useBreathDetector({
    enabled: phase === 'playing',
  });

  // Audio session control -lets useMusicChallenge pause/resume the recorder
  // internally so notes always play at full speaker volume in blow mode.
  const audioSessionControl = useMemo(() => ({
    pauseForPlayback: breathDetector.pauseForPlayback,
    resumeRecording: breathDetector.resumeRecording,
    ensurePlaybackMode: breathDetector.ensurePlaybackMode,
    isInPlaybackMode: breathDetector.isInPlaybackMode,
    isListening: breathDetector.isListening,
  }), [breathDetector.pauseForPlayback, breathDetector.resumeRecording, breathDetector.ensurePlaybackMode, breathDetector.isInPlaybackMode, breathDetector.isListening]);

  // Background music & note volume (must be before useMusicChallenge)
  const globalSound = useGlobalSound();

  // Compute effective note volume: base volume * master * mute.
  // Updates live when the user toggles mute or adjusts the master slider.
  const effectiveNoteVolume = globalSound?.isMuted ? 0 : 0.4 * (globalSound?.masterVolume ?? 1);

  const musicChallenge = useMusicChallenge(musicChallengeConfig, undefined, effectiveNoteVolume, audioSessionControl);

  // Stable ref so callbacks can access the latest musicChallenge without
  // adding it to useCallback deps (it's a new object every render).
  const musicChallengeRef = useRef(musicChallenge);
  musicChallengeRef.current = musicChallenge;

  // Track the current play mode so we only sync breath state in blow mode.
  const currentPlayModeRef = useRef<'blow' | 'press'>('press');

  // Sync breath detector state to music challenge (matches story-book-reader / freeplay).
  // Only in blow mode -in press mode, MusicChallengeUI sets breathActive(true)
  // permanently, and we must not overwrite it with the mic's false signal.
  useEffect(() => {
    if (phase === 'playing' && currentPlayModeRef.current === 'blow') {
      musicChallenge.setBreathActive(breathDetector.isBreathActive);
    }
  }, [breathDetector.isBreathActive, phase]);
  const preMusicVolumeRef = useRef<number | null>(null);
  const musicFadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const musicFadeIdRef = useRef(0);

  const clearMusicFade = useCallback(() => {
    if (musicFadeTimerRef.current) {
      clearInterval(musicFadeTimerRef.current);
      musicFadeTimerRef.current = null;
    }
  }, []);

  const fadeMusicVolumeTo = useCallback((target: number, duration = 300, onDone?: () => void) => {
    clearMusicFade();
    musicFadeIdRef.current += 1;
    const fadeId = musicFadeIdRef.current;
    const start = globalSound.volume;
    const clamped = Math.max(0, Math.min(1, target));
    if (Math.abs(start - clamped) < 0.001) {
      void globalSound.setVolume(clamped);
      onDone?.();
      return;
    }
    const steps = 6;
    const intervalMs = Math.max(16, Math.round(duration / steps));
    let step = 0;
    musicFadeTimerRef.current = setInterval(() => {
      if (fadeId !== musicFadeIdRef.current) { clearMusicFade(); return; }
      step += 1;
      const next = start + ((clamped - start) * (step / steps));
      void globalSound.setVolume(next);
      if (step >= steps) {
        clearMusicFade();
        void globalSound.setVolume(clamped);
        onDone?.();
      }
    }, intervalMs);
  }, [clearMusicFade, globalSound]);

  const restoreMusicVolume = useCallback(() => {
    const vol = preMusicVolumeRef.current;
    if (vol !== null) {
      fadeMusicVolumeTo(vol, 300, () => {
        if (preMusicVolumeRef.current === vol) preMusicVolumeRef.current = null;
      });
    }
  }, [fadeMusicVolumeTo]);

  useEffect(() => () => clearMusicFade(), [clearMusicFade]);

  // Instrument details
  const instrumentDef = useMemo(() =>
    selectedInstrumentId ? getInstrument(selectedInstrumentId) : null,
  [selectedInstrumentId]);

  // Songs filtered for the selected instrument
  const availableSongs = useMemo(() =>
    selectedInstrumentId ? getPracticeSongsForInstrument(selectedInstrumentId) : [],
  [selectedInstrumentId]);

  // Ref mirrors so the carousel callback can read the latest values without
  // adding state to useCallback deps (which would destabilise the gesture handlers).
  const selectedInstrumentIdRef = useRef(selectedInstrumentId);
  selectedInstrumentIdRef.current = selectedInstrumentId;

  // Handlers
  // Quick-switch instrument from the inline carousel.
  // This callback MUST have an empty dep array so the carousel's gesture
  // handlers (useMemo'd Gesture objects) stay referentially stable. Any dep
  // change recreates onSelect → recreates Gesture.Race → crashes
  // react-native-gesture-handler on the native side.
  const handleInlineInstrumentChange = useCallback((instrumentId: string) => {
    // Ignore if the same instrument is already selected -the carousel pan/arrow
    // handlers can fire onSelect even when the centered item hasn't changed.
    if (instrumentId === selectedInstrumentIdRef.current) return;

    // Clean up any lingering audio resources (note players, fade-out intervals,
    // delayed stop timers) from the previous instrument before switching.
    musicChallengeRef.current.cleanup();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedInstrumentId(instrumentId);
    setSelectedSong(null);
  }, []);

  // Fade the instrument overlay in when entering the playing phase.
  // Delay slightly to let the music sheet fade out first (its close animation is ~300ms).
  useEffect(() => {
    if (phase === 'playing') {
      instrumentContentOpacity.value = 0;
      const timer = setTimeout(() => {
        instrumentContentOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Proactively restore the iOS audio session to playback-only mode as soon as
  // we enter the playing phase. useAudioRecorder (breath detector) may have left
  // the session in playAndRecord mode which silences the first note played.
  useEffect(() => {
    if (phase === 'playing') {
      void breathDetector.ensurePlaybackMode();
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'playing' && musicChallengeConfig) {
      // Small delay to ensure the hook has processed the new config
      const timer = setTimeout(() => {
        const mc = musicChallengeRef.current;
        if (mc.state === 'idle') {
          mc.start();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [phase, musicChallengeConfig]);

  const handleSongSelect = useCallback((song: PracticeSong) => {
    // Always update state first so the music sheet appears even if volume
    // ducking fails (e.g. due to stale globalSound reference).
    setSelectedSong(song);
    setShowMusicSheet(true);
    setPhase('preview');

    // Save current bg music volume and duck to 0.1 (matches story-book-reader)
    try {
      const baseVol = preMusicVolumeRef.current ?? globalSound.volume;
      preMusicVolumeRef.current = baseVol;
      fadeMusicVolumeTo(0.1);
    } catch (e) {
      console.warn('Failed to duck music volume on song select:', e);
    }
  }, [globalSound.volume, fadeMusicVolumeTo]);

  // User taps "Ready to Play" on the music sheet → close sheet, enter instrument mode
  const handleReadyToPlay = useCallback(() => {
    setShowMusicSheet(false);
    // Fade background music the rest of the way to silence
    fadeMusicVolumeTo(0, 1000);
    setPhase('playing');
  }, [fadeMusicVolumeTo]);

  // User closes the music sheet without playing → go back to song list
  const handleCloseMusicSheet = useCallback(() => {
    // Clean up audio resources (preview note players, fade-out intervals, loop
    // listeners) before changing state.  Without this, stale AudioPlayer
    // references from the preview can survive until the next instrument /
    // song selection and cause a native crash when accessed after deallocation.
    musicChallengeRef.current.cleanup();
    setShowMusicSheet(false);
    setSelectedSong(null);
    restoreMusicVolume();
    setPhase('songs');
  }, [restoreMusicVolume]);

  // Handle play-mode changes from MusicChallengeUI (matches story-book-reader / freeplay).
  // In "blow" mode we need the mic → start the breath detector.
  // In "press" mode we don't need the mic → stop the detector and restore
  // full-volume playback session so instrument notes are loud.
  const handlePlayModeChange = useCallback(async (mode: 'blow' | 'press') => {
    currentPlayModeRef.current = mode;
    if (mode === 'blow') {
      breathDetector.startListening();
    } else {
      await breathDetector.stopListening();
      await breathDetector.ensurePlaybackMode();
    }
  }, [breathDetector]);

  const handleBackToSongs = useCallback(() => {
    musicChallenge.cleanup();
    breathDetector.stopListening();
    setShowMusicSheet(false);
    setShowSettingsMenu(false);
    setMusicUiHidden(false);
    restoreMusicVolume();
    setSelectedSong(null);
    setPhase('songs');
  }, [musicChallenge, breathDetector, restoreMusicVolume]);

  // Return to song library from playing/preview phase (used by settings menu "Change Instrument")
  const handleChangeInstrument = useCallback(() => {
    // Always clean up audio resources regardless of current phase to prevent
    // native crashes from stale AudioPlayer references during instrument switch.
    musicChallenge.cleanup();
    breathDetector.stopListening();
    setShowMusicSheet(false);
    setShowSettingsMenu(false);
    setMusicUiHidden(false);
    instrumentContentOpacity.value = 0;
    if (phase === 'playing' || phase === 'preview') {
      restoreMusicVolume();
    }
    setSelectedSong(null);
    setPhase('songs');
  }, [phase, musicChallenge, breathDetector, restoreMusicVolume, instrumentContentOpacity]);

  const handleBack = useCallback(() => {
    if (phase === 'playing') {
      handleBackToSongs();
    } else {
      onBack();
    }
  }, [phase, handleBackToSongs, onBack]);

  // Star rotation animation (same as story selection page)
  const starRotation = useSharedValue(0);
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      starRotation.value = withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1,
        false
      );
    }, 600);
    return () => clearTimeout(timeoutId);
  }, []);
  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  /** Shared background matching the stories selection page */
  const renderStoriesBackground = () => (
    <>
      <LinearGradient
        colors={['#4ECDC4', '#3B82F6', '#1E3A8A']}
        style={StyleSheet.absoluteFill}
      />
      {/* Bear top background image */}
      <View style={mainMenuStyles.moonContainer} pointerEvents="none">
        <BearTopImage />
      </View>
      {/* Animated stars */}
      {STAR_POSITIONS.map((star) => (
        <Animated.View
          key={`star-${star.id}`}
          style={[
            {
              position: 'absolute',
              width: VISUAL_EFFECTS.STAR_SIZE,
              height: VISUAL_EFFECTS.STAR_SIZE,
              backgroundColor: 'white',
              borderRadius: VISUAL_EFFECTS.STAR_BORDER_RADIUS,
              opacity: star.opacity,
              left: star.left,
              top: star.top,
              zIndex: 2,
            },
            starAnimatedStyle,
          ]}
        />
      ))}
    </>
  );

  // ---- Render: Playing phase ----
  // The blur overlay stays static (non-rotated, full-screen).
  // The instrument content is rotated 90° to simulate landscape and fades in.
  // Controls are inside the rotated overlay so they render in landscape orientation.
  if (phase === 'playing' && instrumentDef && selectedSong) {
    return (
      <View style={styles.container}>
        {/* Background behind the blur -same as stories page */}
        {renderStoriesBackground()}

        {/* Static blur overlay -always visible, no fade, no rotation.
            pointerEvents="none" so touches pass through to the rotated instrument view. */}
        <View style={styles.musicChallengeOverlay} pointerEvents="none">
          <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
        </View>

        {/* Rotated instrument content -fades in over the static blur */}
        <Animated.View style={[styles.musicChallengeOverlayRotated, instrumentOverlayAnimatedStyle]}>
          <MusicChallengeUI
            challenge={musicChallenge}
            promptText={t(selectedSong.nameKey)}
            requiredSequence={selectedSong.sequence}
            noteLayout={instrumentDef.noteLayout}
            showBreathButton={breathDetector.useFallback}
            allowSkip
            onSkip={handleBackToSongs}
            onContinue={handleBackToSongs}
            continueLabel={t('music.backToLibrary')}
            onMusicSheet={() => setShowMusicSheet(true)}
            onRotationChange={setInstrumentIsRotated}
            onPlayModeChange={handlePlayModeChange}
            onVisibilityChange={setMusicUiHidden}
            insetsOverride={rotatedInsets}
          />

          {/* Top Left Controls -Exit (✕) button, matching freeplay/story layout.
              Inside the rotated view, "top" = portrait left edge, "left" = portrait bottom.
              Use portrait insets remapped for the 90° rotation:
                rotated top    ← insets.left  (usually 0)
                rotated left   ← insets.bottom (home indicator)
                rotated right  ← insets.top   (notch)
                rotated bottom ← insets.right (usually 0) */}
          {!musicUiHidden && (
            <View style={[styles.topLeftControls, {
              paddingTop: Math.max(insets.left + 20, 20),
              paddingLeft: Math.max(insets.bottom + 20, 20),
            }]}>
              <Pressable
                style={[styles.exitButton, {
                  width: scaledButtonSize(50),
                  height: scaledButtonSize(50),
                  borderRadius: scaledButtonSize(25),
                }]}
                onPress={handleBackToSongs}
              >
                <Ionicons name="home" size={scaledFontSize(20)} color="#333333" />
              </Pressable>
            </View>
          )}

          {/* Top Right Controls -Sound + Burger menu, matching freeplay/story layout */}
          {!musicUiHidden && (
            <View style={[styles.topRightControls, {
              paddingTop: Math.max(insets.left + 20, 20),
              paddingRight: Math.max(insets.top + 20, 20),
            }]}>
              <MusicControl size={28} variant="story" />
              <Pressable
                style={[styles.settingsButton, {
                  width: scaledButtonSize(50),
                  height: scaledButtonSize(50),
                  borderRadius: scaledButtonSize(25),
                }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSettingsMenu(prev => !prev);
                }}
              >
                <Text style={[styles.settingsButtonText, { fontSize: scaledFontSize(28), marginTop: 2 }]}>☰</Text>
              </Pressable>
            </View>
          )}

          {/* Settings overlay -tap outside to close */}
          {showSettingsMenu && (
            <Pressable style={styles.settingsOverlay} onPress={() => setShowSettingsMenu(false)} />
          )}

          {/* Settings dropdown menu */}
          {showSettingsMenu && (
            <View style={[styles.settingsMenu, {
              top: Math.max(insets.left + 20, 20) + scaledButtonSize(50) + 10,
              right: Math.max(insets.top + 20, 20),
            }]}>
              {/* Change Instrument (only when not rotated) */}
              {!instrumentIsRotated && (
                <>
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowSettingsMenu(false);
                      handleChangeInstrument();
                    }}
                  >
                    <Text style={[styles.menuItemText, { fontSize: scaledFontSize(14) }]}>{t('music.changeInstrument')}</Text>
                  </Pressable>
                  <View style={styles.menuDivider} />
                </>
              )}
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSettingsMenu(false);
                  handleBackToSongs();
                }}
              >
                <Text style={[styles.menuItemText, { fontSize: scaledFontSize(14) }]}>{t('music.songLibrary')}</Text>
              </Pressable>
            </View>
          )}

        </Animated.View>

        {/* Music Sheet Overlay -rendered outside the rotated parent so it
            always displays in portrait orientation without rotation hacks. */}
        <MusicSheetOverlay
          visible={showMusicSheet}
          onClose={() => setShowMusicSheet(false)}
          requiredSequence={selectedSong.sequence}
          noteLayout={instrumentDef.noteLayout}
          completedNoteCount={musicChallenge.currentNoteIndex}
          instrumentName={instrumentDef.displayName}
          onNotePressIn={(note) => musicChallenge.previewNote(note)}
          onNotePressOut={(note) => musicChallenge.stopNote(note)}
          bpm={selectedSong.bpm}
        />
      </View>
    );
  }

  // ---- Render: Preview phase (music sheet before instrument) ----
  if (phase === 'preview' && instrumentDef && selectedSong) {
    return (
      <View style={styles.container}>
        {renderStoriesBackground()}

        <MusicSheetOverlay
          visible
          onClose={handleCloseMusicSheet}
          requiredSequence={selectedSong.sequence}
          noteLayout={instrumentDef.noteLayout}
          completedNoteCount={0}
          instrumentName={instrumentDef.displayName}
          promptText={t(selectedSong.nameKey)}
          onReadyToPlay={handleReadyToPlay}
          onNotePressIn={(note) => musicChallenge.previewNote(note)}
          onNotePressOut={(note) => musicChallenge.stopNote(note)}
          fadeOutOnly
          bpm={selectedSong.bpm}
        />
      </View>
    );
  }

  // ---- Render: Song library phase ----
  const songFontSize = scaledFontSize(18);
  const previewFontSize = scaledFontSize(13);
  const diffBadgeFontSize = scaledFontSize(12);

  return (
    <View style={styles.container}>
      {renderStoriesBackground()}

      {/* Shared page header -matches story selection screen */}
      <PageHeader
        title={t('music.songLibrary')}
        onBack={handleBack}
        useBackArrow
      />

      {/* Song list -padded below the header like story selection */}
      <View style={{ flex: 1, paddingTop: insets.top + 90 + (textSizeScale - 1) * 40, zIndex: 10 }}>

      {/* Instrument selector -3D coverflow carousel */}
      <InstrumentCarousel
        selectedInstrumentId={selectedInstrumentId}
        onSelect={handleInlineInstrumentChange}
        onLockedPress={() => setShowSubscription(true)}
      />

      <FlatList
        data={availableSongs}
        keyExtractor={(item) => item.id}
        style={{ zIndex: 10 }}
        contentContainerStyle={[
          styles.songList,
          { paddingBottom: insets.bottom + 20 },
        ]}
        renderItem={({ item, index }) => {
          const isInstrumentLocked = !StoryAccessService.isInstrumentUnlocked(selectedInstrumentId);
          const isLocked = isInstrumentLocked || !StoryAccessService.isSongUnlocked(index);
          return (
          <Pressable
            style={({ pressed }) => [
              styles.songCard,
              isLocked && styles.songCardLocked,
              pressed && !isLocked && styles.songCardPressed,
            ]}
            onPress={() => {
              if (isLocked) {
                setShowSubscription(true);
              } else {
                handleSongSelect(item);
              }
            }}
          >
            <View style={styles.songCardHeader}>
              <Text style={[styles.songName, { fontSize: songFontSize }, isLocked && styles.songNameLocked]}>
                {t(item.nameKey)}
              </Text>
              {isLocked ? (
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
                </View>
              ) : (
              <View style={[styles.diffBadge, { backgroundColor: DIFFICULTY_COLORS[item.difficulty] }]}>
                <Text style={[styles.diffBadgeText, { fontSize: diffBadgeFontSize }]}>
                  {DIFFICULTY_STARS[item.difficulty]} {t(`music.difficulty.${item.difficulty}`)}
                </Text>
              </View>
              )}
            </View>
            {/* Note preview */}
            <View style={[styles.notePreview, isLocked && { opacity: 0.35 }]}>
              {item.sequence.slice(0, 16).map((note, i) => (
                <View
                  key={`${note}-${i}`}
                  style={[
                    styles.previewNote,
                    {
                      backgroundColor: instrumentDef?.noteLayout.find(n => n.note === note)?.color ?? '#888',
                    },
                  ]}
                >
                  <Text style={[styles.previewNoteText, { fontSize: previewFontSize }]}>
                    {note}
                  </Text>
                </View>
              ))}
              {item.sequence.length > 16 && (
                <Text style={[styles.moreNotes, { fontSize: previewFontSize }]}>
                  +{item.sequence.length - 16}
                </Text>
              )}
            </View>
          </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { fontSize: songFontSize }]}>
            {t('music.noSongsAvailable')}
          </Text>
        }
      />
      </View>

      {/* Subscription Overlay -triggered from locked instrument tap */}
      <SubscriptionOverlay
        visible={showSubscription}
        onClose={() => setShowSubscription(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },

  songList: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
    zIndex: 10,
  },
  musicChallengeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  // Rotated version for the practice screen -rotated 90° to simulate landscape.
  // Positioning (left/top) and dimensions (width/height) are set by the animated style.
  musicChallengeOverlayRotated: {
    position: 'absolute',
    zIndex: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  songCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  songCardPressed: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ scale: 0.98 }],
  },
  songCardLocked: {
    opacity: 0.65,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  songNameLocked: {
    opacity: 0.6,
  },
  lockBadge: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  songCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  songName: {
    color: '#fff',
    fontFamily: Fonts.primary,
    fontWeight: '600',
    flex: 1,
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  diffBadgeText: {
    color: '#fff',
    fontFamily: Fonts.primary,
    fontWeight: '600',
  },
  notePreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  previewNote: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewNoteText: {
    color: '#fff',
    fontFamily: Fonts.primary,
    fontWeight: 'bold',
  },
  moreNotes: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: Fonts.primary,
    marginLeft: 4,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Fonts.primary,
    textAlign: 'center',
    marginTop: 40,
  },
  // ---- Story-reader-matching controls ----
  topLeftControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 20,
  },
  topRightControls: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 20,
  },
  exitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  exitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1,
  },
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  settingsButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1,
  },
  settingsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  settingsMenu: {
    position: 'absolute',
    backgroundColor: 'rgba(130, 130, 130, 0.75)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 100, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 100,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 4,
  },
  menuItemText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
