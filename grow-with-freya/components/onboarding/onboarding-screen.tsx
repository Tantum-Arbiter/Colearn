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
  Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '../themed-text';
import { PngIllustration } from '../ui/png-illustration';

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
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();

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

  const buttonScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const textTranslateX = useSharedValue(50);
  const imageOpacity = useSharedValue(0);
  const imageTranslateY = useSharedValue(30);
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
    imageOpacity.value = 0;
    imageTranslateY.value = 30;
    buttonOpacity.value = 0;
    buttonTranslateY.value = 20;

    textOpacity.value = withDelay(100, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    textTranslateX.value = withDelay(100, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));

    imageOpacity.value = withDelay(300, withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.1)) }));
    imageTranslateY.value = withDelay(300, withTiming(0, { duration: 600, easing: Easing.out(Easing.back(1.1)) }));

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
    transform: [{ translateY: imageTranslateY.value }],
  }));

  const buttonContainerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  // Steps 6, 7, and 8 are text-only screens (no illustration)
  const isTextOnlyScreen = currentStep === 6 || currentStep === 7 || currentStep === 8;

  const renderContextualContent = (step: number) => {
    const contextualData = [
      {
        tagline: "✨ Stories that grow with your child",
        benefit: "Personalized learning experiences"
      },
      {
        tagline: "👨‍👩‍👧‍👦 Quality time together",
        benefit: "Recommended by child development experts"
      },
      {
        tagline: "🎭 Make it uniquely theirs",
        benefit: "Custom avatars and personalized stories"
      },
      {
        tagline: "🎙️ Your voice, their comfort",
        benefit: "Record once, comfort them always"
      },
      {
        tagline: "🔬 Bridging Psychology with Technology",
        benefit: "Growing together, forever"
      },
      {
        tagline: "",
        benefit: "Thank you for helping us improve!"
      },
      {
        tagline: "",
        benefit: "Your data stays yours"
      },
      {
        tagline: "",
        benefit: "Anonymous crash reports help fix bugs faster"
      }
    ];

    const data = contextualData[step - 1];
    if (!data) return null;

    // Skip rendering if both tagline and benefit are empty
    if (!data.tagline && !data.benefit) return null;

    // For text-only screens (6, 7, and 8), show larger tagline in the content area
    if (step === 6 || step === 7 || step === 8) {
      return (
        <View style={styles.textOnlyTaglineWrapper}>
          {data.tagline ? <ThemedText style={styles.textOnlyTagline}>{data.tagline}</ThemedText> : null}
          {data.benefit ? <ThemedText style={styles.textOnlyBenefit}>{data.benefit}</ThemedText> : null}
        </View>
      );
    }

    return (
      <View style={styles.contextualWrapper}>
        {data.tagline ? <ThemedText style={styles.tagline}>{data.tagline}</ThemedText> : null}
        {data.benefit ? <ThemedText style={styles.benefit}>{data.benefit}</ThemedText> : null}
      </View>
    );
  };

  const renderDecorativeElements = (step: number) => {
    const decorativeElements = [
      ['�', '🌟', '�', '🦄', '�', '🧸'],
      ['�', '🍎', '�', '�', '☀️', '�'],
      ['🎨', '🦋', '�', '�', '🎪', '�'],
      ['🎵', '�', '�', '🎶', '�', '⭐'],
      ['�', '🌱', '�', '🌻', '🎓', '�'],
    ];

    const isTablet = width >= 768;

    if (!isTablet) {
      return [];
    }

    const kidFriendlyElements = [
      ['🐻', '🌟', '🎈', '🦄'],
      ['👶', '🍎', '🌸', '🐰'],
      ['🎨', '🦋', '🌺', '🐱'],
      ['🎵', '🐸', '🌙', '🎶'],
      ['📚', '🌱', '🐝', '🌻'],
      ['📋', '🔧', '📱', '💡'],
      ['🔒', '🛡️', '✅', '💚'],
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
      'parent hugging two children': 'screen-time-family',
      'two children avatars (Tina and Bruno)': 'tina-bruno',
      'adult holding phone speaking': 'voice-recording',
      'parent hugging child': 'research-backed',
      'disclaimer': 'research-backed', // Reuse research-backed for now
      'privacy': 'research-backed', // Reuse research-backed for privacy screen
      'crash-reporting': 'research-backed', // Reuse research-backed for crash reporting screen
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
          <ThemedText type="title" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText style={styles.body}>
            {body}
          </ThemedText>

          <View style={styles.contextualContent}>
            {renderContextualContent(currentStep)}
          </View>
        </Animated.View>

        {!isTextOnlyScreen && (
          <Animated.View
            style={[styles.illustrationContainer, imageAnimatedStyle]}
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
        style={[styles.buttonContainer, buttonAnimatedStyle, buttonContainerAnimatedStyle]}
      >
        <View style={styles.navigationButtons}>
          {currentStep > 1 && (
            <Pressable
              style={styles.backButton}
              onPress={handlePrevious}
            >
              <ThemedText style={styles.backButtonText}>← Back</ThemedText>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              pressed && styles.nextButtonPressed,
            ]}
            onPress={handleNext}
            disabled={isTransitioning}
          >
            <ThemedText style={styles.buttonText}>
              {buttonLabel}
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText style={styles.progressHint}>
          {currentStep < totalSteps ? "Swipe or tap to continue" : "Ready to start your journey!"}
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
  // Text-only screen styles (for steps 6 and 7)
  textOnlyTaglineWrapper: {
    alignItems: 'center',
    gap: 12,
    marginTop: 30,
  },
  textOnlyTagline: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E8B8B',
    textAlign: 'center',
  },
  textOnlyBenefit: {
    fontSize: 16,
    color: '#5A5A5A',
    textAlign: 'center',
    fontStyle: 'italic',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 200,
    maxWidth: 300,
    alignSelf: 'center',
  },
  nextButtonPressed: {
    backgroundColor: '#44A08D',
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  progressHint: {
    fontSize: 12,
    color: '#7A7A7A',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
