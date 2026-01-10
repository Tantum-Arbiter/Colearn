import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions, Image, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

import { useAppStore } from '@/store/app-store';
import { DeviceInfoService } from '@/services/device-info-service';
import { FreyaRocketRightSvg } from './main-menu/svg-components';
import { Fonts } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

// Same gradient colors as main menu
const GRADIENT_COLORS: [string, string, string] = ['#1E3A8A', '#3B82F6', '#4ECDC4'];

// Star configuration (matching main menu)
const STAR_COUNT = 15;
const STAR_SIZE = 3;
const STAR_AREA_HEIGHT_RATIO = 0.6;

// Rocket size - responsive
const ROCKET_SIZE = width > 768 ? 200 : 120;

// Generate deterministic star positions
const generateStars = (count: number) => {
  const stars = [];
  const starAreaHeight = height * STAR_AREA_HEIGHT_RATIO;

  // Use seeded random for consistent positions
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      left: seededRandom(i * 1.1) * (width - 20) + 10,
      top: seededRandom(i * 2.3) * starAreaHeight + 20,
      opacity: 0.3 + seededRandom(i * 3.7) * 0.4,
    });
  }
  return stars;
};

SplashScreen.preventAutoHideAsync();

// Center position for rocket to stop at
const CENTER_X = (width - ROCKET_SIZE) / 2;
const CENTER_Y = (height - ROCKET_SIZE) / 2;

// Start position: further left, behind the bear image
const START_X = -ROCKET_SIZE * 1.5;
const START_Y = height + ROCKET_SIZE / 2;

export function AppSplashScreen() {
  const { setAppReady, hasCompletedOnboarding, hasCompletedLogin } = useAppStore();

  const rocketX = useSharedValue(START_X);
  const rocketY = useSharedValue(START_Y);
  const rocketScale = useSharedValue(0.3); // Start small
  const rocketRotation = useSharedValue(-30); // Start angle
  const rocketOpacity = useSharedValue(0);
  const disclaimerOpacity = useSharedValue(0);
  const starRotation = useSharedValue(0);

  // Timeout cleanup refs
  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Generate star positions (same as main menu)
  const stars = useMemo(() => generateStars(STAR_COUNT), []);

  useEffect(() => {
    async function prepare() {
      try {
        // Hide native splash screen immediately and show our custom one
        await SplashScreen.hideAsync();

        // Initialize device info service (generates/loads device ID)
        await DeviceInfoService.initialize();

        await Font.loadAsync({});

        // Animate rocket from bottom-left to center, growing as it moves
        rocketOpacity.value = withTiming(1, { duration: 200 });
        rocketX.value = withTiming(CENTER_X, {
          duration: 1500,
          easing: Easing.out(Easing.cubic)
        });
        rocketY.value = withTiming(CENTER_Y, {
          duration: 1500,
          easing: Easing.out(Easing.cubic)
        });
        rocketScale.value = withTiming(1.4, {
          duration: 1500,
          easing: Easing.out(Easing.back(1.2))
        });
        // Pivot the rocket: starts at -30deg, dips to -25deg as it arrives
        rocketRotation.value = withTiming(-25, {
          duration: 1500,
          easing: Easing.out(Easing.cubic)
        });

        // Star rotation animation
        starRotation.value = withRepeat(
          withTiming(360, { duration: 3000, easing: Easing.linear }),
          -1
        );

        // Wait for rocket animation to complete
        await new Promise<void>(resolve => {
          delayTimeoutRef.current = setTimeout(resolve, 1600);
        });

        // Start typewriter effect for disclaimer
        disclaimerOpacity.value = 1; // Make container visible immediately
        setStartTyping(true);

        // Wait for typewriter effect to complete and user to read
        // Disclaimer: ~1.8s, pause: 300ms, newline: ~150ms, "cole": ~340ms, blink pause: 800ms,
        // backspace: ~160ms, pause: 150ms, "de.": ~255ms = ~4s total
        // Plus 1.5s to read "code." before transitioning
        await new Promise<void>(resolve => {
          delayTimeoutRef.current = setTimeout(resolve, 5700);
        });

        console.log('Splash screen complete. App state:', { hasCompletedOnboarding, hasCompletedLogin });
        setAppReady(true);

      } catch (e) {
        console.warn(e);
        await SplashScreen.hideAsync();
        console.log('Splash screen error. App state:', { hasCompletedOnboarding, hasCompletedLogin });
        setAppReady(true);
      }
    }

    prepare();

    // Cleanup timeouts on unmount
    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, []);

  const rocketAnimatedStyle = useAnimatedStyle(() => ({
    opacity: rocketOpacity.value,
    transform: [
      { translateX: rocketX.value },
      { translateY: rocketY.value },
      { scale: rocketScale.value },
      { rotate: `${rocketRotation.value}deg` }, // Pivots as it moves
    ],
  }));

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  const disclaimerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: disclaimerOpacity.value,
  }));

  const DISCLAIMER_TEXT = "a university project.";
  const [typedText, setTypedText] = useState('');
  const [typedAuthor, setTypedAuthor] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [isAuthorComplete, setIsAuthorComplete] = useState(false);
  const [startTyping, setStartTyping] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authorTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorBlinkRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Typewriter effect for disclaimer
  useEffect(() => {
    if (!startTyping) return;

    let currentIndex = 0;
    const typeNextChar = () => {
      if (currentIndex < DISCLAIMER_TEXT.length) {
        setTypedText(DISCLAIMER_TEXT.slice(0, currentIndex + 1));
        currentIndex++;
        // Random delay between 50-120ms for natural typing feel
        const delay = 50 + Math.random() * 70;
        typingTimeoutRef.current = setTimeout(typeNextChar, delay);
      } else {
        setIsTypingComplete(true);
      }
    };

    // Start typing
    typingTimeoutRef.current = setTimeout(typeNextChar, 100);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [startTyping]);

  // Cursor blinking effect during pauses
  useEffect(() => {
    if (isPaused) {
      // Start blinking when paused
      cursorBlinkRef.current = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 400);
    } else {
      // Show cursor constantly when typing
      setShowCursor(true);
      if (cursorBlinkRef.current) {
        clearInterval(cursorBlinkRef.current);
        cursorBlinkRef.current = null;
      }
    }

    return () => {
      if (cursorBlinkRef.current) {
        clearInterval(cursorBlinkRef.current);
      }
    };
  }, [isPaused]);

  // Hide cursor when all typing is complete
  useEffect(() => {
    if (isAuthorComplete) {
      setShowCursor(false);
      if (cursorBlinkRef.current) {
        clearInterval(cursorBlinkRef.current);
        cursorBlinkRef.current = null;
      }
    }
  }, [isAuthorComplete]);

  // Typewriter effect for author (starts after disclaimer completes)
  // Types 2 newlines (enter effect), then "cole", backspaces "el", types "de." to show "code."
  useEffect(() => {
    if (!isTypingComplete) return;

    // Animation phases: newline -> type "cole" -> pause -> backspace "el" -> type "de."
    const NEWLINE_COUNT = 1; // One "enter" press
    const INITIAL_TEXT = "cole";
    const BACKSPACE_COUNT = 2; // Remove "e" and "l"
    const FINAL_ADDITION = "de.";

    let phase: 'newlines' | 'typing' | 'pausing' | 'backspacing' | 'finishing' = 'newlines';
    let newlineCount = 0;
    let currentIndex = 0;
    let backspaceCount = 0;
    let finishIndex = 0;
    let currentText = '';

    const animate = () => {
      const delay = 50 + Math.random() * 70;

      if (phase === 'newlines') {
        setIsPaused(false);
        // Add newlines (simulating pressing enter)
        if (newlineCount < NEWLINE_COUNT) {
          currentText += '\n';
          setTypedAuthor(currentText);
          newlineCount++;
          // Slightly longer delay for "enter" press feel
          authorTypingTimeoutRef.current = setTimeout(animate, 150);
        } else {
          // Move to typing "cole"
          phase = 'typing';
          authorTypingTimeoutRef.current = setTimeout(animate, 100);
        }
      } else if (phase === 'typing') {
        setIsPaused(false);
        // Type "cole"
        if (currentIndex < INITIAL_TEXT.length) {
          currentText = currentText.slice(0, NEWLINE_COUNT) + INITIAL_TEXT.slice(0, currentIndex + 1);
          setTypedAuthor(currentText);
          currentIndex++;
          authorTypingTimeoutRef.current = setTimeout(animate, delay);
        } else {
          // Start pause before backspacing - cursor will blink 1 time
          // Blink interval is 400ms, so 1 full blink = 2 state changes = 800ms
          phase = 'pausing';
          setIsPaused(true);
          authorTypingTimeoutRef.current = setTimeout(animate, 800);
        }
      } else if (phase === 'pausing') {
        // End pause, start backspacing
        phase = 'backspacing';
        setIsPaused(false);
        authorTypingTimeoutRef.current = setTimeout(animate, 100);
      } else if (phase === 'backspacing') {
        // Backspace "e" then "l"
        if (backspaceCount < BACKSPACE_COUNT) {
          currentText = currentText.slice(0, -1);
          setTypedAuthor(currentText);
          backspaceCount++;
          authorTypingTimeoutRef.current = setTimeout(animate, delay + 30);
        } else {
          // Brief pause before typing final text
          phase = 'finishing';
          authorTypingTimeoutRef.current = setTimeout(animate, 150);
        }
      } else if (phase === 'finishing') {
        // Type "de."
        if (finishIndex < FINAL_ADDITION.length) {
          currentText = currentText + FINAL_ADDITION[finishIndex];
          setTypedAuthor(currentText);
          finishIndex++;
          authorTypingTimeoutRef.current = setTimeout(animate, delay);
        } else {
          // Done - hide cursor
          setIsAuthorComplete(true);
        }
      }
    };

    // Start typing author after a short pause
    authorTypingTimeoutRef.current = setTimeout(animate, 300);

    return () => {
      if (authorTypingTimeoutRef.current) {
        clearTimeout(authorTypingTimeoutRef.current);
      }
    };
  }, [isTypingComplete]);

  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      style={styles.container}
    >
      {/* Background layer for stars */}
      <View style={styles.starsContainer}>
        {/* Animated stars (same as main menu) */}
        {stars.map((star) => (
          <Animated.View
            key={`star-${star.id}`}
            style={[
              styles.star,
              starAnimatedStyle,
              {
                left: star.left,
                top: star.top,
                opacity: star.opacity,
              }
            ]}
          />
        ))}
      </View>

      {/* Moon/planet image at top (same as main menu) */}
      <View style={styles.moonContainer} pointerEvents="none">
        <Image
          source={require('@/assets/images/ui-elements/moon-top-screen.webp')}
          style={styles.moonImage}
          resizeMode="contain"
        />
      </View>

      {/* Bear/earth image at bottom (same as main menu) */}
      <View style={styles.bearContainer} pointerEvents="none">
        <Image
          source={require('@/assets/images/ui-elements/bear-bottom-screen.webp')}
          style={styles.bearImage}
          resizeMode="contain"
        />
      </View>

      {/* Freya rocket flying across screen */}
      <View style={styles.rocketContainer}>
        <Animated.View style={[styles.rocketWrapper, rocketAnimatedStyle]}>
          <FreyaRocketRightSvg width={ROCKET_SIZE} height={ROCKET_SIZE} />
        </Animated.View>
      </View>

      {/* Disclaimer text with typewriter effect and cursor */}
      <Animated.View style={[styles.disclaimerContainer, disclaimerAnimatedStyle]}>
        <Text style={styles.disclaimerText}>
          {typedText}
          {!isTypingComplete && (
            <Text style={[styles.cursor, { opacity: showCursor ? 1 : 0 }]}>|</Text>
          )}
        </Text>
        {isTypingComplete && (
          <Text style={[styles.disclaimerText, { marginTop: 12 }]}>
            {typedAuthor}
            {!isAuthorComplete && (
              <Text style={[styles.cursor, { opacity: showCursor ? 1 : 0 }]}>|</Text>
            )}
          </Text>
        )}
      </Animated.View>

      {/* App version at bottom */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>v{DeviceInfoService.getAppVersion()}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  star: {
    position: 'absolute',
    width: STAR_SIZE,
    height: STAR_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: STAR_SIZE / 2,
  },
  moonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '15%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 2,
  },
  moonImage: {
    width: 286,
    height: 286,
    opacity: 0.8,
  },
  bearContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '15%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  bearImage: {
    width: 286,
    height: 286,
    opacity: 0.8,
  },
  rocketContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: ROCKET_SIZE,
    height: ROCKET_SIZE,
    zIndex: 10,
  },
  rocketWrapper: {
    width: ROCKET_SIZE,
    height: ROCKET_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disclaimerContainer: {
    position: 'absolute',
    top: CENTER_Y + ROCKET_SIZE * 1.4 + 20, // Below the scaled rocket
    left: 20,
    right: 20,
    zIndex: 15,
    alignItems: 'center',
  },
  disclaimerText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: Fonts.mono,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 1,
  },
  cursor: {
    color: '#FFFFFF',
    fontWeight: '300',
  },
  versionContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
});
