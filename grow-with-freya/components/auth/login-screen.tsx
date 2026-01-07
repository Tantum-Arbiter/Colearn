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
import { LoadingOverlay, type LoadingPhase } from './loading-overlay';
import { MainMenu } from '../main-menu';
import { AuthService } from '@/services/auth-service';
import { SecureStorage } from '@/services/secure-storage';
import { ApiClient } from '@/services/api-client';
import { ProfileSyncService } from '@/services/profile-sync-service';
import { StorySyncService } from '@/services/story-sync-service';
import { AssetSyncService } from '@/services/asset-sync-service';
import { useAppStore } from '@/store/app-store';
import { useAccessibility } from '@/hooks/use-accessibility';

const { width } = Dimensions.get('window');

interface LoginScreenProps {
  onSuccess: () => void;
  onSkip?: () => void;
  onNavigate?: (destination: string) => void;
}

export function LoginScreen({ onSuccess, onSkip, onNavigate }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize } = useAccessibility();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'terms' | 'privacy'>('main');
  const [processedResponseId, setProcessedResponseId] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase | null>(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

  const { setGuestMode } = useAppStore();

  // Google OAuth hook
  const [, response, promptAsync] = Google.useAuthRequest(
    AuthService.getGoogleConfig()
  );

  // Handle Google OAuth response (token exchange happens asynchronously)
  React.useEffect(() => {
    const handleGoogleResponse = async () => {
      // Skip if no response or we've already processed this response
      if (!response) {
        return;
      }

      const responseId = JSON.stringify(response);
      if (processedResponseId === responseId) {
        return;
      }

      if (response.type === 'success' && response.authentication?.idToken) {
        try {
          // Show loading overlay for authentication
          setShowLoadingOverlay(true);
          setLoadingPhase('authenticating');

          const result = await AuthService.completeGoogleSignIn(response.authentication.idToken);

          console.log('[LoginScreen] Storing tokens...');
          await SecureStorage.storeTokens(
            result.tokens.accessToken,
            result.tokens.refreshToken
          );
          await SecureStorage.storeUserData(result.user);
          console.log('[LoginScreen] Login complete, tokens stored');

          // Clear guest mode since user is now authenticated
          setGuestMode(false);

          setIsGoogleLoading(false);
          setProcessedResponseId(responseId);

          // Wait 2 seconds before moving to syncing phase
          // This gives the user time to see the "Signing in..." message
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Move to syncing phase
          setLoadingPhase('syncing');

          // Sync profile and stories
          try {
            const profile = await ApiClient.getProfile();
            await ProfileSyncService.fullSync(profile);
            console.log('[LoginScreen] Profile synced');
          } catch {
            console.log('[LoginScreen] Profile sync deferred');
          }

          try {
            await StorySyncService.prefetchStories();
            console.log('[LoginScreen] Story metadata synced');

            // Prefetch assets in background
            try {
              await AssetSyncService.prefetchAssets();
              console.log('[LoginScreen] Assets prefetched');
            } catch (assetError) {
              console.error('[LoginScreen] Asset prefetch failed:', assetError);
              // Continue anyway - assets will be downloaded on-demand
            }

            // CMS call completed successfully - hide loading overlay to show checkmark
            setShowLoadingOverlay(false);
          } catch (syncError) {
            console.error('[LoginScreen] Story sync failed:', syncError);
            // Show sync error message but allow app to continue in offline mode
            setLoadingPhase('sync-error');
            // User will manually close the error overlay
          }
        } catch (error: any) {
          setIsGoogleLoading(false);
          setProcessedResponseId(responseId);
          console.error('Google sign-in error:', error);

          // Show auth error in overlay - user will manually close
          setLoadingPhase('auth-error');
        }
      } else if (response.type === 'error') {
        setIsGoogleLoading(false);
        setProcessedResponseId(responseId);
        console.error('Google OAuth error:', response.error);
        Alert.alert('Sign-In Failed', 'Unable to sign in with Google. Please try again.', [{ text: 'OK' }]);
      } else if (response.type === 'dismiss') {
        // User cancelled the sign-in
        setIsGoogleLoading(false);
        setProcessedResponseId(responseId);
        console.log('[LoginScreen] Google sign-in cancelled by user');
      }
    };

    handleGoogleResponse();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response, processedResponseId]);

  // Animation values
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(-20);
  const illustrationOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);
  const illustrationScale = useSharedValue(0.8);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(30);
  const mainMenuTranslateX = useSharedValue(width); // Start off-screen to the right
  const loginScreenTranslateX = useSharedValue(0); // Login screen starts at 0

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

    // Slide MainMenu in from the right (starts immediately) - 50% slower = 1400ms
    mainMenuTranslateX.value = withTiming(0, {
      duration: 1400,
      easing: Easing.out(Easing.cubic),
    });

    // Slide login screen out to the left - 50% slower = 1400ms
    loginScreenTranslateX.value = withTiming(-width, {
      duration: 1400,
      easing: Easing.out(Easing.cubic),
    }, (finished) => {
      if (finished) {
        runOnJS(callback)();
      }
    });
  };

  const handleGoogleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsGoogleLoading(true);
    try {
      const result = await promptAsync();
      // promptAsync returns immediately with the result
      // If it's not a success, we should reset the loading state
      if (result?.type !== 'success') {
        setIsGoogleLoading(false);
      }
      // If it's success, the response handler will manage the loading state
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
    // Don't show loading overlay yet - wait for user to confirm in Apple dialog

    try {
      const result = await AuthService.signInWithApple();

      // Only show loading overlay after user has confirmed sign-in
      setShowLoadingOverlay(true);
      setLoadingPhase('authenticating');

      await SecureStorage.storeTokens(
        result.tokens.accessToken,
        result.tokens.refreshToken
      );
      await SecureStorage.storeUserData(result.user);

      // Clear guest mode since user is now authenticated
      setGuestMode(false);

      setIsAppleLoading(false);

      // Move to syncing phase
      setLoadingPhase('syncing');

      try {
        const profile = await ApiClient.getProfile();
        await ProfileSyncService.fullSync(profile);
        console.log('[LoginScreen] Profile synced');
      } catch {
        console.log('[LoginScreen] No profile found, user may need to create one');
      }

      try {
        console.log('[LoginScreen] Prefetching story metadata...');
        await StorySyncService.prefetchStories();
        console.log('[LoginScreen] Story metadata synced');

        // Prefetch assets in background
        try {
          await AssetSyncService.prefetchAssets();
          console.log('[LoginScreen] Assets prefetched');
        } catch (assetError) {
          console.error('[LoginScreen] Asset prefetch failed:', assetError);
          // Continue anyway - assets will be downloaded on-demand
        }

        // CMS call completed successfully - hide loading overlay to show checkmark
        setShowLoadingOverlay(false);
      } catch (syncError) {
        console.error('[LoginScreen] Story sync failed:', syncError);
        // Show sync error message but allow app to continue in offline mode
        setLoadingPhase('sync-error');
        // User will manually close the error overlay
      }
    } catch (error: any) {
      setIsAppleLoading(false);
      console.error('Apple sign-in error:', error);

      // Check for user cancellation - multiple possible error messages
      const isCancelled =
        error.message?.includes('cancelled') ||
        error.message?.includes('user cancelled') ||
        error.code === 'ERR_CANCELED' ||
        error.code === 'ERR_REQUEST_CANCELLED';

      if (isCancelled) {
        console.log('[LoginScreen] Apple sign-in cancelled by user');
        setShowLoadingOverlay(false);
        return;
      }

      // Show auth error in overlay - user will manually close
      setLoadingPhase('auth-error');
    }
  };

  const handleSkip = () => {
    // Set guest mode - no backend calls will be made
    setGuestMode(true);
    console.log('[LoginScreen] Continuing as guest - no backend calls');
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

  // All hooks must be called before any early returns
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

  const mainMenuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: mainMenuTranslateX.value }],
    // Keep opacity at 1 always - no fade in/out, just slide
    opacity: 1,
  }));

  const loginScreenAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: loginScreenTranslateX.value }],
  }));

  // Handle navigation between views (after all hooks)
  if (currentView === 'terms') {
    return <TermsConditionsScreen onBack={() => setCurrentView('main')} />;
  }

  if (currentView === 'privacy') {
    return <PrivacyPolicyScreen onBack={() => setCurrentView('main')} />;
  }

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {/* Login Screen - slides out to the left */}
      <Animated.View style={[styles.loginScreenWrapper, loginScreenAnimatedStyle]}>
        <LinearGradient
          colors={['#E8F5E8', '#F0F8FF', '#E6F3FF']}
          style={styles.gradient}
        >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
            <ThemedText type="title" style={[styles.title, { fontSize: scaledFontSize(28) }]}>
              Welcome to{'\n'}Grow with Freya
            </ThemedText>
            <ThemedText style={[styles.subtitle, { fontSize: scaledFontSize(16) }]}>
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
            style={[
              styles.loginButton,
              styles.googleButton,
            ]}
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading || isAppleLoading}
          >
            <View style={styles.buttonContent}>
              <FontAwesome5 name="google" size={scaledButtonSize(18)} color="#4285F4" style={styles.iconSpacing} />
              <ThemedText style={[styles.buttonText, styles.googleButtonText, { fontSize: scaledFontSize(16) }]}>
                {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
              </ThemedText>
            </View>
          </Pressable>

          {Platform.OS === 'ios' && (
            <Pressable
              style={[
                styles.loginButton,
                styles.appleButton,
              ]}
              onPress={handleAppleLogin}
              disabled={isGoogleLoading || isAppleLoading}
            >
              <View style={styles.buttonContent}>
                <FontAwesome5 name="apple" size={scaledButtonSize(18)} color="#FFFFFF" style={styles.iconSpacing} />
                <ThemedText style={[styles.buttonText, styles.appleButtonText, { fontSize: scaledFontSize(16) }]}>
                  {isAppleLoading ? 'Signing in...' : 'Continue with Apple'}
                </ThemedText>
              </View>
            </Pressable>
          )}

          {/* Skip Button */}
          <Pressable
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <ThemedText style={[styles.skipButtonText, { fontSize: scaledFontSize(14) }]}>
              Continue without signing in
            </ThemedText>
          </Pressable>
        </Animated.View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.footerTextContainer}>
            <ThemedText style={[styles.footerText, { fontSize: scaledFontSize(12) }]}>By continuing, you agree to our </ThemedText>
            <Pressable onPress={handleTermsPress} style={styles.linkPressable}>
              <ThemedText style={[styles.legalLink, { fontSize: scaledFontSize(12) }]}>Terms & Conditions</ThemedText>
            </Pressable>
            <ThemedText style={[styles.footerText, { fontSize: scaledFontSize(12) }]}> and </ThemedText>
            <Pressable onPress={handlePrivacyPress} style={styles.linkPressable}>
              <ThemedText style={[styles.legalLink, { fontSize: scaledFontSize(12) }]}>Privacy Policy</ThemedText>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
      </Animated.View>

      {/* MainMenu slides in from the right - only render during transition to avoid flash */}
      {isTransitioning && (
        <Animated.View style={[styles.mainMenuContainer, mainMenuAnimatedStyle]} pointerEvents="auto">
          <MainMenu onNavigate={onNavigate || (() => {})} isActive={true} />
        </Animated.View>
      )}

      {/* Loading Overlay */}
      <LoadingOverlay
        phase={showLoadingOverlay ? loadingPhase : null}
        onPulseComplete={() => transitionToMainMenu(onSuccess)}
        onClose={() => {
          setShowLoadingOverlay(false);
          setLoadingPhase(null);
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loginScreenWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  mainMenuContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    overflow: 'hidden',
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
    opacity: 0.7,
  },
  buttonDisabled: {
    // Don't change opacity to avoid layout shift
    // The disabled prop on Pressable will prevent interaction
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
