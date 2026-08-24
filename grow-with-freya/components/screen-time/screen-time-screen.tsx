import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/app-store';
import { MoonBottomImage } from '../main-menu/animated-components';
import { mainMenuStyles } from '../main-menu/styles';
import { MusicControl } from '../ui/music-control';
import { StarBackground } from '../ui/star-background';
import ScreenTimeService, { ScreenTimeStats, DailyTotal } from '../../services/screen-time-service';
import NotificationService from '../../services/notification-service';
import { Logger } from '@/utils/logger';

const log = Logger.create('ScreenTimeScreen');
import { useScreenTime } from './screen-time-provider';
import { styles } from './styles';
import { ApiClient } from '@/services/api-client';
import { reminderService, type ReminderStats } from '@/services/reminder-service';
import { useAccessibility } from '@/hooks/use-accessibility';
import { UsageOverview } from './usage-overview';
import { ScheduleCallout } from './schedule-callout';
import { ScheduleWindow } from './schedule-window';
import { AUTH_GRADIENT } from '@/components/auth/auth-theme';
import { backgroundSaveService } from '@/services/background-save-service';
import { ScreenTimeTipsOverlay } from '../tutorial';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScreenTimeScreenProps {
  onBack: () => void;
}

interface ScreenTimeContentProps {
  paddingTop?: number;
  /** Fires when a reminder is created, toggled or deleted inside the schedule
   *  window, so the host can re-check its unsaved-changes state. */
  onReminderChange?: () => void;
}

// Generate star positions for background
const generateStarPositions = () => {
  const stars = [];
  for (let i = 0; i < 50; i++) {
    stars.push({
      id: i,
      left: Math.random() * SCREEN_WIDTH,
      top: Math.random() * 600,
      opacity: 0.3 + Math.random() * 0.7,
    });
  }
  return stars;
};

export function ScreenTimeScreen({ onBack }: ScreenTimeScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet, contentMaxWidth } = useAccessibility();
  const {
    childAgeInMonths,
    screenTimeEnabled,
    notificationsEnabled,
    hasRequestedNotificationPermission,
    setScreenTimeEnabled,
    setNotificationsEnabled,
    setNotificationPermissionRequested,
  } = useAppStore();

  // Get real-time usage from context
  const { todayUsage: contextTodayUsage } = useScreenTime();

  const [stats, setStats] = useState<ScreenTimeStats | null>(null);
  const [dailyTotals, setDailyTotals] = useState<DailyTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [reminderStats, setReminderStats] = useState<ReminderStats | null>(null);

  // Track local changes (not yet saved to backend). The child's age is not one
  // of them -- it is set on the profile screen and only read here.
  const [localScreenTimeEnabled, setLocalScreenTimeEnabled] = useState(screenTimeEnabled);
  const [localNotificationsEnabled, setLocalNotificationsEnabled] = useState(notificationsEnabled);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reminderChangeCounter, setReminderChangeCounter] = useState(0); // Force re-check when reminders change

  // Track changes to detect unsaved state (including reminders)
  useEffect(() => {
    const settingsChanged =
      localScreenTimeEnabled !== screenTimeEnabled ||
      localNotificationsEnabled !== notificationsEnabled;

    const remindersChanged = reminderService.hasUnsavedChanges();

    setHasUnsavedChanges(settingsChanged || remindersChanged);
  }, [localScreenTimeEnabled, localNotificationsEnabled, screenTimeEnabled, notificationsEnabled, scheduleOpen, reminderChangeCounter]); // Re-check when reminders change

  // The callout reports live state, so it reloads whenever a reminder changes
  // or the window closes over one.
  useEffect(() => {
    if (scheduleOpen) return;
    let cancelled = false;
    reminderService
      .getReminderStats()
      .then((next) => {
        if (!cancelled) setReminderStats(next);
      })
      .catch((error) => log.warn('Failed to load reminder stats:', error));
    return () => {
      cancelled = true;
    };
  }, [scheduleOpen, reminderChangeCounter]);

  // Star animation
  const starOpacity = useSharedValue(0.4);
  const stars = useMemo(() => generateStarPositions(), []);

  // Animate stars with a gentle pulsing effect
  useEffect(() => {
    starOpacity.value = withRepeat(
      withTiming(0.8, { duration: 2000 }),
      -1,
      true
    );
  }, []);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    opacity: starOpacity.value,
  }));

  // Load screen time statistics
  useEffect(() => {
    loadStats();
  }, [childAgeInMonths]);

  // Refresh stats when screen becomes active (when user navigates back)
  useEffect(() => {
    const refreshStats = () => {
      loadStats();
    };

    // Refresh immediately when component mounts or when context usage changes
    refreshStats();
  }, [contextTodayUsage]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const screenTimeService = ScreenTimeService.getInstance();
      const screenTimeStats = await screenTimeService.getScreenTimeStats(childAgeInMonths);
      setStats(screenTimeStats);
      setDailyTotals(await screenTimeService.getDailyTotals(30));
    } catch (error) {
      log.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = async () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave without saving?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              // Revert reminder changes
              await reminderService.revertChanges();

              // Reset local state to match app store
              setLocalScreenTimeEnabled(screenTimeEnabled);
              setLocalNotificationsEnabled(notificationsEnabled);
              setHasUnsavedChanges(false);

              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onBack();
            }
          }
        ]
      );
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onBack();
    }
  };

  const handleToggleScreenTime = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalScreenTimeEnabled(!localScreenTimeEnabled);
  };

  const handleToggleNotifications = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!localNotificationsEnabled && !hasRequestedNotificationPermission) {
      // Request permission first
      const notificationService = NotificationService.getInstance();
      const permissionStatus = await notificationService.requestPermissions();
      setNotificationPermissionRequested(true);

      if (permissionStatus.granted) {
        setLocalNotificationsEnabled(true);
        Alert.alert(
          'Notifications Enabled!',
          'Don\'t forget to save your changes at the bottom of the page!'
        );
      } else {
        Alert.alert(
          'Permission Required',
          'To receive helpful reminders, please enable notifications in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {/* Open settings if possible */} }
          ]
        );
      }
    } else {
      setLocalNotificationsEnabled(!localNotificationsEnabled);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Update local app store
      setScreenTimeEnabled(localScreenTimeEnabled);
      setNotificationsEnabled(localNotificationsEnabled);

      // Handle notification scheduling/cancellation
      const notificationService = NotificationService.getInstance();
      if (localNotificationsEnabled && !notificationsEnabled) {
        // Notifications were just enabled - schedule them
        if (stats?.recommendedSchedule) {
          await notificationService.scheduleRecommendedReminders(stats.recommendedSchedule);
        }
      } else if (!localNotificationsEnabled && notificationsEnabled) {
        // Notifications were just disabled - cancel them
        await notificationService.cancelAllScheduledNotifications();
      }

      // Sync to backend in background (only if authenticated)
      const isAuthenticated = await ApiClient.isAuthenticated();
      if (isAuthenticated) {
        // Convert age to age range string
        const ageRange = childAgeInMonths < 24 ? '18-24m' :
                        childAgeInMonths < 72 ? '2-6y' :
                        '6+';

        // Get current profile info from app store for the background save
        const { userNickname, userAvatarType, userAvatarId } = useAppStore.getState();

        // Queue profile update to run in background with retry
        backgroundSaveService.queueProfileSave({
          nickname: userNickname || 'User',
          avatarType: userAvatarType || 'girl',
          avatarId: userAvatarId || 'girl-1',
          notifications: {
            screenTimeEnabled: localScreenTimeEnabled,
            smartRemindersEnabled: localNotificationsEnabled,
          },
          schedule: {
            childAgeRange: ageRange,
          },
        });

        // Sync reminders to backend (in background, don't block)
        if (reminderService.hasUnsavedChanges()) {
          log.debug('Syncing reminders to backend…');
          reminderService.syncToBackend().catch((error: any) => {
            log.warn('Failed to sync reminders:', error);
          });
        }

        log.debug('Settings queued for sync');
      } else {
        // Not authenticated - just commit reminders locally
        if (reminderService.hasUnsavedChanges()) {
          await reminderService.commitChanges();
        }
      }

      // Reload stats with new age
      await loadStats();

      setHasUnsavedChanges(false);
      Alert.alert(
        'Settings Saved!',
        'Your screen time preferences and custom reminders have been saved and synced across your devices.'
      );
    } catch (error) {
      log.error('Failed to save settings:', error);
      Alert.alert(
        'Save Failed',
        'Failed to save your settings. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const dayNames = [
    t('screenTime.sun'),
    t('screenTime.mon'),
    t('screenTime.tue'),
    t('screenTime.wed'),
    t('screenTime.thu'),
    t('screenTime.fri'),
    t('screenTime.sat'),
  ];

  // Use local state for display (not yet saved)
  const dailyLimit = useMemo(() => {
    const screenTimeService = ScreenTimeService.getInstance();
    return screenTimeService.getDailyLimit(childAgeInMonths);
  }, [childAgeInMonths]);

  const todayUsage = contextTodayUsage; // Use real-time usage from context

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={AUTH_GRADIENT}
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

        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50), zIndex: 50 }]}>
          <Pressable testID="screen-time-back" style={[styles.backButton, { minHeight: scaledButtonSize(40) }]} onPress={handleBack}>
            <Ionicons name="arrow-back" size={scaledButtonSize(24)} color="rgba(255, 255, 255, 0.8)" />
          </Pressable>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { fontSize: scaledFontSize(20) }]}>{t('screenTime.title')}</Text>
          </View>
          <MusicControl size={24} color="#FFFFFF" />
        </View>

        {/* Conditional Content */}
        <ScrollView style={[styles.scrollView, { zIndex: 10 }]} contentContainerStyle={[styles.content, isTablet && { alignItems: 'center' }]}>
        <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>
        <UsageOverview
          todayUsageSeconds={todayUsage}
          dailyLimitSeconds={dailyLimit}
          dailyTotals={dailyTotals}
          dayNames={dayNames}
        />

        {/* Create My Schedule */}
        <View style={styles.section}>
          <ScheduleCallout
            testID="screen-time-open-reminders"
            stats={reminderStats}
            onOpen={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setScheduleOpen(true);
            }}
          />

          <View style={[styles.bedtimeWarning, { padding: scaledPadding(12) }]}>
            <Text style={[styles.bedtimeWarningTitle, { fontSize: scaledFontSize(14) }]}>{t('screenTime.bedtimeGuidelines')}</Text>
            <Text style={[styles.bedtimeWarningText, { fontSize: scaledFontSize(12) }]}>
              {t('screenTime.bedtimeWarning')}
            </Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>{t('screenTime.settings')}</Text>

          <View style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>{t('screenTime.screenTimeControls')}</Text>
              <Text style={[styles.settingDescription, { fontSize: scaledFontSize(12) }]}>
                {t('screenTime.screenTimeControlsDesc')}
              </Text>
            </View>
            <Pressable
              testID="screen-time-toggle"
              style={[styles.toggle, localScreenTimeEnabled && styles.toggleActive]}
              onPress={handleToggleScreenTime}
            >
              <View style={[styles.toggleThumb, localScreenTimeEnabled && styles.toggleThumbActive]} />
            </Pressable>
          </View>

          <View style={[styles.settingItem, { paddingVertical: scaledPadding(12) }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { fontSize: scaledFontSize(16) }]}>{t('screenTime.smartReminders')}</Text>
              <Text style={[styles.settingDescription, { fontSize: scaledFontSize(12) }]}>
                {t('screenTime.smartRemindersDesc')}
              </Text>
            </View>
            <Pressable
              testID="screen-time-notifications-toggle"
              style={[styles.toggle, localNotificationsEnabled && styles.toggleActive]}
              onPress={handleToggleNotifications}
            >
              <View style={[styles.toggleThumb, localNotificationsEnabled && styles.toggleThumbActive]} />
            </Pressable>
          </View>
        </View>

        {/* Save Button - Only show when there are unsaved changes */}
        {hasUnsavedChanges && (
          <View style={styles.section}>
            <Pressable
              testID="screen-time-save"
              style={[styles.saveButton, { minHeight: scaledButtonSize(48), paddingVertical: scaledPadding(14) }, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveSettings}
              disabled={isSaving}
            >
              <Text style={[styles.saveButtonText, { fontSize: scaledFontSize(16) }]}>
                {isSaving ? t('screenTime.saving') : t('screenTime.saveSettings')}
              </Text>
            </Pressable>
            <Text style={[styles.saveNote, { fontSize: scaledFontSize(12) }]}>
              {t('screenTime.settingsSyncNote')}
            </Text>
          </View>
        )}
        </View>
        </ScrollView>
      </LinearGradient>

      <ScheduleWindow
        visible={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onReminderChange={() => setReminderChangeCounter(prev => prev + 1)}
      />

      {/* Tips overlay for first-time visitors */}
      <ScreenTimeTipsOverlay />
    </View>
  );
}

// Content-only component for embedding in horizontal scroll
export function ScreenTimeContent({ paddingTop = 0, onReminderChange }: ScreenTimeContentProps) {
  const { t } = useTranslation();
  const { scaledFontSize, scaledPadding, isTablet, contentMaxWidth } = useAccessibility();
  const { childAgeInMonths } = useAppStore();

  const { todayUsage: contextTodayUsage } = useScreenTime();

  const [stats, setStats] = useState<ScreenTimeStats | null>(null);
  const [dailyTotals, setDailyTotals] = useState<DailyTotal[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [reminderStats, setReminderStats] = useState<ReminderStats | null>(null);
  const [reminderChangeCounter, setReminderChangeCounter] = useState(0);

  // Keep the callout honest about what is actually scheduled.
  useEffect(() => {
    if (scheduleOpen) return;
    let cancelled = false;
    reminderService
      .getReminderStats()
      .then((next) => {
        if (!cancelled) setReminderStats(next);
      })
      .catch((error) => log.warn('Failed to load reminder stats:', error));
    return () => {
      cancelled = true;
    };
  }, [scheduleOpen, reminderChangeCounter]);

  useEffect(() => {
    loadStats();
  }, [childAgeInMonths]);

  useEffect(() => {
    // Refresh stats when context usage changes
    loadStats();
  }, [contextTodayUsage]);

  const loadStats = async () => {
    try {
      const screenTimeService = ScreenTimeService.getInstance();
      const screenTimeStats = await screenTimeService.getScreenTimeStats(childAgeInMonths);
      setStats(screenTimeStats);
      setDailyTotals(await screenTimeService.getDailyTotals(30));
    } catch (error) {
      log.error('Failed to load stats:', error);
    }
  };

  // Note: handleSaveSettings removed - auto-save happens on account screen exit

  const dayNames = [
    t('screenTime.sun'),
    t('screenTime.mon'),
    t('screenTime.tue'),
    t('screenTime.wed'),
    t('screenTime.thu'),
    t('screenTime.fri'),
    t('screenTime.sat'),
  ];

  const dailyLimit = useMemo(() => {
    const screenTimeService = ScreenTimeService.getInstance();
    return screenTimeService.getDailyLimit(childAgeInMonths);
  }, [childAgeInMonths]);

  const todayUsage = contextTodayUsage;

  return (
    <View style={{ flex: 1 }}>
      {/* night backing so the dashboard reads dark regardless of the host page */}
      <LinearGradient colors={AUTH_GRADIENT} style={StyleSheet.absoluteFill} />
      <StarBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop }, isTablet && { alignItems: 'center' }]}
      >
        <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>
        <UsageOverview
          todayUsageSeconds={todayUsage}
          dailyLimitSeconds={dailyLimit}
          dailyTotals={dailyTotals}
          dayNames={dayNames}
        />

        {/* Create My Schedule */}
        <View style={styles.section}>
          <ScheduleCallout
            testID="content-reminders"
            stats={reminderStats}
            onOpen={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setScheduleOpen(true);
            }}
          />

          <View style={[styles.bedtimeWarning, { padding: scaledPadding(12) }]}>
            <Text style={[styles.bedtimeWarningTitle, { fontSize: scaledFontSize(14) }]}>{t('screenTime.bedtimeGuidelines')}</Text>
            <Text style={[styles.bedtimeWarningText, { fontSize: scaledFontSize(12) }]}>
              {t('screenTime.bedtimeWarning')}
            </Text>
          </View>
        </View>

        </View>
      </ScrollView>

      <ScheduleWindow
        visible={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onReminderChange={() => {
          setReminderChangeCounter(prev => prev + 1);
          onReminderChange?.();
        }}
      />
    </View>
  );
}
