import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Alert, Image, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AntDesign, FontAwesome, FontAwesome5 } from '@expo/vector-icons';

import { ThemedText } from '../themed-text';

const { width, height } = Dimensions.get('window');

interface LoginScreenProps {
  onSuccess: () => void;
  onSkip?: () => void;
}

export function LoginScreen({ onSuccess, onSkip }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Animation values
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(-20);
  const illustrationOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);
  const illustrationScale = useSharedValue(0.8);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(30);

  React.useEffect(() => {
    // Staggered entrance animations
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    titleTranslateY.value = withDelay(200, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));

    illustrationOpacity.value = withDelay(400, withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.1)) }));
    illustrationScale.value = withDelay(400, withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.1)) }));

    buttonsOpacity.value = withDelay(800, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    buttonsTranslateY.value = withDelay(800, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, []);

  // Smooth transition to main menu
  const transitionToMainMenu = (callback: () => void) => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Fade out and scale down animation with smooth easing
    containerOpacity.value = withTiming(0, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    }, (finished) => {
      if (finished) {
        runOnJS(callback)();
      }
    });

    containerScale.value = withTiming(0.96, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handleGoogleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsGoogleLoading(true);

    // Simulate login process
    setTimeout(() => {
      setIsGoogleLoading(false);
      Alert.alert(
        'Coming Soon!',
        'Google Sign-In will be available once OAuth credentials are configured.',
        [{ text: 'OK', onPress: () => transitionToMainMenu(onSuccess) }]
      );
    }, 1500);
  };

  const handleAppleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsAppleLoading(true);

    // Simulate login process
    setTimeout(() => {
      setIsAppleLoading(false);
      Alert.alert(
        'Coming Soon!',
        'Apple Sign-In will be available once OAuth credentials are configured.',
        [{ text: 'OK', onPress: () => transitionToMainMenu(onSuccess) }]
      );
    }, 1500);
  };

  const handleSkip = () => {
    const callback = onSkip || onSuccess;
    transitionToMainMenu(callback);
  };

  const handleTermsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Terms & Conditions',
      'Our Terms & Conditions outline the rules and guidelines for using Grow with Freya. This includes age requirements, parental consent, acceptable use, and our commitment to child safety.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const handlePrivacyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Privacy Policy',
      'We are committed to protecting your child\'s privacy. We comply with COPPA and collect only minimal data necessary for the app to function. We do not share children\'s information with third parties.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const illustrationAnimatedStyle = useAnimatedStyle(() => ({
    opacity: illustrationOpacity.value,
    transform: [{ scale: illustrationScale.value }],
  }));

  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <LinearGradient
        colors={['#E8F5E8', '#F0F8FF', '#E6F3FF']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
            <ThemedText type="title" style={styles.title}>
              Welcome to{'\n'}Grow with Freya
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Sign in to save your child's progress and sync across devices
            </ThemedText>
          </Animated.View>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Animated.View style={[styles.logo, illustrationAnimatedStyle]}>
            {/* App Icon Logo */}
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Login Buttons */}
        <Animated.View style={[styles.buttonContainer, buttonsAnimatedStyle]}>
          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              styles.googleButton,
              pressed && styles.buttonPressed,
              (isGoogleLoading || isAppleLoading) && styles.buttonDisabled,
            ]}
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading || isAppleLoading}
          >
            <View style={styles.buttonContent}>
              <FontAwesome5 name="google" size={18} color="#4285F4" style={styles.iconSpacing} />
              <ThemedText style={[styles.buttonText, styles.googleButtonText]}>
                {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
              </ThemedText>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              styles.appleButton,
              pressed && styles.buttonPressed,
              (isGoogleLoading || isAppleLoading) && styles.buttonDisabled,
            ]}
            onPress={handleAppleLogin}
            disabled={isGoogleLoading || isAppleLoading}
          >
            <View style={styles.buttonContent}>
              <FontAwesome5 name="apple" size={18} color="#000000" style={styles.iconSpacing} />
              <ThemedText style={[styles.buttonText, styles.appleButtonText]}>
                {isAppleLoading ? 'Signing in...' : 'Continue with Apple'}
              </ThemedText>
            </View>
          </Pressable>

          {/* Skip Button */}
          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              pressed && styles.skipButtonPressed,
            ]}
            onPress={handleSkip}
          >
            <ThemedText style={styles.skipButtonText}>
              Continue without signing in
            </ThemedText>
          </Pressable>
        </Animated.View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <ThemedText style={styles.footerText}>
            By continuing, you agree to our{' '}
            <ThemedText style={styles.legalLink} onPress={handleTermsPress}>
              Terms & Conditions
            </ThemedText>
            {' '}and{' '}
            <ThemedText style={styles.legalLink} onPress={handlePrivacyPress}>
              Privacy Policy
            </ThemedText>
          </ThemedText>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2E8B8B',
    marginBottom: 12,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#5A5A5A',
    lineHeight: 22,
    maxWidth: width * 0.85,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: width > 768 ? 420 : 306, // 50% bigger than previous: 204 * 1.5 = 306 for iPhone, 280 * 1.5 = 420 for iPad
    height: width > 768 ? 420 : 306,
    marginBottom: width > 768 ? 32 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
    alignItems: 'center',
  },
  loginButton: {
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: width > 768 ? 280 : 260, // Fixed width for consistent sizing
    alignSelf: 'center',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  iconSpacing: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  googleButtonText: {
    color: '#333333',
  },
  appleButtonText: {
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 8,
    maxWidth: 280,
    alignSelf: 'center',
  },
  skipButtonPressed: {
    opacity: 0.7,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#7A7A7A',
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#7A7A7A',
    textAlign: 'center',
    lineHeight: 16,
  },
  legalLink: {
    fontSize: 12,
    color: '#4ECDC4',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});
