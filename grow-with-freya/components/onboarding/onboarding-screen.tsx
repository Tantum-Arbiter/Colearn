import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Pressable, PanResponder, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  FadeInUp,
  ZoomIn,
  Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '../themed-text';
import { PngIllustration } from '../ui/png-illustration';
import { useBackButtonText } from '@/hooks/use-back-button-text';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  title: string;
  body: string;
  illustration: string;
  buttonLabel: string;
  onNext: () => void;
  onPrevious?: () => void;
  currentStep: number;
  totalSteps: number;
  isTransitioning?: boolean;
  customContent?: React.ReactNode;
  isNextDisabled?: boolean;
}

export function OnboardingScreen({
  title,
  body,
  illustration,
  buttonLabel,
  onNext,
  onPrevious,
  currentStep,
  totalSteps,
  isTransitioning = false,
  customContent,
  isNextDisabled = false,
}: OnboardingScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const backButtonText = useBackButtonText();

  // Device-specific adjustments for Dynamic Island and notches
  const getProgressTopMargin = () => {
    // Base margin for progress indicator
    const baseMargin = 10;

    // Add extra space for devices with Dynamic Island or notch
    // insets.top will be larger on devices with Dynamic Island/notch
    if (insets.top > 44) {
      // Devices with Dynamic Island (iPhone 14 Pro+) or larger notches
      return insets.top + baseMargin + 5;
    } else if (insets.top > 20) {
      // Devices with standard notch (iPhone X series)
      return insets.top + baseMargin;
    } else {
      // Older devices without notch (iPhone 8, SE, etc.)
      return insets.top + baseMargin + 20;
    }
  };

  const isAndroid = Platform.OS === 'android';
  const buttonScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const textTranslateX = useSharedValue(50);
  const imageOpacity = useSharedValue(isAndroid ? 1 : 0); // Android: no fade, iOS: fade in
  const imageTranslateY = useSharedValue(30);
  const imageScale = useSharedValue(isAndroid ? 0 : 1); // Android: scale from 0, iOS: no scale
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  const containerOpacity = useSharedValue(0); // For initial fade-in from splash

  // Initial container fade-in (runs once on mount)
  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, []);

  useEffect(() => {
    textOpacity.value = 0;
    textTranslateX.value = 50;
    imageOpacity.value = isAndroid ? 1 : 0;
    imageTranslateY.value = 30;
    imageScale.value = isAndroid ? 0 : 1;
    buttonOpacity.value = 0;
    buttonTranslateY.value = 20;

    textOpacity.value = withDelay(100, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    textTranslateX.value = withDelay(100, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));

    if (isAndroid) {
      // Android: scale from 0 to 1 (no opacity) to avoid shadow rendering issues
      imageTranslateY.value = withDelay(300, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
      imageScale.value = withDelay(300, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    } else {
      // iOS: fade in with translate (original behavior)
      imageOpacity.value = withDelay(300, withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.1)) }));
      imageTranslateY.value = withDelay(300, withTiming(0, { duration: 600, easing: Easing.out(Easing.back(1.1)) }));
    }

    buttonOpacity.value = withDelay(500, withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.1)) }));
    buttonTranslateY.value = withDelay(500, withTiming(0, { duration: 500, easing: Easing.out(Easing.back(1.1)) }));
  }, [currentStep]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    buttonScale.value = withSpring(0.95, { duration: 100 }, () => {
      buttonScale.value = withSpring(1, { duration: 200 });
    });
    onNext();
  };

  const handlePrevious = () => {
    if (onPrevious && currentStep > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPrevious();
    }
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 15;
    },
    onPanResponderRelease: (_, gestureState) => {
      const { dx, vx } = gestureState;

      if (dx > 80 || vx > 0.3) {
        if (currentStep > 1 && onPrevious) {
          handlePrevious();
        }
      }
      else if (dx < -80 || vx < -0.3) {
        handleNext();
      }
    },
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateX: textTranslateX.value }],
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [
      { translateY: imageTranslateY.value },
      { scale: imageScale.value }
    ],
  }));

  const buttonContainerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  // Step 2 (How It Works) uses a feature list instead of an illustration
  const isFeatureListScreen = currentStep === 2;
  // Step 4 (Privacy) and Step 5 (Consent) are text-only (no illustration)
  const isConsentScreen = currentStep === 5;
  const isTextOnlyScreen = currentStep === 4 || isConsentScreen;

  const renderContextualContent = (step: number) => {
    // Map step number to translation keys (5 screens)
    const contextualData = [
      { taglineKey: 'onboarding.taglines.welcome', benefitKey: 'onboarding.benefits.welcome' },
      { taglineKey: 'onboarding.taglines.howItWorks', benefitKey: 'onboarding.benefits.howItWorks' },
      { taglineKey: 'onboarding.taglines.family', benefitKey: 'onboarding.benefits.family' },
      { taglineKey: 'onboarding.taglines.privacy', benefitKey: 'onboarding.benefits.privacy' },
      { taglineKey: 'onboarding.taglines.consent', benefitKey: 'onboarding.benefits.consent' },
    ];

    const data = contextualData[step - 1];
    if (!data) return null;

    const tagline = data.taglineKey ? t(data.taglineKey) : '';
    const benefit = data.benefitKey ? t(data.benefitKey) : '';

    if (!tagline && !benefit) return null;

    return (
      <View style={styles.contextualWrapper}>
        {tagline ? <ThemedText style={styles.tagline}>{tagline}</ThemedText> : null}
        {benefit ? <ThemedText style={styles.benefit}>{benefit}</ThemedText> : null}
      </View>
    );
  };

  // Feature list for "How It Works" screen (step 2)
  const renderFeatureList = () => {
    const features = [
      { label: t('onboarding.screens.howItWorks.features.stories'), desc: t('onboarding.screens.howItWorks.features.storiesDesc') },
      { label: t('onboarding.screens.howItWorks.features.music'), desc: t('onboarding.screens.howItWorks.features.musicDesc') },
      { label: t('onboarding.screens.howItWorks.features.voice'), desc: t('onboarding.screens.howItWorks.features.voiceDesc') },
    ];
    return (
      <View style={styles.featureList}>
        {features.map((f, i) => (
          <Animated.View
            key={i}
            entering={FadeInUp.delay(400 + i * 150).duration(500)}
            style={styles.featureRow}
          >
            <ThemedText style={styles.featureLabel}>{f.label}</ThemedText>
            <ThemedText style={styles.featureDesc}>{f.desc}</ThemedText>
          </Animated.View>
        ))}
      </View>
    );
  };

  const renderDecorativeElements = (step: number) => {
    const isTablet = width >= 768;
    if (!isTablet) return [];

    const kidFriendlyElements = [
      ['🐻', '⭐', '🎈', '🦄'],
      ['📚', '🎵', '🎙️', '⭐'],
      ['👨‍👩‍👧‍👦', '🌱', '💛', '🌻'],
      ['🔒', '🛡️', '✅', '💚'],
      ['📋', '✅', '🤝', '💚'],
    ];

    const elements = kidFriendlyElements[step - 1] || [];

    return elements.map((emoji, index) => {
      const sizeVariation = [14, 16, 15, 17][index] || 16;
      const positions = [
        { top: '10%', left: '5%' },
        { top: '15%', left: '88%' },
        { top: '85%', left: '8%' },
        { top: '88%', left: '85%' },
      ];

      const position = positions[index] || positions[0];

      return (
        <Animated.Text
          key={index}
          style={[
            styles.decorativeEmoji,
            {
              top: position.top as any,
              left: position.left as any,
              fontSize: sizeVariation,
            }
          ]}
        >
          {emoji}
        </Animated.Text>
      );
    });
  };


  const renderFloatingElements = () => {
    const isTablet = width >= 768;

    if (!isTablet) {
      return null;
    }

    const dots = [
      { delay: 800, size: 4, opacity: 0.15 },
      { delay: 1200, size: 6, opacity: 0.1 },
      { delay: 1000, size: 3, opacity: 0.2 },
    ];

    return (
      <>
        {dots.map((dot, index) => {
          const dotStyles = [
            styles.floatingDot1,
            styles.floatingDot2,
            styles.floatingDot3,
          ];

          return (
            <Animated.View
              key={index}
              style={[
                styles.floatingDot,
                dotStyles[index] || dotStyles[0],
                {
                  width: dot.size,
                  height: dot.size,
                  borderRadius: dot.size / 2,
                  opacity: dot.opacity,
                }
              ]}
              entering={FadeInUp.delay(dot.delay).duration(1000)}
            />
          );
        })}
      </>
    );
  };

  const renderIllustration = (content: string) => {
    const illustrationMap: { [key: string]: string } = {
      'family reading together': 'family-reading',
      'how-it-works': 'tina-bruno',
      'parent hugging child': 'research-backed',
      'privacy': 'research-backed',
    };

    const pngName = illustrationMap[content] || 'tina-bruno';

    return (
      <PngIllustration
        key={pngName}
        name={pngName}
      />
    );
  };

  return (
    <Animated.View style={[{ flex: 1 }, containerAnimatedStyle]} {...panResponder.panHandlers}>
      <LinearGradient
        colors={['#E8F5E8', '#F0F8FF', '#E6F3FF']}
        style={styles.container}
      >


      <View style={[styles.progressContainer, { marginTop: getProgressTopMargin() }]}>
        <View style={styles.progressWrapper}>
          {[...Array(totalSteps)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index < currentStep ? styles.progressDotActive : styles.progressDotInactive,
              ]}
            />
          ))}
        </View>
        <ThemedText style={styles.stepCounter}>
          {currentStep}/{totalSteps}
        </ThemedText>
      </View>

      <View style={styles.contentContainer}>
        <Animated.View
          style={[
            styles.textContainer,
            textAnimatedStyle,
            isTextOnlyScreen && styles.textContainerExpanded
          ]}
        >
          <ThemedText type="title" style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
            {title}
          </ThemedText>
          <ThemedText style={styles.body}>
            {body}
          </ThemedText>

          {isFeatureListScreen && renderFeatureList()}
          {isConsentScreen && customContent}

          {!isConsentScreen && (
            <View style={styles.contextualContent}>
              {renderContextualContent(currentStep)}
            </View>
          )}
        </Animated.View>

        {!isTextOnlyScreen && !isFeatureListScreen && (
          <Animated.View
            key={isAndroid ? `illustration-${currentStep}` : undefined}
            entering={isAndroid ? ZoomIn.delay(300).duration(600) : undefined}
            style={[
              styles.illustrationContainer,
              !isAndroid && imageAnimatedStyle,
            ]}
          >
            <View style={styles.decorativeBackground}>
              {renderDecorativeElements(currentStep)}
            </View>

            {renderIllustration(illustration)}

            <View style={styles.floatingElements}>
              {renderFloatingElements()}
            </View>
          </Animated.View>
        )}
      </View>


      <Animated.View
        style={[
          styles.buttonContainer,
          buttonAnimatedStyle,
          buttonContainerAnimatedStyle,
          // Add extra bottom padding on Android for navigation bar
          Platform.OS === 'android' && { paddingBottom: Math.max(insets.bottom, 20) + 10 }
        ]}
      >
        <View style={styles.navigationButtons}>
          {currentStep > 1 && (
            <Pressable
              style={styles.backButton}
              onPress={handlePrevious}
            >
              <ThemedText style={styles.backButtonText}>{backButtonText}</ThemedText>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              pressed && !isNextDisabled && styles.nextButtonPressed,
              isNextDisabled && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={isTransitioning || isNextDisabled}
          >
            <ThemedText style={[styles.buttonText, isNextDisabled && styles.buttonTextDisabled]}>
              {buttonLabel}
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText style={styles.progressHint}>
          {currentStep < totalSteps ? t('onboarding.swipeOrTap') : t('onboarding.readyToStart')}
        </ThemedText>
      </Animated.View>
    </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20, // Reduced since we're using safe area insets
    paddingBottom: 30,
  },

  progressContainer: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  progressWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  stepCounter: {
    fontSize: 12,
    color: '#2E8B8B',
    fontWeight: '500',
    marginTop: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    backgroundColor: '#4ECDC4',
  },
  progressDotInactive: {
    backgroundColor: 'rgba(78, 205, 196, 0.3)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 12,
    width: '100%',
  },
  textContainerExpanded: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 0,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#2E8B8B',
    lineHeight: 32,
    width: '100%',
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    color: '#5A5A5A',
    maxWidth: width * 0.85,
  },
  contextualContent: {
    marginTop: 20,
    alignItems: 'center',
  },
  contextualWrapper: {
    alignItems: 'center',
    gap: 6,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ECDC4',
    textAlign: 'center',
  },
  benefit: {
    fontSize: 12,
    color: '#7A7A7A',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Feature list styles (How It Works screen)
  featureList: {
    marginTop: 24,
    gap: 16,
    width: '100%',
    paddingHorizontal: 8,
  },
  featureRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  featureLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2E8B8B',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#5A5A5A',
    lineHeight: 20,
  },
  illustrationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    maxHeight: height * 0.5,
    position: 'relative',
    width: '100%',
  },

  decorativeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  decorativeEmoji: {
    position: 'absolute',
    fontSize: 16,
    opacity: 0.3,
    zIndex: 1,
  },
  floatingElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  floatingDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
  },
  floatingDot1: {
    top: '15%',
    left: '8%',
  },
  floatingDot2: {
    top: '85%',
    left: '85%',
  },
  floatingDot3: {
    top: '12%',
    left: '90%',
  },

  buttonContainer: {
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.3)',
    maxWidth: 120,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButtonText: {
    color: '#2E8B8B',
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 60,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 200,
    maxWidth: 300,
    alignSelf: 'center',
  },
  nextButtonPressed: {
    backgroundColor: '#44A08D',
    transform: [{ scale: 0.98 }],
  },
  nextButtonDisabled: {
    backgroundColor: '#A0C4C0',
    borderColor: '#8BB5B0',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonTextDisabled: {
    opacity: 0.6,
  },
  progressHint: {
    fontSize: 12,
    color: '#7A7A7A',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
