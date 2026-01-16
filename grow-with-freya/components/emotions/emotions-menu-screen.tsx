import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { EmotionCard } from './emotion-card';
import { MusicControl } from '@/components/ui/music-control';
import { EMOTIONS } from '@/data/emotions';
import { EmotionTheme } from '@/types/emotion';
import { getThemeById } from '@/data/emotion-themes';
import { Fonts } from '@/constants/theme';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { useBackButtonText } from '@/hooks/use-back-button-text';


interface EmotionsMenuScreenProps {
  onStartGame: () => void;
  onBack: () => void;
  selectedTheme?: EmotionTheme;
}

export function EmotionsMenuScreen({
  onStartGame,
  onBack,
  selectedTheme = 'emoji'
}: EmotionsMenuScreenProps) {
  const { t } = useTranslation();
  const backButtonText = useBackButtonText();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const insets = useSafeAreaInsets();


  // Get a few sample emotions to display
  const sampleEmotions = EMOTIONS.slice(0, 6);
  const themeData = getThemeById(selectedTheme);

  // Generate star positions for background (matching music main menu)
  const starPositions = useMemo(() => generateStarPositions(VISUAL_EFFECTS.STAR_COUNT), []);

  // Star rotation animation (matching music main menu)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useStarAnimatedStyle = () => {
    return useAnimatedStyle(() => ({
      transform: [{ rotate: `${starRotation.value}deg` }],
    }));
  };

  const starAnimatedStyle = useStarAnimatedStyle();

  const handleEmotionPress = (emotion: any) => {
    // For menu, just start the game when any emotion is pressed
    onStartGame();
  };

  return (
    <LinearGradient
      colors={VISUAL_EFFECTS.GRADIENT_COLORS}
      style={styles.container}
    >
      {/* Animated stars background (matching music main menu) */}
      {starPositions.map((star) => (
        <Animated.View
          key={`star-${star.id}`}
          style={[
            starAnimatedStyle,
            {
              position: 'absolute',
              width: star.size,
              height: star.size,
              backgroundColor: 'white',
              borderRadius: star.size / 2,
              opacity: star.opacity,
              left: star.left,
              top: star.top,
            },
          ]}
        />
      ))}

      <View style={{ flex: 1 }}>
        {/* Header with back button and audio button */}
        <View style={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 20,
          paddingBottom: 20,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between'
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
            <ThemedText style={{
              color: 'white',
              fontSize: 16,
              fontWeight: 'bold',
              fontFamily: Fonts.primary,
            }}>{backButtonText}</ThemedText>
          </Pressable>

          <MusicControl
            size={24}
            color="#FFFFFF"
            style={{ marginBottom: 20 }}
          />
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -20 }}>
          <ThemedText style={styles.title}>{t('emotions.title')}</ThemedText>
          <ThemedText style={styles.subtitle}>
            {themeData.nameKey ? t(themeData.nameKey) : themeData.name} {themeData.icon} • {themeData.descriptionKey ? t(themeData.descriptionKey) : themeData.description}
          </ThemedText>
        </View>

        {/* Emotion preview cards */}
        <View style={styles.emotionPreviewSection}>
          <View style={styles.emotionGrid}>
            {sampleEmotions.slice(0, 3).map((emotion, index) => (
              <EmotionCard
                key={emotion.id}
                emotion={emotion}
                onPress={handleEmotionPress}
                animationDelay={index * 100}
                size="small"
                theme={selectedTheme}
              />
            ))}
          </View>
        </View>

        {/* Bottom action buttons */}
        <View style={styles.actionSection}>
        <Pressable style={styles.primaryButton} onPress={onStartGame}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E8E']}
            style={styles.buttonGradient}
          >
            <ThemedText style={styles.primaryButtonText}>🎮 Choose Theme & Play!</ThemedText>
          </LinearGradient>
        </Pressable>

        {/* How to Play collapsible */}
        <Pressable
          style={styles.howToPlayButton}
          onPress={() => setShowHowToPlay(!showHowToPlay)}
        >
          <ThemedText style={styles.howToPlayButtonText}>
            {showHowToPlay ? '▼' : '▶'} How to Play
          </ThemedText>
        </Pressable>

        {showHowToPlay && (
          <View style={styles.howToPlayContent}>
            <ThemedText style={styles.howToPlayText}>
              • Look at the emotion card{'\n'}
              • Read the expression prompt{'\n'}
              • Show that emotion with your face!{'\n'}
              • Have fun learning about feelings
            </ThemedText>
          </View>
        )}
      </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Fonts.primary,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: Fonts.primary,
  },

  emotionPreviewSection: {
    alignItems: 'center',
  },
  emotionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionSection: {
    paddingBottom: 20,
    gap: 15,
  },
  primaryButton: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
  },
  howToPlayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 10,
  },
  howToPlayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: Fonts.primary,
  },
  howToPlayContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  howToPlayText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
    fontFamily: Fonts.primary,
  },

});
