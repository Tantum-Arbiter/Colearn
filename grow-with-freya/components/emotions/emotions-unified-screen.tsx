import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
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
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { PageHeader } from '@/components/ui/page-header';
import { EmotionTheme } from '@/types/emotion';
import { getThemeById, EMOTION_THEMES } from '@/data/emotion-themes';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { BearTopImage } from '@/components/main-menu/animated-components';
import { EmotionCardsTipsOverlay } from '@/components/tutorial';

import { mainMenuStyles } from '@/components/main-menu/styles';
import { useAccessibility } from '@/hooks/use-accessibility';

interface EmotionsUnifiedScreenProps {
  onStartGame: (theme: EmotionTheme) => void;
  onNavigateToParents: () => void;
  onBack: () => void;
  /** When true, skip rendering gradient/bear/stars (parent owns them) */
  skipBackground?: boolean;
}

export function EmotionsUnifiedScreen({ onStartGame, onNavigateToParents, onBack, skipBackground }: EmotionsUnifiedScreenProps) {
  const [selectedTheme, setSelectedTheme] = useState<EmotionTheme>('emoji');
  const [selectedDevTheme, setSelectedDevTheme] = useState<EmotionTheme>('emoji');
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, scaledPadding, textSizeScale, isTablet, contentMaxWidth } = useAccessibility();
  const { t } = useTranslation();

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

  const handleDevThemePress = (theme: EmotionTheme) => {
    setSelectedDevTheme(theme);
  };

  const handleStartGame = () => {
    onStartGame(selectedTheme);
  };

  const handleStartDevGame = () => {
    onStartGame(selectedDevTheme);
  };

  const selectedThemeData = getThemeById(selectedTheme);
  const selectedDevThemeData = getThemeById(selectedDevTheme);

  // Reusable theme tile grid renderer
  const renderThemeTiles = (selected: EmotionTheme, onPress: (theme: EmotionTheme) => void) => (
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
              selected === theme.id && styles.themeCardSelected
            ]}
            onPress={() => onPress(theme.id)}
          >
            <LinearGradient
              colors={selected === theme.id ? ['#FF6B6B', '#FF8E8E'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
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
  );

  // Reusable start button renderer
  const renderStartButton = (onPress: () => void, themeData: typeof selectedThemeData) => (
    <View style={styles.sectionButtonContainer}>
      <Pressable style={[styles.startButton, { minHeight: scaledButtonSize(50) }]} onPress={onPress}>
        <LinearGradient
          colors={['#FF6B6B', '#FF8E8E']}
          style={[styles.buttonGradient, { paddingHorizontal: scaledPadding(32), paddingVertical: scaledPadding(15) }]}
        >
          <ThemedText style={[styles.startButtonText, { fontSize: scaledFontSize(16) }]}>
            {t('emotions.expressWithTheme', { theme: themeData.nameKey ? t(themeData.nameKey) : themeData.name })}
          </ThemedText>
        </LinearGradient>
      </Pressable>
    </View>
  );

  const Container = skipBackground ? View : LinearGradient;
  const containerProps = skipBackground ? { style: styles.container } : { colors: ['#4ECDC4', '#3B82F6', '#1E3A8A'] as const, style: styles.container };

  return (
    <Container {...containerProps as any}>
      {!skipBackground && (
        <>
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
        </>
      )}

      {/* Page header — only rendered when this screen owns its own background.
          When skipBackground is true, the parent (EmotionsScreen) renders the header
          at the top z-level so it sits above the shared bear image. */}
      {!skipBackground && (
        <PageHeader
          title={t('emotions.title')}
          subtitle={t('emotions.subtitle')}
          onBack={onBack}
          useBackArrow
        />
      )}

      {/* Scrollable content */}
      <ScrollView
        style={{ flex: 1, paddingTop: insets.top + 160 + (textSizeScale - 1) * 80 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, isTablet && { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }]}>

          {/* ── Section 1: Emotion Cards ── */}
          <ThemedText style={[styles.sectionTitle, { fontSize: scaledFontSize(22) }]}>
            {t('emotions.sections.emotionCards')}
          </ThemedText>

          {renderThemeTiles(selectedTheme, handleThemePress)}

          <ThemedText style={[styles.themeDescription, { fontSize: scaledFontSize(14) }]}>
            {selectedThemeData.descriptionKey ? t(selectedThemeData.descriptionKey) : selectedThemeData.description}
          </ThemedText>

          {renderStartButton(handleStartGame, selectedThemeData)}

          {/* ── Section 2: Developing Emotions ── */}
          <View style={styles.sectionDivider} />

          <ThemedText style={[styles.sectionTitle, { fontSize: scaledFontSize(22) }]}>
            {t('emotions.sections.developingEmotions')}
          </ThemedText>

          {renderThemeTiles(selectedDevTheme, handleDevThemePress)}

          <ThemedText style={[styles.themeDescription, { fontSize: scaledFontSize(14) }]}>
            {selectedDevThemeData.descriptionKey ? t(selectedDevThemeData.descriptionKey) : selectedDevThemeData.description}
          </ThemedText>

          {renderStartButton(handleStartDevGame, selectedDevThemeData)}

          {/* ── Section 3: Parents Too ── */}
          <View style={styles.sectionDivider} />

          <ThemedText style={[styles.sectionTitle, { fontSize: scaledFontSize(22) }]}>
            {t('emotions.sections.parentsToo')}
          </ThemedText>

          <ThemedText style={[styles.parentSubtitle, { fontSize: scaledFontSize(14) }]}>
            {t('emotions.sections.parentsTooSubtitle')}
          </ThemedText>

          <Pressable style={[styles.parentCard, { minHeight: scaledButtonSize(70), padding: scaledPadding(15) }]} onPress={onNavigateToParents}>
            <View style={styles.parentCardIcon}>
              <Ionicons name="musical-notes" size={scaledFontSize(24)} color="#FFFFFF" />
            </View>
            <View style={styles.parentCardInfo}>
              <ThemedText style={[styles.parentCardTitle, { fontSize: scaledFontSize(18) }]}>
                {t('relaxMusic.title')}
              </ThemedText>
              <ThemedText style={[styles.parentCardDescription, { fontSize: scaledFontSize(13) }]}>
                {t('emotions.sections.relaxingMusicDescription')}
              </ThemedText>
            </View>
          </Pressable>

        </View>
      </ScrollView>

      {/* Tips overlay for first-time users */}
      <EmotionCardsTipsOverlay />
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 20,
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
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 25,
    marginHorizontal: 20,
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
  sectionButtonContainer: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 5,
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
    maxWidth: 250,
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
  // Parents Too section
  parentSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Fonts.primary,
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  parentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  parentCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  parentCardInfo: {
    flex: 1,
  },
  parentCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    fontFamily: Fonts.primary,
  },
  parentCardDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: Fonts.primary,
    lineHeight: 18,
  },
});
