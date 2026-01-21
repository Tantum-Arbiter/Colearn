import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/app-store';
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
import { reminderService } from '../../services/reminder-service';
import { StorySyncService } from '../../services/story-sync-service';
import { AssetSyncService } from '../../services/asset-sync-service';
import { VersionManager } from '../../services/version-manager';
import { CacheManager } from '../../services/cache-manager';
import { StoryLoader } from '../../services/story-loader';
import { TEXT_SIZE_OPTIONS, useAccessibility } from '../../hooks/use-accessibility';
import { SettingsTipsOverlay } from '../tutorial/settings-tips-overlay';
import { ScreenTimeTipsOverlay } from '../tutorial/screen-time-tips-overlay';
import { useTutorial } from '../../contexts/tutorial-context';
import { SUPPORTED_LANGUAGES, setStoredLanguage, type SupportedLanguage } from '../../services/i18n';

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
  const [showGrayscaleInfo, setShowGrayscaleInfo] = useState(false);
  const [showBlueLightInfo, setShowBlueLightInfo] = useState(false);
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
    clearUserProfile
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
    console.log(`[AccountScreen] Navigate to ${view}`);

    const slideValue = getSlideValue(view);
    if (slideValue) {
      slideValue.value = withTiming(1, { duration: SLIDE_DURATION });
    }
    setCurrentView(view);
  }, [getSlideValue]);

  // Navigate back (slides out to right)
  const navigateBack = useCallback((fromView: SlideView, toView: SlideView) => {
    console.log(`[AccountScreen] Navigate back from ${fromView} to ${toView}`);

    const slideValue = getSlideValue(fromView);
    if (slideValue) {
      slideValue.value = withTiming(0, { duration: SLIDE_DURATION });
    }
    // Update current view after animation starts
    setTimeout(() => setCurrentView(toView), SLIDE_DURATION);
  }, [getSlideValue]);

  // Navigate back to main (closes all overlays)
  const navigateToMain = useCallback(() => {
    console.log(`[AccountScreen] Navigate to main`);

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
                console.error('Background logout error:', error);
              });
              reminderService.clearAllReminders().catch(error => {
                console.error('Background reminder clear error:', error);
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert(t('common.error'), t('alerts.logout.error'));
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
            console.log('[Reset] Clearing all app data...');

            // Clear cache FIRST (blocking) - this must complete before navigation
            // Otherwise the sync will start before the cache is cleared
            try {
              // Clear version metadata so sync knows to re-download everything
              await VersionManager.clearLocalVersion();
              console.log('[Reset] Version metadata cleared');

              // Clear BatchSyncService cache (stories and assets)
              await CacheManager.clearAll();
              console.log('[Reset] CacheManager cleared');

              // Clear legacy sync service caches
              await StorySyncService.clearCache();
              await AssetSyncService.clearCache();
              console.log('[Reset] Legacy caches cleared');

              // IMPORTANT: Clear in-memory cache so old stories don't show
              // This must be called because JS memory isn't cleared on navigation
              StoryLoader.invalidateCache();
              console.log('[Reset] StoryLoader in-memory cache cleared');
            } catch (error) {
              console.error('[Reset] Error clearing caches:', error);
            }

            // Reset all state to initial values
            setOnboardingComplete(false);
            setLoginComplete(false);
            setShowLoginAfterOnboarding(false);
            setAppReady(false);

            // Clear user profile (nickname, avatar, etc.)
            clearUserProfile();
            console.log('[Reset] User profile cleared');

            // Set app ready to trigger navigation
            setTimeout(() => {
              setAppReady(true);
            }, 100);

            // Clear remaining items in background (non-blocking)
            ApiClient.logout().catch(error => {
              console.error('Background logout error:', error);
            });
            clearPersistedStorage().catch(error => {
              console.error('Background storage clear error:', error);
            });
            resetAllTutorials().catch(error => {
              console.error('Background tutorial reset error:', error);
            });

            console.log('[Reset] App reset complete');
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

      console.log('Today\'s screen time usage has been reset');
    } catch (error) {
      console.error('Failed to reset today\'s usage:', error);
    }
  };

  // Handle back based on current view - respects navigation hierarchy
  const handleBack = async () => {
    // If leaving the account screen entirely (from main) and have unsaved changes, auto-save
    if (currentView === 'main' && hasUnsavedChanges) {
      try {
        // Auto-save: commit reminder changes locally
        if (reminderService.hasUnsavedChanges()) {
          await reminderService.commitChanges();
        }

        // Sync to backend if signed in
        const isAuthenticated = await ApiClient.isAuthenticated();
        if (isAuthenticated) {
          try {
            await reminderService.syncToBackend();
            console.log('[AccountScreen] Auto-saved reminders to backend');
          } catch (syncError) {
            console.log('[AccountScreen] Failed to sync to backend (saved locally):', syncError);
          }
        }

        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('[AccountScreen] Failed to auto-save:', error);
        // Still exit even if save fails - data is preserved locally
      }

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
        />

        {/* Content container - z-index 10 to be above moon (z-index 1) */}
        <View style={{ flex: 1, paddingTop: insets.top + 140 + (textSizeScale - 1) * 60, zIndex: 10 }}>
          {/* Main Account Page - always rendered as base layer */}
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.content, { paddingBottom: Dimensions.get('window').height * 0.2 }, isTablet && { alignItems: 'center' }]}
              >
                <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>
          {/* App Settings Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>
              {t('account.settings')}
            </Text>

            <View style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}>
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>
                {t('common.version')}
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaledFontSize(16) }]}>
                1.0.0
              </Text>
            </View>

            <Pressable
              style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}
              onPress={isGuestMode ? handleLogin : handleLogout}
            >
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>
                {isGuestMode ? t('common.login') : t('common.logout')}
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaledFontSize(16) }]}>
                →
              </Text>
            </Pressable>

            <Pressable
              style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowLanguageOverlay(true);
              }}
            >
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>
                {t('account.language')}
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaledFontSize(16) }]}>
                {SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)?.flag} {SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)?.nativeName} →
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigateToSlide('screen-time');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(16) }]}>
                {t('account.screenTime')}
              </Text>
            </Pressable>
          </View>

          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>
              {t('account.profile')}
            </Text>

            <View style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}>
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>
                {t('account.nickname')}
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaledFontSize(16) }]}>
                {userNickname || t('common.notSet')}
              </Text>
            </View>

            <View style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}>
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>
                {t('account.avatarType')}
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaledFontSize(16) }]}>
                {userAvatarType ? (userAvatarType === 'boy' ? t('account.boy') : t('account.girl')) : t('common.notSet')}
              </Text>
            </View>

            <Pressable
              style={[styles.button, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigateToSlide('edit-profile');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(16) }]}>
                {t('common.editProfile')}
              </Text>
            </Pressable>
          </View>

          {/* Accessibility */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>
              {t('accessibility.title')}
            </Text>

            <View style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}>
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>
                {t('account.textSize')}
              </Text>
              <Text style={[styles.settingValue, { fontSize: scaledFontSize(16) }]}>
                {t(TEXT_SIZE_OPTIONS.find(opt => opt.value === textSizeScale)?.labelKey || 'common.default')}
              </Text>
            </View>

            <View style={styles.textSizeOptions}>
              {TEXT_SIZE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.textSizeButton,
                    { minHeight: 40, paddingHorizontal: 10, paddingVertical: 8 },
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
                      { fontSize: 12 },
                    ]}
                    numberOfLines={1}
                  >
                    {t(option.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.accessibilityHint, { fontSize: scaledFontSize(12) }]} numberOfLines={2} adjustsFontSizeToFit>
              {t('accessibility.textSizeHint')}</Text>

            <Pressable
              style={styles.grayscaleInfoBox}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowGrayscaleInfo(!showGrayscaleInfo);
              }}
            >
              <Text style={[
                styles.grayscaleInfoTitle,
                showGrayscaleInfo && styles.grayscaleInfoTitleExpanded,
                { fontSize: scaledFontSize(14) }
              ]}>
                {t('accessibility.grayscale')} {showGrayscaleInfo ? '▼' : '▶'}
              </Text>
              {showGrayscaleInfo && (
                <>
                  <Text style={[styles.grayscaleInfoText, { fontSize: scaledFontSize(12) }]}>
                    {t('accessibility.grayscaleHint')}
                  </Text>
                  <Text style={[styles.grayscaleInfoPath, { fontSize: scaledFontSize(11) }]}>
                    <Text style={styles.platformBold}>iOS:</Text> {t('accessibility.grayscaleIos')}
                  </Text>
                  <Text style={[styles.grayscaleInfoPath, { fontSize: scaledFontSize(11) }]}>
                    <Text style={styles.platformBold}>Android:</Text> {t('accessibility.grayscaleAndroid')}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={styles.grayscaleInfoBox}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowBlueLightInfo(!showBlueLightInfo);
              }}
            >
              <Text style={[
                styles.grayscaleInfoTitle,
                showBlueLightInfo && styles.grayscaleInfoTitleExpanded,
                { fontSize: scaledFontSize(14) }
              ]}>
                {t('accessibility.blueLight')} {showBlueLightInfo ? '▼' : '▶'}
              </Text>
              {showBlueLightInfo && (
                <>
                  <Text style={[styles.grayscaleInfoText, { fontSize: scaledFontSize(12) }]}>
                    {t('accessibility.blueLightHint')}
                  </Text>
                  <Text style={[styles.grayscaleInfoPath, { fontSize: scaledFontSize(11) }]}>
                    <Text style={styles.platformBold}>iOS:</Text> {t('accessibility.blueLightIos')}
                  </Text>
                  <Text style={[styles.grayscaleInfoPath, { fontSize: scaledFontSize(11) }]}>
                    <Text style={styles.platformBold}>Android:</Text> {t('accessibility.blueLightAndroid')}
                  </Text>
                  <Text style={[styles.blueLightBenefitText, { fontSize: scaledFontSize(11), marginTop: 8 }]}>
                    💡 {t('accessibility.blueLightBenefit')}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Privacy & Legal */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>
              {t('account.legal')}
            </Text>

            {/* Crash Reporting Toggle */}
            <Pressable
              style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCrashReportingEnabled(!crashReportingEnabled);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>
                  {t('account.crashReports')}
                </Text>
                <Text style={[styles.settingHint, { fontSize: scaledFontSize(12) }]}>
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

            <Pressable
              style={[styles.button, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigateToSlide('terms');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(16) }]}>
                {t('account.termsAndConditions')}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigateToSlide('privacy');
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(16) }]}>
                {t('account.privacyPolicy')}
              </Text>
            </Pressable>
          </View>

          {/* Developer Options */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>
              Developer Options
            </Text>

            <Pressable
              style={[styles.button, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={handleResetTodayUsage}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(16) }]}>
                Reset Today&apos;s Screen Time ({formatDurationCompact(todayUsage)})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.resetButton, { paddingVertical: scaledPadding(12), minHeight: scaledButtonSize(44) }]}
              onPress={handleResetApp}
            >
              <Text style={[styles.buttonText, styles.resetButtonText, { fontSize: scaledFontSize(16) }]}>
                Reset App
              </Text>
            </Pressable>
          </View>
                </View>
              </ScrollView>
        </View>

        {/* Sub-page overlays - slide in from right, same positioning as main content */}
        {/* Screen Time Page */}
        <Animated.View style={[styles.overlayPage, screenTimeStyle]}>
          <ScreenTimeContent
            paddingTop={insets.top + 140 + (textSizeScale - 1) * 60 + 10}
            onNavigateToReminders={() => navigateToSlide('custom-reminders')}
          />
          <ScreenTimeTipsOverlay isActive={currentView === 'screen-time'} />
        </Animated.View>

        {/* Custom Reminders Page */}
        <Animated.View style={[styles.overlayPage, customRemindersStyle]}>
          <CustomRemindersContent
            paddingTop={insets.top + 140 + (textSizeScale - 1) * 60 + 10}
            onCreateNew={() => navigateToSlide('create-reminder')}
            onReminderChange={() => setReminderChangeCounter(prev => prev + 1)}
            refreshTrigger={reminderChangeCounter}
            isActive={currentView === 'custom-reminders'}
          />
        </Animated.View>

        {/* Create Reminder Page */}
        <Animated.View style={[styles.overlayPage, createReminderStyle]}>
          <CreateReminderContent
            paddingTop={insets.top + 140 + (textSizeScale - 1) * 60 + 10}
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
          <EditProfileContent paddingTop={insets.top + 140 + (textSizeScale - 1) * 60 + 10} onSaveComplete={navigateToMain} />
        </Animated.View>

        {/* Terms & Conditions Page */}
        <Animated.View style={[styles.overlayPage, termsStyle]}>
          <TermsConditionsContent paddingTop={insets.top + 140 + (textSizeScale - 1) * 60 + 10} />
        </Animated.View>

        {/* Privacy Policy Page */}
        <Animated.View style={[styles.overlayPage, privacyStyle]}>
          <PrivacyPolicyContent paddingTop={insets.top + 140 + (textSizeScale - 1) * 60 + 10} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 100,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
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
    backgroundColor: '#1E3A8A', // Solid background to cover main content
    zIndex: 10,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
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
  },
  settingLabel: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  settingValue: {
    color: '#E0E0E0',
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
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 152, 0, 0.8)',
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loginButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
  },
  loginButtonText: {
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
  textSizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  textSizeButton: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
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
  accessibilityHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  grayscaleInfoBox: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
  },
  grayscaleInfoTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'left',
  },
  grayscaleInfoTitleExpanded: {
    marginBottom: 8,
  },
  grayscaleInfoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    lineHeight: 18,
  },
  grayscaleInfoPath: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    marginBottom: 4,
    lineHeight: 16,
  },
  platformBold: {
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#FFFFFF',
  },
  blueLightBenefitText: {
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
    fontStyle: 'italic',
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
