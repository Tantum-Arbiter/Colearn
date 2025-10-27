import React, { useEffect, useMemo, useState } from 'react';
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
import { getTracksByCategory } from '@/data/music';
import { MusicTrack } from '@/types/music';
import { Fonts } from '@/constants/theme';
import { MusicControl } from '@/components/ui/music-control';

interface TantrumSelectionScreenProps {
  onTrackSelect: (track: MusicTrack) => void;
  onBack: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function TantrumSelectionScreen({ onTrackSelect, onBack }: TantrumSelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const [showTips, setShowTips] = useState(false);

  // Get tantrum-related tracks
  const tantrumTracks = useMemo(() => {
    const binauralTracks = getTracksByCategory('binaural-beats');
    const tantrumCalming = getTracksByCategory('tantrum-calming');
    
    // Combine binaural beats tantrum tracks with regular tantrum calming tracks
    const binauralTantrumTracks = binauralTracks.filter(track => 
      track.subcategory === 'tantrum'
    );
    
    return [...binauralTantrumTracks, ...tantrumCalming];
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

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const getTrackTypeInfo = (track: MusicTrack) => {
    if (track.category === 'binaural-beats') {
      return {
        type: 'Binaural Beats',
        icon: '🧠',
        color: '#FF6B6B'
      };
    } else {
      return {
        type: 'Nature Sounds',
        icon: '🌊',
        color: '#4ECDC4'
      };
    }
  };

  return (
    <LinearGradient
      colors={['#FF6B6B', '#FF8E8E', '#FFB3B3']}
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
              opacity: star.opacity * 0.7,
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
        <View style={{ width: 24 }} />
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
          <Text style={styles.subtitle}>Choose your calming sound</Text>
          
          <View style={styles.tracksContainer}>
            {tantrumTracks.map((track) => {
              const typeInfo = getTrackTypeInfo(track);
              
              return (
                <Pressable
                  key={track.id}
                  style={styles.trackCard}
                  onPress={() => onTrackSelect(track)}
                >
                  <View style={[styles.trackIcon, { backgroundColor: typeInfo.color }]}>
                    <Text style={styles.trackIconText}>{typeInfo.icon}</Text>
                  </View>
                  
                  <View style={styles.trackInfo}>
                    <Text style={styles.trackTitle} numberOfLines={2}>
                      {track.title}
                    </Text>
                    
                    <Text style={styles.trackType}>
                      {typeInfo.type}
                    </Text>
                    
                    {track.description && (
                      <Text style={styles.trackDescription} numberOfLines={2}>
                        {track.description}
                      </Text>
                    )}
                    
                    <Text style={styles.trackDuration}>
                      {formatDuration(track.duration)}
                    </Text>
                  </View>

                  <View style={styles.playIcon}>
                    <Text style={styles.playIconText}>▶️</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Tips Section - Collapsible */}
          <View style={styles.tipsSection}>
            <Pressable
              style={styles.tipsHeader}
              onPress={() => setShowTips(!showTips)}
            >
              <Text style={styles.tipTitle}>
                Tips for Best Results {showTips ? '▼' : '▶'}
              </Text>
            </Pressable>

            {showTips && (
              <View style={styles.tipBox}>
                <Text style={styles.tipText}>
                  • Use during the early stages of a tantrum{'\n'}
                  • Create a calm, comfortable environment{'\n'}
                  • Stay with your child and breathe together{'\n'}
                  • For binaural beats, use stereo headphones{'\n'}
                  • Keep volume low and comfortable
                </Text>
              </View>
            )}
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
  trackType: {
    fontSize: 12,
    color: 'white',
    opacity: 0.8,
    marginBottom: 5,
    fontFamily: Fonts.primary,
    fontWeight: '600',
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
  playIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconText: {
    fontSize: 16,
  },
  tipsSection: {
    marginTop: 20,
  },
  tipsHeader: {
    alignItems: 'center',
  },
  tipBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
    textAlign: 'center',
  },
  tipText: {
    fontSize: 14,
    color: 'white',
    lineHeight: 20,
    fontFamily: Fonts.primary,
    opacity: 0.9,
  },
});
