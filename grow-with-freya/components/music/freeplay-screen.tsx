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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation';
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

  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(true);
  const [musicUiHidden, setMusicUiHidden] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isLandscapeReady, setIsLandscapeReady] = useState(false);
  const isExitingRef = useRef(false);

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
      micRequired: false,
      fallbackAllowed: true,
      hintLevel: 'none',
    };
  }, [selectedInstrumentId]);

  const musicChallenge = useMusicChallenge(freeplayConfig, undefined, 0.4);

  const breathDetector = useBreathDetector({
    enabled: !!selectedInstrumentId && !showPicker,
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

  const instrumentDef = useMemo(() =>
    selectedInstrumentId ? getInstrument(selectedInstrumentId) : null,
  [selectedInstrumentId]);

  // Lock to landscape when playing, restore portrait when leaving
  const isPlaying = !showPicker && !!selectedInstrumentId;
  useEffect(() => {
    if (isPlaying) {
      isExitingRef.current = false;
      setIsLandscapeReady(false);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
        .then(() => setIsLandscapeReady(true))
        .catch(() => setIsLandscapeReady(true));
    }
    return () => {
      if (isPlaying && !isExitingRef.current) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
    };
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

  const restorePortrait = useCallback(async () => {
    isExitingRef.current = true;
    try {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } catch {}
  }, []);

  const handleInstrumentSelect = useCallback((instrumentId: string) => {
    // Save current bg music volume and fade to 0.1 (matches story-book-reader)
    const baseVol = preMusicVolumeRef.current ?? globalSound.volume;
    preMusicVolumeRef.current = baseVol;
    fadeMusicVolumeTo(0.1);
    setSelectedInstrumentId(instrumentId);
    setShowPicker(false);
  }, [globalSound.volume, fadeMusicVolumeTo]);

  const handleChangeInstrument = useCallback(async () => {
    musicChallenge.cleanup();
    breathDetector.stopListening();
    setShowSettingsMenu(false);
    setMusicUiHidden(false);
    restoreMusicVolume();
    await restorePortrait();
    setSelectedInstrumentId(null);
    setShowPicker(true);
  }, [musicChallenge, breathDetector, restorePortrait, restoreMusicVolume]);

  const handleBack = useCallback(async () => {
    if (!showPicker && selectedInstrumentId) {
      await handleChangeInstrument();
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

  // ---- Instrument picker ----
  if (showPicker || !selectedInstrumentId || !instrumentDef) {
    return (
      <View style={styles.container}>
        {renderStoriesBackground()}
        <InstrumentPickerOverlay
          visible
          onSelect={handleInstrumentSelect}
          onClose={onBack}
        />
      </View>
    );
  }

  // ---- Freeplay UI ----
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
          promptText={t('music.freeplayPrompt')}
          requiredSequence={[]}
          noteLayout={instrumentDef.noteLayout}
          showBreathButton={false}
          allowSkip={false}
          onSkip={handleBack}
          onContinue={handleBack}
          onRotationChange={() => {}}
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
            onPress={handleChangeInstrument}
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
        </View>
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