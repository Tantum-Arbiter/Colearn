import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useAppStore } from '../../store/app-store';
import { MoonBottomImage } from '../main-menu/animated-components';
import { mainMenuStyles } from '../main-menu/styles';
import { MusicControl } from '../ui/music-control';
import ScreenTimeService, { ScreenTimeStats, SCREEN_TIME_LIMITS } from '../../services/screen-time-service';
import NotificationService from '../../services/notification-service';
import { useScreenTime } from './screen-time-provider';
import { CustomRemindersScreen, CreateReminderScreen } from '../reminders';
import { styles } from './styles';
import { formatDurationCompact } from '../../utils/time-formatting';
import { ApiClient } from '@/services/api-client';
import { reminderService } from '@/services/reminder-service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScreenTimeScreenProps {
  onBack: () => void;
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
  const insets = useSafeAreaInsets();
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

      // Sync to backend (only if authenticated)
      const isAuthenticated = await ApiClient.isAuthenticated();
      if (isAuthenticated) {
        try {
          // Convert age to age range string
          const ageRange = localChildAge < 24 ? '18-24m' :
                          localChildAge < 72 ? '2-6y' :
                          '6+';

          let profile;
          try {
            // Try to get existing profile
            profile = await ApiClient.getProfile();
          } catch (error: any) {
            // Profile doesn't exist - create one with default nickname/avatar
            if (error.message?.includes('404')) {
              console.log('[ScreenTimeScreen] No profile found - creating one with settings');
              profile = {
                nickname: 'User',
                avatarType: 'girl' as const,
                avatarId: 'girl-1',
                notifications: {},
                schedule: {},
              };
            } else {
              throw error;
            }
          }

          // Update or create profile with new settings
          await ApiClient.updateProfile({
            nickname: profile.nickname,
            avatarType: profile.avatarType,
            avatarId: profile.avatarId,
            notifications: {
              ...(profile.notifications || {}),
              screenTimeEnabled: localScreenTimeEnabled,
              smartRemindersEnabled: localNotificationsEnabled,
            },
            schedule: {
              ...(profile.schedule || {}),
              childAgeRange: ageRange,
            },
          });

          // Sync reminders to backend (only if reminders changed)
          if (reminderService.hasUnsavedChanges()) {
            console.log('[ScreenTimeScreen] Syncing reminders to backend...');
            await reminderService.syncToBackend();
          }

          console.log('[ScreenTimeScreen] Settings synced to backend');
        } catch (error: any) {
          console.log('[ScreenTimeScreen] Failed to sync to backend:', error);
          // Still commit reminders locally
          if (reminderService.hasUnsavedChanges()) {
            await reminderService.commitChanges();
          }
        }
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
    if (seconds === 0) return 'No screen time recommended';
    return formatDurationCompact(seconds);
  };

  const formatDayOfWeek = (day: string) => {
    const dayMap: { [key: string]: string } = {
      'Sunday': 'Sun',
      'Monday': 'Mon',
      'Tuesday': 'Tue',
      'Wednesday': 'Wed',
      'Thursday': 'Thu',
      'Friday': 'Fri',
      'Saturday': 'Sat',
    };
    return dayMap[day] || day.slice(0, 3);
  };



  const getUsagePercentage = (usage: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min((usage / limit) * 100, 100);
  };

  const getAgeRangeText = (ageInMonths: number) => {
    if (ageInMonths < 24) return '18-24 months';
    if (ageInMonths < 72) return '2-6 years old';
    return '6+ years';
  };

  const getGuidelinesText = (ageInMonths: number) => {
    if (ageInMonths < 24) {
      return 'WHO/AAP Guidelines: Up to 15 minutes of high-quality content with parent co-engagement.';
    }
    if (ageInMonths < 72) {
      return 'WHO/AAP Guidelines: Up to 1 hour of high-quality programming with parent involvement.';
    }
    return 'For children 6+ years, establish consistent limits on screen time and ensure it doesn\'t interfere with sleep, physical activity, and other healthy behaviors.';
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
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="rgba(255, 255, 255, 0.8)" />
            </Pressable>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Screen Time</Text>
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
          <ScrollView style={[styles.scrollView, { zIndex: 10 }]} contentContainerStyle={styles.content}>
          {/* Today's Usage */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today&apos;s Usage</Text>
            
            <View style={styles.usageCard}>
              <View style={styles.usageHeader}>
                <View style={styles.usageTimeContainer}>
                  <Text style={styles.usageTime}>{formatTime(todayUsage)}</Text>
                  <Text style={styles.usageLimit}>of {formatTime(dailyLimit)}</Text>
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
              
              <Text style={styles.usagePercentage}>
                {usagePercentage.toFixed(0)}% of daily limit
              </Text>
            </View>
          </View>

          {/* Age Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Child&apos;s Age</Text>

            <View style={styles.ageSelector}>
              <Text style={styles.currentAge}>
                Current: {getAgeRangeText(localChildAge)}
              </Text>

              <View style={styles.ageButtons}>
                <Pressable
                  style={[styles.ageButton, localChildAge < 24 && styles.ageButtonActive]}
                  onPress={() => handleAgeChange(20)}
                >
                  <Text style={[styles.ageButtonText, localChildAge < 24 && styles.ageButtonTextActive]}>
                    18-24 months
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.ageButton, localChildAge >= 24 && localChildAge < 72 && styles.ageButtonActive]}
                  onPress={() => handleAgeChange(36)}
                >
                  <Text style={[styles.ageButtonText, localChildAge >= 24 && localChildAge < 72 && styles.ageButtonTextActive]}>
                    2-6 years old
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.ageButton, localChildAge >= 72 && styles.ageButtonActive]}
                  onPress={() => handleAgeChange(84)}
                >
                  <Text style={[styles.ageButtonText, localChildAge >= 72 && styles.ageButtonTextActive]}>
                    6+ years
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.guidelines}>
              {getGuidelinesText(localChildAge)}
            </Text>
          </View>

          {/* Weekly Activity Heatmap */}
          {stats && stats.heatmapData && stats.heatmapData.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Weekly Activity Heatmap</Text>

              <View style={styles.chartContainer}>
                <Text style={styles.chartNote}>
                  Your child&apos;s screen time patterns by day
                </Text>

                {/* Heatmap */}
                <View style={styles.heatmapContainer}>
                  {/* Daily Bar Chart */}
                  <View style={styles.dailyBarChart}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, dayIndex) => {
                      const dayData = stats.heatmapData.find(data => data.day === dayIndex);
                      const usage = dayData?.usage || 0;
                      const isOverRecommended = dayData?.isOverRecommended || false;

                      // Get age-appropriate daily limit for proper scaling (use local age for immediate feedback)
                      const dailyLimit = localChildAge < 24 ? 15 * 60 : // 15 minutes in seconds for 18-24 months
                                       localChildAge < 72 ? 60 * 60 : // 60 minutes in seconds for 2-6 years
                                       120 * 60; // 120 minutes in seconds for 6+ years

                      // Calculate fill percentage based on daily limit (0-100%)
                      const fillPercentage = dailyLimit > 0 ? Math.min((usage / dailyLimit) * 100, 100) : 0;

                      // Color based on usage and age-appropriate recommendations
                      let backgroundColor: string;
                      if (usage === 0) {
                        backgroundColor = 'rgba(255, 255, 255, 0.05)'; // Very light background for no usage
                      } else if (isOverRecommended) {
                        // Red for excessive usage
                        backgroundColor = `rgba(255, 99, 71, ${Math.max(fillPercentage / 100, 0.3)})`;
                      } else {
                        // Light blue to bright blue for recommended usage
                        backgroundColor = `rgba(78, 205, 196, ${Math.max(fillPercentage / 100, 0.2)})`;
                      }

                      // All bars are the same height (100px), but fill based on usage
                      const barFillHeight = Math.max(4, (fillPercentage / 100) * 100); // Minimum 4px for visibility

                      return (
                        <View key={dayIndex} style={styles.dailyBarContainer}>
                          {/* Day label */}
                          <Text style={styles.dailyBarLabel}>{dayName}</Text>

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
                                  <Text style={styles.dailyBarText}>
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
                    <Text style={styles.heatmapLegendTitle}>Screen Time Level</Text>

                    {/* Color Bar */}
                    <View style={styles.heatmapLegendColorBar}>
                      {/* All color cells in a row */}
                      <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(78, 205, 196, 0.2)' }]} />
                      <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(78, 205, 196, 0.4)' }]} />
                      <View style={[styles.heatmapLegendCell, styles.heatmapRecommendedCell, { backgroundColor: 'rgba(78, 205, 196, 1.0)' }]} />
                      <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(255, 99, 71, 0.6)' }]} />
                      <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(255, 99, 71, 0.8)' }]} />
                      <View style={[styles.heatmapLegendCell, { backgroundColor: 'rgba(255, 99, 71, 1.0)' }]} />

                    </View>

                    {/* Labels Row - Separate from color bar */}
                    <View style={styles.heatmapLabelsRow}>
                      <View style={styles.heatmapLabelContainer}>
                        <Text style={styles.heatmapLegendLabel} numberOfLines={1}>
                          No Screen Time
                        </Text>
                      </View>
                      <View style={styles.heatmapLabelContainer}>
                        <Text style={styles.heatmapLegendLabel} numberOfLines={1}>
                          Recommended
                        </Text>
                      </View>
                      <View style={styles.heatmapLabelContainer}>
                        <Text style={styles.heatmapLegendLabel} numberOfLines={1}>
                          Excessive
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
            <Text style={styles.sectionTitle}>Create My Schedule</Text>

            <View style={styles.scheduleIntro}>
              <Text style={styles.scheduleIntroText}>
                Set up personalized notification times for your child&apos;s screen time activities. You&apos;ll receive gentle reminders when it&apos;s time for stories, emotions, or music activities.
              </Text>
            </View>

            <Pressable
              style={styles.createScheduleButton}
              onPress={() => setCurrentPage('custom-reminders')}
            >
              <Text style={styles.createScheduleButtonText}>+ Create Custom Reminders</Text>
            </Pressable>

            <View style={styles.recommendedTimes}>
              <Text style={styles.recommendedTimesTitle}>Recommended Times</Text>
              <Text style={styles.recommendedTimesText}>
                Based on child development research, the best times for screen activities are:
              </Text>

              <View style={styles.timeSlot}>
                <Text style={styles.timeSlotTime}>9:00 AM - 10:00 AM</Text>
                <Text style={styles.timeSlotActivity}>Morning stories & emotions</Text>
              </View>

              <View style={styles.timeSlot}>
                <Text style={styles.timeSlotTime}>2:00 PM - 3:00 PM</Text>
                <Text style={styles.timeSlotActivity}>Afternoon learning activities</Text>
              </View>

              <View style={styles.timeSlot}>
                <Text style={styles.timeSlotTime}>5:00 PM - 6:00 PM</Text>
                <Text style={styles.timeSlotActivity}>Pre-dinner wind down music</Text>
              </View>
            </View>

            <View style={styles.bedtimeWarning}>
              <Text style={styles.bedtimeWarningTitle}>Bedtime Guidelines</Text>
              <Text style={styles.bedtimeWarningText}>
                Screen time after 7 PM can interfere with sleep quality. For best results, finish screen activities at least 1 hour before bedtime to help your child wind down naturally.
              </Text>
            </View>
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Screen Time Controls</Text>
                <Text style={styles.settingDescription}>
                  Monitor and limit daily screen time based on WHO/AAP guidelines
                </Text>
              </View>
              <Pressable
                style={[styles.toggle, localScreenTimeEnabled && styles.toggleActive]}
                onPress={handleToggleScreenTime}
              >
                <View style={[styles.toggleThumb, localScreenTimeEnabled && styles.toggleThumbActive]} />
              </Pressable>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Smart Reminders</Text>
                <Text style={styles.settingDescription}>
                  Receive gentle notifications for recommended activity times
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
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSaveSettings}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Text>
              </Pressable>
              <Text style={styles.saveNote}>
                Your settings will be synced across all your devices
              </Text>
            </View>
          )}
          </ScrollView>
        )}
      </LinearGradient>
    </View>
  );
}
