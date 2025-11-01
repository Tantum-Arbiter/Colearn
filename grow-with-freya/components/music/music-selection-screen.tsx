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
import { BearTopImage } from '@/components/main-menu/animated-components';
import { mainMenuStyles } from '@/components/main-menu/styles';

import { MUSIC_CATEGORIES, getTracksByCategory, getTrackById } from '@/data/music';
import { MusicCategory, MusicTrack } from '@/types/music';
import { Fonts } from '@/constants/theme';
import { MusicControl } from '@/components/ui/music-control';
import { SleepSequencePlayer } from '@/services/sleep-sequence-player';

interface MusicSelectionScreenProps {
  onTrackSelect: (track: MusicTrack) => void;
  onPlaylistSelect: (category: MusicCategory) => void;
  onBack: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function MusicSelectionScreen({ 
  onTrackSelect, 
  onPlaylistSelect, 
  onBack 
}: MusicSelectionScreenProps) {
  const insets = useSafeAreaInsets();

  // Generate star positions for background (same as story pages)
  const starPositions = useMemo(() => generateStarPositions(VISUAL_EFFECTS.STAR_COUNT), []);

  // Star rotation animation
  const starRotation = useSharedValue(0);

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

  // Animated style for star rotation
  const starAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${starRotation.value}deg` }],
    };
  });

  const handleTrackPress = async (track: MusicTrack) => {
    console.log('Track selected:', track.title);

    // Handle sequence tracks (like sleep progression)
    if (track.isSequence && track.sequenceTracks) {
      try {
        // Get the actual tracks for the sequence
        const sequenceTracks = track.sequenceTracks
          .map(trackId => getTrackById(trackId))
          .filter((t): t is MusicTrack => t !== undefined);

        if (sequenceTracks.length > 0) {
          console.log('Starting sleep sequence with', sequenceTracks.length, 'phases');

          // Start the sleep sequence
          const sleepPlayer = SleepSequencePlayer.getInstance();
          await sleepPlayer.startSleepSequence(
            sequenceTracks,
            (phase, phaseNumber) => {
              console.log(`Phase ${phaseNumber}: ${phase.title}`);
            },
            () => {
              console.log('Sleep sequence completed');
            }
          );

          // Select the first track for the UI
          onTrackSelect(sequenceTracks[0]);
        } else {
          console.warn('No valid tracks found for sequence');
          onTrackSelect(track);
        }
      } catch (error) {
        console.error('Failed to start sleep sequence:', error);
        onTrackSelect(track);
      }
    } else {
      // Regular track selection
      onTrackSelect(track);
    }
  };

  const handlePlaylistPress = (category: MusicCategory) => {
    console.log('Playlist selected:', category);
    onPlaylistSelect(category);
  };

  return (
    <LinearGradient
      colors={['#4ECDC4', '#3B82F6', '#1E3A8A']}
      style={styles.container}
    >
      {/* Animated Stars Background (same as story pages) */}
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

      {/* Header with back button */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50), zIndex: 50 }]}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <View style={{ width: 24 }} />
        <MusicControl
          size={24}
          color="#FFFFFF"
        />
      </View>

      {/* Main content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {MUSIC_CATEGORIES.map((category) => {
          const tracks = getTracksByCategory(category.id);
          
          return (
            <View key={category.id} style={styles.categorySection}>
              {/* Category Header */}
              <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleContainer}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                </View>
                <Pressable 
                  style={[styles.playAllButton, { backgroundColor: category.color }]}
                  onPress={() => handlePlaylistPress(category.id)}
                >
                  <Text style={styles.playAllButtonText}>Play All</Text>
                </Pressable>
              </View>

              {/* Track Grid */}
              <View style={styles.trackGrid}>
                {tracks.map((track) => (
                  <Pressable
                    key={track.id}
                    style={[styles.trackTile, { borderColor: category.color }]}
                    onPress={() => handleTrackPress(track)}
                  >
                    <View style={[styles.trackIcon, { backgroundColor: category.color }]}>
                      <Text style={styles.trackIconText}>♪</Text>
                    </View>
                    <Text style={styles.trackTitle} numberOfLines={2}>
                      {track.title}
                    </Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>
                      {track.artist || 'Unknown Artist'}
                    </Text>
                    <Text style={styles.trackDuration}>
                      {formatDuration(track.duration)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}

        {/* Bottom spacing for safe area */}
        <View style={{ height: Math.max(insets.bottom + 20, 40) }} />
      </ScrollView>
    </LinearGradient>
  );
}

// Helper function to format duration
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
    marginRight: 16,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 28,
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
    paddingHorizontal: 20,
  },
  categorySection: {
    marginBottom: 40,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  categoryEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  categoryTitleContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontFamily: Fonts.primary,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  categoryDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: Fonts.primary,
  },
  playAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  playAllButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Fonts.primary,
  },
  trackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  trackTile: {
    width: (screenWidth - 60) / 2, // 2 columns with spacing
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  trackIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  trackIconText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 40, // Ensure consistent height for 2 lines
  },
  trackArtist: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: Fonts.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  trackDuration: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: Fonts.primary,
    textAlign: 'center',
  },
});
