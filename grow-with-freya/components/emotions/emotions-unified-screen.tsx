import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
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
import { Fonts } from '@/constants/theme';
import { PageHeader } from '@/components/ui/page-header';
import { EmotionTheme } from '@/types/emotion';
import { getThemeById, EMOTION_THEMES, BEAR_EMOTION_IMAGES } from '@/data/emotion-themes';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { BearTopImage } from '@/components/main-menu/animated-components';
import { EmotionCardsTipsOverlay } from '@/components/tutorial';

import { mainMenuStyles } from '@/components/main-menu/styles';
import { useAccessibility } from '@/hooks/use-accessibility';

interface EmotionsUnifiedScreenProps {
  onStartGame: (theme: EmotionTheme) => void;
  onBack: () => void;
}

export function EmotionsUnifiedScreen({ onStartGame, onBack }: EmotionsUnifiedScreenProps) {
  const [selectedTheme, setSelectedTheme] = useState<EmotionTheme>('emoji');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, scaledPadding, textSizeScale, isTablet, contentMaxWidth } = useAccessibility();

  // Generate star positions for background (matching stories pattern)
  const starPositions = useMemo(() => generateStarPositions(VISUAL_EFFECTS.STAR_COUNT), []);

  // Star rotation animation (matching stories pattern)
  const starRotation = useSharedValue(0);

  // PERFORMANCE: Defer star animation until after page transition to prevent jitter
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      starRotation.value = withRepeat(
        withTiming(360, {
          duration: 20000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }, 600); // Wait for page transition (500ms + 100ms buffer)
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      {/* Shared page header component */}
      <PageHeader
        title="Emotion Cards"
        subtitle="Choose your style and learn about emotions"
        onBack={onBack}
      />

      {/* Content container with flex: 1 for proper layout - dynamic padding for scaled text */}
      <View style={{ flex: 1, paddingTop: insets.top + 160 + (textSizeScale - 1) * 80, zIndex: 10, alignItems: isTablet ? 'center' : undefined }}>
        <View style={[styles.content, isTablet && { maxWidth: contentMaxWidth, width: '100%' }]}>
          {/* Theme Selection */}
          <View style={styles.themesContainer}>
            {Object.values(EMOTION_THEMES).map((theme) => {
              const cardSize = scaledButtonSize(100);
              const hasThemeIcon = theme.themeIcon !== undefined;
              return (
                <Pressable
                  key={theme.id}
                  style={[
                    styles.themeCard,
                    { width: cardSize, height: cardSize },
                    selectedTheme === theme.id && styles.themeCardSelected
                  ]}
                  onPress={() => handleThemePress(theme.id)}
                >
                  <LinearGradient
                    colors={selectedTheme === theme.id ? ['#FF6B6B', '#FF8E8E'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                    style={styles.themeCardGradient}
                  >
                    {hasThemeIcon ? (
                      <View style={{ width: '100%', height: '100%', backgroundColor: '#fdf8e1', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                        <Image
                          source={theme.themeIcon}
                          style={{ width: '140%', height: '140%' }}
                          resizeMode="cover"
                        />
                      </View>
                    ) : (
                      <View style={{ width: '100%', height: '100%', backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' }}>
                        <ThemedText style={[styles.themeIcon, { fontSize: cardSize * 0.5, lineHeight: cardSize * 0.6 }]}>{theme.icon}</ThemedText>
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>

          <ThemedText style={[styles.themeDescription, { fontSize: scaledFontSize(14) }]}>
            {selectedThemeData.description}
          </ThemedText>

          {/* How to Play */}
          <Pressable
            style={[styles.howToPlayCard, { marginTop: scaledPadding(20) }]}
            onPress={() => setShowHowToPlay(!showHowToPlay)}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
              style={[styles.howToPlayGradient, { padding: scaledPadding(15) }]}
            >
              <ThemedText style={[styles.howToPlayTitle, { fontSize: scaledFontSize(18) }]}>
                How to Play {showHowToPlay ? '▼' : '▶'}
              </ThemedText>
              {showHowToPlay && (
                <ThemedText style={[styles.instructions, { fontSize: scaledFontSize(14), marginTop: scaledPadding(10) }]}>
                  • Look at the picture{'\n'}
                  • Make the same face!{'\n'}
                  • Show me happy, sad, or silly{'\n'}
                  • Let&apos;s learn about feelings together!
                </ThemedText>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* Start Button - Fixed to bottom */}
      <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable style={[styles.startButton, { minHeight: scaledButtonSize(50) }]} onPress={handleStartGame}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E8E']}
            style={[styles.buttonGradient, { paddingHorizontal: scaledPadding(32), paddingVertical: scaledPadding(15) }]}
          >
            <ThemedText style={[styles.startButtonText, { fontSize: scaledFontSize(16) }]}>
              Express with {selectedThemeData.name}!
            </ThemedText>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Tips overlay for first-time users */}
      <EmotionCardsTipsOverlay />
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
    overflow: 'visible',
  },
  themeSection: {
    marginBottom: 30,
    overflow: 'visible',
  },
  sectionTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
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
  },
  themeIcon: {
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  themeDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: Fonts.primary,
    marginBottom: 10,
  },
  howToPlayCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  howToPlayGradient: {
    padding: 15,
    borderRadius: 15,
  },
  howToPlayTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: Fonts.primary,
  },
  instructions: {
    color: 'white',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.primary,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 20,
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
    paddingHorizontal: 32,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Fonts.primary,
    textAlign: 'center',
  },
});
