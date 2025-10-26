import React, { useEffect, useMemo } from 'react';
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
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { getTracksByCategory, getTrackById } from '@/data/music';
import { MusicTrack } from '@/types/music';
import { Fonts } from '@/constants/theme';
import { MusicControl } from '@/components/ui/music-control';
import { SleepSequencePlayer } from '@/services/sleep-sequence-player';

interface SleepSelectionScreenProps {
  onTrackSelect: (track: MusicTrack) => void;
  onBack: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function SleepSelectionScreen({ onTrackSelect, onBack }: SleepSelectionScreenProps) {
  const insets = useSafeAreaInsets();

  // Get sleep-related tracks
  const sleepTracks = useMemo(() => {
    const binauralTracks = getTracksByCategory('binaural-beats');
    return binauralTracks.filter(track => 
      track.subcategory === 'sleep' || track.isSequence
    );
  }, []);

  // Generate star positions for background
  const starPositions = useMemo(() => generateStarPositions(VISUAL_EFFECTS.STAR_COUNT), []);

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
  }, []);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  const handleTrackPress = async (track: MusicTrack) => {
    if (track.isSequence && track.sequenceTracks) {
      // Handle sequence track
      const sequenceTracks = track.sequenceTracks
        .map(trackId => getTrackById(trackId))
        .filter((t): t is MusicTrack => t !== undefined);
      
      if (sequenceTracks.length > 0) {
        const sleepPlayer = SleepSequencePlayer.getInstance();
        await sleepPlayer.startSleepSequence(
          sequenceTracks,
          (phase, track) => {
            console.log(`Sleep phase ${phase} started: ${track.title}`);
          },
          () => {
            console.log('Sleep sequence completed');
          }
        );
        onTrackSelect(sequenceTracks[0]);
      }
    } else {
      onTrackSelect(track);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  return (
    <LinearGradient
      colors={['#6B73FF', '#8E95FF', '#B3B9FF']}
      style={styles.container}
    >
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
            },
          ]}
        />
      ))}

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50) }]}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Sleep Music</Text>
        <MusicControl
          size={24}
          color="#FFFFFF"
        />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.subtitle}>Choose your sleep experience</Text>
          
          <View style={styles.tracksContainer}>
            {sleepTracks.map((track) => (
              <Pressable
                key={track.id}
                style={styles.trackCard}
                onPress={() => handleTrackPress(track)}
              >
                <View style={styles.trackIcon}>
                  <Text style={styles.trackIconText}>
                    {track.isSequence ? '🌙' : '🎵'}
                  </Text>
                </View>
                
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle} numberOfLines={2}>
                    {track.title}
                  </Text>
                  
                  {track.isSequence ? (
                    <Text style={styles.trackDescription}>
                      Complete 2-phase sleep progression (60 min when complete)
                    </Text>
                  ) : (
                    <Text style={styles.trackDescription}>
                      Phase {track.sequenceOrder} • {formatDuration(track.duration)}
                    </Text>
                  )}
                  
                  <Text style={styles.trackDuration}>
                    {formatDuration(track.duration)}
                  </Text>
                </View>

                {track.isSequence && (
                  <View style={styles.sequenceBadge}>
                    <Text style={styles.sequenceBadgeText}>AUTO</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>💤 Sleep Progression</Text>
            <Text style={styles.infoText}>
              The Complete Sleep Sequence automatically transitions through two phases:{'\n\n'}
              • Alpha (15 min) - Initial relaxation{'\n'}
              • Theta (45 min) - Deep sleep state{'\n\n'}
              Currently only Theta phase is available. Alpha phase coming soon for full 60-minute experience.{'\n\n'}
              Use stereo headphones for best results.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom spacing */}
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
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    fontFamily: Fonts.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
  },
  volumeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  volumeButtonText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: Fonts.primary,
    opacity: 0.9,
  },
  tracksContainer: {
    gap: 15,
    marginBottom: 30,
  },
  trackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  trackIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  trackIconText: {
    fontSize: 24,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
    fontFamily: Fonts.primary,
  },
  trackDescription: {
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
    marginBottom: 5,
    fontFamily: Fonts.primary,
  },
  trackDuration: {
    fontSize: 12,
    color: 'white',
    opacity: 0.7,
    fontFamily: Fonts.primary,
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
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    fontFamily: Fonts.primary,
  },
  infoText: {
    fontSize: 14,
    color: 'white',
    lineHeight: 20,
    fontFamily: Fonts.primary,
    opacity: 0.9,
  },
});
