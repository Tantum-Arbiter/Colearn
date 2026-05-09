/**
 * FreeplayScreen
 *
 * Flow: instrument picker → free play music UI (no required notes).
 * The user picks an instrument and then has free access to play any note
 * without any sequence constraints. No notes-to-play guidance is shown.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { InstrumentPickerOverlay } from '@/components/stories/instrument-picker-overlay';
import { MusicChallengeUI } from '@/components/stories/music-challenge-ui';
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
} from '@/services/music-asset-registry';
import type { MusicChallenge } from '@/types/story';
import { useGlobalSound } from '@/contexts/global-sound-context';

// Pre-generate star positions at module level (same as story selection screen)
const STAR_POSITIONS = generateStarPositions(VISUAL_EFFECTS.STAR_COUNT);

type PlayMode = 'blow' | 'press';

interface FreeplayScreenProps {
  onBack: () => void;
}

export function FreeplayScreen({ onBack }: FreeplayScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize } = useAccessibility();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(true);
  // Keeps the picker overlay mounted during its fade-out animation
  const [showPickerOverlay, setShowPickerOverlay] = useState(true);
  const [musicUiHidden, setMusicUiHidden] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [instrumentIsRotated, setInstrumentIsRotated] = useState(false);

  // Remap portrait safe-area insets for the 90° CSS-rotated container.
  // Inside the rotated view: top←left, bottom←right, left←bottom, right←top
  const rotatedInsets = useMemo(() => ({
    top: insets.left,
    bottom: insets.right,
    left: insets.bottom,
    right: insets.top,
  }), [insets.top, insets.bottom, insets.left, insets.right]);

  // Fade animations for crossfade between picker and instrument
  const pickerOpacity = useSharedValue(1);
  const instrumentContentOpacity = useSharedValue(0);
  const pickerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pickerOpacity.value,
  }));
  // Rotated instrument overlay — fades in over the static blur
  const instrumentOverlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: instrumentContentOpacity.value,
    left: (screenWidth - screenHeight) / 2,
    top: (screenHeight - screenWidth) / 2,
    width: screenHeight,
    height: screenWidth,
    transform: [{ rotate: '90deg' }],
  }));

  // Freeplay config: free_play_optional mode, empty sequence, no mic required
  const freeplayConfig = useMemo<MusicChallenge | undefined>(() => {
    if (!selectedInstrumentId) return undefined;
    return {
      enabled: true,
      instrumentId: selectedInstrumentId,
      promptText: '',
      mode: 'free_play_optional',
      requiredSequence: [],        // No required notes
      successSongId: '',
      autoPlaySuccessSong: false,
      allowSkip: true,
      micRequired: true,           // Needed so blow mode gates notes behind breath detection
      fallbackAllowed: true,
      hintLevel: 'none',
    };
  }, [selectedInstrumentId]);

  const breathDetector = useBreathDetector({
    enabled: !!selectedInstrumentId && !showPicker,
  });

  // Audio session control — lets useMusicChallenge pause/resume the recorder
  // internally so notes always play at full speaker volume in blow mode.
  const audioSessionControl = useMemo(() => ({
    pauseForPlayback: breathDetector.pauseForPlayback,
    resumeRecording: breathDetector.resumeRecording,
    isListening: breathDetector.isListening,
  }), [breathDetector.pauseForPlayback, breathDetector.resumeRecording, breathDetector.isListening]);

  const musicChallenge = useMusicChallenge(freeplayConfig, undefined, 0.4, audioSessionControl);

  // Track the current play mode so we only sync breath state in blow mode.
  const currentPlayModeRef = useRef<'blow' | 'press'>('press');

  // Sync breath detector state to music challenge (matches story-book-reader).
  // Only in blow mode — in press mode, MusicChallengeUI sets breathActive(true)
  // permanently, and we must not overwrite it with the mic's false signal.
  useEffect(() => {
    if (selectedInstrumentId && !showPicker && currentPlayModeRef.current === 'blow') {
      musicChallenge.setBreathActive(breathDetector.isBreathActive);
    }
  }, [breathDetector.isBreathActive, selectedInstrumentId, showPicker]);

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

  // Duck background music as soon as the freeplay screen opens (picker visible).
  // Save the original volume so we can restore it when leaving.
  useEffect(() => {
    const baseVol = preMusicVolumeRef.current ?? globalSound.volume;
    preMusicVolumeRef.current = baseVol;
    fadeMusicVolumeTo(0.1, 500);
    // Restore volume on unmount (safety net)
    return () => {
      const vol = preMusicVolumeRef.current;
      if (vol !== null) {
        void globalSound.setVolume(vol);
        preMusicVolumeRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const instrumentDef = useMemo(() =>
    selectedInstrumentId ? getInstrument(selectedInstrumentId) : null,
  [selectedInstrumentId]);

  // Fade the instrument overlay in when picker is hidden (playing)
  const isPlaying = !showPicker && !!selectedInstrumentId;
  useEffect(() => {
    if (isPlaying) {
      instrumentContentOpacity.value = 0;
      // Slight delay so the picker fade-out completes first
      const timer = setTimeout(() => {
        instrumentContentOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isPlaying]);

  // Auto-start the music challenge when playing and config is ready
  const musicChallengeRef = useRef(musicChallenge);
  musicChallengeRef.current = musicChallenge;

  useEffect(() => {
    if (isPlaying && freeplayConfig) {
      const timer = setTimeout(() => {
        const mc = musicChallengeRef.current;
        if (mc.state === 'idle') {
          mc.start();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, freeplayConfig]);

  const handleInstrumentSelect = useCallback((instrumentId: string) => {
    // Fade background music to silence for instrument playing (matches story mode)
    fadeMusicVolumeTo(0, 1000);
    setSelectedInstrumentId(instrumentId);
    setShowPicker(false);
    // Fade out the picker overlay, then unmount it after the animation
    pickerOpacity.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) });
    setTimeout(() => setShowPickerOverlay(false), 550);
  }, [pickerOpacity, fadeMusicVolumeTo]);

  const handleChangeInstrument = useCallback(() => {
    musicChallenge.cleanup();
    breathDetector.stopListening();
    setShowSettingsMenu(false);
    setMusicUiHidden(false);
    setInstrumentIsRotated(false);
    // Raise volume back to ducked level (0.1) while on picker, not full restore
    fadeMusicVolumeTo(0.1, 300);
    // Fade out the instrument first, then show the picker after the fade completes
    instrumentContentOpacity.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) });
    setTimeout(() => {
      setSelectedInstrumentId(null);
      pickerOpacity.value = 1;
      setShowPickerOverlay(true);
      setShowPicker(true);
    }, 550);
  }, [musicChallenge, breathDetector, fadeMusicVolumeTo, instrumentContentOpacity, pickerOpacity]);

  // Handle play-mode changes from MusicChallengeUI (matches story-book-reader).
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

  const handleBack = useCallback(() => {
    if (!showPicker && selectedInstrumentId) {
      handleChangeInstrument();
    } else {
      musicChallenge.cleanup();
      breathDetector.stopListening();
      restoreMusicVolume();
      onBack();
    }
  }, [showPicker, selectedInstrumentId, handleChangeInstrument, musicChallenge, breathDetector, restoreMusicVolume, onBack]);

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
      <View style={mainMenuStyles.moonContainer} pointerEvents="none">
        <BearTopImage />
      </View>
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

  // ---- Single render tree ----
  // Background is always visible. The picker overlay (with its own blur) sits on top
  // and fades out on selection. The instrument blur + rotated content fades in underneath.
  const showInstrumentUI = !!selectedInstrumentId && !!instrumentDef;

  return (
    <View style={styles.container}>
      {/* Background — always visible, never fades */}
      {renderStoriesBackground()}

      {/* Static blur overlay — always mounted, never fades.
          pointerEvents="none" so touches pass through to the rotated instrument view. */}
      <View style={styles.musicChallengeOverlay} pointerEvents="none">
        <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
      </View>

      {/* Instrument rotated content — renders when instrument selected, fades in/out */}
      {showInstrumentUI && (
          <Animated.View style={[styles.musicChallengeOverlayRotated, instrumentOverlayAnimatedStyle]}>
            <MusicChallengeUI
              challenge={musicChallenge}
              promptText={t('music.freeplayPrompt')}
              requiredSequence={[]}
              noteLayout={instrumentDef!.noteLayout}
              showBreathButton={breathDetector.useFallback}
              allowSkip={false}
              onSkip={handleBack}
              onContinue={handleBack}
              onRotationChange={setInstrumentIsRotated}
              onPlayModeChange={handlePlayModeChange}
              onVisibilityChange={setMusicUiHidden}
              insetsOverride={rotatedInsets}
            />

            {/* Top Left Controls — Exit (✕) button */}
            {!musicUiHidden && (
              <View style={[styles.topLeftControls, {
                paddingTop: Math.max(rotatedInsets.top + 5, 20),
                paddingLeft: Math.max(rotatedInsets.left + 5, 20),
              }]}>
                <Pressable
                  style={[styles.exitButton, {
                    width: scaledButtonSize(50),
                    height: scaledButtonSize(50),
                    borderRadius: scaledButtonSize(25),
                  }]}
                  onPress={handleChangeInstrument}
                >
                  <Text style={[styles.exitButtonText, { fontSize: scaledFontSize(20) }]}>✕</Text>
                </Pressable>
              </View>
            )}

            {/* Top Right Controls — Sound + Burger menu */}
            {!musicUiHidden && (
              <View style={[styles.topRightControls, {
                paddingTop: Math.max(rotatedInsets.top + 5, 20),
                paddingRight: Math.max(rotatedInsets.right + 5, 20),
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
                top: Math.max(rotatedInsets.top + 5, 20) + scaledButtonSize(50) + 10,
                right: Math.max(rotatedInsets.right + 5, 20),
              }]}>
                {!instrumentIsRotated && (
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
                )}
              </View>
            )}
          </Animated.View>
      )}

      {/* Instrument picker — sits on top of blur (no own backdrop).
          Fades out when an instrument is selected; stays mounted briefly during fade. */}
      {showPickerOverlay && (
        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 20 }, pickerAnimatedStyle]}>
          <InstrumentPickerOverlay
            visible
            onSelect={handleInstrumentSelect}
            onClose={handleBack}
            hideBackdrop
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A',
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
  // Rotated overlay — CSS rotation 90° to simulate landscape in portrait mode.
  // Positioning (left/top) and dimensions (width/height) are set by the animated style.
  musicChallengeOverlayRotated: {
    position: 'absolute',
    zIndex: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
  menuItemText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
});