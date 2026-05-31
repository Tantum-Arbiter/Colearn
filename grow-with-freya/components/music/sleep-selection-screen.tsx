import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { BearTopImage } from '@/components/main-menu/animated-components';
import { mainMenuStyles } from '@/components/main-menu/styles';
import { PageHeader } from '@/components/ui/page-header';
import { getTracksByCategory, getTrackById } from '@/data/music';
import { MusicTrack } from '@/types/music';
import { Fonts } from '@/constants/theme';
import { MusicPlayerService } from '@/services/music-player';
import { SleepSequencePlayer } from '@/services/sleep-sequence-player';
import { useAccessibility } from '@/hooks/use-accessibility';

interface SleepSelectionScreenProps {
  onTrackSelect: (track: MusicTrack) => void;
  onBack: () => void;
  /** When true, skip rendering gradient/bear/stars (parent owns them) */
  skipBackground?: boolean;
}

export function SleepSelectionScreen({ onTrackSelect, onBack, skipBackground }: SleepSelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { scaledFontSize, scaledButtonSize, scaledPadding, textSizeScale, isTablet, contentMaxWidth } = useAccessibility();

  // Get relaxation tracks (binaural beats only, no narration books)
  const relaxTracks = useMemo(() => {
    const binauralTracks = getTracksByCategory('binaural-beats');
    return binauralTracks.filter(track =>
      track.subcategory === 'sleep' && !track.isSequence
    );
  }, []);

  // Generate star positions for background
  const starPositions = useMemo(() => generateStarPositions(VISUAL_EFFECTS.STAR_COUNT), []);

  // Fade-in animation
  const contentOpacity = useSharedValue(0);

  // Star rotation animation
  const starRotation = useSharedValue(0);

  useEffect(() => {
    starRotation.value = withRepeat(
      withTiming(360, {
        duration: 20000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
    // Fade in content
    contentOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  // Subscribe to playback state for time tracking
  useEffect(() => {
    const musicPlayer = MusicPlayerService.getInstance();
    const handleStateChange = (state: { currentTime: number; duration: number; playbackState: string }) => {
      setCurrentTime(state.currentTime);
      setDuration(state.duration);
      // If playback stopped naturally (track ended), clear the playing state
      if (state.playbackState === 'stopped' && playingTrackId) {
        // Only clear if not a sequence (sequences handle their own state)
        const track = relaxTracks.find(t => t.id === playingTrackId);
        if (track && !track.isSequence) {
          setPlayingTrackId(null);
          setIsPaused(false);
        }
      }
    };
    musicPlayer.onStateChange(handleStateChange);
    return () => {
      musicPlayer.removeStateChangeListener(handleStateChange);
    };
  }, [playingTrackId, relaxTracks]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      const musicPlayer = MusicPlayerService.getInstance();
      const sequencePlayer = SleepSequencePlayer.getInstance();
      const state = musicPlayer.getState();
      if (state.playbackState === 'playing' || state.playbackState === 'paused') {
        musicPlayer.clearTrack();
      }
      sequencePlayer.stopSequence();
    };
  }, []);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handleTrackPress = useCallback(async (track: MusicTrack) => {
    const musicPlayer = MusicPlayerService.getInstance();

    // If tapping the currently playing track, toggle play/pause
    if (playingTrackId === track.id) {
      if (isPaused) {
        await musicPlayer.play();
        setIsPaused(false);
      } else {
        await musicPlayer.pause();
        setIsPaused(true);
      }
      return;
    }

    // Stop any currently playing track
    if (playingTrackId) {
      await musicPlayer.clearTrack();
    }

    try {
      if (track.isSequence && track.sequenceTracks) {
        const sequenceTracks = track.sequenceTracks
          .map(trackId => getTrackById(trackId))
          .filter((t): t is MusicTrack => t !== undefined);

        if (sequenceTracks.length > 0) {
          const sequencePlayer = SleepSequencePlayer.getInstance();
          await sequencePlayer.startSleepSequence(
            sequenceTracks,
            (phaseTrack, phaseNumber) => {
              console.log(`Relaxation phase ${phaseNumber} started: ${phaseTrack.title}`);
            },
            () => {
              console.log('Relaxation sequence completed');
              setPlayingTrackId(null);
              setIsPaused(false);
            }
          );
          setPlayingTrackId(track.id);
          setIsPaused(false);
        }
      } else {
        await musicPlayer.initialize();
        await musicPlayer.loadTrack(track);
        await musicPlayer.play();
        setPlayingTrackId(track.id);
        setIsPaused(false);
      }
    } catch (error) {
      console.error('Failed to play track:', error);
      setPlayingTrackId(null);
      setIsPaused(false);
    }
  }, [playingTrackId, isPaused]);

  const handleStopAll = useCallback(async () => {
    const musicPlayer = MusicPlayerService.getInstance();
    await musicPlayer.clearTrack();
    const sequencePlayer = SleepSequencePlayer.getInstance();
    await sequencePlayer.stopSequence();
    setPlayingTrackId(null);
    setIsPaused(false);
  }, []);

  const handleBack = useCallback(async () => {
    await handleStopAll();
    onBack();
  }, [handleStopAll, onBack]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDurationLabel = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    if (mins < 1) return '<1 min';
    return `${mins} min`;
  };

  const Container = skipBackground ? View : LinearGradient;
  const containerProps = skipBackground ? { style: styles.container } : { colors: ['#6B73FF', '#8E95FF', '#B3B9FF'] as const, style: styles.container };

  return (
    <Container {...containerProps as any}>
      {!skipBackground && (
        <>
          {/* Bear top background image */}
          <View style={mainMenuStyles.moonContainer} pointerEvents="none">
            <BearTopImage />
          </View>

          {/* Animated stars background */}
          {starPositions.map((star) => (
            <Animated.View
              key={`star-${star.id}`}
              style={[
                starAnimatedStyle,
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
              ]}
            />
          ))}
        </>
      )}

      {/* Shared page header */}
      <PageHeader
        title={t('relaxMusic.screenTitle')}
        subtitle={t('relaxMusic.subtitle')}
        onBack={handleBack}
        useBackArrow
      />

      {/* Scrollable content with fade-in */}
      <Animated.View style={[{ flex: 1, paddingTop: insets.top + 160 + (textSizeScale - 1) * 80, zIndex: 10 }, contentAnimatedStyle]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, isTablet && { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' as const }]}>

            {/* Headphone guidance */}
            <View style={styles.guidanceBox}>
              <Ionicons name="headset" size={scaledFontSize(22)} color="rgba(255, 255, 255, 0.9)" />
              <Text style={[styles.guidanceText, { fontSize: scaledFontSize(13) }]}>
                {t('relaxMusic.headphoneGuidance')}
              </Text>
            </View>

            {/* Track list */}
            <View style={styles.tracksContainer}>
              {relaxTracks.map((track) => {
                const isActive = playingTrackId === track.id;
                const isPlaying = isActive && !isPaused;
                const isTrackPaused = isActive && isPaused;
                const progress = isActive && duration > 0 ? currentTime / duration : 0;
                const iconName = track.subcategory === 'audiobook' ? 'book' : track.isSequence ? 'moon' : 'musical-note';
                return (
                  <Pressable
                    key={track.id}
                    style={[
                      styles.trackCard,
                      { minHeight: scaledButtonSize(80), padding: scaledPadding(15) },
                      isActive && styles.trackCardActive,
                    ]}
                    onPress={() => handleTrackPress(track)}
                  >
                    <View style={[styles.trackIcon, isActive && styles.trackIconActive]}>
                      <Ionicons
                        name={isPlaying ? 'pause' : isTrackPaused ? 'play' : iconName}
                        size={scaledFontSize(22)}
                        color="#FFFFFF"
                      />
                    </View>

                    <View style={styles.trackInfo}>
                      <Text style={[styles.trackTitle, { fontSize: scaledFontSize(17) }]} numberOfLines={2}>
                        {track.titleKey ? t(track.titleKey) : track.title}
                      </Text>

                      {/* Show description when not active */}
                      {!isActive && (
                        <Text style={[styles.trackDescription, { fontSize: scaledFontSize(13) }]} numberOfLines={2}>
                          {track.descriptionKey ? t(track.descriptionKey) : track.description}
                        </Text>
                      )}

                      {/* Show time progress when active */}
                      {isActive && duration > 0 && (
                        <View style={styles.progressContainer}>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
                          </View>
                          <Text style={[styles.progressTime, { fontSize: scaledFontSize(11) }]}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </Text>
                        </View>
                      )}

                      {/* Show duration label when not active and duration known at data level */}
                      {!isActive && !track.isSequence && track.duration > 0 && (
                        <Text style={[styles.trackDuration, { fontSize: scaledFontSize(11) }]}>
                          {formatDurationLabel(track.duration)}
                        </Text>
                      )}
                    </View>

                    {track.isSequence && (
                      <View style={styles.sequenceBadge}>
                        <Text style={[styles.sequenceBadgeText, { fontSize: scaledFontSize(10) }]}>AUTO</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Stop button when playing */}
            {playingTrackId && (
              <Pressable style={[styles.stopButton, { minHeight: scaledButtonSize(44) }]} onPress={handleStopAll}>
                <Ionicons name="stop-circle" size={scaledFontSize(20)} color="#FFFFFF" />
                <Text style={[styles.stopButtonText, { fontSize: scaledFontSize(15) }]}>
                  {t('relaxMusic.stopAll')}
                </Text>
              </Pressable>
            )}

            {/* Relaxation tips - Collapsible */}
            <View style={styles.infoSection}>
              <Pressable
                style={styles.infoHeader}
                onPress={() => setShowInfo(!showInfo)}
              >
                <Text style={[styles.infoTitle, { fontSize: scaledFontSize(16) }]}>
                  {t('relaxMusic.tipsTitle')} <Ionicons name={showInfo ? 'chevron-down' : 'chevron-forward'} size={scaledFontSize(14)} color="#FFFFFF" />
                </Text>
              </Pressable>

              {showInfo && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    {t('relaxMusic.tipsBody')}
                  </Text>
                </View>
              )}
            </View>

          </View>
        </ScrollView>
      </Animated.View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 20,
  },
  guidanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 12,
  },
  guidanceText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: Fonts.primary,
    lineHeight: 19,
  },
  tracksContainer: {
    gap: 12,
    marginBottom: 20,
  },
  trackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  trackCardActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  trackIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  trackIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    fontFamily: Fonts.primary,
  },
  trackDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 3,
    fontFamily: Fonts.primary,
    lineHeight: 18,
  },
  trackDuration: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: Fonts.primary,
  },
  progressContainer: {
    marginTop: 6,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: '100%' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 2,
  },
  progressTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: Fonts.primary,
    marginTop: 3,
  },
  sequenceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sequenceBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 100, 100, 0.3)',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.4)',
  },
  stopButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
  },
  infoSection: {
    marginTop: 10,
  },
  infoHeader: {
    alignItems: 'center',
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: 'white',
    lineHeight: 22,
    fontFamily: Fonts.primary,
    opacity: 0.9,
  },
});
