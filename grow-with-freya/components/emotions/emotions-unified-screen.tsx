import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { MusicControl } from '@/components/ui/music-control';
import { EmotionTheme } from '@/types/emotion';
import { getThemeById, EMOTION_THEMES } from '@/data/emotion-themes';
import { Fonts } from '@/constants/theme';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { BearTopImage } from '@/components/main-menu/animated-components';

import { mainMenuStyles } from '@/components/main-menu/styles';

interface EmotionsUnifiedScreenProps {
  onStartGame: (theme: EmotionTheme) => void;
  onBack: () => void;
}

export function EmotionsUnifiedScreen({ onStartGame, onBack }: EmotionsUnifiedScreenProps) {
  const [selectedTheme, setSelectedTheme] = useState<EmotionTheme>('emoji');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const insets = useSafeAreaInsets();

  // Generate star positions for background (matching stories pattern)
  const starPositions = useMemo(() => generateStarPositions(VISUAL_EFFECTS.STAR_COUNT), []);

  // Star rotation animation (matching stories pattern)
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

  const handleThemePress = (theme: EmotionTheme) => {
    setSelectedTheme(theme);
  };

  const handleStartGame = () => {
    onStartGame(selectedTheme);
  };

  const selectedThemeData = getThemeById(selectedTheme);

  return (
    <LinearGradient
      colors={['#4ECDC4', '#3B82F6', '#1E3A8A']}
      style={styles.container}
    >
      {/* Bear top background image */}
      <View style={mainMenuStyles.moonContainer} pointerEvents="none">
        <BearTopImage />
      </View>

      {/* Animated stars background (matching stories pattern) */}
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

      {/* Content container with flex: 1 for proper layout */}
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
          <Pressable
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              marginBottom: 20,
            }}
            onPress={onBack}
          >
            <Text style={{
              color: 'white',
              fontSize: 16,
              fontWeight: 'bold',
              fontFamily: Fonts.primary,
            }}>← Back</Text>
          </Pressable>

          <MusicControl
            size={24}
            color="#FFFFFF"
            style={{ marginBottom: 20 }}
          />
        </View>

      {/* Content container with flex: 1 for proper layout */}
      <View style={{ flex: 1, paddingTop: insets.top + 80, zIndex: 10 }}>
        {/* Title - EXACT COPY FROM STORIES PATTERN */}
        <View style={{ paddingHorizontal: 20, marginTop: -20 }}>
          <Text style={{
            color: 'white',
            fontSize: 32,
            fontWeight: 'bold',
            textAlign: 'center',
            textShadowColor: 'rgba(0, 0, 0, 0.3)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}>
            Express Yourself!
          </Text>
          <Text style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: 16,
            textAlign: 'center',
            marginTop: 8,
          }}>
            Choose your style and learn about emotions
          </Text>
        </View>

        {/* Content area with stories-pattern spacing */}
        <View style={styles.content}>
          {/* Theme Selection Section */}
          <View style={styles.themeSection}>
            <ThemedText style={styles.sectionTitle}>Pick Your Style</ThemedText>
            <View style={styles.themesContainer}>
              {Object.values(EMOTION_THEMES).map((theme) => (
                <Pressable
                  key={theme.id}
                  style={[
                    styles.themeCard,
                    selectedTheme === theme.id && styles.themeCardSelected
                  ]}
                  onPress={() => handleThemePress(theme.id)}
                >
                  <LinearGradient
                    colors={selectedTheme === theme.id ? ['#FF6B6B', '#FF8E8E'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                    style={styles.themeCardGradient}
                  >
                    <ThemedText style={styles.themeIcon}>{theme.icon}</ThemedText>
                    <ThemedText style={styles.themeName}>{theme.name}</ThemedText>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
            <ThemedText style={styles.themeDescription}>
              {selectedThemeData.description}
            </ThemedText>
          </View>

          {/* How to Play Section */}
          <View style={styles.howToPlaySection}>
            <Pressable 
              style={styles.howToPlayHeader}
              onPress={() => setShowHowToPlay(!showHowToPlay)}
            >
              <ThemedText style={styles.sectionTitle}>
                How to Play {showHowToPlay ? '▼' : '▶'}
              </ThemedText>
            </Pressable>
            
            {showHowToPlay && (
              <View style={styles.instructionsContainer}>
                <ThemedText style={styles.instructions}>
                  • Look at the picture{'\n'}
                  • Make the same face!{'\n'}
                  • Show me happy, sad, or silly{'\n'}
                  • Let&apos;s learn about feelings together!
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Action Button (fixed at bottom) */}
        <View style={styles.bottomSection}>
          <Pressable style={styles.startButton} onPress={handleStartGame}>
            <LinearGradient
              colors={['#FF6B6B', '#FF8E8E']}
              style={styles.buttonGradient}
            >
              <ThemedText style={styles.startButtonText} numberOfLines={1}>
                Express with {selectedThemeData.name}!
              </ThemedText>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  themeSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: Fonts.primary,
  },
  themesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    marginBottom: 15,
  },
  themeCard: {
    width: 90,
    height: 90,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  themeCardSelected: {
    borderColor: '#FFD700',
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
  themeCardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  themeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  themeName: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: Fonts.primary,
  },
  themeDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: Fonts.primary,
  },
  howToPlaySection: {
    marginBottom: 20,
  },
  howToPlayHeader: {
    alignItems: 'center',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginTop: 10,
  },
  instructions: {
    color: 'white',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.primary,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: Math.max(20, 20),
    alignItems: 'center',
  },
  startButton: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: '100%',
    maxWidth: 250, // Match stories "Surprise Me!" button width
  },
  buttonGradient: {
    paddingHorizontal: 32, // Match stories "Surprise Me!" button padding
    paddingVertical: 15,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16, // Reduced from 18 to ensure single line text
    fontWeight: 'bold',
    fontFamily: Fonts.primary,
  },
});
