import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import LottieView from 'lottie-react-native';

import { createLoadingCircleAnimation, createTextFadeAnimation, createCheckmarkAnimation } from './loading-animations';

const { width, height } = Dimensions.get('window');

export type LoadingPhase = 'authenticating' | 'syncing' | 'auth-error' | 'sync-error' | null;

interface LoadingOverlayProps {
  phase: LoadingPhase;
  onPulseComplete?: () => void;
}

const WINDOW_WIDTH = 280;
const WINDOW_HEIGHT = 280;

export function LoadingOverlay({ phase, onPulseComplete }: LoadingOverlayProps) {
  const insets = useSafeAreaInsets();
  const [displayText, setDisplayText] = useState('Signing in...');
  const [wasLoading, setWasLoading] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const windowTranslateX = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  // Create animations using hooks directly in the component
  const loadingCircleAnim = useRef(createLoadingCircleAnimation()).current;
  const textFadeAnim = useRef(createTextFadeAnimation()).current;
  const checkmarkAnim = useRef(createCheckmarkAnimation()).current;

  // Always compute these values
  const isError = phase === 'auth-error' || phase === 'sync-error';
  const isLoading = phase === 'authenticating' || phase === 'syncing';

  // Load and play click sound
  const playClickSound = async () => {
    try {
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/click.wav')
        );
        soundRef.current = sound;
      }
      await soundRef.current.replayAsync();
    } catch (error) {
      console.error('Error playing click sound:', error);
    }
  };

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    const { startAnimation: startLoadingCircle } = loadingCircleAnim;
    const { startFadeIn: fadeInText, startFadeOut: fadeOutText } = textFadeAnim;
    const { playCheckmarkEffect } = checkmarkAnim;

    if (isLoading) {
      // Show the overlay and start loading animation
      setIsVisible(true);
      setWasLoading(true);
      setShowCheckmark(false);
      setDisplayText(phase === 'authenticating' ? 'Signing in...' : 'Loading your stories...');
      startLoadingCircle();
      fadeInText();
    } else if (phase === 'auth-error' || phase === 'sync-error') {
      // Show error state
      setIsVisible(true);
      setDisplayText(phase === 'auth-error' ? 'Sign-in failed' : 'Couldn\'t load stories');
      fadeOutText();
    } else if (!phase && wasLoading && !isError) {
      // Loading completed successfully - show checkmark
      setShowCheckmark(true);
      loadingCircleAnim.rotation.value = 0;
      fadeOutText();
      playCheckmarkEffect(() => {
        playClickSound();
        // Delay main menu transition slightly after sound plays
        setTimeout(() => {
          // Animate window out to the left (same as login screen)
          windowTranslateX.value = withTiming(-width, {
            duration: 1400,
            easing: Easing.out(Easing.cubic),
          });
          // Fade out the dark overlay
          overlayOpacity.value = withTiming(0, {
            duration: 1400,
            easing: Easing.out(Easing.cubic),
          });
          // Call onPulseComplete which will trigger the login screen transition
          onPulseComplete?.();
        }, 300);
      });
      setWasLoading(false);
    }
  }, [phase]);

  const windowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: windowTranslateX.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <Animated.View
      style={[styles.container, { display: isVisible ? 'flex' : 'none' }]}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        {/* Small Loading Window */}
        <Animated.View style={[styles.window, windowAnimatedStyle]}>
          {/* Loading Circle or Checkmark - overlaid in same space */}
          <View style={styles.loadingCircleContainer}>
            {/* Loading Circle - always render, opacity controlled by animation */}
            <Animated.View style={[loadingCircleAnim.animatedStyle, { opacity: showCheckmark ? 0 : 1 }]}>
              <View style={styles.loadingCircle} />
            </Animated.View>

            {/* Checkmark - fades in when loading completes */}
            {showCheckmark && (
              <Animated.View style={[checkmarkAnim.checkmarkAnimatedStyle, styles.checkmarkOverlay]}>
                <LottieView
                  source={require('@/assets/animations/right-tick.json')}
                  autoPlay
                  loop={false}
                  style={[styles.checkmark, { justifyContent: 'center', alignItems: 'center' }]}
                />
              </Animated.View>
            )}
          </View>

          {/* Status Text */}
          <Animated.View style={[styles.textContainer, textFadeAnim.animatedStyle]}>
            <Text style={[styles.statusText, isError && styles.errorText]}>
              {displayText}
            </Text>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  window: {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCircleContainer: {
    marginBottom: 28, // 20 * 1.4
    position: 'relative',
    width: 112, // 80 * 1.4
    height: 112, // 80 * 1.4
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCircle: {
    width: 70, // 50 * 1.4
    height: 70, // 50 * 1.4
    borderRadius: 35, // 25 * 1.4
    borderWidth: 4, // 3 * 1.4 rounded up
    borderColor: '#4ECDC4',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  textContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 17, // 12 * 1.4 rounded
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  errorText: {
    color: '#FF6B6B',
  },
  checkmark: {
    width: 146, // 104 * 1.4
    height: 146, // 104 * 1.4
  },
  checkmarkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 112, // 80 * 1.4
    height: 112, // 80 * 1.4
    justifyContent: 'center',
    alignItems: 'center',
  },
});

