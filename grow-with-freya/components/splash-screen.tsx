import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
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

const { width, height } = Dimensions.get('window');

// Same gradient colors as main menu
const GRADIENT_COLORS = ['#1E3A8A', '#3B82F6', '#4ECDC4'] as const;

// Star configuration (matching main menu)
const STAR_COUNT = 15;
const STAR_SIZE = 3;
const STAR_AREA_HEIGHT_RATIO = 0.6;

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

// Logo size matches login page: 306px on phone, 420px on tablet
const logoSize = width > 768 ? 420 : 306;

export function AppSplashScreen() {
  const { setAppReady, hasCompletedOnboarding, hasCompletedLogin } = useAppStore();

  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
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

        // Animate logo appearing
        logoOpacity.value = withTiming(1, { duration: 1000 });
        logoScale.value = withTiming(1, {
          duration: 1000,
          easing: Easing.out(Easing.back(1.5))
        });

        // Star rotation animation
        starRotation.value = withRepeat(
          withTiming(360, { duration: 3000, easing: Easing.linear }),
          -1
        );

        // Wait for animations to complete
        await new Promise<void>(resolve => {
          delayTimeoutRef.current = setTimeout(resolve, 2500);
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

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  return (
    <LinearGradient
      colors={GRADIENT_COLORS as unknown as string[]}
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

      {/* Centered logo (same size as login page) */}
      <View style={styles.logoContainer}>
        <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>
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
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: logoSize,
    height: logoSize,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
});
