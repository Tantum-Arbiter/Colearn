import React, { useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
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
import { Fonts } from '@/constants/theme';
import { MusicControl } from '@/components/ui/music-control';
import { useAppStore } from '@/store/app-store';


interface MusicMainMenuProps {
  onTantrumsSelect: () => void;
  onSleepSelect: () => void;
  onBack: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export function MusicMainMenu({ 
  onTantrumsSelect, 
  onSleepSelect, 
  onBack 
}: MusicMainMenuProps) {
  const insets = useSafeAreaInsets();


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

  const useStarAnimatedStyle = () => {
    return useAnimatedStyle(() => ({
      transform: [{ rotate: `${starRotation.value}deg` }],
    }));
  };

  const starAnimatedStyle = useStarAnimatedStyle();

  return (
    <LinearGradient
      colors={['#4ECDC4', '#3B82F6', '#1E3A8A']}
      style={styles.container}
    >
      {/* Bear top background image */}
      <View style={mainMenuStyles.moonContainer} pointerEvents="none">
        <BearTopImage />
      </View>

      {/* Animated stars background */}
      {starPositions.map((star) => (
        <Animated.View
          key={`star-${star.id}`}
          testID={`star-${star.id}`}
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

      {/* Header with back button and audio button - ABSOLUTE POSITIONING */}
      <View style={{
        position: 'absolute',
        top: insets.top + 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        zIndex: 30,
      }}>
        <Pressable style={styles.backButton} onPress={onBack} testID="back-button">
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <View style={{ width: 24 }} />
        <MusicControl
          size={24}
          color="#FFFFFF"
          style={{ marginBottom: 20 }}
        />
      </View>

      {/* Content container with flex: 1 for proper layout */}
      <View style={{ flex: 1, paddingTop: insets.top + 80, zIndex: 10 }}>
        <View style={styles.content}>
        <Text style={styles.subtitle}>Choose your music type</Text>
        
        <View style={styles.optionsContainer}>
          {/* Tantrums Option */}
          <Pressable style={styles.optionCard} onPress={onTantrumsSelect}>
            <LinearGradient
              colors={['#FF6B6B', '#FF8E8E']}
              style={styles.optionGradient}
            >
              <Text style={styles.optionTitle}>Tantrums</Text>
              <Text style={styles.optionDescription}>
                Calming music to help during difficult moments
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Sleep Option */}
          <Pressable style={styles.optionCard} onPress={onSleepSelect}>
            <LinearGradient
              colors={['#6B73FF', '#8E95FF']}
              style={styles.optionGradient}
            >
              <Text style={styles.optionTitle}>Sleep</Text>
              <Text style={styles.optionDescription}>
                Gentle sounds to help your child drift off to sleep
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
        </View>
      </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: Fonts.primary,
    opacity: 0.9,
  },
  optionsContainer: {
    gap: 20,
  },
  optionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  optionGradient: {
    padding: 30,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
  },
  optionEmoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  optionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    fontFamily: Fonts.primary,
  },
  optionDescription: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
    fontFamily: Fonts.primary,
    lineHeight: 22,
  },
});
