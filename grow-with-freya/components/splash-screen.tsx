import React, { useEffect, useRef, useMemo } from 'react';
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

const { width, height } = Dimensions.get('window');

// Same gradient colors as main menu
const GRADIENT_COLORS: [string, string, string] = ['#1E3A8A', '#3B82F6', '#4ECDC4'];

// Star configuration (matching main menu)
const STAR_COUNT = 15;
const STAR_SIZE = 3;
const STAR_AREA_HEIGHT_RATIO = 0.6;

// Rocket size - small accent, not the main focus
const ROCKET_SIZE = width > 768 ? 80 : 50;

// Logo size - responsive (large, main focus of splash)
const LOGO_SIZE = width > 768 ? 380 : 280;

// Generate deterministic star positions
const generateStars = (count: number) => {
  const stars = [];
  const starAreaHeight = height * STAR_AREA_HEIGHT_RATIO;

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

// Rocket start: off-screen bottom-left
const START_X = -ROCKET_SIZE * 1.5;
const START_Y = height + ROCKET_SIZE / 2;

// Rocket passes through lower-center area (below the logo)
const MID_X = (width - ROCKET_SIZE) / 2;
const MID_Y = height * 0.65;

// Rocket exits: off-screen top-right
const END_X = width + ROCKET_SIZE;
const END_Y = -ROCKET_SIZE * 2;

export function AppSplashScreen() {
  const { setAppReady } = useAppStore();

  const rocketX = useSharedValue(START_X);
  const rocketY = useSharedValue(START_Y);
  const rocketScale = useSharedValue(0.3);
  const rocketRotation = useSharedValue(-30);
  const rocketOpacity = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const starRotation = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stars = useMemo(() => generateStars(STAR_COUNT), []);

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.hideAsync();
        await DeviceInfoService.initialize();
        await Font.loadAsync({});

        // Fade in logo immediately
        logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
        logoScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.1)) });

        // Rocket: fly from bottom-left toward center (phase 1)
        rocketOpacity.value = withTiming(1, { duration: 200 });
        rocketX.value = withTiming(MID_X, {
          duration: 1200,
          easing: Easing.out(Easing.cubic)
        });
        rocketY.value = withTiming(MID_Y, {
          duration: 1200,
          easing: Easing.out(Easing.cubic)
        });
        rocketScale.value = withTiming(1.2, {
          duration: 1200,
          easing: Easing.out(Easing.back(1.2))
        });
        rocketRotation.value = withTiming(-25, {
          duration: 1200,
          easing: Easing.out(Easing.cubic)
        });

        // Star rotation
        starRotation.value = withRepeat(
          withTiming(360, { duration: 3000, easing: Easing.linear }),
          -1
        );

        // Wait for rocket to reach center
        await new Promise<void>(resolve => {
          delayTimeoutRef.current = setTimeout(resolve, 1300);
        });

        // Phase 2: rocket continues off-screen top-right (behind logo via z-index)
        rocketX.value = withTiming(END_X, {
          duration: 800,
          easing: Easing.in(Easing.cubic)
        });
        rocketY.value = withTiming(END_Y, {
          duration: 800,
          easing: Easing.in(Easing.cubic)
        });
        rocketScale.value = withTiming(0.6, {
          duration: 800,
          easing: Easing.in(Easing.cubic)
        });
        rocketRotation.value = withTiming(-40, {
          duration: 800,
          easing: Easing.in(Easing.cubic)
        });

        // Wait for rocket to exit + brief pause to admire logo
        await new Promise<void>(resolve => {
          delayTimeoutRef.current = setTimeout(resolve, 1500);
        });

        // Fade out splash screen
        screenOpacity.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });

        await new Promise<void>(resolve => {
          delayTimeoutRef.current = setTimeout(resolve, 500);
        });

        setAppReady(true);

      } catch (e) {
        await SplashScreen.hideAsync();
        setAppReady(true);
      }
    }

    prepare();

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
      { rotate: `${rocketRotation.value}deg` },
    ],
  }));

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, screenAnimatedStyle]}>
      <LinearGradient
        colors={GRADIENT_COLORS}
        style={styles.gradientContainer}
      >
        {/* Background layer for stars */}
        <View style={styles.starsContainer}>
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

        {/* Moon/planet image at top */}
        <View style={styles.moonContainer} pointerEvents="none">
          <Image
            source={require('@/assets/images/ui-elements/moon-top-screen.webp')}
            style={styles.moonImage}
            resizeMode="contain"
          />
        </View>

        {/* Bear/earth image at bottom */}
        <View style={styles.bearContainer} pointerEvents="none">
          <Image
            source={require('@/assets/images/ui-elements/bear-bottom-screen.webp')}
            style={styles.bearImage}
            resizeMode="contain"
          />
        </View>

        {/* Rocket flying across screen (behind logo via lower zIndex) */}
        <View style={styles.rocketContainer}>
          <Animated.View style={[styles.rocketWrapper, rocketAnimatedStyle]}>
            <FreyaRocketRightSvg width={ROCKET_SIZE} height={ROCKET_SIZE} />
          </Animated.View>
        </View>

        {/* Earlyroots logo - centered, above rocket */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Image
            source={require('@/assets/images/ui-elements/earlyroots-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App version at bottom */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>v{DeviceInfoService.getAppVersion()}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientContainer: {
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
  logoContainer: {
    position: 'absolute',
    top: (height - LOGO_SIZE) / 2,
    left: (width - LOGO_SIZE) / 2,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    zIndex: 15, // Above rocket so it passes "behind" the logo
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
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
