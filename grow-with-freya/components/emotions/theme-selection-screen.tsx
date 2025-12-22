import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { MusicControl } from '@/components/ui/music-control';
import { EmotionTheme } from '@/types/emotion';
import { getAllThemes, getThemeById } from '@/data/emotion-themes';
import { Fonts } from '@/constants/theme';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { useAccessibility } from '@/hooks/use-accessibility';

interface ThemeSelectionScreenProps {
  onThemeSelected: (theme: EmotionTheme) => void;
  onBack: () => void;
  selectedTheme?: EmotionTheme;
}

export function ThemeSelectionScreen({
  onThemeSelected,
  onBack,
  selectedTheme = 'emoji'
}: ThemeSelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const [currentTheme, setCurrentTheme] = useState<EmotionTheme>(selectedTheme);
  const themes = getAllThemes();
  const { scaledFontSize, scaledButtonSize, scaledPadding } = useAccessibility();

  const handleThemePress = (themeId: EmotionTheme) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentTheme(themeId);
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onThemeSelected(currentTheme);
  };

  return (
    <LinearGradient
      colors={VISUAL_EFFECTS.GRADIENT_COLORS}
      style={styles.container}
    >
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
              paddingHorizontal: scaledPadding(16),
              paddingVertical: scaledPadding(8),
              borderRadius: 20,
              marginBottom: 20,
              minHeight: scaledButtonSize(36),
              justifyContent: 'center',
            }}
            onPress={onBack}
          >
            <ThemedText style={{
              color: 'white',
              fontSize: scaledFontSize(16),
              fontWeight: 'bold',
              fontFamily: Fonts.primary,
            }}>← Back</ThemedText>
          </Pressable>

          <MusicControl
            size={24}
            color="#FFFFFF"
            style={{ marginBottom: 20 }}
          />
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -20 }}>
          <ThemedText style={[styles.title, { fontSize: scaledFontSize(32) }]}>Pick Your Style!</ThemedText>
          <ThemedText style={[styles.subtitle, { fontSize: scaledFontSize(18) }]}>
            Choose how you want to express emotions
          </ThemedText>
        </View>

        {/* Theme cards - horizontal layout */}
        <View style={styles.themesSection}>
          {themes.map((theme, index) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isSelected={currentTheme === theme.id}
              onPress={() => handleThemePress(theme.id)}
              animationDelay={index * 150}
            />
          ))}
        </View>

        {/* Continue button at bottom */}
        <View style={styles.actionSection}>
          <Pressable style={[styles.continueButton, { minHeight: scaledButtonSize(56) }]} onPress={handleContinue}>
            <LinearGradient
              colors={['#FF6B6B', '#FF8E8E']}
              style={[styles.buttonGradient, { paddingVertical: scaledPadding(16) }]}
            >
              <ThemedText style={[styles.continueButtonText, { fontSize: scaledFontSize(20) }]}>
                Continue with {getThemeById(currentTheme).name} 🎮
              </ThemedText>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* Bottom safe area */}
      <View style={{ height: Math.max(insets.bottom + 20, 40) }} />
    </LinearGradient>
  );
}

interface ThemeCardProps {
  theme: any;
  isSelected: boolean;
  onPress: () => void;
  animationDelay: number;
}

function ThemeCard({ theme, isSelected, onPress, animationDelay }: ThemeCardProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(30);
  const pressScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  React.useEffect(() => {
    const delay = animationDelay;
    
    setTimeout(() => {
      opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      translateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
    }, delay);
  }, []);

  React.useEffect(() => {
    if (isSelected) {
      glowOpacity.value = withTiming(1, { duration: 300 });
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isSelected]);

  const handlePress = () => {
    pressScale.value = withSpring(0.95, { damping: 15, stiffness: 300 }, () => {
      pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    });
    onPress();
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value * pressScale.value },
      { translateY: translateY.value }
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Sample emotions for preview
  const sampleEmotions = ['happy', 'sad', 'excited'];

  return (
    <Animated.View style={[styles.themeCardContainer, cardAnimatedStyle]}>
      {/* Glow effect for selection */}
      {isSelected && (
        <Animated.View 
          style={[styles.themeGlow, glowAnimatedStyle]} 
        />
      )}
      
      <Pressable
        style={[
          styles.themeCard,
          isSelected && styles.themeCardSelected
        ]}
        onPress={handlePress}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
      >
        <LinearGradient
          colors={isSelected ? ['#FF6B6B', '#FF8E8E'] : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
          style={styles.themeCardGradient}
        >
          {/* Theme Icon */}
          <ThemedText style={styles.themeIcon}>{theme.icon}</ThemedText>
          
          {/* Theme Name */}
          <ThemedText style={[styles.themeName, isSelected && styles.themeNameSelected]}>
            {theme.name}
          </ThemedText>
          
          {/* Theme Description */}
          <ThemedText style={[styles.themeDescription, isSelected && styles.themeDescriptionSelected]}>
            {theme.description}
          </ThemedText>
        </LinearGradient>
      </Pressable>
    </Animated.View>
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
    fontFamily: Fonts.primary,
  },
  themesSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 25,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  themeCardContainer: {
    alignItems: 'center',
  },
  themeGlow: {
    position: 'absolute',
    width: '110%',
    height: '110%',
    borderRadius: 25,
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  themeCard: {
    width: 110,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  themeCardSelected: {
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  themeCardGradient: {
    padding: 15,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  themeIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  themeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
    fontFamily: Fonts.primary,
    textAlign: 'center',
  },
  themeNameSelected: {
    color: 'white',
  },
  themeDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 16,
    fontFamily: Fonts.primary,
  },
  themeDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.95)',
  },
  actionSection: {
    gap: 15,
  },
  continueButton: {
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
  continueButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Fonts.primary,
  },
});
