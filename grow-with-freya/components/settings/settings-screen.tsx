import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Dimensions, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';

import { ThemedText } from '../themed-text';
import { useAppStore } from '@/store/app-store';
import {
  VISUAL_EFFECTS,
  MoonBottomImage,
  mainMenuStyles,
  generateAccountStarPositions
} from '@/components/main-menu/index';
import { MusicControl } from '@/components/ui/music-control';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const { setOnboardingComplete, setAppReady } = useAppStore();

  // Star animation
  const starRotation = useSharedValue(0);

  // Generate star positions for account page (consistent across re-renders)
  const stars = useMemo(() => generateAccountStarPositions(), []);

  // Star animation style
  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  // Start star rotation animation on mount
  useEffect(() => {
    starRotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Debug logging for settings screen
  React.useEffect(() => {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log('SettingsScreen mounted');
    }

    return () => {
      if (isDev) {
        console.log('SettingsScreen unmounted');
      }
    };
  }, []);

  const handleResetApp = () => {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log('Settings: Reset app button pressed');
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOnboardingComplete(false);
    setAppReady(false);
    // This will trigger the app to restart from splash screen
    setTimeout(() => {
      setAppReady(true);
    }, 100);
  };

  const handleBack = () => {
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log('Settings: Back button pressed');
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  return (
    <LinearGradient
      colors={['#1E3A8A', '#1E3A8A']} // Consistent dark background
      style={styles.container}
    >
      {/* Animated stars background */}
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

      {/* Header with back button and audio button - ABOVE moon image */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: insets.top + 20,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        zIndex: 30,
      }}>
        <Pressable
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            zIndex: 30,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
          onPress={handleBack}
        >
          <ThemedText style={{
            color: 'white',
            fontSize: 16,
            fontWeight: 'bold',
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}>← Back</ThemedText>
        </Pressable>

        <MusicControl
          size={24}
          color="#FFFFFF"
          style={{
            zIndex: 30,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
          }}
        />
      </View>

      {/* Title - ABOVE moon image */}
      <View style={{
        position: 'absolute',
        top: insets.top + 90, // Same as emotions page that works correctly
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        zIndex: 30,
      }}>
        <Text style={{
          color: 'white',
          fontSize: 32,
          fontWeight: 'bold',
          textAlign: 'center',
          textShadowColor: 'rgba(0, 0, 0, 0.8)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
        }}>
          Account
        </Text>
      </View>

      {/* Moon at bottom */}
      <View style={mainMenuStyles.moonBottomContainer} pointerEvents="none">
        <MoonBottomImage />
      </View>

      {/* Main content with upward scroll transition */}
      <View style={[styles.content, { paddingTop: insets.top + 140 }]}>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>App Settings</ThemedText>

            <View style={styles.settingItem}>
              <ThemedText style={styles.settingLabel}>Version</ThemedText>
              <ThemedText style={styles.settingValue}>1.0.0</ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Account</ThemedText>

            <View style={styles.settingItem}>
              <ThemedText style={styles.settingLabel}>Sign In Status</ThemedText>
              <ThemedText style={styles.settingValue}>Not Signed In</ThemedText>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.signInButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // TODO: Navigate to login screen when OAuth is ready
              }}
            >
              <ThemedText style={styles.actionButtonText}>
                Sign In (Coming Soon)
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Developer Options</ThemedText>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.resetButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handleResetApp}
            >
              <ThemedText style={styles.resetButtonText}>
                Reset App (Show Splash & Onboarding)
              </ThemedText>
            </Pressable>
          </View>

          {/* Extra padding for moon-bottom */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  star: {
    position: 'absolute',
    width: VISUAL_EFFECTS.STAR_SIZE,
    height: VISUAL_EFFECTS.STAR_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: VISUAL_EFFECTS.STAR_BORDER_RADIUS,
    opacity: VISUAL_EFFECTS.STAR_BASE_OPACITY,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  settingValue: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  actionButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  signInButton: {
    backgroundColor: 'rgba(78, 205, 196, 0.9)',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
