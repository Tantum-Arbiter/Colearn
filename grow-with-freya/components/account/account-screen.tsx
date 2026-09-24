import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Alert, BackHandler, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, type SubscriptionTier } from '../../store/app-store';
import { useShallow } from 'zustand/react/shallow';
import { restorePurchases, isDevMode, forgetAccount as forgetSubscriptionAccount } from '@/services/subscription-service';
import { VoiceSyncService } from '@/services/voice-sync-service';
import { PageHeader } from '../ui/page-header';
import { TermsConditionsContent } from './terms-conditions-screen';
import { PrivacyPolicyContent } from './privacy-policy-screen';
import ScreenTimeService from '../../services/screen-time-service';
import NotificationService from '../../services/notification-service';
import { useScreenTime } from '../screen-time/screen-time-provider';
import { formatDurationCompact } from '../../utils/time-formatting';
import { ApiClient } from '../../services/api-client';
import { SecureStorage } from '../../services/secure-storage';
import { reminderService } from '../../services/reminder-service';
import { ChildSyncService } from '../../services/child-sync-service';
import { DeviceInfoService } from '../../services/device-info-service';
import { TEXT_SIZE_OPTIONS, useAccessibility } from '../../hooks/use-accessibility';
import { OwlGuide } from '../owl-guide';
import { useGuideScroller } from '../owl-guide/use-guide-scroller';
import { Logger } from '@/utils/logger';
import { SettingsSkyBackdrop } from './settings-sky-backdrop';
import { SleepingSkyFace } from './sleeping-sky-face';
import { heroContentTop, heroSunFrame } from '@/constants/home-sky';
import { Fonts } from '@/constants/theme';
import { useTimeOfDay } from '@/hooks/use-time-of-day';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useSettledAfterTransition } from '@/hooks/use-ambient-animation';
import { ChildBottomNavigation, navClearance, type ChildNavItemId } from '@/components/child-ui/child-bottom-navigation';
import { useScreenTimeAllowance } from '@/hooks/use-screen-time-allowance';
import { destinationForSection } from '@/constants/catalogue-destinations';
import { useSessionActions } from '@/hooks/use-session-actions';
import { resetApp } from '@/services/app-reset';

const log = Logger.create('Account');

import { useOwlGuide } from '../../contexts/owl-guide-context';
import * as Notifications from 'expo-notifications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SlideView = 'main' | 'terms' | 'privacy';

// Animation duration for slide transitions
const SLIDE_DURATION = 300;


interface AccountScreenProps {
  onBack: () => void;
  onNavigate?: (destination: string) => void;
  isActive?: boolean;
}

export function AccountScreen({ onBack, onNavigate, isActive = true }: AccountScreenProps) {
  const { t } = useTranslation();
  const session = useSessionActions();
  const [currentView, setCurrentView] = useState<SlideView>('main');

  // Slide animation values for each sub-page (0 = off-screen right, 1 = visible)
  const termsSlide = useSharedValue(0);
  const privacySlide = useSharedValue(0);

  // Animated styles for each sub-page overlay
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
    voiceSyncEnabled,
    screenTimeEnabled,
    notificationsEnabled,
    hasRequestedNotificationPermission,
    setScreenTimeEnabled,
    setNotificationsEnabled,
    setNotificationPermissionRequested,
    setTextSizeScale,
    setCrashReportingEnabled,
    setLoginComplete,
    setShowLoginAfterOnboarding,
    setGuestMode,
    clearUserProfile,
    getEffectiveTier,
    _devSubscriptionOverride,
    setDevSubscriptionOverride,
    trialEndPromptSeenFor,
    setTrialEndPromptSeenFor,
  } = useAppStore(
    useShallow((state) => ({
      userNickname: state.userNickname,
      userAvatarType: state.userAvatarType,
      textSizeScale: state.textSizeScale,
      isGuestMode: state.isGuestMode,
      crashReportingEnabled: state.crashReportingEnabled,
      voiceSyncEnabled: state.voiceSyncEnabled,
      screenTimeEnabled: state.screenTimeEnabled,
      notificationsEnabled: state.notificationsEnabled,
      hasRequestedNotificationPermission: state.hasRequestedNotificationPermission,
      setScreenTimeEnabled: state.setScreenTimeEnabled,
      setNotificationsEnabled: state.setNotificationsEnabled,
      setNotificationPermissionRequested: state.setNotificationPermissionRequested,
      setTextSizeScale: state.setTextSizeScale,
      setCrashReportingEnabled: state.setCrashReportingEnabled,
      setLoginComplete: state.setLoginComplete,
      setShowLoginAfterOnboarding: state.setShowLoginAfterOnboarding,
      setGuestMode: state.setGuestMode,
      clearUserProfile: state.clearUserProfile,
      getEffectiveTier: state.getEffectiveTier,
      _devSubscriptionOverride: state._devSubscriptionOverride,
      setDevSubscriptionOverride: state.setDevSubscriptionOverride,
      trialEndPromptSeenFor: state.trialEndPromptSeenFor,
      setTrialEndPromptSeenFor: state.setTrialEndPromptSeenFor,
    }))
  );

  // Screen time context for resetting today's usage
  const { todayUsage, refreshUsage } = useScreenTime();

  // Get the slide animation value for a view
  const getSlideValue = useCallback((view: SlideView) => {
    switch (view) {
      case 'terms': return termsSlide;
      case 'privacy': return privacySlide;
      default: return null;
    }
  }, [termsSlide, privacySlide]);

  // Navigate to a sub-page (slides in from right)
  const navigateToSlide = useCallback((view: SlideView) => {
    log.debug(`Navigate → ${view}`);

    const slideValue = getSlideValue(view);
    if (slideValue) {
      slideValue.value = withTiming(1, { duration: SLIDE_DURATION });
    }
    setCurrentView(view);
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
      case 'terms': return t('account.termsAndConditions');
      case 'privacy': return t('account.privacyPolicy');
      default: return t('account.title');
    }
  }, [t]);

  // Accessibility scaling (textSizeScale already from useAppStore above)
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet, contentMaxWidth } = useAccessibility();

  const screen = useWindowDimensions();
  const sun = heroSunFrame(screen.width, screen.height, insets.top);
  const timeOfDay = useTimeOfDay();
  const reduceMotion = useReducedMotion();
  const skyAnimated = useSettledAfterTransition(isActive) && !reduceMotion;
  const screenTimeAllowance = useScreenTimeAllowance();

  // Tutorial reset
  const { resetGuides, lastResetTimestamp } = useOwlGuide();
  const textSizeRef = useRef<View>(null);
  const screenTimeRef = useRef<View>(null);
  const remindersRef = useRef<View>(null);
  const crashReportsRef = useRef<View>(null);
  const guideScroller = useGuideScroller();
  const guideTargets = useMemo(() => ({
    settings_text_size: textSizeRef,
    settings_screen_time: screenTimeRef,
    settings_reminders: remindersRef,
    settings_crash_reports: crashReportsRef,
  }), []);

  // Screen time controls live here rather than on the Screen Time page: that
  // page reports on usage, this one is where the parent changes things. They
  // write straight to the store, like every other toggle on this page -- the
  // old copies inside ScreenTimeContent only ever set component state, so the
  // parent's choice was dropped the moment they navigated away.
  const handleToggleScreenTime = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScreenTimeEnabled(!screenTimeEnabled);
  };

  const handleToggleSmartReminders = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // switching on for the first time needs the OS to agree first
    if (!notificationsEnabled && !hasRequestedNotificationPermission) {
      const permissionStatus = await NotificationService.getInstance().requestPermissions();
      setNotificationPermissionRequested(true);

      if (permissionStatus.granted) {
        setNotificationsEnabled(true);
        Alert.alert(t('screenTime.notificationsEnabled'));
      } else {
        Alert.alert(
          t('screenTime.permissionRequired'),
          t('screenTime.enableNotificationsInSettings')
        );
      }
      return;
    }

    setNotificationsEnabled(!notificationsEnabled);
  };

  const handleToggleVoiceSync = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const failed = () => Alert.alert(t('account.voiceSync.failed'));
    if (!voiceSyncEnabled) {
      Alert.alert(t('account.voiceSync.enableTitle'), t('account.voiceSync.enableMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('account.voiceSync.enable'),
          onPress: async () => {
            if (!(await VoiceSyncService.enable())) failed();
          },
        },
      ]);
      return;
    }
    const turnOff = (removeOnlineCopies: boolean) => async () => {
      if (!(await VoiceSyncService.disable({ removeOnlineCopies }))) failed();
    };
    Alert.alert(t('account.voiceSync.disableTitle'), t('account.voiceSync.disableMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('account.voiceSync.keepCopies'), onPress: turnOff(false) },
      { text: t('account.voiceSync.removeCopies'), style: 'destructive', onPress: turnOff(true) },
    ]);
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
      await ChildSyncService.forgetAccount();
      await forgetSubscriptionAccount();

      Alert.alert(t('common.success'), t('alerts.deleteAccount.success'));
      onBack();
    } catch (error: any) {
      log.error('Account deletion error:', error);

      // Detect auth-related failures (token refresh failed, not authenticated, etc.)
      const isAuthError = error?.message?.includes('login') ||
        error?.message?.includes('authenticated') ||
        error?.message?.includes('refresh') ||
        error?.message?.includes('token');

      if (isAuthError) {
        // Tokens were already cleared by the failed refresh -update UI state to match
        setGuestMode(true);
        Alert.alert(
          t('alerts.deleteAccount.title'),
          t('alerts.deleteAccount.sessionExpired'),
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
            {
              text: t('common.login'),
              onPress: () => {
                setGuestMode(false);
                setShowLoginAfterOnboarding(true);
                onBack();
              },
            },
          ]
        );
      } else {
        Alert.alert(t('common.error'), t('alerts.deleteAccount.error'));
      }
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
            await resetApp();
            resetGuides().catch(error => log.error('Background tutorial reset:', error));
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

  const handleClearAllScreenTimeHistory = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const screenTimeService = ScreenTimeService.getInstance();
      await screenTimeService.resetAllUsage();

      // Refresh the usage in the context to update the UI immediately
      await refreshUsage();

      log.info('Screen time history cleared');
    } catch (error) {
      log.error('Failed to clear screen time history:', error);
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
  }, [currentView, isActive]);

  // Handle back based on current view - respects navigation hierarchy
  const handleBack = () => {
    if (currentView === 'main') {
      onBack();
    } else {
      navigateToMain();
    }
  };

  const handleNavSelect = useCallback((id: ChildNavItemId) => {
    if (id === 'screensafe') {
      const scroll = guideScroller.scrollRef.current;
      screenTimeRef.current?.measureLayout(
        scroll as unknown as number,
        (_x, y) => scroll?.scrollTo({ y: Math.max(y - insets.top - 90, 0), animated: true }),
        () => undefined
      );
      return;
    }
    const destination = destinationForSection(id);
    if (destination) onNavigate?.(destination);
  }, [guideScroller.scrollRef, insets.top, onNavigate]);

  return (
    <View style={styles.container}>
      <View testID="account-background" style={styles.gradient}>
        <SettingsSkyBackdrop active={isActive} />

        {/* Shared page header component - title changes based on current view */}
        <PageHeader
          title={currentView === 'main' ? '' : getSlideTitle(currentView)}
          onBack={handleBack}
          useBackArrow
        />

        <View style={{ flex: 1, zIndex: 10 }}>
          {/* Main Account Page - always rendered as base layer */}
              <ScrollView
                ref={guideScroller.scrollRef}
                onScroll={guideScroller.onScroll}
                onLayout={guideScroller.onLayout}
                onContentSizeChange={guideScroller.onContentSizeChange}
                scrollEventThrottle={16}
                bounces={false}
                overScrollMode="never"
                style={styles.scrollView}
                // the journey bar sits at the foot of this page, so the last
                // row needs its clearance and no more; a fifth of the screen
                // here let every row be thrown up out of view over an empty
                // lower third
                contentContainerStyle={[styles.content, { paddingBottom: navClearance(insets.bottom) + guideScroller.reserve }, isTablet && { alignItems: 'center' }]}
              >
                <View testID="account-sky" style={[styles.sky, { height: heroContentTop(insets.top, sun.size), paddingTop: sun.top }]}>
                  <SleepingSkyFace size={sun.size} timeOfDay={timeOfDay} animated={skyAnimated} />
                </View>
                <Text testID="account-heading" style={[styles.heading, { fontSize: scaledFontSize(isTablet ? 40 : 34) }]}>
                  {t('account.title')}
                </Text>
                <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>

          {/* Accessibility: inline text size pills */}
          <Text style={[styles.textSizeLabel, { fontSize: scaledFontSize(13) }]}>{t('accessibility.title')}</Text>
          <View ref={textSizeRef} collapsable={false} style={styles.textSizeOptions} testID="account-text-size">
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

          {/* Screen time controls -- the Screen Time page reports on usage,
              this is where the parent changes it */}
          <Pressable
            style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}
            onPress={handleToggleScreenTime}
            testID="account-screen-time-toggle"
            ref={screenTimeRef}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(13) }]}>
                {t('screenTime.screenTimeControls')}
              </Text>
              <Text style={[styles.settingHint, { fontSize: scaledFontSize(11) }]}>
                {t('screenTime.monitorAndLimit')}
              </Text>
            </View>
            <View style={[styles.toggle, screenTimeEnabled && styles.toggleEnabled]}>
              <View style={[styles.toggleThumb, screenTimeEnabled && styles.toggleThumbEnabled]} />
            </View>
          </Pressable>

          <Pressable
            style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}
            onPress={handleToggleSmartReminders}
            testID="account-smart-reminders-toggle"
            ref={remindersRef}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(13) }]}>
                {t('screenTime.smartReminders')}
              </Text>
              <Text style={[styles.settingHint, { fontSize: scaledFontSize(11) }]}>
                {t('screenTime.receiveGentleNotifications')}
              </Text>
            </View>
            <View style={[styles.toggle, notificationsEnabled && styles.toggleEnabled]}>
              <View style={[styles.toggleThumb, notificationsEnabled && styles.toggleThumbEnabled]} />
            </View>
          </Pressable>

          {/* Crash Reporting Toggle */}
          <Pressable
            ref={crashReportsRef}
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

          {!isGuestMode && VoiceSyncService.isAvailable() && (
            <Pressable
              style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}
              onPress={handleToggleVoiceSync}
              testID="account-voice-sync-toggle"
              accessibilityRole="switch"
              accessibilityState={{ checked: voiceSyncEnabled }}
              accessibilityLabel={t('account.voiceSync.title')}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { fontSize: scaledFontSize(13) }]}>
                  {t('account.voiceSync.title')}
                </Text>
                <Text style={[styles.settingHint, { fontSize: scaledFontSize(11) }]}>
                  {t('account.voiceSync.hint')}
                </Text>
              </View>
              <View style={[styles.toggle, voiceSyncEnabled && styles.toggleEnabled]}>
                <View style={[styles.toggleThumb, voiceSyncEnabled && styles.toggleThumbEnabled]} />
              </View>
            </Pressable>
          )}

          {!session.needsSignIn && (
            <Pressable
              testID="account-logout"
              accessibilityRole="button"
              accessibilityLabel={t('common.logout')}
              style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.6 }]}
              onPress={session.logout}
            >
              <Ionicons name="log-out-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={[styles.logoutButtonText, { fontSize: scaledFontSize(14) }]}>{t('common.logout')}</Text>
            </Pressable>
          )}

          {/* Delete Account -only shown for logged-in users */}
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

          {/* Restore Purchases -Apple requires this for App Store approval */}
          {!isGuestMode && !isDevMode() && (
            <Pressable
              style={({ pressed }) => [styles.logoutButton, { marginTop: 12 }, pressed && { opacity: 0.6 }]}
              onPress={async () => {
                const result = await restorePurchases();
                if (result.success) {
                  Alert.alert(
                    t('subscription.restoreSuccessTitle'),
                    t('subscription.restoreSuccessMessage'),
                  );
                } else if (result.error) {
                  Alert.alert(
                    t('subscription.errorTitle'),
                    result.error,
                  );
                } else {
                  Alert.alert(
                    t('subscription.restoreNoneTitle'),
                    t('subscription.restoreNoneMessage'),
                  );
                }
              }}
            >
              <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={[styles.logoutButtonText, { fontSize: scaledFontSize(14) }]}>
                {t('subscription.restorePurchases')}
              </Text>
            </Pressable>
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
              testID="dev-rearm-trial-end-prompt"
              style={[styles.button, { paddingVertical: scaledPadding(10), minHeight: scaledButtonSize(40) }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTrialEndPromptSeenFor(null);
              }}
            >
              <Text style={[styles.buttonText, { fontSize: scaledFontSize(13) }]}>
                {trialEndPromptSeenFor
                  ? `Re-arm Trial-End Prompt (answered ${trialEndPromptSeenFor})`
                  : 'Trial-End Prompt Armed'}
              </Text>
            </Pressable>

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
              onPress={handleClearAllScreenTimeHistory}
            >
              <Text style={[styles.buttonText, styles.resetButtonText, { fontSize: scaledFontSize(13) }]}>
                Clear All Screen Time History
              </Text>
            </Pressable>

            <Pressable
              testID="account-reset-app"
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
            <Pressable testID="account-terms" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigateToSlide('terms'); }}>
              <Text style={[styles.bottomLink, { fontSize: scaledFontSize(12) }]}>{t('account.termsAndConditions')}</Text>
            </Pressable>
            <Text style={[styles.bottomSeparator, { fontSize: scaledFontSize(12) }]}>{'  |  '}</Text>
            <Pressable testID="account-privacy" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigateToSlide('privacy'); }}>
              <Text style={[styles.bottomLink, { fontSize: scaledFontSize(12) }]}>{t('account.privacyPolicy')}</Text>
            </Pressable>
          </View>
          <Text testID="account-version" style={[styles.versionText, { fontSize: scaledFontSize(11) }]}>
            {t('common.version')} {DeviceInfoService.getVersionLabel()}
          </Text>

                </View>
              </ScrollView>
        </View>

        {/* Sub-page overlays - slide in from right, same positioning as main content */}
        {/* Terms & Conditions Page */}
        <Animated.View style={[styles.overlayPage, termsStyle]}>
          <TermsConditionsContent paddingTop={insets.top + 90 + (textSizeScale - 1) * 40 + 10} />
        </Animated.View>

        {/* Privacy Policy Page */}
        <Animated.View style={[styles.overlayPage, privacyStyle]}>
          <PrivacyPolicyContent paddingTop={insets.top + 90 + (textSizeScale - 1) * 40 + 10} />
        </Animated.View>


      </View>

      {currentView === 'main' && (
        <ChildBottomNavigation selected="profile" onSelect={handleNavSelect} screenTime={screenTimeAllowance} slotKey="account" />
      )}

      {/* The owl's settings walkthrough - shown on first visit, key forces remount after reset */}
      <OwlGuide key={`settings-guide-${lastResetTimestamp}`} id="settings_walkthrough" active={isActive && currentView === 'main'} targets={guideTargets} scroller={guideScroller.scroller} />
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
  sky: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  heading: {
    color: 'white',
    fontFamily: Fonts.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  overlayPage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0F2C',
    zIndex: 10,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
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
