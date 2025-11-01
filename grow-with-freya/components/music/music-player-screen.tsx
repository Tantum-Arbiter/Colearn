import React, { useEffect, useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Dimensions,
  Alert 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { BearTopImage } from '@/components/main-menu/animated-components';
import { mainMenuStyles } from '@/components/main-menu/styles';

import { MusicControl } from '../ui/music-control';
import { useMusicPlayer } from '@/hooks/use-music-player';
import { getCategoryInfo } from '@/data/music';
import { Fonts } from '@/constants/theme';
import { SleepSequencePlayer } from '@/services/sleep-sequence-player';

interface MusicPlayerScreenProps {
  onBack: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function MusicPlayerScreen({ onBack }: MusicPlayerScreenProps) {
  const insets = useSafeAreaInsets();
  const {
    currentTrack,
    currentPlaylist,
    playbackState,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffled,
    error,
    repeatCount,
    play,
    pause,
    stop,
    next,
    previous,
    seekTo,
    setVolume,
    toggleMute,
    setRepeatMode,
    toggleShuffle,
    togglePlayPause,
  } = useMusicPlayer();


  const [sequenceStatus, setSequenceStatus] = useState<{
    isActive: boolean;
    currentPhase: number;
    totalPhases: number;
    remainingTimeInPhase: number;
    remainingTimeTotal: number;
    timeUntilThetaPhase: number;
    isInThetaPhase: boolean;
  } | null>(null);

  // Generate star positions for background (same as story pages)
  const starPositions = useMemo(() => generateStarPositions(VISUAL_EFFECTS.STAR_COUNT), []);

  // Star rotation animation
  const starRotation = useSharedValue(0);
  
  // Play button scale animation
  const playButtonScale = useSharedValue(1);

  useEffect(() => {
    starRotation.value = withRepeat(
      withTiming(360, {
        duration: 20000, // 20 second rotation cycle
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  // Animate play button when state changes
  useEffect(() => {
    playButtonScale.value = withSpring(playbackState === 'playing' ? 1.1 : 1, {
      damping: 15,
      stiffness: 150,
    });
  }, [playbackState]);

  // Show error alerts
  useEffect(() => {
    if (error) {
      Alert.alert('Music Player Error', error, [{ text: 'OK' }]);
    }
  }, [error]);

  // Track sequence status for binaural beats
  useEffect(() => {
    if (currentTrack?.isSequence) {
      const sleepPlayer = SleepSequencePlayer.getInstance();
      const status = sleepPlayer.getSequenceStatus();
      setSequenceStatus(status);

      // Update sequence status every second for countdown timer
      const interval = setInterval(() => {
        const updatedStatus = sleepPlayer.getSequenceStatus();
        setSequenceStatus(updatedStatus);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setSequenceStatus(null);
    }
  }, [currentTrack]);

  // Animated styles
  const starAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${starRotation.value}deg` }],
    };
  });

  const playButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: playButtonScale.value }],
    };
  });

  // Get category info for styling
  const categoryInfo = currentTrack ? getCategoryInfo(currentTrack.category) : null;

  // Format time display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle progress bar change
  const handleSeek = async (value: number) => {
    await seekTo(value);
  };



  if (!currentTrack) {
    return (
      <LinearGradient
        colors={VISUAL_EFFECTS.GRADIENT_COLORS}
        style={styles.container}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50) }]}>
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No track selected</Text>
          <Text style={styles.emptyStateSubtext}>Choose a song to start playing</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={categoryInfo?.gradient as any || VISUAL_EFFECTS.GRADIENT_COLORS as any}
      style={styles.container}
    >
      {/* Animated Stars Background */}
      {starPositions.map((star) => (
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
            },
            starAnimatedStyle,
          ]}
        />
      ))}

      {/* Bear top background image */}
      <View style={mainMenuStyles.moonContainer} pointerEvents="none">
        <BearTopImage />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50), zIndex: 50 }]}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <View style={{ width: 24 }} />
        <MusicControl size={24} color="white" />
      </View>



      {/* Main Content */}
      <View style={styles.content}>
        {/* Album Art Placeholder */}
        <View style={[styles.albumArt, { backgroundColor: categoryInfo?.color || '#4ECDC4' }]}>
          <Text style={styles.albumArtIcon}>{categoryInfo?.emoji || '♪'}</Text>
        </View>

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle}>{currentTrack.title}</Text>
          <Text style={styles.trackArtist}>{currentTrack.artist || 'Unknown Artist'}</Text>
          {currentPlaylist && (
            <Text style={styles.playlistName}>from {currentPlaylist.title}</Text>
          )}

          {/* Repeat Status for Tantrum Tracks */}
          {currentTrack?.subcategory === 'tantrum' && (
            <View style={styles.sequenceStatus}>
              <Text style={styles.sequenceText}>
                Repeat {repeatCount + 1} of 3
              </Text>
              <Text style={styles.sequenceTime}>
                Calming session in progress
              </Text>
            </View>
          )}

          {/* Sleep Sequence Countdown Timer */}
          {sequenceStatus?.isActive && (
            <View style={styles.sleepCountdownContainer}>
              <View style={styles.phaseIndicator}>
                <Text style={styles.phaseText}>
                  {sequenceStatus.isInThetaPhase ? 'Deep Sleep Phase' : 'Relaxation Phase'}
                </Text>
                <Text style={styles.phaseSubtext}>
                  Phase {sequenceStatus.currentPhase} of {sequenceStatus.totalPhases}
                </Text>
              </View>

              {/* Current Phase Countdown */}
              <View style={styles.countdownTimer}>
                <Text style={styles.countdownLabel}>Current phase remaining</Text>
                <Text style={styles.countdownTime}>
                  {Math.floor(sequenceStatus.remainingTimeInPhase / 60)}:{(Math.floor(sequenceStatus.remainingTimeInPhase % 60)).toString().padStart(2, '0')}
                </Text>
              </View>

              {/* Total Experience Length */}
              <View style={styles.totalTimeContainer}>
                <Text style={styles.totalTimeLabel}>Total experience remaining</Text>
                <Text style={styles.totalTimeText}>
                  {Math.floor(sequenceStatus.remainingTimeTotal / 60)}:{(Math.floor(sequenceStatus.remainingTimeTotal % 60)).toString().padStart(2, '0')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Progress Bar - Hidden for sleep sequences */}
        {!sequenceStatus?.isActive && (
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Slider
              style={styles.progressSlider}
              minimumValue={0}
              maximumValue={duration}
              value={currentTime}
              onValueChange={handleSeek}
              minimumTrackTintColor="white"
              maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
            />
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>


          {/* Simplified Controls - Play/Pause and Restart Only */}
          <View style={styles.mainControls}>
            <Animated.View style={playButtonAnimatedStyle}>
              <Pressable style={styles.playButton} onPress={togglePlayPause}>
                <Text style={styles.playButtonText}>
                  {playbackState === 'playing' ? 'Pause' : 'Play'}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>

        {/* Playback State Indicator */}
        <View style={styles.stateIndicator}>
          <Text style={styles.stateText}>
            {playbackState === 'loading' ? 'Loading...' : 
             playbackState === 'error' ? 'Error' : 
             playbackState.charAt(0).toUpperCase() + playbackState.slice(1)}
          </Text>
        </View>
      </View>

      {/* Bottom spacing for safe area */}
      <View style={{ height: Math.max(insets.bottom + 20, 40) }} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumArt: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  albumArtIcon: {
    fontSize: 80,
    color: 'white',
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  trackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  trackArtist: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: Fonts.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  playlistName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: Fonts.primary,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
  },
  timeText: {
    color: 'white',
    fontSize: 14,
    fontFamily: Fonts.primary,
    minWidth: 40,
    textAlign: 'center',
  },
  progressSlider: {
    flex: 1,
    height: 40,
    marginHorizontal: 16,
  },
  controlsContainer: {
    width: '100%',
    alignItems: 'center',
  },

  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  controlButtonText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeControl: {
    color: 'white',
  },
  playButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonText: {
    fontSize: 30,
    color: 'white',
  },


  stateIndicator: {
    marginTop: 20,
    alignItems: 'center',
  },
  stateText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: Fonts.primary,
  },
  sequenceStatus: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  sequenceText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontFamily: Fonts.primary,
    fontWeight: '600',
  },
  sequenceTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: Fonts.primary,
    marginTop: 2,
  },
  sleepCountdownContainer: {
    marginTop: 12,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    alignItems: 'center',
    minWidth: '90%',
  },
  phaseIndicator: {
    alignItems: 'center',
    marginBottom: 16,
  },
  phaseText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 18,
    fontFamily: Fonts.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  phaseSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: Fonts.primary,
    marginTop: 4,
    textAlign: 'center',
  },
  countdownTimer: {
    alignItems: 'center',
  },
  countdownLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: Fonts.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  countdownTime: {
    color: 'white',
    fontSize: 32,
    fontFamily: Fonts.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
  },
  totalTimeContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  totalTimeLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: Fonts.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  totalTimeText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 18,
    fontFamily: Fonts.primary,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: Fonts.primary,
  },
});
