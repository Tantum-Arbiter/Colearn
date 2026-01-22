import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Alert } from 'react-native';
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
import ScreenTimeService, { ScreenTimeStats, SCREEN_TIME_LIMITS } from '../../services/screen-time-service';
import NotificationService from '../../services/notification-service';
import { useScreenTime } from './screen-time-provider';
import { CustomRemindersScreen, CreateReminderScreen } from '../reminders';
import { styles } from './styles';
import { formatDurationCompact } from '../../utils/time-formatting';
import { ApiClient } from '@/services/api-client';
import { reminderService } from '@/services/reminder-service';
import { useAccessibility } from '@/hooks/use-accessibility';
import { backgroundSaveService } from '@/services/background-save-service';
import { ScreenTimeTipsOverlay } from '../tutorial';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScreenTimeScreenProps {
  onBack: () => void;
}

interface ScreenTimeContentProps {
  paddingTop?: number;
  onNavigateToReminders?: () => void;
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
    setChildAge,
    setScreenTimeEnabled,
    setNotificationsEnabled,
    setNotificationPermissionRequested,
  } = useAppStore();

  // Get real-time usage from context
  const { todayUsage: contextTodayUsage } = useScreenTime();

  const [stats, setStats] = useState<ScreenTimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<'main' | 'custom-reminders' | 'create-reminder'>('main');

  // Track local changes (not yet saved to backend)
  const [localChildAge, setLocalChildAge] = useState(childAgeInMonths);
  const [localScreenTimeEnabled, setLocalScreenTimeEnabled] = useState(screenTimeEnabled);
  const [localNotificationsEnabled, setLocalNotificationsEnabled] = useState(notificationsEnabled);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reminderChangeCounter, setReminderChangeCounter] = useState(0); // Force re-check when reminders change

  // Track changes to detect unsaved state (including reminders)
  useEffect(() => {
    const settingsChanged =
      localChildAge !== childAgeInMonths ||
      localScreenTimeEnabled !== screenTimeEnabled ||
      localNotificationsEnabled !== notificationsEnabled;

    const remindersChanged = reminderService.hasUnsavedChanges();

    setHasUnsavedChanges(settingsChanged || remindersChanged);
  }, [localChildAge, localScreenTimeEnabled, localNotificationsEnabled, childAgeInMonths, screenTimeEnabled, notificationsEnabled, currentPage, reminderChangeCounter]); // Re-check when reminders change

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
    } catch (error) {
      console.error('Failed to load screen time stats:', error);
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
              setLocalChildAge(childAgeInMonths);
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

  const handleAgeChange = (newAge: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalChildAge(newAge);
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Update local app store
      setChildAge(localChildAge);
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
        const ageRange = localChildAge < 24 ? '18-24m' :
                        localChildAge < 72 ? '2-6y' :
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
          console.log('[ScreenTimeScreen] Syncing reminders to backend...');
          reminderService.syncToBackend().catch((error: any) => {
            console.log('[ScreenTimeScreen] Failed to sync reminders:', error);
          });
        }

        console.log('[ScreenTimeScreen] Settings queued for background sync');
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
      console.error('Failed to save settings:', error);
      Alert.alert(
        'Save Failed',
        'Failed to save your settings. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getDailyLimit = () => {
    const screenTimeService = ScreenTimeService.getInstance();
    return screenTimeService.getDailyLimit(childAgeInMonths);
  };

  const formatTime = (seconds: number) => {
    if (seconds === 0) return t('screenTime.noScreenTimeRecommended');
    return formatDurationCompact(seconds);
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

  const getUsagePercentage = (usage: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min((usage / limit) * 100, 100);
  };

  const getAgeRangeText = (ageInMonths: number) => {
    if (ageInMonths < 24) return t('screenTime.age18to24months');
    if (ageInMonths < 72) return t('screenTime.age2to6years');
    return t('screenTime.age6plus');
  };

  const getGuidelinesText = (ageInMonths: number) => {
    if (ageInMonths < 24) {
      return t('screenTime.guidelines18to24');
    }
    if (ageInMonths < 72) {
      return t('screenTime.guidelines2to6');
    }
    return t('screenTime.guidelines6plus');
  };

  // Use local state for display (not yet saved)
  const dailyLimit = useMemo(() => {
    const screenTimeService = ScreenTimeService.getInstance();
    return screenTimeService.getDailyLimit(localChildAge);
  }, [localChildAge]);

  const todayUsage = contextTodayUsage; // Use real-time usage from context
  const usagePercentage = getUsagePercentage(todayUsage, dailyLimit);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1E3A8A', '#1E3A8A', '#1E3A8A']}
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

        {/* Header - Only show for main page */}
        {currentPage === 'main' && (
          <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50), zIndex: 50 }]}>
            <Pressable style={[styles.backButton, { minHeight: scaledButtonSize(40) }]} onPress={handleBack}>
              <Ionicons name="arrow-back" size={scaledButtonSize(24)} color="rgba(255, 255, 255, 0.8)" />
            </Pressable>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { fontSize: scaledFontSize(20) }]}>{t('screenTime.title')}</Text>
            </View>
            <MusicControl size={24} color="#FFFFFF" />
          </View>
        )}

        {/* Conditional Content */}
        {currentPage === 'custom-reminders' && (
          <CustomRemindersScreen
            onBack={() => setCurrentPage('main')}
            onCreateNew={() => setCurrentPage('create-reminder')}
            onReminderChange={() => setReminderChangeCounter(prev => prev + 1)}
          />
        )}

        {currentPage === 'create-reminder' && (
          <CreateReminderScreen
            onBack={() => setCurrentPage('custom-reminders')}
            onSuccess={() => {
              setReminderChangeCounter(prev => prev + 1);
              setCurrentPage('custom-reminders');
            }}
          />
        )}

        {currentPage === 'main' && (
          <ScrollView style={[styles.scrollView, { zIndex: 10 }]} contentContainerStyle={[styles.content, isTablet && { alignItems: 'center' }]}>
          <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>
          {/* Today's Usage */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>{t('screenTime.todaysUsage')}</Text>

            <View style={[styles.usageCard, { padding: scaledPadding(16) }]}>
              <View style={styles.usageHeader}>
                <View style={styles.usageTimeContainer}>
                  <Text style={[styles.usageTime, { fontSize: scaledFontSize(32) }]}>{formatTime(todayUsage)}</Text>
                  <Text style={[styles.usageLimit, { fontSize: scaledFontSize(14) }]}>{t('screenTime.of')} {formatTime(dailyLimit)}</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${usagePercentage}%`,
                      backgroundColor: usagePercentage > 90 ? '#EF4444' : usagePercentage > 70 ? '#F59E0B' : '#10B981'
                    }
                  ]}
                />
              </View>

              <Text style={[styles.usagePercentage, { fontSize: scaledFontSize(14) }]}>
                {t('screenTime.ofDailyLimit', { percentage: usagePercentage.toFixed(0) })}
              </Text>
            </View>
          </View>

          {/* Age Settings */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>{t('screenTime.childsAge')}</Text>

            <View style={styles.ageSelector}>
              <Text style={[styles.currentAge, { fontSize: scaledFontSize(16) }]}>
                {t('screenTime.current', { age: getAgeRangeText(localChildAge) })}
              </Text>

              <View style={styles.ageButtons}>
                <Pressable
                  style={[styles.ageButton, { minHeight: scaledButtonSize(44), paddingVertical: scaledPadding(10), paddingHorizontal: scaledPadding(12) }, localChildAge < 24 && styles.ageButtonActive]}
                  onPress={() => handleAgeChange(20)}
                >
                  <Text style={[styles.ageButtonText, { fontSize: scaledFontSize(14) }, localChildAge < 24 && styles.ageButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                    {t('screenTime.age18to24m')}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.ageButton, { minHeight: scaledButtonSize(44), paddingVertical: scaledPadding(10), paddingHorizontal: scaledPadding(12) }, localChildAge >= 24 && localChildAge < 72 && styles.ageButtonActive]}
                  onPress={() => handleAgeChange(36)}
                >
                  <Text style={[styles.ageButtonText, { fontSize: scaledFontSize(14) }, localChildAge >= 24 && localChildAge < 72 && styles.ageButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                    {t('screenTime.age2to6yrs')}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.ageButton, { minHeight: scaledButtonSize(44), paddingVertical: scaledPadding(10), paddingHorizontal: scaledPadding(12) }, localChildAge >= 72 && styles.ageButtonActive]}
                  onPress={() => handleAgeChange(84)}
                >
                  <Text style={[styles.ageButtonText, { fontSize: scaledFontSize(14) }, localChildAge >= 72 && styles.ageButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                    {t('screenTime.age6plusYrs')}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text style={[styles.guidelines, { fontSize: scaledFontSize(14) }]}>
              {getGuidelinesText(localChildAge)}
            </Text>
          </View>

          {/* Weekly Activity Heatmap */}
          {stats && stats.heatmapData && stats.heatmapData.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>{t('screenTime.weeklyActivityHeatmap')}</Text>

              <View style={styles.chartContainer}>
                <Text style={[styles.chartNote, { fontSize: scaledFontSize(14) }]}>
                  {t('screenTime.screenTimePatterns')}
                </Text>

                {/* Heatmap */}
                <View style={styles.heatmapContainer}>
                  {/* Daily Bar Chart */}
                  <View style={styles.dailyBarChart}>
                    {dayNames.map((dayName, dayIndex) => {
                      const dayData = stats.heatmapData.find(data => data.day === dayIndex);
                      const usage = dayData?.usage || 0;

                      // Get age-appropriate daily limit for proper scaling (use local age for immediate feedback)
                      const dailyLimit = localChildAge < 24 ? 15 * 60 : // 15 minutes in seconds for 18-24 months
                                       localChildAge < 72 ? 60 * 60 : // 60 minutes in seconds for 2-6 years
                                       120 * 60; // 120 minutes in seconds for 6+ years

                      // Recalculate isOverRecommended using localChildAge for immediate UI feedback
                      const isOverRecommended = dailyLimit > 0 && usage > dailyLimit;

                      // Calculate fill percentage based on daily limit (0-100%)
                      const fillPercentage = dailyLimit > 0 ? Math.min((usage / dailyLimit) * 100, 100) : 0;

                      // Color based on usage and age-appropriate recommendations
                      let backgroundColor: string;
                      if (usage === 0) {
                        backgroundColor = 'rgba(255, 255, 255, 0.05)'; // Very light background for no usage
                      } else if (isOverRecommended) {
                        // Orange/amber for excessive usage (single shade)
                        backgroundColor = 'rgba(255, 159, 67, 0.85)';
                      } else {
                        // Teal gradient for recommended usage (light to bright based on fill)
                        const opacity = Math.max(fillPercentage / 100, 0.2);
                        backgroundColor = `rgba(78, 205, 196, ${opacity})`;
                      }

                      // All bars are the same height (100px), but fill based on usage
                      const barFillHeight = Math.max(4, (fillPercentage / 100) * 100); // Minimum 4px for visibility

                      return (
                        <View key={dayIndex} style={styles.dailyBarContainer}>
                          {/* Day label */}
                          <Text style={[styles.dailyBarLabel, { fontSize: scaledFontSize(10) }]}>{dayName}</Text>

                          {/* Usage bar - consistent container size */}
                          <View style={styles.dailyBarWrapper}>
                            <View style={styles.dailyBarBackground}>
                              <View
                                style={[
                                  styles.dailyBarFill,
                                  {
                                    backgroundColor,
                                    height: barFillHeight,
                                  }
                                ]}
                              >
                                {usage > 60 && ( // Only show time if more than 1 minute
                                  <Text style={[styles.dailyBarText, { fontSize: scaledFontSize(8) }]}>
                                    {formatDurationCompact(usage)}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* Legend */}
                  <View style={styles.heatmapLegend}>
                    <Text style={[styles.heatmapLegendTitle, { fontSize: scaledFontSize(12) }]}>{t('screenTime.screenTimeLevel')}</Text>

                    {/* Color Bar - 5 cells: 3 teal (recommended range) + 2 orange (over limit) */}
                    <View style={styles.heatmapLegendColorBar}>
                      <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(78, 205, 196, 0.3)' }]} />
                      <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(78, 205, 196, 0.6)' }]} />
                      <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(78, 205, 196, 1.0)' }]} />
                      <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(255, 159, 67, 0.7)' }]} />
                      <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(255, 159, 67, 1.0)' }]} />
                    </View>

                    {/* Arrow pointing to middle (recommended) cell */}
                    <View style={styles.heatmapArrowContainer}>
                      <Text style={[styles.heatmapArrow, { fontSize: scaledFontSize(12) }]}>▲</Text>
                    </View>

                    {/* Labels Row */}
                    <View style={styles.heatmapLabelsRow}>
                      <View style={styles.heatmapLabelContainer}>
                        <Text style={[styles.heatmapLegendLabel, { fontSize: scaledFontSize(10) }]} numberOfLines={1}>
                          {t('screenTime.noScreenTime')}
                        </Text>
                      </View>
                      <View style={styles.heatmapLabelContainer}>
                        <Text style={[styles.heatmapLegendLabel, { fontSize: scaledFontSize(10) }]} numberOfLines={1}>
                          {t('screenTime.recommended')}
                        </Text>
                      </View>
                      <View style={styles.heatmapLabelContainer}>
                        <Text style={[styles.heatmapLegendLabel, { fontSize: scaledFontSize(10) }]} numberOfLines={1}>
                          {t('screenTime.overLimit')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Create My Schedule */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>{t('screenTime.createMySchedule')}</Text>

            <View style={styles.scheduleIntro}>
              <Text style={[styles.scheduleIntroText, { fontSize: scaledFontSize(14) }]}>
                {t('screenTime.scheduleIntro')}
              </Text>
            </View>

            <Pressable
              style={[styles.createScheduleButton, { minHeight: scaledButtonSize(48), paddingVertical: scaledPadding(12), paddingHorizontal: scaledPadding(20) }]}
              onPress={() => setCurrentPage('custom-reminders')}
            >
              <Text style={[styles.createScheduleButtonText, { fontSize: scaledFontSize(16) }]}>{t('screenTime.createCustomReminders')}</Text>
            </Pressable>

            <View style={styles.recommendedTimes}>
              <Text style={[styles.recommendedTimesTitle, { fontSize: scaledFontSize(16) }]}>{t('screenTime.recommendedTimes')}</Text>
              <Text style={[styles.recommendedTimesText, { fontSize: scaledFontSize(14) }]}>
                {t('screenTime.recommendedTimesIntro')}
              </Text>

              <View style={[styles.timeSlot, { paddingVertical: scaledPadding(8) }]}>
                <Text style={[styles.timeSlotTime, { fontSize: scaledFontSize(14) }]}>9:00 AM - 10:00 AM</Text>
                <Text style={[styles.timeSlotActivity, { fontSize: scaledFontSize(12) }]}>{t('screenTime.morningStoriesEmotions')}</Text>
              </View>

              <View style={[styles.timeSlot, { paddingVertical: scaledPadding(8) }]}>
                <Text style={[styles.timeSlotTime, { fontSize: scaledFontSize(14) }]}>2:00 PM - 3:00 PM</Text>
                <Text style={[styles.timeSlotActivity, { fontSize: scaledFontSize(12) }]}>{t('screenTime.afternoonLearning')}</Text>
              </View>

              <View style={[styles.timeSlot, { paddingVertical: scaledPadding(8) }]}>
                <Text style={[styles.timeSlotTime, { fontSize: scaledFontSize(14) }]}>5:00 PM - 6:00 PM</Text>
                <Text style={[styles.timeSlotActivity, { fontSize: scaledFontSize(12) }]}>{t('screenTime.preDinnerMusic')}</Text>
              </View>
            </View>

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
        )}
      </LinearGradient>

      {/* Tips overlay for first-time visitors */}
      <ScreenTimeTipsOverlay />
    </View>
  );
}

// Content-only component for embedding in horizontal scroll
export function ScreenTimeContent({ paddingTop = 0, onNavigateToReminders }: ScreenTimeContentProps) {
  const { t } = useTranslation();
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet, contentMaxWidth } = useAccessibility();
  const {
    childAgeInMonths,
    screenTimeEnabled,
    notificationsEnabled,
    hasRequestedNotificationPermission,
    setNotificationPermissionRequested,
  } = useAppStore();

  const { todayUsage: contextTodayUsage } = useScreenTime();

  const [stats, setStats] = useState<ScreenTimeStats | null>(null);
  const [localChildAge, setLocalChildAge] = useState(childAgeInMonths);
  const [localScreenTimeEnabled, setLocalScreenTimeEnabled] = useState(screenTimeEnabled);
  const [localNotificationsEnabled, setLocalNotificationsEnabled] = useState(notificationsEnabled);

  // Note: Save button removed - auto-save happens on account screen exit

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
    } catch (error) {
      console.error('Failed to load screen time stats:', error);
    }
  };

  const handleToggleScreenTime = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalScreenTimeEnabled(!localScreenTimeEnabled);
  };

  const handleToggleNotifications = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!localNotificationsEnabled && !hasRequestedNotificationPermission) {
      const notificationService = NotificationService.getInstance();
      const permissionStatus = await notificationService.requestPermissions();
      setNotificationPermissionRequested(true);

      if (permissionStatus.granted) {
        setLocalNotificationsEnabled(true);
        Alert.alert(t('screenTime.notificationsEnabled'), t('screenTime.dontForgetToSave'));
      } else {
        Alert.alert(t('screenTime.permissionRequired'), t('screenTime.enableNotificationsInSettings'));
      }
    } else {
      setLocalNotificationsEnabled(!localNotificationsEnabled);
    }
  };

  const handleAgeChange = (newAge: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalChildAge(newAge);
  };

  // Note: handleSaveSettings removed - auto-save happens on account screen exit

  const formatTime = (seconds: number) => {
    if (seconds === 0) return t('screenTime.noScreenTimeRecommended');
    return formatDurationCompact(seconds);
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

  const getAgeRangeText = (ageInMonths: number) => {
    if (ageInMonths < 24) return t('screenTime.age18to24months');
    if (ageInMonths < 72) return t('screenTime.age2to6years');
    return t('screenTime.age6plus');
  };

  const getGuidelinesText = (ageInMonths: number) => {
    if (ageInMonths < 24) {
      return t('screenTime.guidelines18to24');
    }
    if (ageInMonths < 72) {
      return t('screenTime.guidelines2to6');
    }
    return t('screenTime.guidelines6plus');
  };

  const dailyLimit = useMemo(() => {
    const screenTimeService = ScreenTimeService.getInstance();
    return screenTimeService.getDailyLimit(localChildAge);
  }, [localChildAge]);

  const todayUsage = contextTodayUsage;
  const usagePercentage = dailyLimit > 0 ? Math.min((todayUsage / dailyLimit) * 100, 100) : 0;

  return (
    <View style={{ flex: 1 }}>
      <StarBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop }, isTablet && { alignItems: 'center' }]}
      >
        <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>
          {/* Today's Usage */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>{t('screenTime.todaysUsage')}</Text>

          <View style={[styles.usageCard, { padding: scaledPadding(16) }]}>
            <View style={styles.usageHeader}>
              <View style={styles.usageTimeContainer}>
                <Text style={[styles.usageTime, { fontSize: scaledFontSize(32) }]}>{formatTime(todayUsage)}</Text>
                <Text style={[styles.usageLimit, { fontSize: scaledFontSize(14) }]}>{t('screenTime.of')} {formatTime(dailyLimit)}</Text>
              </View>
            </View>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${usagePercentage}%`,
                    backgroundColor: usagePercentage > 90 ? '#EF4444' : usagePercentage > 70 ? '#F59E0B' : '#10B981'
                  }
                ]}
              />
            </View>

            <Text style={[styles.usagePercentage, { fontSize: scaledFontSize(14) }]}>
              {t('screenTime.ofDailyLimit', { percentage: usagePercentage.toFixed(0) })}
            </Text>
          </View>
        </View>

        {/* Age Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>{t('screenTime.childsAge')}</Text>

          <View style={styles.ageSelector}>
            <Text style={[styles.currentAge, { fontSize: scaledFontSize(16) }]}>
              {t('screenTime.current', { age: getAgeRangeText(localChildAge) })}
            </Text>

            <View style={styles.ageButtons}>
              <Pressable
                style={[styles.ageButton, { minHeight: scaledButtonSize(44), paddingVertical: scaledPadding(10), paddingHorizontal: scaledPadding(12) }, localChildAge < 24 && styles.ageButtonActive]}
                onPress={() => handleAgeChange(20)}
              >
                <Text style={[styles.ageButtonText, { fontSize: scaledFontSize(14) }, localChildAge < 24 && styles.ageButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                  {t('screenTime.age18to24m')}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.ageButton, { minHeight: scaledButtonSize(44), paddingVertical: scaledPadding(10), paddingHorizontal: scaledPadding(12) }, localChildAge >= 24 && localChildAge < 72 && styles.ageButtonActive]}
                onPress={() => handleAgeChange(36)}
              >
                <Text style={[styles.ageButtonText, { fontSize: scaledFontSize(14) }, localChildAge >= 24 && localChildAge < 72 && styles.ageButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                  {t('screenTime.age2to6yrs')}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.ageButton, { minHeight: scaledButtonSize(44), paddingVertical: scaledPadding(10), paddingHorizontal: scaledPadding(12) }, localChildAge >= 72 && styles.ageButtonActive]}
                onPress={() => handleAgeChange(84)}
              >
                <Text style={[styles.ageButtonText, { fontSize: scaledFontSize(14) }, localChildAge >= 72 && styles.ageButtonTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                  {t('screenTime.age6plusYrs')}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={[styles.guidelines, { fontSize: scaledFontSize(14) }]}>
            {getGuidelinesText(localChildAge)}
          </Text>
        </View>

        {/* Weekly Activity Heatmap */}
        {stats && stats.heatmapData && stats.heatmapData.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>{t('screenTime.weeklyActivityHeatmap')}</Text>

            <View style={styles.chartContainer}>
              <Text style={[styles.chartNote, { fontSize: scaledFontSize(14) }]}>
                {t('screenTime.screenTimePatterns')}
              </Text>

              {/* Heatmap */}
              <View style={styles.heatmapContainer}>
                {/* Daily Bar Chart */}
                <View style={styles.dailyBarChart}>
                  {dayNames.map((dayName, dayIndex) => {
                    const dayData = stats.heatmapData.find(data => data.day === dayIndex);
                    const usage = dayData?.usage || 0;

                    // Get age-appropriate daily limit for proper scaling
                    const ageBasedLimit = localChildAge < 24 ? 15 * 60 :
                                     localChildAge < 72 ? 60 * 60 :
                                     120 * 60;

                    // Recalculate isOverRecommended using localChildAge for immediate UI feedback
                    const isOverRecommended = ageBasedLimit > 0 && usage > ageBasedLimit;

                    const fillPercentage = ageBasedLimit > 0 ? Math.min((usage / ageBasedLimit) * 100, 100) : 0;

                    let backgroundColor: string;
                    if (usage === 0) {
                      backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    } else if (isOverRecommended) {
                      // Orange/amber for excessive usage (single shade)
                      backgroundColor = 'rgba(255, 159, 67, 0.85)';
                    } else {
                      // Teal gradient for recommended usage (light to bright based on fill)
                      const opacity = Math.max(fillPercentage / 100, 0.2);
                      backgroundColor = `rgba(78, 205, 196, ${opacity})`;
                    }

                    const barFillHeight = Math.max(4, (fillPercentage / 100) * 100);

                    return (
                      <View key={dayIndex} style={styles.dailyBarContainer}>
                        <Text style={[styles.dailyBarLabel, { fontSize: scaledFontSize(10) }]}>{dayName}</Text>
                        <View style={styles.dailyBarWrapper}>
                          <View style={styles.dailyBarBackground}>
                            <View
                              style={[
                                styles.dailyBarFill,
                                { backgroundColor, height: barFillHeight }
                              ]}
                            >
                              {usage > 60 && (
                                <Text style={[styles.dailyBarText, { fontSize: scaledFontSize(8) }]}>
                                  {formatDurationCompact(usage)}
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Legend - 5 cells: 3 teal (recommended range) + 2 orange (over limit) */}
                <View style={styles.heatmapLegend}>
                  <Text style={[styles.heatmapLegendTitle, { fontSize: scaledFontSize(12) }]}>{t('screenTime.screenTimeLevel')}</Text>
                  <View style={styles.heatmapLegendColorBar}>
                    <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(78, 205, 196, 0.3)' }]} />
                    <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(78, 205, 196, 0.6)' }]} />
                    <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(78, 205, 196, 1.0)' }]} />
                    <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(255, 159, 67, 0.7)' }]} />
                    <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(255, 159, 67, 1.0)' }]} />
                  </View>
                  {/* Arrow pointing to middle (recommended) cell */}
                  <View style={styles.heatmapArrowContainer}>
                    <Text style={[styles.heatmapArrow, { fontSize: scaledFontSize(12) }]}>▲</Text>
                  </View>
                  <View style={styles.heatmapLabelsRow}>
                    <View style={styles.heatmapLabelContainer}>
                      <Text style={[styles.heatmapLegendLabel, { fontSize: scaledFontSize(10) }]} numberOfLines={1}>{t('screenTime.noScreenTime')}</Text>
                    </View>
                    <View style={styles.heatmapLabelContainer}>
                      <Text style={[styles.heatmapLegendLabel, { fontSize: scaledFontSize(10) }]} numberOfLines={1}>{t('screenTime.recommended')}</Text>
                    </View>
                    <View style={styles.heatmapLabelContainer}>
                      <Text style={[styles.heatmapLegendLabel, { fontSize: scaledFontSize(10) }]} numberOfLines={1}>{t('screenTime.overLimit')}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Create My Schedule */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(18) }]}>{t('screenTime.createMySchedule')}</Text>

          <View style={styles.scheduleIntro}>
            <Text style={[styles.scheduleIntroText, { fontSize: scaledFontSize(14) }]}>
              {t('screenTime.scheduleIntro')}
            </Text>
          </View>

          {onNavigateToReminders && (
            <Pressable
              style={[styles.createScheduleButton, { minHeight: scaledButtonSize(48), paddingVertical: scaledPadding(12), paddingHorizontal: scaledPadding(20) }]}
              onPress={onNavigateToReminders}
            >
              <Text style={[styles.createScheduleButtonText, { fontSize: scaledFontSize(16) }]}>{t('screenTime.createCustomReminders')}</Text>
            </Pressable>
          )}

          <View style={styles.recommendedTimes}>
            <Text style={[styles.recommendedTimesTitle, { fontSize: scaledFontSize(16) }]}>{t('screenTime.recommendedTimes')}</Text>
            <Text style={[styles.recommendedTimesText, { fontSize: scaledFontSize(14) }]}>
              {t('screenTime.recommendedTimesIntro')}
            </Text>

            <View style={[styles.timeSlot, { paddingVertical: scaledPadding(8) }]}>
              <Text style={[styles.timeSlotTime, { fontSize: scaledFontSize(14) }]}>9:00 AM - 10:00 AM</Text>
              <Text style={[styles.timeSlotActivity, { fontSize: scaledFontSize(12) }]}>{t('screenTime.morningStoriesEmotions')}</Text>
            </View>

            <View style={[styles.timeSlot, { paddingVertical: scaledPadding(8) }]}>
              <Text style={[styles.timeSlotTime, { fontSize: scaledFontSize(14) }]}>2:00 PM - 3:00 PM</Text>
              <Text style={[styles.timeSlotActivity, { fontSize: scaledFontSize(12) }]}>{t('screenTime.afternoonLearning')}</Text>
            </View>

            <View style={[styles.timeSlot, { paddingVertical: scaledPadding(8) }]}>
              <Text style={[styles.timeSlotTime, { fontSize: scaledFontSize(14) }]}>5:00 PM - 6:00 PM</Text>
              <Text style={[styles.timeSlotActivity, { fontSize: scaledFontSize(12) }]}>{t('screenTime.preDinnerMusic')}</Text>
            </View>
          </View>

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
                {t('screenTime.monitorAndLimit')}
              </Text>
            </View>
            <Pressable
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
                {t('screenTime.receiveGentleNotifications')}
              </Text>
            </View>
            <Pressable
              style={[styles.toggle, localNotificationsEnabled && styles.toggleActive]}
              onPress={handleToggleNotifications}
            >
              <View style={[styles.toggleThumb, localNotificationsEnabled && styles.toggleThumbActive]} />
            </Pressable>
          </View>
        </View>

          {/* Save button removed - auto-save on exit from account screen */}
        </View>
      </ScrollView>
    </View>
  );
}
