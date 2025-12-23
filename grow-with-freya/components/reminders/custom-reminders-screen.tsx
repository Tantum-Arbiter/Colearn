import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reminderService, ReminderService, CustomReminder, ReminderStats } from '../../services/reminder-service';
import { styles } from './styles';
import { useAccessibility } from '@/hooks/use-accessibility';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

interface CustomRemindersScreenProps {
  onBack: () => void;
  onCreateNew: () => void;
  onReminderChange?: () => void; // Callback when reminders are modified
}

export const CustomRemindersScreen: React.FC<CustomRemindersScreenProps> = ({
  onBack,
  onCreateNew,
  onReminderChange,
}) => {
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet, contentMaxWidth } = useAccessibility();
  const [reminders, setReminders] = useState<CustomReminder[]>([]);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Star animation
  const starOpacity = useSharedValue(0.4);
  const stars = useMemo(() => generateStarPositions(), []);

  useEffect(() => {
    loadReminders();
  }, []);

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

  const loadReminders = async () => {
    try {
      setLoading(true);
      const [allReminders, reminderStats] = await Promise.all([
        reminderService.getAllReminders(),
        reminderService.getReminderStats(),
      ]);

      console.log('[CustomRemindersScreen] Loaded reminders:', allReminders.map(r => ({ id: r.id, title: r.title, isActive: r.isActive })));

      setReminders(allReminders);
      setStats(reminderStats);
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReminder = async (reminderId: string, title: string) => {
    Alert.alert(
      'Delete Reminder',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await reminderService.deleteReminder(reminderId);
            if (success) {
              await loadReminders();
              onReminderChange?.(); // Notify parent that reminders changed
            }
          },
        },
      ]
    );
  };

  const handleToggleReminder = async (reminderId: string) => {
    console.log('[CustomRemindersScreen] Toggling reminder:', reminderId);
    const success = await reminderService.toggleReminder(reminderId);
    if (success) {
      // Reload reminders from service to get the authoritative state
      const updatedReminders = await reminderService.getAllReminders();
      console.log('[CustomRemindersScreen] Reloaded state from service:', updatedReminders.map(r => ({ id: r.id, title: r.title, isActive: r.isActive })));
      setReminders(updatedReminders);

      // Reload stats to update the counts
      try {
        const reminderStats = await reminderService.getReminderStats();
        setStats(reminderStats);
      } catch (error) {
        console.error('Failed to reload reminder stats:', error);
      }

      // Notify parent that reminders changed
      onReminderChange?.();
    }
  };

  const groupRemindersByDay = (reminders: CustomReminder[]) => {
    const grouped: { [key: number]: CustomReminder[] } = {};
    
    reminders.forEach(reminder => {
      if (!grouped[reminder.dayOfWeek]) {
        grouped[reminder.dayOfWeek] = [];
      }
      grouped[reminder.dayOfWeek].push(reminder);
    });

    // Sort reminders within each day by time
    Object.keys(grouped).forEach(day => {
      grouped[parseInt(day)].sort((a, b) => a.time.localeCompare(b.time));
    });

    return grouped;
  };

  const groupedReminders = groupRemindersByDay(reminders);
  const daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={isTablet ? { alignItems: 'center' } : undefined}>
        <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50) }]}>
          <Pressable onPress={onBack} style={[styles.backButton, { minHeight: scaledButtonSize(40) }]}>
            <Ionicons name="arrow-back" size={scaledButtonSize(24)} color="rgba(255, 255, 255, 0.8)" />
          </Pressable>
          <Text style={[styles.title, { fontSize: scaledFontSize(20) }]}>Custom Reminders</Text>
          <Pressable onPress={onCreateNew} style={[styles.addButton, { minHeight: scaledButtonSize(40) }]}>
            <Ionicons name="add" size={scaledButtonSize(24)} color="rgba(255, 255, 255, 0.8)" />
          </Pressable>
        </View>

        {/* Stats */}
        {stats && (
          <View style={[styles.statsContainer, { padding: scaledPadding(16) }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { fontSize: scaledFontSize(24) }]}>{stats.totalReminders}</Text>
              <Text style={[styles.statLabel, { fontSize: scaledFontSize(12) }]}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { fontSize: scaledFontSize(24) }]}>{stats.activeReminders}</Text>
              <Text style={[styles.statLabel, { fontSize: scaledFontSize(12) }]}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { fontSize: scaledFontSize(24) }]}>{stats.upcomingToday.length}</Text>
              <Text style={[styles.statLabel, { fontSize: scaledFontSize(12) }]}>Today</Text>
            </View>
          </View>
        )}

        {/* Reminders by Day */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { fontSize: scaledFontSize(16) }]}>Loading reminders...</Text>
          </View>
        ) : reminders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={scaledButtonSize(64)} color="rgba(255, 255, 255, 0.3)" />
            <Text style={[styles.emptyTitle, { fontSize: scaledFontSize(20) }]}>No Custom Reminders</Text>
            <Text style={[styles.emptyMessage, { fontSize: scaledFontSize(14) }]}>
              Create your first reminder to get started with personalized exercise notifications.
            </Text>
            <Pressable onPress={onCreateNew} style={[styles.createFirstButton, { minHeight: scaledButtonSize(48), paddingVertical: scaledPadding(12), paddingHorizontal: scaledPadding(24) }]}>
              <Text style={[styles.createFirstButtonText, { fontSize: scaledFontSize(16) }]}>Create First Reminder</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.remindersContainer}>
            {daysOfWeek.map(dayOfWeek => {
              const dayReminders = groupedReminders[dayOfWeek] || [];
              if (dayReminders.length === 0) return null;

              return (
                <View key={dayOfWeek} style={styles.daySection}>
                  <Text style={[styles.dayTitle, { fontSize: scaledFontSize(16) }]}>
                    {ReminderService.getDayName(dayOfWeek)}
                  </Text>

                  {dayReminders.map(reminder => (
                    <View key={reminder.id} style={[styles.reminderCard, { padding: scaledPadding(12) }]}>
                      <View style={styles.reminderContent}>
                        <View style={styles.reminderHeader}>
                          <Text style={[styles.reminderTitle, { fontSize: scaledFontSize(16) }]}>{reminder.title}</Text>
                          <Text style={[styles.reminderTime, { fontSize: scaledFontSize(14) }]}>
                            {ReminderService.formatTime(reminder.time)}
                          </Text>
                        </View>

                        <Text style={[styles.reminderMessage, { fontSize: scaledFontSize(12) }]}>{reminder.message}</Text>

                        <View style={styles.reminderActions}>
                          <Pressable
                            onPress={() => handleToggleReminder(reminder.id)}
                            style={[
                              styles.toggleButton,
                              { minHeight: scaledButtonSize(32), paddingVertical: scaledPadding(6), paddingHorizontal: scaledPadding(10) },
                              reminder.isActive ? styles.toggleButtonActive : styles.toggleButtonInactive
                            ]}
                          >
                            <Ionicons
                              name={reminder.isActive ? "notifications" : "notifications-off"}
                              size={scaledButtonSize(16)}
                              color={reminder.isActive ? "#4CAF50" : "rgba(255, 255, 255, 0.5)"}
                            />
                            <Text style={[
                              styles.toggleButtonText,
                              { fontSize: scaledFontSize(12) },
                              reminder.isActive ? styles.toggleButtonTextActive : styles.toggleButtonTextInactive
                            ]}>
                              {reminder.isActive ? 'Active' : 'Inactive'}
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => handleDeleteReminder(reminder.id, reminder.title)}
                            style={[styles.deleteButton, { minHeight: scaledButtonSize(32), padding: scaledPadding(8) }]}
                          >
                            <Ionicons name="trash-outline" size={scaledButtonSize(16)} color="#FF6B6B" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
};
