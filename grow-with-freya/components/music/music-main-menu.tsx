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
import { useTranslation } from 'react-i18next';
import { VISUAL_EFFECTS } from '@/components/main-menu/constants';
import { generateStarPositions } from '@/components/main-menu/utils';
import { BearTopImage } from '@/components/main-menu/animated-components';

import { mainMenuStyles } from '@/components/main-menu/styles';
import { Fonts } from '@/constants/theme';
import { PageHeader } from '@/components/ui/page-header';
import { useAccessibility } from '@/hooks/use-accessibility';


interface MusicMainMenuProps {
  onTantrumsSelect: () => void;
  onSleepSelect: () => void;
  onBack: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _dimensions = Dimensions.get('window'); // Keep for potential future use

export function MusicMainMenu({
  onTantrumsSelect,
  onSleepSelect,
  onBack
}: MusicMainMenuProps) {
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, scaledPadding, textSizeScale } = useAccessibility();
  const { t } = useTranslation();


  // Generate star positions for background
  const starPositions = useMemo(() => generateStarPositions(VISUAL_EFFECTS.STAR_COUNT), []);

  // Star rotation animation
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

      {/* Shared page header component */}
      <PageHeader
        title={t('music.title')}
        subtitle={t('music.subtitle')}
        onBack={onBack}
      />

      {/* Content container with flex: 1 for proper layout - dynamic padding for scaled text */}
      <View style={{ flex: 1, paddingTop: insets.top + 140 + (textSizeScale - 1) * 60, zIndex: 10 }}>
        <View style={styles.content}>

        <View style={styles.optionsContainer}>
          {/* Tantrums Option */}
          <Pressable style={[styles.optionCard, { minHeight: scaledButtonSize(120) }]} onPress={onTantrumsSelect}>
            <LinearGradient
              colors={['#FF6B6B', '#FF8E8E']}
              style={[styles.optionGradient, { padding: scaledPadding(20) }]}
            >
              <Text style={[styles.optionTitle, { fontSize: scaledFontSize(24) }]}>{t('music.tantrums')}</Text>
              <Text style={[styles.optionDescription, { fontSize: scaledFontSize(16) }]}>
                {t('music.tantrumsDescription')}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Sleep Option */}
          <Pressable style={[styles.optionCard, { minHeight: scaledButtonSize(120) }]} onPress={onSleepSelect}>
            <LinearGradient
              colors={['#6B73FF', '#8E95FF']}
              style={[styles.optionGradient, { padding: scaledPadding(20) }]}
            >
              <Text style={[styles.optionTitle, { fontSize: scaledFontSize(24) }]}>{t('music.sleep')}</Text>
              <Text style={[styles.optionDescription, { fontSize: scaledFontSize(16) }]}>
                {t('music.sleepDescription')}
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
