import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

import { useAppStore } from '@/store/app-store';
import { DeviceInfoService } from '@/services/device-info-service';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTimeOfDay } from '@/hooks/use-time-of-day';
import { NIGHT_VOID } from '@/constants/night-palette';
import { SPLASH_TIMELINE, splashLogoSize } from '@/constants/splash-logo';
import { taglineBottom } from '@/constants/splash-sky';
import { AnimatedLogo } from '@/components/splash/animated-logo';
import { SplashAura } from '@/components/splash/splash-aura';
import { SplashSky } from '@/components/splash/splash-sky';

SplashScreen.preventAutoHideAsync();

interface AppSplashScreenProps {
  /** The page the app opens on has mounted behind the splash; fade off it. */
  leaving: boolean;
  onGone: () => void;
}

export function AppSplashScreen({ leaving, onGone }: AppSplashScreenProps) {
  const { setAppReady } = useAppStore();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const timeOfDay = useTimeOfDay();
  const { scaledFontSize } = useAccessibility();
  const [playing, setPlaying] = useState(false);

  const taglineOpacity = useSharedValue(0);
  const opacity = useSharedValue(1);

  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdEndsAtRef = useRef<number | null>(null);
  const onGoneRef = useRef(onGone);
  onGoneRef.current = onGone;

  const { t } = useTranslation();

  const logoSize = splashLogoSize(width);
  const logoLeft = (width - logoSize) / 2;
  const logoTop = (height - logoSize) / 2;

  useEffect(() => {
    let isMounted = true;

    async function prepare() {
      try {
        await SplashScreen.hideAsync();
        await DeviceInfoService.initialize();
        await Font.loadAsync({});

        if (!isMounted) {
          return;
        }
        setPlaying(true);
        taglineOpacity.value = withDelay(
          SPLASH_TIMELINE.tagline.delayMs,
          withTiming(1, { duration: SPLASH_TIMELINE.tagline.durationMs, easing: Easing.out(Easing.cubic) })
        );

        const startedAt = Date.now();

        await new Promise<void>(resolve => {
          delayTimeoutRef.current = setTimeout(resolve, SPLASH_TIMELINE.exitAtMs - SPLASH_TIMELINE.mountAllowanceMs);
        });

        holdEndsAtRef.current = startedAt + SPLASH_TIMELINE.exitAtMs;
        setAppReady(true);

      } catch {
        await SplashScreen.hideAsync().catch(() => undefined);
        setAppReady(true);
      }
    }

    prepare();

    return () => {
      isMounted = false;
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, []);

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  useEffect(() => {
    if (!leaving) {
      return undefined;
    }

    // Mounting the page behind stalls the first frames after it; counting the
    // fade from then would spend most of it inside the stall.
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const holdLeftMs = holdEndsAtRef.current === null ? 0 : holdEndsAtRef.current - Date.now();
        const waitMs = Math.max(SPLASH_TIMELINE.handoffMs, holdLeftMs);

        opacity.value = withDelay(
          waitMs,
          withTiming(0, { duration: SPLASH_TIMELINE.exitMs, easing: Easing.inOut(Easing.quad) })
        );
        timer = setTimeout(() => onGoneRef.current(), waitMs + SPLASH_TIMELINE.exitMs);
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [leaving, opacity]);

  const splashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View testID="splash-screen" style={[styles.container, splashAnimatedStyle]}>
      <SplashSky width={width} height={height} timeOfDay={timeOfDay} playing={playing} reduceMotion={reduceMotion} />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <SplashAura
          logoLeft={logoLeft}
          logoTop={logoTop}
          logoSize={logoSize}
          playing={playing}
          reduceMotion={reduceMotion}
        />

        <View style={[styles.logoContainer, { left: logoLeft, top: logoTop }]}>
          <AnimatedLogo size={logoSize} playing={playing} reduceMotion={reduceMotion} />
        </View>

        <Animated.View style={[styles.taglineContainer, { bottom: taglineBottom(width, height) }, taglineAnimatedStyle]}>
          <Text style={[styles.taglineText, { fontSize: scaledFontSize(20), lineHeight: scaledFontSize(28) }]}>
            {t('splash.tagline')}
          </Text>
        </Animated.View>

        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { fontSize: scaledFontSize(12) }]}>v{DeviceInfoService.getAppVersion()}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NIGHT_VOID,
  },
  logoContainer: {
    position: 'absolute',
    zIndex: 15,
  },
  taglineContainer: {
    position: 'absolute',
    left: 32,
    right: 32,
    alignItems: 'center',
    zIndex: 20,
  },
  taglineText: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    color: 'rgba(255, 255, 255, 0.75)',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
