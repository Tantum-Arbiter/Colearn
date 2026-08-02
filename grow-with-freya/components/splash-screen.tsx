import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Image, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
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

// Night-sky gradient per the Phase 7 design set
const GRADIENT_COLORS: [string, string, string] = ['#050515', '#0A0F2C', '#1a1a3e'];

// Star configuration (matching main menu)
const STAR_COUNT = 15;
const STAR_SIZE = 3;
const STAR_AREA_HEIGHT_RATIO = 0.6;


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

export function AppSplashScreen() {
  const { setAppReady } = useAppStore();

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const starRotation = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { t } = useTranslation();
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

        // Star rotation
        starRotation.value = withRepeat(
          withTiming(360, { duration: 3000, easing: Easing.linear }),
          -1
        );

        // Brief pause to admire the logo and tagline
        await new Promise<void>(resolve => {
          delayTimeoutRef.current = setTimeout(resolve, 1800);
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

        {/* Earlyroots logo - centered */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Image
            source={require('@/assets/images/ui-elements/earlyroots-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Tagline + loading ring per design */}
        <View style={styles.taglineContainer} pointerEvents="none">
          <Text style={styles.taglineText}>{t('splash.tagline')}</Text>
          <ActivityIndicator size="small" color="rgba(255, 255, 255, 0.8)" style={styles.loadingRing} />
        </View>

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
  logoContainer: {
    position: 'absolute',
    top: (height - LOGO_SIZE) / 2,
    left: (width - LOGO_SIZE) / 2,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    zIndex: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  taglineContainer: {
    position: 'absolute',
    bottom: '21%',
    left: 32,
    right: 32,
    alignItems: 'center',
    gap: 18,
    zIndex: 20,
  },
  taglineText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'center',
    lineHeight: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loadingRing: {
    marginTop: 2,
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
