import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Alert, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';

import { ThemedText } from '../themed-text';
import { TermsConditionsScreen } from '../account/terms-conditions-screen';
import { PrivacyPolicyScreen } from '../account/privacy-policy-screen';
import { AuthService } from '@/services/auth-service';
import { SecureStorage } from '@/services/secure-storage';
import { ApiClient } from '@/services/api-client';
import { useAppStore } from '@/store/app-store';
import { ProfileSyncService } from '@/services/profile-sync-service';
import { StorySyncService } from '@/services/story-sync-service';

const { width } = Dimensions.get('window');

interface LoginScreenProps {
  onSuccess: () => void;
  onSkip?: () => void;
}

export function LoginScreen({ onSuccess, onSkip }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'terms' | 'privacy'>('main');

  // Google OAuth hook
  const [, response, promptAsync] = Google.useAuthRequest(
    AuthService.getGoogleConfig()
  );

  // Handle Google OAuth response (token exchange happens asynchronously)
  React.useEffect(() => {
    const handleGoogleResponse = async () => {
      if (response?.type === 'success' && response.authentication?.idToken) {
        setIsGoogleLoading(true);
        try {
          const result = await AuthService.completeGoogleSignIn(response.authentication.idToken);

          console.log('🔑 [LoginScreen] Storing tokens...');
          await SecureStorage.storeTokens(
            result.tokens.accessToken,
            result.tokens.refreshToken
          );
          await SecureStorage.storeUserData(result.user);
          console.log('✅ [LoginScreen] Login complete, tokens stored');

          setIsGoogleLoading(false);
          transitionToMainMenu(onSuccess);

          // Sync profile and stories in background after transition starts
          setTimeout(async () => {
            try {
              const profile = await ApiClient.getProfile();
              await ProfileSyncService.fullSync(profile);
              console.log('✅ [LoginScreen] Profile synced');
            } catch (error) {
              console.log('ℹ️ [LoginScreen] Profile sync deferred');
            }

            StorySyncService.prefetchStories()
              .then(() => console.log('✅ [LoginScreen] Story metadata synced'))
              .catch(() => console.log('ℹ️ [LoginScreen] Story sync deferred'));
          }, 500);
        } catch (error: any) {
          setIsGoogleLoading(false);
          console.error('Google sign-in error:', error);

          const isTimeout = error.message?.includes('timed out');
          Alert.alert(
            isTimeout ? 'Connection Timeout' : 'Sign-In Failed',
            isTimeout
              ? 'The server is taking too long to respond. Please check your connection and try again.'
              : 'Unable to sign in with Google. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } else if (response?.type === 'error') {
        setIsGoogleLoading(false);
        console.error('Google OAuth error:', response.error);
        Alert.alert('Sign-In Failed', 'Unable to sign in with Google. Please try again.', [{ text: 'OK' }]);
      }
    };

    handleGoogleResponse();
  }, [response]);

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
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    titleTranslateY.value = withDelay(200, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));

    illustrationOpacity.value = withDelay(400, withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.1)) }));
    illustrationScale.value = withDelay(400, withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.1)) }));

    buttonsOpacity.value = withDelay(800, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    buttonsTranslateY.value = withDelay(800, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [buttonsOpacity, buttonsTranslateY, illustrationOpacity, illustrationScale, titleOpacity, titleTranslateY]);

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
    try {
      await promptAsync();
    } catch (error) {
      setIsGoogleLoading(false);
      console.error('Google OAuth prompt error:', error);
    }
  };

  const handleAppleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS !== 'ios') {
      Alert.alert(
        'Not Available',
        'Apple Sign-In is only available on iOS devices.',
        [{ text: 'OK' }]
      );
      return;
    }

    const isAvailable = await AuthService.isAppleSignInAvailable();
    if (!isAvailable) {
      Alert.alert(
        'Not Available',
        'Apple Sign-In is not available on this device.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsAppleLoading(true);

    try {
      const result = await AuthService.signInWithApple();

      await SecureStorage.storeTokens(
        result.tokens.accessToken,
        result.tokens.refreshToken
      );
      await SecureStorage.storeUserData(result.user);

      try {
        const profile = await ApiClient.getProfile();
        await ProfileSyncService.fullSync(profile);
      } catch (error) {
        console.log('ℹ️ [LoginScreen] No profile found, user may need to create one');
      }

      try {
        console.log('📚 [LoginScreen] Prefetching story metadata...');
        await StorySyncService.prefetchStories();
        console.log('✅ [LoginScreen] Story metadata synced');
      } catch (error) {
        console.error('❌ [LoginScreen] Story sync failed:', error);
      }

      setIsAppleLoading(false);
      transitionToMainMenu(onSuccess);
    } catch (error: any) {
      setIsAppleLoading(false);
      console.error('Apple sign-in error:', error);

      if (error.message?.includes('cancelled')) {
        return;
      }

      const isTimeout = error.message?.includes('timed out');
      Alert.alert(
        isTimeout ? 'Connection Timeout' : 'Sign-In Failed',
        isTimeout
          ? 'Sign-in is taking too long. Please check your connection and try again.'
          : 'Failed to sign in with Apple. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSkip = () => {
    const callback = onSkip || onSuccess;
    transitionToMainMenu(callback);
  };

  const handleTermsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentView('terms');
  };

  const handlePrivacyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentView('privacy');
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

  // Handle navigation between views
  if (currentView === 'terms') {
    return <TermsConditionsScreen onBack={() => setCurrentView('main')} />;
  }

  if (currentView === 'privacy') {
    return <PrivacyPolicyScreen onBack={() => setCurrentView('main')} />;
  }

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
              Sign in to save your child&apos;s progress and sync across devices
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

          {Platform.OS === 'ios' && (
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
                <FontAwesome5 name="apple" size={18} color="#FFFFFF" style={styles.iconSpacing} />
                <ThemedText style={[styles.buttonText, styles.appleButtonText]}>
                  {isAppleLoading ? 'Signing in...' : 'Continue with Apple'}
                </ThemedText>
              </View>
            </Pressable>
          )}

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
          <View style={styles.footerTextContainer}>
            <ThemedText style={styles.footerText}>By continuing, you agree to our </ThemedText>
            <Pressable onPress={handleTermsPress} style={styles.linkPressable}>
              <ThemedText style={styles.legalLink}>Terms & Conditions</ThemedText>
            </Pressable>
            <ThemedText style={styles.footerText}> and </ThemedText>
            <Pressable onPress={handlePrivacyPress} style={styles.linkPressable}>
              <ThemedText style={styles.legalLink}>Privacy Policy</ThemedText>
            </Pressable>
          </View>
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
    width: width > 768 ? 420 : 306,
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
    width: width > 768 ? 280 : 260,
    alignSelf: 'center',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#000000',
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
  },
  iconSpacing: {
    marginRight: 10,
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
  footerTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#7A7A7A',
    lineHeight: 16,
  },
  linkPressable: {
    // No additional styling needed - just wraps the text
  },
  legalLink: {
    fontSize: 12,
    color: '#4ECDC4',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});
