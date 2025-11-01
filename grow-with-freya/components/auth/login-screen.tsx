import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { MoonBottomImage } from '../main-menu/animated-components';
import { mainMenuStyles } from '../main-menu/styles';

interface LoginScreenProps {
  onLoginComplete: () => void;
}

// Generate star positions for background
const generateStarPositions = () => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const stars = [];
  const starCount = 20;

  for (let i = 0; i < starCount; i++) {
    stars.push({
      id: i,
      left: Math.random() * screenWidth,
      top: Math.random() * (screenHeight * 0.7), // Only in top 70% of screen
      opacity: 0.3 + Math.random() * 0.4, // Random opacity between 0.3-0.7
    });
  }
  return stars;
};

export function LoginScreen({ onLoginComplete }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);

  // Star animation
  const starOpacity = useSharedValue(0.4);
  const stars = React.useMemo(() => generateStarPositions(), []);

  // Animate stars with a gentle pulsing effect
  React.useEffect(() => {
    starOpacity.value = withRepeat(
      withTiming(0.8, { duration: 2000 }),
      -1,
      true
    );
  }, []);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    opacity: starOpacity.value,
  }));

  const handleSkipLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLoginComplete();
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Simulate login process
    setTimeout(() => {
      setIsLoading(false);
      onLoginComplete();
    }, 1500);
  };

  const handleAppleLogin = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Simulate login process
    setTimeout(() => {
      setIsLoading(false);
      onLoginComplete();
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4ECDC4', '#3B82F6', '#1E3A8A']} // Same gradient as main menu
        style={styles.gradient}
      >
        {/* Animated stars background */}
        {stars.map((star) => (
          <Animated.View
            key={`star-${star.id}`}
            style={[
              starAnimatedStyle,
              {
                position: 'absolute',
                width: 3,
                height: 3,
                backgroundColor: '#FFFFFF',
                borderRadius: 1.5,
                opacity: star.opacity,
                left: star.left,
                top: star.top,
                zIndex: 1,
              },
            ]}
          />
        ))}

        {/* Moon bottom background image */}
        <View style={mainMenuStyles.bearContainer} pointerEvents="none">
          <MoonBottomImage />
        </View>

        {/* Content */}
        <View style={[styles.content, { paddingTop: Math.max(insets.top + 60, 100) }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Grow with Freya!</Text>
            <Text style={styles.subtitle}>
              Sign in to save your progress and sync across devices
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Pressable 
              style={[styles.loginButton, styles.googleButton]}
              onPress={handleGoogleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Signing in...' : '🔍 Continue with Google'}
              </Text>
            </Pressable>

            <Pressable 
              style={[styles.loginButton, styles.appleButton]}
              onPress={handleAppleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Signing in...' : '🍎 Continue with Apple'}
              </Text>
            </Pressable>

            <Pressable 
              style={[styles.skipButton]}
              onPress={handleSkipLogin}
              disabled={isLoading}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </Pressable>
          </View>

          <Text style={styles.disclaimer}>
            Your privacy is important to us. We only use your account to save your progress.
          </Text>
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
    paddingHorizontal: 30,
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 40,
  },
  loginButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  googleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  appleButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 20,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  disclaimer: {
    fontSize: 12,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
