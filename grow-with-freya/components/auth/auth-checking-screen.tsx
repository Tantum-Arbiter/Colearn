import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useLoadingCircleAnimation, useTextFadeAnimation } from './loading-animations';
import { StarBackground } from '../ui/star-background';

// Same gradient as splash screen and startup loading screen
const GRADIENT_COLORS = ['#1a1a2e', '#16213e', '#0f3460'] as const;

/**
 * AuthCheckingScreen - Simple full-screen loading shown while checking authentication
 * 
 * Displayed when app resumes from background and needs to verify/refresh tokens.
 * Shows a spinning circle and "Checking session..." text.
 */
export function AuthCheckingScreen() {
  const loadingCircleAnim = useLoadingCircleAnimation();
  const textFadeAnim = useTextFadeAnimation();

  useEffect(() => {
    loadingCircleAnim.startAnimation();
    textFadeAnim.startFadeIn();
    
    return () => {
      loadingCircleAnim.stopAnimation();
    };
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={GRADIENT_COLORS} style={styles.gradient}>
        {/* Star background for visual consistency */}
        <StarBackground starCount={20} deferAnimation={false} />

        <View style={styles.content}>
          {/* Loading Circle */}
          <View style={styles.animationContainer}>
            <Animated.View style={loadingCircleAnim.animatedStyle}>
              <View style={styles.loadingCircle} />
            </Animated.View>
          </View>
          
          {/* Status Text */}
          <Animated.View style={textFadeAnim.animatedStyle}>
            <Text style={styles.statusText}>Checking session...</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  animationContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: 'transparent',
    borderTopColor: '#4FC3F7',
    borderRightColor: '#4FC3F7',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

