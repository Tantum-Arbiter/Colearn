/**
 * PractiseScreen
 *
 * Flow: instrument picker → song library → music challenge UI (guided mode).
 * The user picks an instrument, then selects a song from a filtered library,
 * then plays through the notes in the same MusicChallengeUI used by stories.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { InstrumentPickerOverlay } from '@/components/stories/instrument-picker-overlay';
import { MusicChallengeUI } from '@/components/stories/music-challenge-ui';
import { MusicSheetOverlay } from '@/components/stories/music-sheet-overlay';
import { MusicControl } from '@/components/ui/music-control';
import { BearTopImage } from '@/components/main-menu/animated-components';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { mainMenuStyles } from '@/components/main-menu/styles';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useMusicChallenge } from '@/hooks/use-music-challenge';
import { useBreathDetector } from '@/hooks/use-breath-detector';
import {
  getInstrument,
  getPracticeSongsForInstrument,
} from '@/services/music-asset-registry';
import type { PracticeSong, PracticeSongDifficulty } from '@/services/music-asset-registry';
import type { MusicChallenge } from '@/types/story';
import { Fonts } from '@/constants/theme';
import { useGlobalSound } from '@/contexts/global-sound-context';

// Pre-generate star positions at module level (same as story selection screen)
const STAR_POSITIONS = generateStarPositions(VISUAL_EFFECTS.STAR_COUNT);

type PlayMode = 'blow' | 'press';

// Phases of the practise screen
type PractisePhase = 'instrument' | 'songs' | 'playing';

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
  const { scaledFontSize, scaledButtonSize, scaledPadding } = useAccessibility();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Phase state
  const [phase, setPhase] = useState<PractisePhase>('instrument');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<PracticeSong | null>(null);
  const [showMusicSheet, setShowMusicSheet] = useState(false);
  const [instrumentIsRotated, setInstrumentIsRotated] = useState(false);
  const [musicUiHidden, setMusicUiHidden] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isLandscapeReady, setIsLandscapeReady] = useState(false);
  const isExitingRef = useRef(false);

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
      micRequired: false,
      fallbackAllowed: true,
      hintLevel: 'standard',
    };
  }, [selectedSong, selectedInstrumentId]);

  const musicChallenge = useMusicChallenge(musicChallengeConfig, undefined, 0.4);

  const breathDetector = useBreathDetector({
    enabled: phase === 'playing',
  });

  // Background music volume fade (mirror story-book-reader behaviour)
  const globalSound = useGlobalSound();
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

  // Handlers
  const handleInstrumentSelect = useCallback((instrumentId: string) => {
    setSelectedInstrumentId(instrumentId);
    setPhase('songs');
  }, []);

  // Lock to landscape when entering playing phase, restore portrait when leaving
  useEffect(() => {
    if (phase === 'playing') {
      isExitingRef.current = false;
      setIsLandscapeReady(false);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
        .then(() => setIsLandscapeReady(true))
        .catch(() => setIsLandscapeReady(true));
    }
    return () => {
      if (phase === 'playing' && !isExitingRef.current) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
    };
  }, [phase]);

  // Auto-start the music challenge when we enter the playing phase and config is ready
  // We use a ref to hold the latest start function to avoid stale closures
  const musicChallengeRef = useRef(musicChallenge);
  musicChallengeRef.current = musicChallenge;

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

  const restorePortrait = useCallback(async () => {
    isExitingRef.current = true;
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch {}
  }, []);

  const handleSongSelect = useCallback((song: PracticeSong) => {
    // Save current bg music volume and fade to 0.1 (matches story-book-reader)
    const baseVol = preMusicVolumeRef.current ?? globalSound.volume;
    preMusicVolumeRef.current = baseVol;
    fadeMusicVolumeTo(0.1);
    setSelectedSong(song);
    setPhase('playing');
  }, [globalSound.volume, fadeMusicVolumeTo]);

  const handleBackToSongs = useCallback(async () => {
    musicChallenge.cleanup();
    breathDetector.stopListening();
    setShowMusicSheet(false);
    setShowSettingsMenu(false);
    setMusicUiHidden(false);
    restoreMusicVolume();
    await restorePortrait();
    setSelectedSong(null);
    setPhase('songs');
  }, [musicChallenge, breathDetector, restorePortrait, restoreMusicVolume]);

  // When changing instrument from the song library, remember the previous instrument
  // so the ✕ button can go back to songs with the old instrument restored.
  const previousInstrumentRef = useRef<string | null>(null);

  const handleChangeInstrument = useCallback(async () => {
    if (phase === 'playing') {
      musicChallenge.cleanup();
      breathDetector.stopListening();
      setShowMusicSheet(false);
      setShowSettingsMenu(false);
      setMusicUiHidden(false);
      restoreMusicVolume();
      await restorePortrait();
    }
    previousInstrumentRef.current = selectedInstrumentId;
    setSelectedInstrumentId(null);
    setSelectedSong(null);
    setPhase('instrument');
  }, [phase, musicChallenge, breathDetector, restorePortrait, restoreMusicVolume, selectedInstrumentId]);

  const handleInstrumentPickerClose = useCallback(() => {
    const prev = previousInstrumentRef.current;
    if (prev) {
      // Came from song library — restore instrument and go back to songs
      setSelectedInstrumentId(prev);
      previousInstrumentRef.current = null;
      setPhase('songs');
    } else {
      onBack();
    }
  }, [onBack]);

  const handleBack = useCallback(() => {
    if (phase === 'playing') {
      handleBackToSongs();
    } else {
      // From songs or instrument picker, go straight to main menu
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
  if (phase === 'playing' && instrumentDef && selectedSong) {
    // Wait for landscape orientation before rendering instrument UI
    if (!isLandscapeReady) {
      return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <LinearGradient colors={['#4ECDC4', '#3B82F6', '#1E3A8A']} style={StyleSheet.absoluteFill} />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {/* Background behind the blur — same as stories page */}
        {renderStoriesBackground()}

        {/* Overlay exactly matching story-book-reader's musicChallengeOverlay */}
        <View style={styles.musicChallengeOverlay}>
          <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
          <MusicChallengeUI
            challenge={musicChallenge}
            promptText={t(selectedSong.nameKey)}
            requiredSequence={selectedSong.sequence}
            noteLayout={instrumentDef.noteLayout}
            showBreathButton={false}
            allowSkip
            onSkip={handleBackToSongs}
            onContinue={handleBackToSongs}
            continueLabel={t('music.backToLibrary')}
            onMusicSheet={() => setShowMusicSheet(true)}
            onRotationChange={setInstrumentIsRotated}
            onPlayModeChange={(mode: PlayMode) => {
              if (mode === 'blow') {
                breathDetector.startListening();
              } else {
                breathDetector.stopListening();
              }
            }}
            onVisibilityChange={setMusicUiHidden}
          />
        </View>

        {/* Top Left Controls — Exit (✕) button, matching story-book-reader */}
        {!musicUiHidden && (
          <View style={[styles.topLeftControls, {
            paddingTop: Math.max(insets.top + 5, 20),
            paddingLeft: Math.max(insets.left + 5, 20),
          }]}>
            <Pressable
              style={[styles.exitButton, {
                width: scaledButtonSize(50),
                height: scaledButtonSize(50),
                borderRadius: scaledButtonSize(25),
              }]}
              onPress={handleBackToSongs}
            >
              <Text style={[styles.exitButtonText, { fontSize: scaledFontSize(20) }]}>✕</Text>
            </Pressable>
          </View>
        )}

        {/* Top Right Controls — Sound + Burger menu, matching story-book-reader */}
        {!musicUiHidden && (
          <View style={[styles.topRightControls, {
            paddingTop: Math.max(insets.top + 5, 20),
            paddingRight: Math.max(insets.right + 5, 20),
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

        {/* Settings overlay — tap outside to close */}
        {showSettingsMenu && (
          <Pressable style={styles.settingsOverlay} onPress={() => setShowSettingsMenu(false)} />
        )}

        {/* Settings dropdown menu */}
        {showSettingsMenu && (
          <View style={[styles.settingsMenu, {
            top: Math.max(insets.top + 5, 20) + scaledButtonSize(50) + 10,
            right: Math.max(insets.right + 5, 20),
          }]}>
            {/* Change Instrument (only when not rotated, matching story reader) */}
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

        <MusicSheetOverlay
          visible={showMusicSheet}
          onClose={() => setShowMusicSheet(false)}
          requiredSequence={selectedSong.sequence}
          noteLayout={instrumentDef.noteLayout}
          completedNoteCount={musicChallenge.currentNoteIndex}
          instrumentName={instrumentDef.displayName}
          onNotePressIn={(note) => musicChallenge.previewNote(note)}
          onNotePressOut={(note) => musicChallenge.stopNote(note)}
          isRotated={instrumentIsRotated}
        />
      </View>
    );
  }

  // ---- Render: Instrument picker phase ----
  if (phase === 'instrument') {
    return (
      <View style={styles.container}>
        {renderStoriesBackground()}
        <InstrumentPickerOverlay
          visible
          onSelect={handleInstrumentSelect}
          onClose={handleInstrumentPickerClose}
        />
      </View>
    );
  }

  // ---- Render: Song library phase ----
  const songFontSize = scaledFontSize(18);
  const titleFontSize = scaledFontSize(28);
  const previewFontSize = scaledFontSize(13);
  const diffBadgeFontSize = scaledFontSize(12);
  const backBtnSize = scaledButtonSize(40);

  return (
    <View style={styles.container}>
      {renderStoriesBackground()}

      {/* Header */}
      <View style={[styles.songHeader, { paddingTop: insets.top + 16 }]}>
        <Pressable
          style={[styles.backButton, { width: backBtnSize, height: backBtnSize }]}
          onPress={handleBack}
          accessibilityLabel={t('music.backToMenu')}
        >
          <Text style={{ fontSize: scaledFontSize(20), color: '#FFFFFF' }}>←</Text>
        </Pressable>
        <Text style={[styles.songTitle, { fontSize: titleFontSize }]}>
          {t('music.songLibrary')}
        </Text>
        <Pressable
          style={[styles.backButton, { width: backBtnSize, height: backBtnSize }]}
          onPress={handleChangeInstrument}
          accessibilityLabel={t('music.changeInstrument')}
        >
          <Text style={{ fontSize: scaledFontSize(16), color: '#FFFFFF' }}>🎵</Text>
        </Pressable>
      </View>

      {/* Instrument indicator */}
      {instrumentDef && (
        <Text style={[styles.instrumentLabel, { fontSize: scaledFontSize(14) }]}>
          {instrumentDef.displayName}
        </Text>
      )}

      {/* Song list */}
      <FlatList
        data={availableSongs}
        keyExtractor={(item) => item.id}
        style={{ zIndex: 10 }}
        contentContainerStyle={[
          styles.songList,
          { paddingBottom: insets.bottom + 20 },
        ]}
        renderItem={({ item }) => (
          <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
            <Pressable
              style={({ pressed }) => [
                styles.songCard,
                pressed && styles.songCardPressed,
              ]}
              onPress={() => handleSongSelect(item)}
            >
              <View style={styles.songCardHeader}>
                <Text style={[styles.songName, { fontSize: songFontSize }]}>
                  {t(item.nameKey)}
                </Text>
                <View style={[styles.diffBadge, { backgroundColor: DIFFICULTY_COLORS[item.difficulty] }]}>
                  <Text style={[styles.diffBadgeText, { fontSize: diffBadgeFontSize }]}>
                    {DIFFICULTY_STARS[item.difficulty]} {t(`music.difficulty.${item.difficulty}`)}
                  </Text>
                </View>
              </View>
              {/* Note preview */}
              <View style={styles.notePreview}>
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
          </Animated.View>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { fontSize: songFontSize }]}>
            {t('music.noSongsAvailable')}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },
  songHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songTitle: {
    color: '#fff',
    fontFamily: Fonts.primary,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  instrumentLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Fonts.primary,
    textAlign: 'center',
    marginBottom: 8,
    zIndex: 10,
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
