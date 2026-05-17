import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Alert, BackHandler, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, type SubscriptionTier } from '../../store/app-store';
import { MoonBottomImage } from '../main-menu/animated-components';
import { mainMenuStyles } from '../main-menu/styles';
import { PageHeader } from '../ui/page-header';
import { TermsConditionsContent } from './terms-conditions-screen';
import { PrivacyPolicyContent } from './privacy-policy-screen';
import { ScreenTimeContent } from '../screen-time/screen-time-screen';
import { CustomRemindersContent, CreateReminderContent } from '../reminders';
import ScreenTimeService from '../../services/screen-time-service';
import { useScreenTime } from '../screen-time/screen-time-provider';
import { formatDurationCompact } from '../../utils/time-formatting';
import { EditProfileContent } from './edit-profile-screen';
import { ApiClient } from '../../services/api-client';
import { SecureStorage } from '../../services/secure-storage';
import { reminderService } from '../../services/reminder-service';
import { StorySyncService } from '../../services/story-sync-service';
import { VersionManager } from '../../services/version-manager';
import { DeviceInfoService } from '../../services/device-info-service';
import { CacheManager } from '../../services/cache-manager';
import { StoryLoader } from '../../services/story-loader';
import { TEXT_SIZE_OPTIONS, useAccessibility } from '../../hooks/use-accessibility';
import { SettingsTipsOverlay } from '../tutorial/settings-tips-overlay';
import { ScreenTimeTipsOverlay } from '../tutorial/screen-time-tips-overlay';
import { Logger } from '@/utils/logger';

const log = Logger.create('Account');
import { useTutorial } from '../../contexts/tutorial-context';
import { SUPPORTED_LANGUAGES, setStoredLanguage, type SupportedLanguage } from '../../services/i18n';
import * as Notifications from 'expo-notifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SlideView = 'main' | 'screen-time' | 'custom-reminders' | 'create-reminder' | 'edit-profile' | 'terms' | 'privacy';

// Animation duration for slide transitions
const SLIDE_DURATION = 300;


interface AccountScreenProps {
  onBack: () => void;
  isActive?: boolean;
}

// PERFORMANCE: Generate star positions once at module level
const generateStarPositions = () => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const stars = [];
  const starCount = 15;

  for (let i = 0; i < starCount; i++) {
    stars.push({
      id: i,
      left: Math.random() * screenWidth,
      top: Math.random() * (screenHeight * 0.6), // Only in top 60% of screen
      opacity: 0.3 + Math.random() * 0.4, // Random opacity between 0.3-0.7
    });
  }
  return stars;
};
const MEMOIZED_ACCOUNT_STAR_POSITIONS = generateStarPositions();

export function AccountScreen({ onBack, isActive = true }: AccountScreenProps) {
  const { i18n, t } = useTranslation();
  const [currentView, setCurrentView] = useState<SlideView>('main');

  const [showLanguageOverlay, setShowLanguageOverlay] = useState(false);
  const currentLanguage = i18n.language as SupportedLanguage;

  const handleLanguageChange = useCallback(async (lang: SupportedLanguage) => {
    await setStoredLanguage(lang);
    setShowLanguageOverlay(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Track reminder changes for the screen time content
  const [reminderChangeCounter, setReminderChangeCounter] = useState(0);

  // Track unsaved changes across all screens (currently mainly for reminders)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Re-check for unsaved changes when reminder counter changes
  useEffect(() => {
    const remindersChanged = reminderService.hasUnsavedChanges();
    setHasUnsavedChanges(remindersChanged);
  }, [reminderChangeCounter]);

  // Slide animation values for each sub-page (0 = off-screen right, 1 = visible)
  const screenTimeSlide = useSharedValue(0);
  const customRemindersSlide = useSharedValue(0);
  const createReminderSlide = useSharedValue(0);
  const editProfileSlide = useSharedValue(0);
  const termsSlide = useSharedValue(0);
  const privacySlide = useSharedValue(0);

  // Animated styles for each sub-page overlay
  const screenTimeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - screenTimeSlide.value) * SCREEN_WIDTH }],
  }));
  const customRemindersStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - customRemindersSlide.value) * SCREEN_WIDTH }],
  }));
  const createReminderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - createReminderSlide.value) * SCREEN_WIDTH }],
  }));
  const editProfileStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - editProfileSlide.value) * SCREEN_WIDTH }],
  }));
  const termsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - termsSlide.value) * SCREEN_WIDTH }],
  }));
  const privacyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - privacySlide.value) * SCREEN_WIDTH }],
  }));



  const insets = useSafeAreaInsets();
  const {
    userNickname,
    userAvatarType,
    textSizeScale,
    isGuestMode,
    crashReportingEnabled,
    setTextSizeScale,
    setCrashReportingEnabled,
    setOnboardingComplete,
    setLoginComplete,
    setAppReady,
    setShowLoginAfterOnboarding,
    setGuestMode,
    clearPersistedStorage,
    clearUserProfile,
    getEffectiveTier,
    _devSubscriptionOverride,
    setDevSubscriptionOverride,
  } = useAppStore();

  // Screen time context for resetting today's usage
  const { todayUsage, refreshUsage } = useScreenTime();

  // Get the slide animation value for a view
  const getSlideValue = useCallback((view: SlideView) => {
    switch (view) {
      case 'screen-time': return screenTimeSlide;
      case 'custom-reminders': return customRemindersSlide;
      case 'create-reminder': return createReminderSlide;
      case 'edit-profile': return editProfileSlide;
      case 'terms': return termsSlide;
      case 'privacy': return privacySlide;
      default: return null;
    }
  }, [screenTimeSlide, customRemindersSlide, createReminderSlide, editProfileSlide, termsSlide, privacySlide]);

  // Navigate to a sub-page (slides in from right)
  const navigateToSlide = useCallback((view: SlideView) => {
    log.debug(`Navigate → ${view}`);

    const slideValue = getSlideValue(view);
    if (slideValue) {
      slideValue.value = withTiming(1, { duration: SLIDE_DURATION });
    }
    setCurrentView(view);
  }, [getSlideValue]);

  // Navigate back (slides out to right)
  const navigateBack = useCallback((fromView: SlideView, toView: SlideView) => {
    log.debug(`Navigate ${fromView} → ${toView}`);

    const slideValue = getSlideValue(fromView);
    if (slideValue) {
      slideValue.value = withTiming(0, { duration: SLIDE_DURATION });
    }
    // Update current view after animation starts
    setTimeout(() => setCurrentView(toView), SLIDE_DURATION);
  }, [getSlideValue]);

  // Navigate back to main (closes all overlays)
  const navigateToMain = useCallback(() => {
    log.debug('Navigate → main');

    // Slide out the current view
    const slideValue = getSlideValue(currentView);
    if (slideValue) {
      slideValue.value = withTiming(0, { duration: SLIDE_DURATION });
    }
    setTimeout(() => setCurrentView('main'), SLIDE_DURATION);
  }, [currentView, getSlideValue]);

  // Get the title for the current slide view
  const getSlideTitle = useCallback((view: SlideView): string => {
    switch (view) {
      case 'screen-time': return t('account.screenTime');
      case 'edit-profile': return t('profile.editTitle');
      case 'terms': return t('account.termsAndConditions');
      case 'privacy': return t('account.privacyPolicy');
      case 'custom-reminders': return t('account.customReminders');
      case 'create-reminder': return t('reminders.createTitle');
      default: return t('account.title');
    }
  }, [t]);

  // Accessibility scaling (textSizeScale already from useAppStore above)
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet, contentMaxWidth } = useAccessibility();

  // Tutorial reset
  const { resetAllTutorials, lastResetTimestamp } = useTutorial();

  // Star animation
  const starOpacity = useSharedValue(0.4);
  // PERFORMANCE: Use module-level memoized star positions
  const stars = MEMOIZED_ACCOUNT_STAR_POSITIONS;

  // PERFORMANCE: Defer star animation until after page transition to prevent jitter
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      starOpacity.value = withRepeat(
        withTiming(0.8, { duration: 2000 }),
        -1,
        true
      );
    }, 600); // Wait for page transition (500ms + 100ms buffer)
    return () => clearTimeout(timeoutId);
  }, [starOpacity]);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    opacity: starOpacity.value,
  }));

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Clear guest mode and show login screen
    setGuestMode(false);
    setShowLoginAfterOnboarding(true);
    onBack();
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      t('alerts.logout.title'),
      t('alerts.logout.message'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear user profile data from store (instant)
              clearUserProfile();

              // Reset login state (instant)
              setLoginComplete(false);
              setShowLoginAfterOnboarding(true);

              // Go back to main menu (which will redirect to login) - instant
              onBack();

              // Clear authentication tokens and reminders in background (non-blocking)
              // Note: We keep story and asset caches intact for delta sync efficiency
              // Changed assets will be detected via checksum comparison on next login
              ApiClient.logout().catch(error => {
                log.error('Background logout error:', error);
              });
              reminderService.clearAllReminders().catch(error => {
                log.error('Background reminder clear error:', error);
              });
            } catch (error) {
              log.error('Logout error:', error);
              Alert.alert(t('common.error'), t('alerts.logout.error'));
            }
          },
        },
      ]
    );
  };

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const performAccountDeletion = async () => {
    setIsDeletingAccount(true);
    try {
      await ApiClient.deleteAccount();

      // Clear all local data
      clearUserProfile();
      setLoginComplete(false);
      setShowLoginAfterOnboarding(true);

      // Clear tokens and reminders
      await SecureStorage.clearAuthData();
      await reminderService.clearAllReminders();

      Alert.alert(t('common.success'), t('alerts.deleteAccount.success'));
      onBack();
    } catch (error) {
      log.error('Account deletion error:', error);
      Alert.alert(t('common.error'), t('alerts.deleteAccount.error'));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    if (isGuestMode) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Alert.alert(
      t('alerts.deleteAccount.title'),
      t('alerts.deleteAccount.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            if (Platform.OS === 'ios') {
              // iOS supports Alert.prompt for typed confirmation
              Alert.prompt(
                t('alerts.deleteAccount.title'),
                t('alerts.deleteAccount.confirm'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async (input?: string) => {
                      if (input?.trim().toUpperCase() !== 'DELETE') {
                        Alert.alert(t('common.error'), t('alerts.deleteAccount.confirm'));
                        return;
                      }
                      await performAccountDeletion();
                    },
                  },
                ],
                'plain-text'
              );
            } else {
              // Android: second confirmation dialog (no prompt support)
              Alert.alert(
                t('alerts.deleteAccount.title'),
                t('alerts.deleteAccount.confirm'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: performAccountDeletion,
                  },
                ]
              );
            }
          },
        },
      ]
    );
  };

  const handleResetApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      t('alerts.resetApp.title'),
      t('alerts.resetApp.message'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            log.info('Clearing all app data…');

            // Clear cache FIRST (blocking) - this must complete before navigation
            // Otherwise the sync will start before the cache is cleared
            try {
              await VersionManager.clearLocalVersion();
              await CacheManager.clearAll();
              await StorySyncService.clearCache();
              StoryLoader.invalidateCache();
              log.info('Caches cleared');
            } catch (error) {
              log.error('Error clearing caches:', error);
            }

            // Reset all state to initial values
            setOnboardingComplete(false);
            setLoginComplete(false);
            setShowLoginAfterOnboarding(false);
            setAppReady(false);

            // Clear user profile (nickname, avatar, etc.)
            clearUserProfile();

            // Set app ready to trigger navigation
            setTimeout(() => {
              setAppReady(true);
            }, 100);

            // Clear remaining items in background (non-blocking)
            ApiClient.logout().catch(error => log.error('Background logout:', error));
            clearPersistedStorage().catch(error => log.error('Background storage clear:', error));
            resetAllTutorials().catch(error => log.error('Background tutorial reset:', error));

            log.info('App reset complete');
          },
        },
      ]
    );
  };

  const handleResetTodayUsage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const screenTimeService = ScreenTimeService.getInstance();
      await screenTimeService.resetTodayUsage();

      // Refresh the usage in the context to update the UI immediately
      await refreshUsage();

      log.info('Screen time usage reset');
    } catch (error) {
      log.error('Failed to reset usage:', error);
    }
  };

  // Android hardware back button support
  useEffect(() => {
    if (Platform.OS !== 'android' || !isActive) return;

    const onBackPress = () => {
      handleBack();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [currentView, hasUnsavedChanges, isActive]);

  // Handle back based on current view - respects navigation hierarchy
  const handleBack = () => {
    // If leaving the account screen entirely (from main) and have unsaved changes, auto-save
    if (currentView === 'main' && hasUnsavedChanges) {
      // Save locally first (sync, non-blocking for UI)
      if (reminderService.hasUnsavedChanges()) {
        reminderService.commitChanges().catch(error => {
          log.error('Failed to commit changes locally:', error);
        });
      }

      // Sync to backend in background (fire and forget - don't block navigation)
      // This prevents UI freezing when tokens need to be refreshed
      (async () => {
        try {
          const isAuthenticated = await ApiClient.isAuthenticated();
          if (isAuthenticated) {
            await reminderService.syncToBackend();
            log.debug('Reminders synced to backend');
          }
        } catch (syncError) {
          log.debug('Failed to sync to backend (saved locally):', syncError);
        }
      })();

      setHasUnsavedChanges(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onBack();
      return;
    }

    if (currentView === 'main') {
      onBack();
    } else if (currentView === 'create-reminder') {
      // Create reminder goes back to custom reminders
      navigateBack('create-reminder', 'custom-reminders');
    } else if (currentView === 'custom-reminders') {
      // Custom reminders goes back to screen time
      navigateBack('custom-reminders', 'screen-time');
    } else if (currentView === 'screen-time') {
      // Screen time goes back to main
      navigateBack('screen-time', 'main');
    } else {
      // Other views (edit-profile, terms, privacy) go back to main
      navigateToMain();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1E3A8A', '#1E3A8A', '#1E3A8A']} // Darkest color from main menu gradient
        style={styles.gradient}
      >
        {/* Animated stars background - pointerEvents none to allow scrolling through */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
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
                },
              ]}
            />
          ))}
        </View>

        {/* Moon bottom background image - behind all other components */}
        <View style={mainMenuStyles.bearContainer} pointerEvents="none">
          <MoonBottomImage />
        </View>

        {/* Shared page header component - title changes based on current view */}
        <PageHeader
          title={getSlideTitle(currentView)}
          onBack={handleBack}
          rightActionIcon={currentView === 'custom-reminders' ? 'add' : undefined}
          onRightAction={currentView === 'custom-reminders' ? () => navigateToSlide('create-reminder') : undefined}
          headerBackgroundColor="#1E3A8A"
          useHomeIcon={currentView === 'main'}
          useBackArrow={currentView !== 'main'}
        />

        {/* Content container - z-index 10 to be above moon (z-index 1) */}
        <View style={{ flex: 1, paddingTop: insets.top + 90 + (textSizeScale - 1) * 40, zIndex: 10 }}>
          {/* Main Account Page - always rendered as base layer */}
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.content, { paddingBottom: Dimensions.get('window').height * 0.2 }, isTablet && { alignItems: 'center' }]}
              >
                <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>

          {/* Button strips: Language, Screen Time, Edit Profile */}
          <View style={styles.stripContainer}>
            <Pressable
              style={({ pressed }) => [styles.strip, pressed && styles.stripPressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowLanguageOverlay(true);
              }}
            >
              <Image
                source={require('../../assets/images/ui-elements/language-button-background.webp')}
                style={styles.stripImage}
                resizeMode="cover"
              />
              <View style={styles.stripOverlay}>
                <Text style={{ fontSize: 28, marginRight: 12 }}>{SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)?.flag || '🌐'}</Text>
                <Text style={[styles.stripLabel, { fontSize: scaledFontSize(30) }]}>{t('account.language')}</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.strip, pressed && styles.stripPressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigateToSlide('screen-time');
              }}
            >
              <Image
                source={require('../../assets/images/ui-elements/screentime-button-background.webp')}
                style={styles.stripImage}
                resizeMode="cover"
              />
              <View style={styles.stripOverlay}>
                <Ionicons name="time-outline" size={28} color="#FFFFFF" style={{ marginRight: 12 }} />
                <Text style={[styles.stripLabel, { fontSize: scaledFontSize(30) }]}>{t('account.screenTime')}</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.strip, pressed && styles.stripPressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigateToSlide('edit-profile');
              }}
            >
              <Image
                source={require('../../assets/images/ui-elements/choose-profile-button-background.webp')}
                style={styles.stripImage}
                resizeMode="cover"
              />
              <View style={styles.stripOverlay}>
                <Ionicons name="person-outline" size={28} color="#FFFFFF" style={{ marginRight: 12 }} />
                <Text style={[styles.stripLabel, { fontSize: scaledFontSize(30) }]}>{t('common.editProfile')}</Text>
              </View>
            </Pressable>
          </View>

          {/* Accessibility: inline text size pills */}
          <Text style={[styles.textSizeLabel, { fontSize: scaledFontSize(13) }]}>{t('accessibility.title')}</Text>
          <View style={styles.textSizeOptions}>
            {TEXT_SIZE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.textSizeButton,
                  textSizeScale === option.value && styles.textSizeButtonSelected,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTextSizeScale(option.value);
                }}
              >
                <Text
                  style={[
                    styles.textSizeButtonText,
                    textSizeScale === option.value && styles.textSizeButtonTextSelected,
                    { fontSize: 11 },
                  ]}
                  numberOfLines={1}
                >
                  {t(option.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Crash Reporting Toggle */}
          <Pressable
            style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCrashReportingEnabled(!crashReportingEnabled);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(13) }]}>
                {t('account.crashReports')}
              </Text>
              <Text style={[styles.settingHint, { fontSize: scaledFontSize(11) }]}>
                {t('account.crashReportsHint')}
              </Text>
            </View>
            <View style={[
              styles.toggle,
              crashReportingEnabled && styles.toggleEnabled
            ]}>
              <View style={[
                styles.toggleThumb,
                crashReportingEnabled && styles.toggleThumbEnabled
              ]} />
            </View>
          </Pressable>

          {/* Logout — transparent pill button like home icon */}
          <Pressable
            style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.6 }]}
            onPress={isGuestMode ? handleLogin : handleLogout}
          >
            <Ionicons name={isGuestMode ? 'log-in-outline' : 'log-out-outline'} size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={[styles.logoutButtonText, { fontSize: scaledFontSize(14) }]}>
              {isGuestMode ? t('common.login') : t('common.logout')}
            </Text>
          </Pressable>

          {/* Delete Account — only shown for logged-in users */}
          {!isGuestMode && (
            <View style={styles.deleteAccountSection}>
              <Pressable
                style={({ pressed }) => [
                  styles.deleteAccountButton,
                  pressed && { opacity: 0.6 },
                  isDeletingAccount && { opacity: 0.4 },
                ]}
                onPress={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                <Ionicons name="trash-outline" size={16} color="#FF4444" style={{ marginRight: 6 }} />
                <Text style={[styles.deleteAccountButtonText, { fontSize: scaledFontSize(13) }]}>
                  {isDeletingAccount ? t('alerts.deleteAccount.deleting') : t('account.deleteAccount')}
                </Text>
              </Pressable>
              <Text style={[styles.deleteAccountHint, { fontSize: scaledFontSize(11) }]}>
                {t('account.deleteAccountHint')}
              </Text>
            </View>
          )}

          {/* Developer Options */}
          <View style={[styles.section, { marginTop: 16 }]}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(13) }]}>
              Developer Options
            </Text>

            {/* Subscription tier override */}
            <View style={styles.devTierRow}>
              <Text style={[styles.devTierLabel, { fontSize: scaledFontSize(12) }]}>
                Subscription Tier
              </Text>
              <Text style={[styles.devTierHint, { fontSize: scaledFontSize(10) }]}>
                {_devSubscriptionOverride
                  ? `Override active → ${_devSubscriptionOverride}`
                  : `Using real tier → ${getEffectiveTier()}`}
              </Text>
              <View style={styles.devTierButtons}>
                {(['free', 'basic', 'premium'] as SubscriptionTier[]).map((tier) => {
                  const isActive = getEffectiveTier() === tier;
                  return (
                    <Pressable
                      key={tier}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setDevSubscriptionOverride(isActive && _devSubscriptionOverride ? null : tier);
                      }}
                      style={[
                        styles.devTierPill,
                        isActive && styles.devTierPillActive,
                      ]}
                    >
                      <Text style={[
                        styles.devTierPillText,
                        { fontSize: scaledFontSize(12) },
                        isActive && styles.devTierPillTextActive,
                      ]}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              style={[styles.button, { paddingVertical: scaledPadding(10), minHeight: scaledButtonSize(40) }]}
              onPress={handleResetTodayUsage}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(13) }]}>
                Reset Today&apos;s Screen Time ({formatDurationCompact(todayUsage)})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.resetButton, { paddingVertical: scaledPadding(10), minHeight: scaledButtonSize(40) }]}
              onPress={handleResetApp}
            >
              <Text style={[styles.buttonText, styles.resetButtonText, { fontSize: scaledFontSize(13) }]}>
                Reset App
              </Text>
            </Pressable>
          </View>

          {/* Bottom: T&Cs + Privacy on one line, Version below */}
          <View style={styles.bottomTextRow}>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigateToSlide('terms'); }}>
              <Text style={[styles.bottomLink, { fontSize: scaledFontSize(12) }]}>{t('account.termsAndConditions')}</Text>
            </Pressable>
            <Text style={[styles.bottomSeparator, { fontSize: scaledFontSize(12) }]}>{'  |  '}</Text>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigateToSlide('privacy'); }}>
              <Text style={[styles.bottomLink, { fontSize: scaledFontSize(12) }]}>{t('account.privacyPolicy')}</Text>
            </Pressable>
          </View>
          <Text style={[styles.versionText, { fontSize: scaledFontSize(11) }]}>
            {t('common.version')} {DeviceInfoService.getAppVersion()}
          </Text>

                </View>
              </ScrollView>
        </View>

        {/* Sub-page overlays - slide in from right, same positioning as main content */}
        {/* Screen Time Page */}
        <Animated.View style={[styles.overlayPage, screenTimeStyle]}>
          <ScreenTimeContent
            paddingTop={insets.top + 90 + (textSizeScale - 1) * 40 + 10}
            onNavigateToReminders={() => navigateToSlide('custom-reminders')}
          />
          <ScreenTimeTipsOverlay isActive={currentView === 'screen-time'} />
        </Animated.View>

        {/* Custom Reminders Page */}
        <Animated.View style={[styles.overlayPage, customRemindersStyle]}>
          <CustomRemindersContent
            paddingTop={insets.top + 90 + (textSizeScale - 1) * 40 + 10}
            onCreateNew={() => navigateToSlide('create-reminder')}
            onReminderChange={() => setReminderChangeCounter(prev => prev + 1)}
            refreshTrigger={reminderChangeCounter}
            isActive={currentView === 'custom-reminders'}
          />
        </Animated.View>

        {/* Create Reminder Page */}
        <Animated.View style={[styles.overlayPage, createReminderStyle]}>
          <CreateReminderContent
            paddingTop={insets.top + 90 + (textSizeScale - 1) * 40 + 10}
            onBack={() => navigateBack('create-reminder', 'custom-reminders')}
            onSuccess={() => {
              setReminderChangeCounter(prev => prev + 1);
              navigateBack('create-reminder', 'custom-reminders');
            }}
            refreshTrigger={reminderChangeCounter}
            isActive={currentView === 'create-reminder'}
          />
        </Animated.View>

        {/* Edit Profile Page */}
        <Animated.View style={[styles.overlayPage, editProfileStyle]}>
          <EditProfileContent paddingTop={insets.top + 90 + (textSizeScale - 1) * 40 + 10} onSaveComplete={navigateToMain} />
        </Animated.View>

        {/* Terms & Conditions Page */}
        <Animated.View style={[styles.overlayPage, termsStyle]}>
          <TermsConditionsContent paddingTop={insets.top + 90 + (textSizeScale - 1) * 40 + 10} />
        </Animated.View>

        {/* Privacy Policy Page */}
        <Animated.View style={[styles.overlayPage, privacyStyle]}>
          <PrivacyPolicyContent paddingTop={insets.top + 90 + (textSizeScale - 1) * 40 + 10} />
        </Animated.View>

        {/* Language Selection Overlay */}
        {showLanguageOverlay && (
          <Pressable
            style={styles.languageOverlay}
            onPress={() => setShowLanguageOverlay(false)}
          >
            <Pressable
              style={styles.languageModal}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[styles.languageModalTitle, { fontSize: scaledFontSize(18) }]}>
                {t('account.selectLanguage')}
              </Text>
              <ScrollView
                style={styles.languageScrollView}
                showsVerticalScrollIndicator={true}
                scrollIndicatorInsets={{ right: 4 }}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <Pressable
                    key={lang.code}
                    style={[
                      styles.languageOption,
                      currentLanguage === lang.code && styles.languageOptionSelected,
                    ]}
                    onPress={() => handleLanguageChange(lang.code)}
                  >
                    <Text style={[styles.languageFlag, { fontSize: scaledFontSize(24) }]}>
                      {lang.flag}
                    </Text>
                    <Text style={[styles.languageName, { fontSize: scaledFontSize(16) }]}>
                      {lang.nativeName}
                    </Text>
                    {currentLanguage === lang.code && (
                      <Text style={[styles.languageCheck, { fontSize: scaledFontSize(18) }]}>✓</Text>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        )}

      </LinearGradient>

      {/* Settings Tips Overlay - shown on first visit, key forces remount after reset */}
      <SettingsTipsOverlay key={`settings-tips-${lastResetTimestamp}`} isActive={isActive} />
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
  scrollView: {
    flex: 1,
  },
  overlayPage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E3A8A',
    zIndex: 10,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Strip button container (vertical stack like main menu carousel)
  stripContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },

  // Individual strip button (matches main menu strip style)
  strip: {
    width: '100%',
    height: 110,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  stripPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  stripImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  stripOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  stripGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripLabel: {
    color: '#FFFFFF',
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 1,
  },

  // Logout — transparent pill like home icon
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },

  // Delete Account
  deleteAccountSection: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deleteAccountButtonText: {
    color: '#FF4444',
    fontWeight: '600',
  },
  deleteAccountHint: {
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
    textAlign: 'center',
  },

  section: {
    marginBottom: 16,
    width: '100%',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
  },
  settingLabel: {
    color: '#FFFFFF',
    fontWeight: '500',
  },

  button: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  resetButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  resetButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  devTierRow: {
    marginBottom: 12,
  },
  devTierLabel: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  devTierHint: {
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: 8,
  },
  devTierButtons: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  devTierPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  devTierPillActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.7)',
    borderColor: 'rgba(76, 175, 80, 0.9)',
  },
  devTierPillText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600' as const,
  },
  devTierPillTextActive: {
    color: '#FFFFFF',
  },
  textSizeLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    marginBottom: 6,
  },
  textSizeOptions: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  textSizeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSizeButtonSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderColor: 'rgba(76, 175, 80, 1)',
  },
  textSizeButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  textSizeButtonTextSelected: {
    fontWeight: 'bold',
  },

  // Bottom text links
  bottomTextRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  bottomLink: {
    color: 'rgba(255, 255, 255, 0.7)',
    textDecorationLine: 'underline',
  },
  bottomSeparator: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 8,
  },

  languageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  languageModal: {
    backgroundColor: 'rgba(30, 30, 60, 0.95)',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 350,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'column',
  },
  languageScrollView: {
    maxHeight: 400,
  },
  languageModalTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  languageOptionSelected: {
    backgroundColor: 'rgba(100, 150, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(100, 150, 255, 0.5)',
  },
  languageFlag: {
    marginRight: 12,
  },
  languageName: {
    color: '#FFFFFF',
    flex: 1,
  },
  languageCheck: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  settingHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleEnabled: {
    backgroundColor: '#4CAF50',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbEnabled: {
    alignSelf: 'flex-end',
  },
});
