import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useLoadingCircleAnimation, useTextFadeAnimation, useCheckmarkAnimation } from './loading-animations';

const { width } = Dimensions.get('window');

export type LoadingPhase = 'authenticating' | 'syncing' | 'complete' | 'auth-error' | 'sync-error' | null;

interface LoadingOverlayProps {
  phase: LoadingPhase;
  onPulseComplete?: () => void;
  onClose?: () => void;
}

const WINDOW_WIDTH = 280;
const WINDOW_HEIGHT = 280;

export function LoadingOverlay({ phase, onPulseComplete, onClose }: LoadingOverlayProps) {
  const [displayText, setDisplayText] = useState('Signing in...');
  const [subText, setSubText] = useState<string | null>(null);
  const [wasLoading, setWasLoading] = useState(false);
  const [hadError, setHadError] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [showErrorState, setShowErrorState] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showSignedIn, setShowSignedIn] = useState(false); // Show "Signed in" during syncing
  const soundRef = useRef<Audio.Sound | null>(null);
  const windowTranslateX = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsVisible(false);
    setShowErrorState(false);
    setHadError(false);
    setWasLoading(false);
    onClose?.();
  };

  // Use animation hooks
  const loadingCircleAnim = useLoadingCircleAnimation();
  const textFadeAnim = useTextFadeAnimation();
  const checkmarkAnim = useCheckmarkAnimation();

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
      setHadError(false); // Reset error state when starting a new loading phase
      setShowCheckmark(false);
      setShowErrorState(false);
      setDisplayText(phase === 'authenticating' ? 'Signing in...' : 'Loading your stories...');
      // Show "Signed in" when we're in syncing phase (means auth succeeded)
      setShowSignedIn(phase === 'syncing');
      setSubText(null);
      startLoadingCircle();
      fadeInText();
    } else if (phase === 'auth-error' || phase === 'sync-error') {
      // Show error state and remember that we had an error
      setIsVisible(true);
      setHadError(true);
      setShowErrorState(true);
      setDisplayText(phase === 'auth-error' ? 'Sign-in failed' : 'Couldn\'t load stories');
      setSubText('Please try again');
      fadeInText(); // Show the error text
    } else if (!phase && wasLoading && !hadError) {
      // Loading completed successfully - show checkmark
      setShowCheckmark(true);
      loadingCircleAnim.stopAnimation(); // Stop the rotation animation cleanly
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
    } else if (!phase && hadError) {
      // Error was shown and overlay is now being hidden - reset state for next attempt
      setIsVisible(false);
      setWasLoading(false);
      setHadError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {/* Loading Circle, Checkmark, or Error Icon - overlaid in same space */}
          <View style={styles.loadingCircleContainer}>
            {/* Loading Circle - show when loading and not in error/success state */}
            {!showCheckmark && !showErrorState && (
              <Animated.View style={loadingCircleAnim.animatedStyle}>
                <View style={styles.loadingCircle} />
              </Animated.View>
            )}

            {/* Checkmark - fades in when loading completes successfully */}
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

            {/* Error Icon - shows when there's an error */}
            {showErrorState && (
              <View style={styles.errorIconContainer}>
                <Ionicons name="alert-circle" size={70} color="#FF6B6B" />
              </View>
            )}
          </View>

          {/* Status Text */}
          <Animated.View style={[styles.textContainer, textFadeAnim.animatedStyle]}>
            <Text style={[styles.statusText, isError && styles.errorText]}>
              {displayText}
            </Text>
            {subText && (
              <Text style={styles.subText}>{subText}</Text>
            )}
            {/* Signed in indicator - shown during syncing phase */}
            {showSignedIn && (
              <View style={styles.signedInContainer}>
                <Ionicons name="checkmark-circle" size={18} color="#4ECDC4" />
                <Text style={styles.signedInText}>Signed in</Text>
              </View>
            )}
          </Animated.View>

          {/* Close Button - only shown on error */}
          {showErrorState && (
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          )}
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
    marginTop: -10,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  errorText: {
    color: '#FF6B6B',
  },
  subText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
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
  errorIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 40,
    backgroundColor: '#4ECDC4',
    borderRadius: 25,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signedInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  signedInText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4ECDC4',
  },
});

