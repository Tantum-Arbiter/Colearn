import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

import { ThemedText } from './themed-text';
import { useAppStore } from '@/store/app-store';

const { width, height } = Dimensions.get('window');

SplashScreen.preventAutoHideAsync();

export function AppSplashScreen() {
  const { setAppReady } = useAppStore();

  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const starRotation = useSharedValue(0);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({});

        logoOpacity.value = withTiming(1, { duration: 1000 });
        logoScale.value = withTiming(1, {
          duration: 1000,
          easing: Easing.out(Easing.back(1.5))
        });

        setTimeout(() => {
          textOpacity.value = withTiming(1, { duration: 800 });
        }, 500);

        starRotation.value = withRepeat(
          withTiming(360, { duration: 3000, easing: Easing.linear }),
          -1
        );

        await new Promise(resolve => setTimeout(resolve, 2500));

        await SplashScreen.hideAsync();
        setAppReady(true);

      } catch (e) {
        console.warn(e);
        await SplashScreen.hideAsync();
        setAppReady(true);
      }
    }

    prepare();
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  return (
    <LinearGradient
      colors={['#4ECDC4', '#44A08D', '#2E8B8B']}
      style={styles.container}
    >
      <View style={styles.starsContainer}>
        {[...Array(20)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              starAnimatedStyle,
              {
                left: Math.random() * width,
                top: Math.random() * height,
                opacity: 0.3 + Math.random() * 0.7,
              }
            ]}
          />
        ))}
      </View>

      <View style={styles.logoContainer}>
        <Animated.View style={[styles.logoCircle, logoAnimatedStyle]}>
          <ThemedText style={styles.logoText}>🌟</ThemedText>
        </Animated.View>
        
        <Animated.View style={textAnimatedStyle}>
          <ThemedText type="title" style={styles.appName}>
            Grow with Freya
          </ThemedText>
          <ThemedText style={styles.tagline}>
            Personalized stories for your little one
          </ThemedText>
        </Animated.View>
      </View>

      <View style={styles.loadingContainer}>
        <ThemedText style={styles.loadingText}>Loading magical stories...</ThemedText>
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
    width: '100%',
    height: '100%',
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: 'white',
    borderRadius: 2,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 100,
  },
  logoCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoText: {
    fontSize: 120,
  },
  appName: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
});
