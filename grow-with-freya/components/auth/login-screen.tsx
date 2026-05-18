import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Alert, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
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
import { MainMenu } from '../main-menu';
import { AuthService } from '@/services/auth-service';
import { SecureStorage } from '@/services/secure-storage';
import { useAppStore } from '@/store/app-store';
import { useAccessibility } from '@/hooks/use-accessibility';
import { Logger } from '@/utils/logger';

const log = Logger.create('Login');

// Debug logging - set to false for production performance
const DEBUG_LOGS = false;

// NOTE: Profile/Story/Asset sync is now handled by BatchSyncService in StartupLoadingScreen
// LoginScreen only handles authentication and token storage

const { width, height } = Dimensions.get('window');

// Star configuration
const STAR_COUNT = 15;
const STAR_SIZE = 3;

const generateStars = (count: number) => {
  const stars = [];
  const starAreaHeight = height * 0.6;
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      left: seededRandom(i * 1.3) * (width - 20) + 10,
      top: seededRandom(i * 2.7) * starAreaHeight + 20,
      opacity: 0.3 + seededRandom(i * 3.5) * 0.4,
    });
  }
  return stars;
};

interface LoginScreenProps {
  onSuccess: () => void;
  onSkip?: () => void;
  onNavigate?: (destination: string) => void;
}

export function LoginScreen({ onSuccess, onSkip, onNavigate }: LoginScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize } = useAccessibility();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showReturningMenu, setShowReturningMenu] = useState(false);
  const [showGuestInfo, setShowGuestInfo] = useState(false);
  const [showGuestMenu, setShowGuestMenu] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'terms' | 'privacy'>('main');
  const [processedResponseId, setProcessedResponseId] = useState<string | null>(null);

  const { setGuestMode, getEffectiveTier } = useAppStore();
  const stars = useMemo(() => generateStars(STAR_COUNT), []);

  // Configure native Google Sign-In for Android on mount
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      AuthService.configureNativeGoogleSignIn();
    }
  }, []);

  // Google OAuth hook (used for iOS only, but hook must be called unconditionally)
  const [, response, promptAsync] = Google.useAuthRequest(
    AuthService.getGoogleConfig()
  );

  // Handle Google OAuth response (token exchange happens asynchronously) - iOS only
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
          const result = await AuthService.completeGoogleSignIn(response.authentication.idToken);

          DEBUG_LOGS && console.log('[LoginScreen] Storing tokens...');
          await SecureStorage.storeTokens(
            result.tokens.accessToken,
            result.tokens.refreshToken
          );
          await SecureStorage.storeUserData(result.user);
          DEBUG_LOGS && console.log('[LoginScreen] Login complete, tokens stored');

          // Clear guest mode since user is now authenticated
          setGuestMode(false);

          // Keep isGoogleLoading=true so button stays as "Signing in..." while
          // the loading overlay slides down over the login screen
          setProcessedResponseId(responseId);

          // Authentication complete - go directly to StartupLoadingScreen
          // BatchSyncService will handle all sync operations there
          log.info('Google sign-in complete');
          onSuccess();
        } catch (error: any) {
          setIsGoogleLoading(false);
          setProcessedResponseId(responseId);
          log.error('Google sign-in error:', error);

          // Check for timeout error
          const isTimeout = error.message?.includes('timed out') ||
                           error.message?.includes('timeout') ||
                           error.name === 'AbortError';

          // Show error alert
          const errorTitle = isTimeout ? t('login.connectionTimeout') : t('login.signInFailed');
          const errorMessage = isTimeout ? t('login.connectionTimeoutMessage') : t('login.signInFailedMessage');
          Alert.alert(errorTitle, errorMessage, [{ text: t('login.ok') }]);
        }
      } else if (response.type === 'error') {
        setIsGoogleLoading(false);
        setProcessedResponseId(responseId);
        log.error('Google OAuth error:', response.error);
        Alert.alert(t('login.signInFailed'), t('login.signInFailedMessage'), [{ text: t('login.ok') }]);
      } else if (response.type === 'dismiss') {
        // User cancelled the sign-in
        setIsGoogleLoading(false);
        setProcessedResponseId(responseId);
        DEBUG_LOGS && console.log('[LoginScreen] Google sign-in cancelled by user');
      }
    };

    handleGoogleResponse();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response, processedResponseId]);

  // Animation values
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(-20);
  const illustrationOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(0); // Start at 0 for fade-in from splash
  const containerScale = useSharedValue(1);
  const illustrationScale = useSharedValue(0.8);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(30);

  const guestInfoSlideY = useSharedValue(-height); // Start above screen

  React.useEffect(() => {
    // Fade in the entire container first (smooth transition from splash)
    containerOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });

    titleOpacity.value = withDelay(200, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    titleTranslateY.value = withDelay(200, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));

    illustrationOpacity.value = withDelay(400, withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.1)) }));
    illustrationScale.value = withDelay(400, withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.1)) }));

    buttonsOpacity.value = withDelay(800, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    buttonsTranslateY.value = withDelay(800, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [buttonsOpacity, buttonsTranslateY, containerOpacity, illustrationOpacity, illustrationScale, titleOpacity, titleTranslateY]);


  const handleGoogleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsGoogleLoading(true);

    // On Android, use native Google Sign-In if available
    if (Platform.OS === 'android' && AuthService.isNativeGoogleSignInAvailable()) {
      try {
        const result = await AuthService.signInWithGoogleNative();

        DEBUG_LOGS && console.log('[LoginScreen] Storing tokens...');
        await SecureStorage.storeTokens(
          result.tokens.accessToken,
          result.tokens.refreshToken
        );
        await SecureStorage.storeUserData(result.user);
        DEBUG_LOGS && console.log('[LoginScreen] Login complete, tokens stored');

        // Clear guest mode since user is now authenticated
        setGuestMode(false);

        // Keep isGoogleLoading=true so button stays as "Signing in..." while
        // the loading overlay slides down over the login screen

        // Authentication complete - go directly to StartupLoadingScreen
        log.info('Native Google sign-in complete');
        onSuccess();
        return;
      } catch (error: any) {
        setIsGoogleLoading(false);
        if (!error.message?.includes('cancelled')) {
          log.error('Native Google Sign-In error:', error);
          Alert.alert(t('login.signInFailed'), error.message || t('login.signInFailedMessage'));
        }
        return;
      }
    }

    // On iOS, use expo-auth-session flow
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
      log.error('Google OAuth prompt error:', error);
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

      // Clear guest mode since user is now authenticated
      setGuestMode(false);

      // Keep isAppleLoading=true so button stays as "Signing in..." while
      // the loading overlay slides down over the login screen
      log.info('Apple sign-in complete');

      // Authentication complete - go directly to StartupLoadingScreen
      onSuccess();
    } catch (error: any) {
      setIsAppleLoading(false);
      log.error('Apple sign-in error:', error);

      // Check for user cancellation - multiple possible error messages
      const isCancelled =
        error.message?.includes('cancelled') ||
        error.message?.includes('user cancelled') ||
        error.code === 'ERR_CANCELED' ||
        error.code === 'ERR_REQUEST_CANCELLED';

      if (isCancelled) {
        DEBUG_LOGS && console.log('[LoginScreen] Apple sign-in cancelled by user');
        return;
      }

      // Check for timeout error
      const isTimeout = error.message?.includes('timed out') ||
                       error.message?.includes('timeout') ||
                       error.name === 'AbortError';

      // Show error alert
      const errorTitle = isTimeout ? t('login.connectionTimeout') : t('login.signInFailed');
      const errorMessage = isTimeout ? t('login.connectionTimeoutMessage') : t('login.signInFailedMessage');
      Alert.alert(errorTitle, errorMessage, [{ text: t('login.ok') }]);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Returning user with a paid subscription (internet down / session expired):
    // skip the "what you're missing" overlay -fade out login UI, slide in main menu.
    // Free-tier users (never purchased) still see the info overlay.
    const tier = getEffectiveTier();
    if (tier !== 'free') {
      DEBUG_LOGS && console.log('[LoginScreen] Returning subscriber -skipping guest info');
      setGuestMode(true);

      // Fade out login UI elements (title, buttons, logo)
      titleOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
      buttonsOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
      illustrationOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
      // Fade out the login background (gradient, stars, moon, bear)
      containerOpacity.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });

      // Mount MainMenu behind the fading login -carousel buttons animate in naturally
      setShowReturningMenu(true);

      // After the carousel buttons have animated in (~2s), call onSkip to finish
      setTimeout(() => {
        const callback = onSkip || onSuccess;
        callback();
      }, 2000);
      return;
    }

    // First-time / free user -show guest info overlay
    setShowGuestInfo(true);
    // Slide the guest info overlay down into view
    guestInfoSlideY.value = withTiming(0, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handleGuestContinue = () => {
    // Set guest mode - no backend calls will be made
    setGuestMode(true);
    DEBUG_LOGS && console.log('[LoginScreen] Continuing as guest - no backend calls');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mount the MainMenu underneath the guest info overlay
    setShowGuestMenu(true);

    // Slide the guest info overlay up out of view to reveal the menu
    setTimeout(() => {
      guestInfoSlideY.value = withTiming(-height, {
        duration: 1200,
        easing: Easing.in(Easing.cubic),
      }, (finished) => {
        if (finished) {
          const callback = onSkip || onSuccess;
          runOnJS(callback)();
        }
      });
    }, 300);
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

  const guestInfoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: guestInfoSlideY.value }],
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
      <View style={styles.loginScreenWrapper}>
        <LinearGradient
          colors={['#1E3A8A', '#3B82F6', '#4ECDC4']}
          style={styles.gradient}
        >
        {/* Stars */}
        <View style={styles.starsContainer} pointerEvents="none">
          {stars.map((star) => (
            <View
              key={`star-${star.id}`}
              style={[
                styles.star,
                { left: star.left, top: star.top, opacity: star.opacity },
              ]}
            />
          ))}
        </View>

        {/* Moon */}
        <View style={styles.moonContainer} pointerEvents="none">
          <Image
            source={require('@/assets/images/ui-elements/moon-top-screen.webp')}
            style={styles.moonImage}
            resizeMode="contain"
          />
        </View>

        {/* Bear */}
        <View style={styles.bearContainer} pointerEvents="none">
          <Image
            source={require('@/assets/images/ui-elements/bear-bottom-screen.webp')}
            style={styles.bearImage}
            resizeMode="contain"
          />
        </View>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 80 }]}>
          <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
            <ThemedText type="title" style={[styles.title, { fontSize: scaledFontSize(28) }]}>
              {t('login.welcomeTitle')}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { fontSize: scaledFontSize(16) }]}>
              {t('login.subtitle')}
            </ThemedText>
          </Animated.View>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Animated.View style={[styles.logo, illustrationAnimatedStyle]}>
            <Image
              source={require('@/assets/images/ui-elements/earlyroots-logo.png')}
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
                {isGoogleLoading ? t('login.signingIn') : t('login.continueWithGoogle')}
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
                  {isAppleLoading ? t('login.signingIn') : t('login.continueWithApple')}
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
              {t('login.continueWithoutSignIn')}
            </ThemedText>
          </Pressable>
        </Animated.View>

        {/* Bottom spacer */}
        <View style={{ paddingBottom: insets.bottom + 20 }} />
      </LinearGradient>
      </View>

      {/* Guest Info Overlay - slides down from top */}
      {showGuestInfo && (
        <Animated.View style={[styles.guestInfoOverlay, guestInfoAnimatedStyle]}>
          <LinearGradient
            colors={['#1a1a3e', '#0d0d2b', '#050515']}
            style={styles.gradient}
          >
            {/* Background art */}
            <Image
              source={require('@/assets/images/ui-elements/story-art-strip-subscribe.webp')}
              style={styles.guestInfoBgImage}
              resizeMode="cover"
            />
            <View style={styles.guestInfoBgOverlay} />

            <View style={[styles.guestInfoContent, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16 }]}>
              {/* Logo */}
              <Image
                source={require('@/assets/images/ui-elements/earlyroots-logo.png')}
                style={styles.guestInfoLogo}
                resizeMode="contain"
              />

              {/* Title */}
              <ThemedText style={styles.guestInfoTitle} numberOfLines={1} adjustsFontSizeToFit>
                {t('guestInfo.title')}
              </ThemedText>

              {/* Description */}
              <ThemedText style={styles.guestInfoDescription} numberOfLines={2} adjustsFontSizeToFit>
                {t('guestInfo.description')}
              </ThemedText>

              {/* What you miss */}
              <View style={styles.guestInfoSection}>
                <ThemedText style={styles.guestInfoSectionTitle} numberOfLines={1} adjustsFontSizeToFit>
                  {t('guestInfo.missingOutTitle')}
                </ThemedText>

                {['syncProgress', 'multiDevice', 'cloudBackup', 'personalised'].map((key) => (
                  <View key={key} style={styles.guestInfoItem}>
                    <ThemedText style={styles.guestInfoBullet}>✦</ThemedText>
                    <ThemedText style={styles.guestInfoItemText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {t(`guestInfo.missing.${key}`)}
                    </ThemedText>
                  </View>
                ))}
              </View>

              {/* Subscription info */}
              <View style={styles.guestInfoSection}>
                <ThemedText style={styles.guestInfoSectionTitle} numberOfLines={1} adjustsFontSizeToFit>
                  {t('guestInfo.subscriptionTitle')}
                </ThemedText>
                <ThemedText style={styles.guestInfoSubscriptionText} numberOfLines={4} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {t('guestInfo.subscriptionDescription')}
                </ThemedText>
              </View>

              {/* Continue Button */}
              <Pressable
                style={styles.guestInfoContinueButton}
                onPress={handleGuestContinue}
              >
                <ThemedText style={styles.guestInfoContinueText}>
                  {t('guestInfo.continueButton')}
                </ThemedText>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* MainMenu for guest flow -mounted behind the guest info overlay, revealed by slide-up */}
      {showGuestMenu && (
        <View style={styles.guestMenuContainer}>
          <MainMenu onNavigate={onNavigate || (() => {})} isActive={true} disableTutorial={true} entranceDelay={1500} />
        </View>
      )}

      {/* Returning subscriber: MainMenu mounted behind fading login, carousel buttons animate in */}
      {showReturningMenu && (
        <View style={styles.returningMenuContainer}>
          <MainMenu onNavigate={onNavigate || (() => {})} isActive={true} disableTutorial={true} entranceDelay={400} />
        </View>
      )}


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
  returningMenuContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  guestMenuContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  gradient: {
    flex: 1,
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
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    zIndex: 5,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
    maxWidth: width * 0.85,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 5,
  },
  logo: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: width > 768 ? 520 : 420,
    height: width > 768 ? 520 : 420,
    marginBottom: width > 768 ? 32 : 24,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
    alignItems: 'center',
    zIndex: 5,
  },
  loginButton: {
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 8,
    maxWidth: 280,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
  },
  skipButtonPressed: {
    opacity: 0.7,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 5,
  },
  footerTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 16,
    fontWeight: '600',
  },
  linkPressable: {
    // No additional styling needed - just wraps the text
  },
  legalLink: {
    fontSize: 12,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  // Guest Info Overlay
  guestInfoOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 500,
  },
  guestInfoBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    opacity: 0.35,
  },
  guestInfoBgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 20, 0.45)',
  },
  guestInfoContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    justifyContent: 'flex-start',
    gap: 12,
  },
  guestInfoLogo: {
    width: width > 768 ? 320 : 220,
    height: width > 768 ? 320 : 220,
    marginBottom: -4,
  },
  guestInfoTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  guestInfoDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: width * 0.85,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  guestInfoSection: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  guestInfoSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFD700',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  guestInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingRight: 8,
  },
  guestInfoBullet: {
    color: '#FFD700',
    fontSize: 14,
    marginRight: 10,
    lineHeight: 20,
  },
  guestInfoItemText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  guestInfoSubscriptionText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  guestInfoContinueButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
    maxWidth: 300,
  },
  guestInfoContinueText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
