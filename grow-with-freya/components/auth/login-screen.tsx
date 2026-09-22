import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
  Image,
  Platform,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';

import { ThemedText } from '../themed-text';
import { TermsConditionsScreen } from '../account/terms-conditions-screen';
import { PrivacyPolicyScreen } from '../account/privacy-policy-screen';
import { GoogleGlyph } from './google-glyph';
import { AuthSky } from './auth-sky';
import { AuthPillButton } from './auth-pill-button';
import { LoginHero } from './login-hero';
import { GuestInfoScreen } from './guest-info-screen';
import { AuthService } from '@/services/auth-service';
import { SecureStorage } from '@/services/secure-storage';
import { useAppStore } from '@/store/app-store';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Logger } from '@/utils/logger';
import { Fonts } from '@/constants/theme';
import { GOLD, TEXT_MUTED } from '../onboarding/onboarding-theme';
import {
  IS_TABLET,
  CARD_PADDING,
  CARD_V_PADDING,
  CARD_RADIUS,
  CONTENT_WIDTH,
  useAuthLayout,
  CREAM,
  PANEL_BG,
  PANEL_BORDER,
  generateStars,
} from './auth-theme';

// The greeting is the one place a parent-supplied name is set in display type,
// so it needs a hard guarantee that the name never wraps.
const TITLE_MAX_SIZE = 40;
const TITLE_MIN_SIZE = 22;
const TITLE_MAX_LINES = 2;
const TITLE_LINE_HEIGHT_RATIO = 1.2;
// somewhere for the off-screen copy to lay out without hitting a width limit
const TITLE_MEASURE_WIDTH = 10000;

/** The word that has to survive intact -- the name, in every language whether it
 *  leads or trails the greeting. Exported so the selection itself is testable:
 *  the rendered greeting alone cannot prove the longest token was picked. */
export function longestWord(text: string) {
  return text.split(/\s+/).reduce((longest, word) => (word.length > longest.length ? word : longest), '');
}

const log = Logger.create('Login');

// Debug logging - set to false for production performance
const DEBUG_LOGS = false;

// NOTE: Profile/Story/Asset sync is now handled by BatchSyncService in StartupLoadingScreen
// LoginScreen only handles authentication and token storage

const { height } = Dimensions.get('window');

// the hero art is 900x596; it's sized to the content width but capped by a
// height budget so that on short phones it yields space rather than pushing the
// buttons and the privacy panel past the fold
const HERO_ASPECT = 596 / 900;
const HERO_HEIGHT_BUDGET = height < 700 ? 148 : height < 812 ? 186 : IS_TABLET ? 300 : 216;
const HERO_WIDTH = Math.min(
  CONTENT_WIDTH,
  IS_TABLET ? 460 : 320,
  Math.round(HERO_HEIGHT_BUDGET / HERO_ASPECT)
);
const HERO_HEIGHT = Math.round(HERO_WIDTH * HERO_ASPECT);

// the onboarding entrance rhythm:every block fades down in over 450ms, 120ms apart
const CASCADE_STEP_MS = 120;
const CASCADE_DURATION_MS = 450;
const cascade = (step: number) => FadeInDown.delay(CASCADE_STEP_MS * step).duration(CASCADE_DURATION_MS);
// the art fades out into cloud and mist at its base, so the first button can sit
// over that edge without hiding anything. Reserving less height than the image
// draws lifts everything below it and frees space for the rest of the card.
const HERO_OVERLAP = Math.round(HERO_HEIGHT * 0.16);

interface LoginScreenProps {
  onSuccess: () => void;
  onSkip?: () => void;
  onRevealStart?: () => void;
}

export function LoginScreen({ onSuccess, onSkip, onRevealStart }: LoginScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize } = useAccessibility();
  const { cardWidth, cardMaxHeight } = useAuthLayout();
  const reduceMotion = useReducedMotion();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showGuestInfo, setShowGuestInfo] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'terms' | 'privacy'>('main');
  const [processedResponseId, setProcessedResponseId] = useState<string | null>(null);

  const { setGuestMode, getEffectiveTier, userNickname } = useAppStore();
  // Onboarding always asks for a nickname now, but installs that predate that
  // -- and any cleared profile -- fall back to the plain greeting
  const greetingName = userNickname?.trim() || null;
  const greeting = greetingName
    ? t('login.welcomeTitleNamed', { name: greetingName })
    : t('login.welcomeTitle');

  // The greeting must never split the child's name across lines, on any screen
  // width or in any language. adjustsFontSizeToFit measures unreliably here, and
  // onTextLayout reports only once -- it does not fire again after a size change
  // -- so shrinking by trial and error stalls after a single step. Instead the
  // name is measured once off-screen at full size and the type is scaled to the
  // width actually available, in one pass.
  const titleWord = useMemo(() => longestWord(greeting), [greeting]);
  const [titleSlotWidth, setTitleSlotWidth] = useState(0);
  const [titleWordWidth, setTitleWordWidth] = useState(0);

  const handleTitleSlotLayout = useCallback((event: LayoutChangeEvent) => {
    setTitleSlotWidth(event.nativeEvent.layout.width);
  }, []);

  const handleTitleWordLayout = useCallback((event: LayoutChangeEvent) => {
    setTitleWordWidth(event.nativeEvent.layout.width);
  }, []);

  const titleSize = useMemo(() => {
    if (!titleSlotWidth || !titleWordWidth || titleWordWidth <= titleSlotWidth) {
      return TITLE_MAX_SIZE;
    }
    const fitted = Math.floor((TITLE_MAX_SIZE * titleSlotWidth) / titleWordWidth);
    return Math.max(TITLE_MIN_SIZE, Math.min(TITLE_MAX_SIZE, fitted));
  }, [titleSlotWidth, titleWordWidth]);
  const stars = useMemo(() => generateStars(), []);

  // Configure native Google Sign-In for Android on mount
  React.useEffect(() => {
    if (Platform.OS === 'android' && AuthService.isGoogleAuthConfigured()) {
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

  // Animation values. The entrance itself is the FadeInDown cascade; these
  // shared values exist for the fade-out paths. cardOpacity dims only the card,
  // leaving the sky (stars, clouds, mist) in place while overlays come and go.
  const cardOpacity = useSharedValue(1);
  const containerOpacity = useSharedValue(0); // Start at 0 for fade-in from splash
  const skyOpacity = useSharedValue(1);

  const guestInfoSlideY = useSharedValue(-height); // Start above screen

  React.useEffect(() => {
    // Fade in the entire container (smooth transition from splash/onboarding);
    // the content cascade plays inside this fade
    containerOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [containerOpacity]);


  const handleGoogleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!AuthService.isGoogleAuthConfigured()) {
      log.error('Google Sign-In unavailable: client id not configured for this build');
      Alert.alert(t('login.signInFailed'), t('login.signInFailedMessage'));
      return;
    }
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
      onRevealStart?.();

      cardOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
      containerOpacity.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(finishHandoff)();
        }
      });
      return;
    }

    // First-time / free user -show guest info overlay. The overlay carries no
    // sky of its own: the login card fades away and the guest card slides in
    // over the same stars and clouds.
    cardOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    setShowGuestInfo(true);
    guestInfoSlideY.value = withTiming(0, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handleGuestBack = () => {
    // Slide the overlay card back up and fade the login card in beneath it --
    // the sky never moves
    cardOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    guestInfoSlideY.value = withTiming(-height, {
      duration: 450,
      easing: Easing.in(Easing.cubic),
    }, (finished) => {
      if (finished) {
        runOnJS(setShowGuestInfo)(false);
      }
    });
  };

  const finishHandoff = () => {
    const callback = onSkip || onSuccess;
    callback();
  };

  const handleGuestContinue = () => {
    // Set guest mode - no backend calls will be made
    setGuestMode(true);
    DEBUG_LOGS && console.log('[LoginScreen] Continuing as guest - no backend calls');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    skyOpacity.value = 0;
    onRevealStart?.();
    setTimeout(() => {
      guestInfoSlideY.value = withTiming(-height, {
        duration: 1200,
        easing: Easing.in(Easing.cubic),
      }, (finished) => {
        if (finished) {
          runOnJS(finishHandoff)();
        }
      });
    }, 300);
  };



  // All hooks must be called before any early returns
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const skyAnimatedStyle = useAnimatedStyle(() => ({
    opacity: skyOpacity.value,
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
      <Animated.View style={[styles.loginScreenWrapper, skyAnimatedStyle]} testID="login-sky-and-card">
        <AuthSky stars={stars}>
        {/* Storybook panel -- fades as one while the sky behind stays put */}
        <Animated.View
          style={[
            styles.card,
            cardAnimatedStyle,
            {
              width: cardWidth,
              maxHeight: cardMaxHeight,
              marginTop: insets.top + 8,
              marginBottom: insets.bottom + 8,
            },
          ]}
        >
          <Animated.View
            testID="login-title-slot"
            entering={cascade(0)}
            style={styles.titleContainer}
            onLayout={handleTitleSlotLayout}
          >
            {/* off-screen copy of the name at full size: its laid-out width is
                what the visible type is scaled against */}
            <View pointerEvents="none" style={styles.titleMeasure}>
              <ThemedText
                testID="login-title-measure"
                type="title"
                style={[
                  styles.title,
                  {
                    fontSize: scaledFontSize(TITLE_MAX_SIZE),
                    lineHeight: scaledFontSize(TITLE_MAX_SIZE) * TITLE_LINE_HEIGHT_RATIO,
                  },
                ]}
                numberOfLines={1}
                onLayout={handleTitleWordLayout}
              >
                {titleWord}
              </ThemedText>
            </View>

            <ThemedText
              testID="login-title"
              type="title"
              style={[
                styles.title,
                {
                  fontSize: scaledFontSize(titleSize),
                  lineHeight: scaledFontSize(titleSize) * TITLE_LINE_HEIGHT_RATIO,
                },
              ]}
              numberOfLines={TITLE_MAX_LINES}
            >
              {greeting}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { fontSize: scaledFontSize(17) }]}>
              {t('login.subtitle')}
            </ThemedText>
          </Animated.View>

          {/* Hero illustration */}
          <Animated.View entering={cascade(1)} style={styles.heroContainer}>
            <LoginHero width={HERO_WIDTH} height={HERO_HEIGHT} animated={!reduceMotion} />
          </Animated.View>

          {/* Sign-in options */}
          <Animated.View entering={cascade(2)} style={styles.buttonContainer}>
            {Platform.OS === 'ios' && (
              <AuthPillButton
                label={isAppleLoading ? t('login.signingIn') : t('login.continueWithApple')}
                variant="light"
                onPress={handleAppleLogin}
                disabled={isGoogleLoading || isAppleLoading}
                testID="login-apple"
                icon={<FontAwesome5 name="apple" size={scaledButtonSize(24)} color="#0B0B0B" />}
              />
            )}

            <AuthPillButton
              label={isGoogleLoading ? t('login.signingIn') : t('login.continueWithGoogle')}
              variant="light"
              onPress={handleGoogleLogin}
              disabled={isGoogleLoading || isAppleLoading}
              testID="login-google"
              icon={<GoogleGlyph size={scaledButtonSize(24)} />}
            />

            <AuthPillButton
              label={t('login.continueAsGuest')}
              variant="guest"
              onPress={handleSkip}
              testID="login-guest"
              icon={
                <Image
                  testID="login-guest-avatar"
                  source={require('@/assets/images/login/guest-avatar.webp')}
                  style={styles.guestIcon}
                  resizeMode="contain"
                />
              }
            />
          </Animated.View>

          {/* What guest mode gives you */}
          <Animated.View entering={cascade(3)} style={styles.guestNoteRow} testID="login-guest-note">
            <Image
              testID="login-cloud-badge"
              source={require('@/assets/images/login/cloud-badge.webp')}
              style={styles.badgeSmall}
              resizeMode="contain"
            />
            <ThemedText style={[styles.guestNote, { fontSize: scaledFontSize(14) }]}>
              {t('login.guestNote')}
            </ThemedText>
          </Animated.View>

          {/* Privacy promise */}
          <Animated.View entering={cascade(4)} style={styles.privacyPanel} testID="login-privacy-panel">
            <Image
              testID="login-shield-badge"
              source={require('@/assets/images/login/shield-badge.webp')}
              style={styles.badgeLarge}
              resizeMode="contain"
            />
            <View style={styles.privacyPanelText}>
              <ThemedText style={[styles.privacyTitle, { fontSize: scaledFontSize(17) }]}>
                {t('login.safePrivateTitle')}
              </ThemedText>
              {(['noAdverts', 'noTracking'] as const).map((key) => (
                <View key={key} style={styles.privacyItem} testID={`login-promise-${key}`}>
                  <Ionicons name="checkmark-circle-outline" size={scaledFontSize(17)} color={GOLD} />
                  <ThemedText style={[styles.privacyItemText, { fontSize: scaledFontSize(15) }]}>
                    {t(`login.${key}`)}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Legal footer */}
          <Animated.View entering={cascade(5)} style={styles.footer} testID="login-legal-footer">
            <ThemedText style={[styles.footerText, { fontSize: scaledFontSize(12) }]}>
              {t('login.footerPrefix')}{' '}
              <ThemedText
                style={[styles.legalLink, { fontSize: scaledFontSize(12) }]}
                onPress={() => setCurrentView('terms')}
              >
                {t('login.termsAndConditions')}
              </ThemedText>
              {t('login.and')}{' '}
              <ThemedText
                style={[styles.legalLink, { fontSize: scaledFontSize(12) }]}
                onPress={() => setCurrentView('privacy')}
              >
                {t('login.privacyPolicy')}
              </ThemedText>
              .
            </ThemedText>
          </Animated.View>
        </Animated.View>
      </AuthSky>
      </Animated.View>

      {/* Guest Info Overlay - slides down from top */}
      {showGuestInfo && (
        <Animated.View
          style={[styles.guestInfoOverlay, guestInfoAnimatedStyle]}
          testID="guest-info-overlay"
        >
          <GuestInfoScreen onContinue={handleGuestContinue} onBack={handleGuestBack} />
        </Animated.View>
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
  card: {
    flex: 1,
    // the width comes from useAuthLayout, capped so the sign-in stack is not
    // simply as wide as the tablet; centring is what keeps it a panel
    alignSelf: 'center',
    maxWidth: '100%',
    paddingHorizontal: CARD_PADDING,
    paddingVertical: CARD_V_PADDING,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: 'rgba(10, 15, 44, 0.35)',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  titleContainer: {
    alignItems: 'center',
  },
  titleMeasure: {
    position: 'absolute',
    opacity: 0,
    top: 0,
    left: 0,
    width: TITLE_MEASURE_WIDTH,
  },
  title: {
    fontFamily: Fonts.serif,
    fontWeight: '700',
    textAlign: 'center',
    color: CREAM,
    textShadowColor: 'rgba(232, 184, 75, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  subtitle: {
    fontFamily: Fonts.rounded,
    textAlign: 'center',
    color: TEXT_MUTED,
    lineHeight: 24,
    marginTop: 4,
    maxWidth: CONTENT_WIDTH,
  },
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -HERO_OVERLAP,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
    zIndex: 5,
  },
  guestIcon: {
    width: 26,
    height: 26,
  },
  // icon and note read as one centred unit, like everything else on the card
  guestNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  // sized close to the two-line note (40pt) so the pair reads level
  badgeSmall: {
    width: 46,
    height: 46,
  },
  // the two promise lines and their heading set the panel's height, so the badge
  // has room to grow to roughly that height before it starts driving the box
  badgeLarge: {
    width: 68,
    height: 68,
  },
  guestNote: {
    flexShrink: 1,
    fontFamily: Fonts.rounded,
    color: TEXT_MUTED,
    lineHeight: 20,
  },
  privacyPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: PANEL_BG,
  },
  // one gap governs the heading and both promises so the three lines sit on an
  // even rhythm; line heights are explicit so that rhythm doesn't shift with the
  // platform's default leading
  privacyPanelText: {
    flex: 1,
    gap: 4,
  },
  privacyTitle: {
    fontFamily: Fonts.rounded,
    fontWeight: '700',
    color: GOLD,
    lineHeight: 21,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyItemText: {
    flex: 1,
    fontFamily: Fonts.rounded,
    color: '#FFFFFF',
    lineHeight: 19,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Fonts.rounded,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    fontFamily: Fonts.rounded,
    color: GOLD,
    fontWeight: '700',
  },
  // the overlay is positioned here; its content styling lives in
  // guest-info-screen.tsx
  guestInfoOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 500,
  },
});
