import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, Pressable, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../themed-text';
import { useAccessibility } from '@/hooks/use-accessibility';
import {
  ONBOARDING_MAX_WIDTH,
  SWIPE_ACTIVATE_X,
  SWIPE_FAIL_Y,
  onboardingLift,
  OnboardingSqueezeContext,
  swipeIntent,
} from './onboarding-metrics';
import { NIGHT_GRADIENT, GOLD, TEXT_MUTED } from './onboarding-theme';
import { OnboardingProgressBar } from './onboarding-progress-bar';

const { width, height } = Dimensions.get('window');

const STAR_COUNT = 55;
// past this the page scrolls; a hero has already given all it can
const MAX_SQUEEZE = 600;

const generateStars = (count: number) => {
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: seededRandom(i * 1.1) * (width - 20) + 10,
    top: seededRandom(i * 2.3) * height * 0.92 + 12,
    size: seededRandom(i * 4.1) > 0.82 ? 3 : seededRandom(i * 5.3) > 0.5 ? 2 : 1.5,
    opacity: 0.2 + seededRandom(i * 3.7) * 0.6,
  }));
};

export interface OnboardingScreenProps {
  title: string;
  body?: string;
  illustration?: string;
  buttonLabel: string;
  onNext: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  currentStep: number;
  totalSteps: number;
  isTransitioning?: boolean;
  customContent?: React.ReactNode;
  isNextDisabled?: boolean;
  /** Hung from the top-right, outside the scroll area. */
  decoration?: React.ReactNode;
  /** Full-bleed art behind the title and content. */
  backdrop?: React.ReactNode;
}

const MASCOT_INSET = 208;

export function OnboardingScreen({
  title,
  body,
  buttonLabel,
  onNext,
  onPrevious,
  onSkip,
  currentStep,
  totalSteps,
  isTransitioning = false,
  customContent,
  isNextDisabled = false,
  decoration,
  backdrop,
}: OnboardingScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledPadding, isTablet } = useAccessibility();
  const stars = useMemo(() => generateStars(STAR_COUNT), []);

  // The column is measured rather than the scroll content, because the lift is
  // then added to the padding above it -- measuring the content would feed the
  // lift back into its own input.
  // the column is remounted for each step, so its height is always the
  // current page's: the last page's measurement would otherwise be taken for
  // this one until it happened to lay out at a different size
  const [column, setColumn] = useState({ step: currentStep, height: 0 });
  const columnHeight = column.step === currentStep ? column.height : 0;
  const [viewportHeight, setViewportHeight] = useState(0);

  const basePaddingTop = insets.top + scaledPadding(34);
  const paddingBottom = scaledPadding(8);
  const contentHeight = basePaddingTop + columnHeight + paddingBottom;
  const lift = onboardingLift(viewportHeight, contentHeight, isTablet);
  // A page taller than the viewport is asked to give the difference back,
  // out of its hero. The ask only ever grows for a page, and is measured
  // from the column as it stands, so once the page fits it stays fitted
  // rather than springing back the moment the overflow it caused is gone.
  const [fit, setFit] = useState({ step: currentStep, squeeze: 0 });
  const squeeze = fit.step === currentStep ? fit.squeeze : 0;
  const measured = viewportHeight > 0 && columnHeight > 0;
  const overflow = measured ? contentHeight - viewportHeight : 0;
  React.useEffect(() => {
    if (overflow <= 0) return;
    setFit((current) => ({
      step: currentStep,
      squeeze: Math.min(MAX_SQUEEZE, (current.step === currentStep ? current.squeeze : 0) + overflow),
    }));
  }, [overflow, currentStep]);
  // Vertical movement is navigation on no page here, so the scroll view only
  // scrolls when the content genuinely does not fit -- otherwise holding the
  // page and dragging drifted the whole composition around.
  const scrollable = measured && contentHeight > viewportHeight;

  const handleColumnLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.height);
    setColumn((current) =>
      current.step === currentStep && current.height === measured ? current : { step: currentStep, height: measured }
    );
  }, [currentStep]);

  const handleScrollLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.height);
    setViewportHeight((current) => (current === measured ? current : measured));
  }, []);

  // Stepping fades the outgoing page during the flow's isTransitioning window;
  // the incoming page then remounts (keyed by step) and replays the FadeInDown
  // cascade, so every page enters the way the first one does.
  const pageOpacity = useSharedValue(1);
  React.useEffect(() => {
    if (isTransitioning) {
      pageOpacity.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) });
    } else {
      // snap back -- the freshly mounted content's entering cascade does the
      // visible fade-in, so the wrapper must not double it
      pageOpacity.value = 1;
    }
  }, [isTransitioning, pageOpacity]);

  const pageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pageOpacity.value,
  }));

  const handleNext = useCallback(() => {
    if (isNextDisabled || isTransitioning) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  }, [isNextDisabled, isTransitioning, onNext]);

  const handlePrevious = useCallback(() => {
    if (!onPrevious || isTransitioning) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPrevious();
  }, [onPrevious, isTransitioning]);

  const handleSwipe = useCallback(
    (translationX: number, velocityX: number) => {
      const intent = swipeIntent(translationX, velocityX);
      if (intent === 'next') handleNext();
      else if (intent === 'previous') handlePrevious();
    },
    [handleNext, handlePrevious]
  );

  // Sideways only, and only once the drag is clearly sideways: the offsets keep
  // taps on the chips, checkboxes and text field working, and stop a vertical
  // drag from turning the page on its way past.
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-SWIPE_ACTIVATE_X, SWIPE_ACTIVATE_X])
        .failOffsetY([-SWIPE_FAIL_Y, SWIPE_FAIL_Y])
        .onEnd((event) => {
          runOnJS(handleSwipe)(event.translationX, event.velocityX);
        }),
    [handleSwipe]
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={swipe}>
        <OnboardingSqueezeContext.Provider value={squeeze}>
        <View style={styles.container}>
          <LinearGradient colors={NIGHT_GRADIENT} style={StyleSheet.absoluteFill} />

          <View style={styles.starsLayer} pointerEvents="none">
            {stars.map((star) => (
              <View
                key={`star-${star.id}`}
                style={[
                  styles.star,
                  {
                    left: star.left,
                    top: star.top,
                    width: star.size,
                    height: star.size,
                    borderRadius: star.size / 2,
                    opacity: star.opacity,
                  },
                ]}
              />
            ))}
          </View>

          {/* the layer shares pageOpacity so the art fades out in step with the
              content; the outgoing backdrop is then removed instantly (already
              invisible) and the incoming one fades in with the cascade */}
          <Animated.View style={[styles.backdropLayer, { top: lift }, pageAnimatedStyle]} pointerEvents="none">
            {backdrop && (
              <Animated.View
                key={`backdrop-${currentStep}`}
                entering={FadeIn.duration(450)}
                style={StyleSheet.absoluteFill}
              >
                {backdrop}
              </Animated.View>
            )}
          </Animated.View>

          {onSkip && (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={[styles.skipContainer, { top: insets.top + scaledPadding(10) }]}
            >
              <Pressable
                testID="onboarding-skip"
                onPress={onSkip}
                hitSlop={12}
                accessibilityLabel={t('onboardingV2.skip')}
              >
                <ThemedText style={[styles.skipText, { fontSize: scaledFontSize(15) }]}>
                  {t('onboardingV2.skip')}
                </ThemedText>
              </Pressable>
            </Animated.View>
          )}

          <ScrollView
            testID="onboarding-scroll"
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: basePaddingTop + lift, paddingBottom },
            ]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollable}
            bounces={false}
            overScrollMode="never"
            onLayout={handleScrollLayout}
          >
            <Animated.View
              key={`column-${currentStep}`}
              style={[styles.pageColumn, pageAnimatedStyle]}
              onLayout={handleColumnLayout}
              testID="onboarding-column"
            >
              <Animated.View
                key={`header-${currentStep}`}
                entering={FadeInDown.duration(450)}
                style={styles.header}
              >
                <ThemedText style={[styles.title, { fontSize: scaledFontSize(28) }]}>{title}</ThemedText>
                {body ? (
                  <ThemedText style={[styles.body, { fontSize: scaledFontSize(15) }]}>{body}</ThemedText>
                ) : null}
              </Animated.View>

              {customContent ? (
                <Animated.View
                  key={`content-${currentStep}`}
                  entering={FadeInDown.delay(120).duration(450)}
                  style={styles.customContent}
                >
                  {customContent}
                </Animated.View>
              ) : null}
            </Animated.View>
          </ScrollView>

          {decoration && (
            <View style={[styles.decorationLayer, { top: insets.top - 26 }]} pointerEvents="none">
              {decoration}
            </View>
          )}

          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, 12) + scaledPadding(8) },
            ]}
          >
            <View style={styles.buttonRow}>
              {onPrevious && currentStep > 1 ? (
                <Pressable
                  testID="onboarding-back"
                  style={styles.backButton}
                  onPress={handlePrevious}
                  accessibilityLabel={t('common.back')}
                >
                  <Ionicons name="chevron-back" size={scaledFontSize(18)} color="#FFFFFF" />
                  <ThemedText style={[styles.backText, { fontSize: scaledFontSize(15) }]}>
                    {t('common.back')}
                  </ThemedText>
                </Pressable>
              ) : null}

              <Pressable
                testID="onboarding-next"
                style={[styles.nextButton, isNextDisabled && styles.nextButtonDisabled]}
                onPress={handleNext}
                disabled={isNextDisabled || isTransitioning}
                accessibilityLabel={buttonLabel}
              >
                <ThemedText style={[styles.nextText, { fontSize: scaledFontSize(16) }]}>
                  {buttonLabel}
                </ThemedText>
                <Ionicons name="arrow-forward" size={scaledFontSize(17)} color="#1A1633" />
              </Pressable>
            </View>

            <View style={styles.progressRow}>
              <OnboardingProgressBar currentStep={currentStep} totalSteps={totalSteps} />
              <ThemedText
                testID="onboarding-step-counter"
                style={[styles.stepCounter, { fontSize: scaledFontSize(13) }]}
              >
                {t('onboardingV2.stepCounter', { current: currentStep, total: totalSteps })}
              </ThemedText>
            </View>
          </View>

        </View>
        </OnboardingSqueezeContext.Provider>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  starsLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  backdropLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  skipContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 30,
  },
  skipText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  // onboarding lays out to a capped width so a tablet does not scale the art
  // up with the screen; the column is centred so the page still reads as one
  // composition rather than a phone layout pinned to the left
  pageColumn: {
    width: '100%',
    maxWidth: ONBOARDING_MAX_WIDTH,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#F4DFAE',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 36,
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  body: {
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 320,
  },
  customContent: {
    alignSelf: 'stretch',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 14,
    zIndex: 10,
  },
  decorationLayer: {
    position: 'absolute',
    right: 26,
    zIndex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stepCounter: {
    color: TEXT_MUTED,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  backText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 26,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  nextButtonDisabled: {
    backgroundColor: 'rgba(232, 184, 75, 0.35)',
    shadowOpacity: 0,
  },
  nextText: {
    color: '#1A1633',
    fontWeight: '700',
  },
});
