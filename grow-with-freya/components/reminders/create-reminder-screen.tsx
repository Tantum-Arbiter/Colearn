import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reminderService, ReminderService, CustomReminder } from '../../services/reminder-service';
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

interface CreateReminderScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const CreateReminderScreen: React.FC<CreateReminderScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, scaledPadding } = useAccessibility();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const getDefaultTime = () => {
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0); // Default to 9:00 AM
    return defaultTime;
  };

  const [selectedTime, setSelectedTime] = useState(getDefaultTime());

  // Star animation
  const starOpacity = useSharedValue(0.4);
  const stars = useMemo(() => generateStarPositions(), []);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTimeOptions, setShowTimeOptions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [existingReminders, setExistingReminders] = useState<CustomReminder[]>([]);

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update unsaved changes flag whenever form fields change
  useEffect(() => {
    const changed =
      title.trim() !== '' ||
      message.trim() !== '' ||
      selectedDay !== null;
    setHasUnsavedChanges(changed);
  }, [title, message, selectedDay]);

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

  const daysOfWeek = [
    { value: 0, label: 'Sunday', short: 'Sun' },
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' },
  ];

  const timeOptions = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30'
  ];

  const exerciseTemplates = [
    // App-specific templates first
    {
      title: 'Read Interactive Book',
      message: 'Time to explore a wonderful story together! Pick a favorite book and dive in.',
    },
    {
      title: 'Do Emotion Cards',
      message: 'Let\'s practice identifying feelings! Time for some emotion card activities.',
    },
    {
      title: 'Going Out to the Park',
      message: 'Time for some fresh air and outdoor fun! Let\'s head to the park.',
    },
    {
      title: '15 Minute Buggy Stroll',
      message: 'Perfect time for a gentle stroll! Get some fresh air and explore the neighborhood.',
    },
    // UK mum activities
    {
      title: 'School Run',
      message: 'Time to get ready for the school run! Gather bags, coats, and head out.',
    },
    {
      title: 'Nursery Drop-off',
      message: 'Time for nursery drop-off! Get little one ready and head out.',
    },
    {
      title: 'Toddler Group',
      message: 'Time for toddler group! Pack snacks and toys for a fun social session.',
    },
    {
      title: 'Soft Play Visit',
      message: 'Time for soft play! Let the children burn off some energy indoors.',
    },
    {
      title: 'Weekly Food Shop',
      message: 'Time for the weekly shop! Don\'t forget the shopping list and bags for life.',
    },
    {
      title: 'Swimming Lessons',
      message: 'Time for swimming! Pack towels, goggles, and swimming kit.',
    },
    {
      title: 'Library Story Time',
      message: 'Time for library story time! A lovely quiet activity with books and songs.',
    },
    {
      title: 'Coffee with Friends',
      message: 'Time to meet friends for coffee! A well-deserved break and catch-up.',
    },
    {
      title: 'Bedtime Routine',
      message: 'Time to start the bedtime routine! Bath, stories, and settling down.',
    },
    {
      title: 'Morning Stretch',
      message: 'Time for your morning stretching routine! Start your day with gentle movements.',
    },
  ];

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setSelectedTime(selectedDate);
    }
  };

  useEffect(() => {
    loadExistingReminders();
  }, []);

  const loadExistingReminders = async () => {
    try {
      const reminders = await reminderService.getAllReminders();
      setExistingReminders(reminders);
    } catch (error) {
      console.error('Failed to load existing reminders:', error);
    }
  };

  const isTimeSlotTaken = (dayOfWeek: number, timeString: string): boolean => {
    return existingReminders.some(reminder =>
      reminder.dayOfWeek === dayOfWeek &&
      reminder.time === timeString &&
      reminder.isActive
    );
  };

  const getActivityCount = (timeString: string): number => {
    return existingReminders.filter(reminder =>
      reminder.time === timeString &&
      reminder.isActive
    ).length;
  };

  // Remove time blocking - allow all times for all days
  const isTimeTooSoon = (timeString: string, dayOfWeek: number): boolean => {
    return false; // Allow all times for all days
  };

  const handleTimeOptionSelect = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const newTime = new Date();
    newTime.setHours(hours, minutes, 0, 0);
    setSelectedTime(newTime);
    setShowTimeOptions(false);
  };

  const formatTime = (date: Date): string => {
    return date.toTimeString().slice(0, 5); // HH:MM format
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave without saving?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: onBack }
        ]
      );
    } else {
      onBack();
    }
  };

  const handleCreateReminder = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your reminder.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Missing Message', 'Please enter a message for your reminder.');
      return;
    }

    if (selectedDay === null) {
      Alert.alert('Missing Day', 'Please select a day of the week for your reminder.');
      return;
    }

    // Check for time slot conflict
    const timeString = formatTime(selectedTime);
    if (isTimeSlotTaken(selectedDay, timeString)) {
      Alert.alert(
        'Time Slot Conflict',
        `You already have a reminder set for ${ReminderService.getDayName(selectedDay)} at ${ReminderService.formatTime(timeString)}. Please choose a different time.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setCreating(true);

      await reminderService.createReminder(
        title.trim(),
        message.trim(),
        selectedDay,
        timeString
      );

      // Clear unsaved changes flag
      setHasUnsavedChanges(false);

      // Return to reminders list - user will save on main Screen Time page
      onSuccess();
    } catch (error) {
      console.error('Failed to create reminder:', error);
      Alert.alert('Error', 'Failed to create reminder. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleUseTemplate = (template: typeof exerciseTemplates[0]) => {
    setTitle(template.title);
    setMessage(template.message);
  };

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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50) }]}>
          <Pressable onPress={handleBack} style={[styles.backButton, { minHeight: scaledButtonSize(40) }]}>
            <Ionicons name="arrow-back" size={scaledButtonSize(24)} color="rgba(255, 255, 255, 0.8)" />
          </Pressable>
          <Text style={[styles.title, { fontSize: scaledFontSize(20) }]}>Create Reminder</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Exercise Templates */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(16) }]}>Quick Templates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
            {exerciseTemplates.map((template, index) => (
              <Pressable
                key={index}
                onPress={() => handleUseTemplate(template)}
                style={[styles.templateCard, { padding: scaledPadding(12) }]}
              >
                <Text style={[styles.templateTitle, { fontSize: scaledFontSize(14) }]}>{template.title}</Text>
                <Text style={[styles.templateMessage, { fontSize: scaledFontSize(12) }]} numberOfLines={2}>
                  {template.message}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Form */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(16) }]}>Reminder Details</Text>

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: scaledFontSize(14) }]}>Title</Text>
            <TextInput
              style={[styles.textInput, { fontSize: scaledFontSize(16), padding: scaledPadding(12) }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter reminder title..."
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              maxLength={50}
            />
          </View>

          {/* Message Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: scaledFontSize(14) }]}>Message</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput, { fontSize: scaledFontSize(16), padding: scaledPadding(12) }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Enter reminder message..."
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          {/* Day Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: scaledFontSize(14) }]}>Day of Week</Text>
            <View style={styles.daySelector}>
              {daysOfWeek.map(day => (
                <Pressable
                  key={day.value}
                  onPress={() => setSelectedDay(day.value)}
                  style={[
                    styles.dayButton,
                    { minHeight: scaledButtonSize(40), paddingVertical: scaledPadding(8), paddingHorizontal: scaledPadding(10) },
                    selectedDay === day.value && styles.dayButtonSelected
                  ]}
                >
                  <Text style={[
                    styles.dayButtonText,
                    { fontSize: scaledFontSize(12) },
                    selectedDay === day.value && styles.dayButtonTextSelected
                  ]}>
                    {day.short}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Time Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: scaledFontSize(14) }]}>Time</Text>
            <Pressable onPress={() => setShowTimeOptions(!showTimeOptions)} style={[styles.timeButton, { minHeight: scaledButtonSize(44), paddingVertical: scaledPadding(12), paddingHorizontal: scaledPadding(16) }]}>
              <Ionicons name="time-outline" size={scaledButtonSize(20)} color="rgba(255, 255, 255, 0.8)" />
              <Text style={[styles.timeButtonText, { fontSize: scaledFontSize(16) }]}>
                {ReminderService.formatTime(formatTime(selectedTime))}
              </Text>
              <Ionicons
                name={showTimeOptions ? "chevron-up" : "chevron-down"}
                size={scaledButtonSize(16)}
                color="rgba(255, 255, 255, 0.6)"
              />
            </Pressable>
          </View>

          {/* Time Options Grid */}
          {showTimeOptions && (
            <View style={styles.timeOptionsContainer}>
              <View style={styles.timeOptionsGrid}>
                {timeOptions.map((time) => {
                  const isConflict = selectedDay !== null && isTimeSlotTaken(selectedDay, time);
                  const isSelected = formatTime(selectedTime) === time;
                  const isTooSoon = selectedDay !== null && isTimeTooSoon(time, selectedDay);
                  const isDisabled = isTooSoon || isConflict;

                  return (
                    <Pressable
                      key={time}
                      onPress={() => !isDisabled && handleTimeOptionSelect(time)}
                      disabled={isDisabled}
                      style={[
                        styles.timeOptionButton,
                        { minHeight: scaledButtonSize(36), paddingVertical: scaledPadding(8), paddingHorizontal: scaledPadding(12) },
                        isSelected && styles.timeOptionButtonSelected,
                        isConflict && styles.timeOptionButtonConflict,
                        isTooSoon && styles.timeOptionButtonDisabled
                      ]}
                    >
                      <Text style={[
                        styles.timeOptionText,
                        { fontSize: scaledFontSize(12) },
                        isSelected && styles.timeOptionTextSelected,
                        isConflict && styles.timeOptionTextConflict,
                        isTooSoon && styles.timeOptionTextDisabled
                      ]}>
                        {ReminderService.formatTime(time)}
                      </Text>
                      {/* Only show conflict indicator for selected day */}
                      {isConflict && (
                        <View style={[styles.activityIndicator, { backgroundColor: 'rgba(255, 99, 71, 1)' }]}>
                          <Text style={[styles.activityCount, { fontSize: scaledFontSize(10) }]}>!</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.conflictHint, { fontSize: scaledFontSize(12) }]}>
                {selectedDay !== null && isTimeSlotTaken(selectedDay, formatTime(selectedTime))
                  ? '⚠️ This time slot is already taken for this day'
                  : selectedDay !== null
                    ? 'Red (!) shows conflicts for selected day. All times are available.'
                    : 'Select a day to see time availability'}
              </Text>

            </View>
          )}

          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* Create Button */}
        <View style={styles.section}>
          <Pressable
            onPress={handleCreateReminder}
            disabled={creating}
            style={[styles.createButton, { minHeight: scaledButtonSize(48), paddingVertical: scaledPadding(14) }, creating && styles.createButtonDisabled]}
          >
            <Text style={[styles.createButtonText, { fontSize: scaledFontSize(16) }]}>
              {creating ? 'Creating...' : 'Create Reminder'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};
