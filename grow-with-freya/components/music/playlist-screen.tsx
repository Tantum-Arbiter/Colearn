import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { MusicTrack } from '@/types/music';
import { ALL_MUSIC_TRACKS, MUSIC_TAG_INFO, MusicTag, formatDuration, getTrackById } from '@/data/music';
import { PageHeader } from '@/components/ui/page-header';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useMusicPlayer } from '@/hooks/use-music-player';
import { Fonts } from '@/constants/theme';
import { generateStarPositions, VISUAL_EFFECTS } from '@/components/main-menu/index';
import { BearTopImage } from '@/components/main-menu/animated-components';
import { mainMenuStyles } from '@/components/main-menu/styles';
import { SleepSequencePlayer } from '@/services/sleep-sequence-player';

interface PlaylistScreenProps {
  onBack: () => void;
  isActive?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const MAX_CONTENT_WIDTH = 500;
const isTablet = screenWidth > 600;

export function PlaylistScreen({ onBack, isActive = true }: PlaylistScreenProps) {
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, textSizeScale } = useAccessibility();
  const [selectedTags, setSelectedTags] = useState<Set<MusicTag>>(new Set());
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  // Reset expanded track when screen becomes inactive
  const wasActiveRef = React.useRef(isActive);
  React.useEffect(() => {
    if (wasActiveRef.current && !isActive) {
      // Screen becoming inactive - reset expanded track
      setExpandedTrackId(null);
    }
    wasActiveRef.current = isActive;
  }, [isActive]);

  const {
    playbackState,
    currentTime,
    duration,
    loadTrack,
    togglePlayPause,
    seekTo,
    stop,
    pause,
    clearTrack,
    setRepeatMode,
  } = useMusicPlayer();

  // Handle back button - pause audio and restore background music before leaving
  const handleBack = useCallback(async () => {
    // Pause and clear any playing track
    await pause();
    await clearTrack();
    // Reset expanded track state so it's fresh when returning
    setExpandedTrackId(null);
    // Then navigate back
    onBack();
  }, [pause, clearTrack, onBack]);

  // Star animation
  const starPositions = useMemo(() => generateStarPositions(VISUAL_EFFECTS.STAR_COUNT), []);
  const starRotation = useSharedValue(0);

  React.useEffect(() => {
    starRotation.value = withRepeat(
      withTiming(360, { duration: 60000, easing: Easing.linear }),
      -1
    );
  }, [starRotation]);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  // Filter tracks based on selected tags (match ANY selected tag - OR logic)
  const filteredTracks = useMemo(() => {
    if (selectedTags.size === 0) return ALL_MUSIC_TRACKS;
    return ALL_MUSIC_TRACKS.filter(track =>
      Array.from(selectedTags).some(tag => track.tags?.includes(tag))
    );
  }, [selectedTags]);

  const handleTagPress = useCallback((tag: MusicTag) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  }, []);

  const handleTrackPress = useCallback(async (track: MusicTrack) => {
    if (!track.isAvailable) return;

    // If this track is already expanded, collapse it
    if (expandedTrackId === track.id) {
      await stop();
      setExpandedTrackId(null);
      return;
    }

    // Stop any currently playing track before switching
    await stop();

    // Expand and load this track
    setExpandedTrackId(track.id);

    try {
      // Handle sequence tracks
      if (track.isSequence && track.sequenceTracks) {
        const sequenceTracks = track.sequenceTracks
          .map(trackId => getTrackById(trackId))
          .filter((t): t is MusicTrack => t !== undefined);

        if (sequenceTracks.length > 0) {
          const sleepPlayer = SleepSequencePlayer.getInstance();
          await sleepPlayer.startSleepSequence(sequenceTracks, () => {}, () => {});
          await loadTrack(sequenceTracks[0]);
        }
      } else {
        await loadTrack(track);
      }
      // Enable looping - track will repeat until user stops
      await setRepeatMode('one');
    } catch (error) {
      console.error('Failed to load track:', error);
    }
  }, [expandedTrackId, loadTrack, stop, setRepeatMode]);

  const isTrackPlaying = (trackId: string) =>
    expandedTrackId === trackId && playbackState === 'playing';

  const isTrackExpanded = (trackId: string) => expandedTrackId === trackId;

  const tags: MusicTag[] = ['calming', 'bedtime', 'stories'];

  return (
    <LinearGradient colors={['#4ECDC4', '#3B82F6', '#1E3A8A']} style={styles.container}>
      {/* Background elements */}
      <View style={mainMenuStyles.moonContainer} pointerEvents="none">
        <BearTopImage />
      </View>

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

      <PageHeader title="Music" subtitle="Choose a track to play" onBack={handleBack} />

      <View style={{ flex: 1, paddingTop: insets.top + 180 + (textSizeScale - 1) * 60, zIndex: 10 }}>
        {/* Centered content wrapper for tablets */}
        <View style={styles.contentWrapper}>
          {/* Tag filters */}
          <View style={styles.tagContainer}>
            {tags.map((tag) => {
              const tagInfo = MUSIC_TAG_INFO[tag];
              const isSelected = selectedTags.has(tag);
              return (
                <Pressable
                  key={tag}
                  style={[styles.tagButton, isSelected && { backgroundColor: tagInfo.color }]}
                  onPress={() => handleTagPress(tag)}
                >
                  <Text style={styles.tagEmoji}>{tagInfo.emoji}</Text>
                  <Text style={[styles.tagLabel, { fontSize: scaledFontSize(14) }]}>
                    {tagInfo.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Track list */}
          <ScrollView style={styles.trackList} contentContainerStyle={styles.trackListContent}>
            {filteredTracks.map((track) => {
              const expanded = isTrackExpanded(track.id);
              const playing = isTrackPlaying(track.id);

              return (
                <View key={track.id} style={[styles.trackCard, !track.isAvailable && styles.trackCardDisabled, expanded && styles.trackCardExpanded]}>
                  <Pressable
                    style={styles.trackHeader}
                    onPress={() => handleTrackPress(track)}
                  >
                    <View style={[styles.trackIcon, playing && styles.trackIconPlaying]}>
                      <Ionicons
                        name={playing ? 'pause' : track.isAvailable ? 'musical-notes' : 'time-outline'}
                        size={scaledButtonSize(24)}
                        color={playing ? '#fff' : track.isAvailable ? '#4ECDC4' : '#888'}
                      />
                    </View>
                    <View style={styles.trackInfo}>
                      <Text style={[styles.trackTitle, { fontSize: scaledFontSize(16) }]}>
                        {track.title}
                      </Text>
                      <Text style={[styles.trackArtist, { fontSize: scaledFontSize(12) }]}>
                        {track.artist} • {formatDuration(track.duration)}
                      </Text>
                      {!track.isAvailable && (
                        <Text style={[styles.comingSoon, { fontSize: scaledFontSize(11) }]}>
                          Coming Soon
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name={expanded ? 'chevron-up' : track.isAvailable ? 'chevron-down' : 'lock-closed'}
                      size={scaledButtonSize(24)}
                      color={track.isAvailable ? '#4ECDC4' : '#666'}
                    />
                  </Pressable>

                  {/* Expanded controls */}
                  {expanded && (() => {
                    // Use player duration if valid, otherwise fall back to track duration
                    const trackDuration = duration > 0 ? duration : track.duration;
                    return (
                      <View style={styles.controlsContainer}>
                        {/* Progress bar */}
                        <View style={styles.progressRow}>
                          <Text style={styles.timeText}>{formatDuration(Math.floor(currentTime))}</Text>
                          <Slider
                            style={styles.progressSlider}
                            minimumValue={0}
                            maximumValue={trackDuration}
                            value={currentTime}
                            onSlidingComplete={seekTo}
                            minimumTrackTintColor="#4ECDC4"
                            maximumTrackTintColor="rgba(78, 205, 196, 0.3)"
                            thumbTintColor="#4ECDC4"
                          />
                          <Text style={styles.timeText}>{formatDuration(Math.floor(trackDuration))}</Text>
                        </View>

                        {/* Play/Pause button and loop indicator */}
                        <View style={styles.controlRow}>
                          <Pressable style={styles.playButton} onPress={togglePlayPause}>
                            <Ionicons
                              name={playbackState === 'playing' ? 'pause-circle' : 'play-circle'}
                              size={scaledButtonSize(56)}
                              color="#4ECDC4"
                            />
                          </Pressable>
                        </View>

                        {/* Loop indicator */}
                        <View style={styles.loopIndicator}>
                          <Ionicons name="repeat" size={16} color="#4ECDC4" />
                          <Text style={styles.loopText}>Looping</Text>
                        </View>

                        {/* Status */}
                        {playbackState === 'loading' && (
                          <Text style={styles.statusText}>Loading...</Text>
                        )}
                      </View>
                    );
                  })()}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    maxWidth: isTablet ? MAX_CONTENT_WIDTH : undefined,
    alignSelf: 'center',
    width: '100%',
  },
  tagContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  tagEmoji: {
    fontSize: 16,
  },
  tagLabel: {
    color: 'white',
    fontFamily: Fonts.rounded,
    fontWeight: '600',
  },
  trackList: {
    flex: 1,
  },
  trackListContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  trackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  trackCardExpanded: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  trackCardDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  trackIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackIconPlaying: {
    backgroundColor: '#4ECDC4',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    color: '#1E3A8A',
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    marginBottom: 2,
  },
  trackArtist: {
    color: '#666',
    fontFamily: Fonts.rounded,
  },
  comingSoon: {
    color: '#FF6B6B',
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    marginTop: 2,
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(78, 205, 196, 0.2)',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
  },
  progressSlider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  timeText: {
    color: '#666',
    fontFamily: Fonts.rounded,
    fontSize: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    marginTop: 8,
  },
  loopIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  loopText: {
    color: '#4ECDC4',
    fontFamily: Fonts.rounded,
    fontSize: 12,
  },
  statusText: {
    color: '#888',
    fontFamily: Fonts.rounded,
    fontSize: 12,
    marginTop: 8,
  },
});

