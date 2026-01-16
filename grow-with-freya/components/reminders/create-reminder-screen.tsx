import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { reminderService, ReminderService, CustomReminder } from '../../services/reminder-service';
import { styles } from './styles';
import { useAccessibility } from '@/hooks/use-accessibility';
import { StarBackground } from '@/components/ui/star-background';

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

// Props for content-only version (for embedding in horizontal scroll)
interface CreateReminderContentProps {
  paddingTop?: number;
  onBack: () => void;
  onSuccess: () => void;
  refreshTrigger?: number; // Increment to trigger reload of existing reminders
  isActive?: boolean; // Whether this screen is currently visible
}

export const CreateReminderScreen: React.FC<CreateReminderScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet, contentMaxWidth } = useAccessibility();
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
    { value: 0, key: 'sunday', short: t('reminders.daysShort.sunday') },
    { value: 1, key: 'monday', short: t('reminders.daysShort.monday') },
    { value: 2, key: 'tuesday', short: t('reminders.daysShort.tuesday') },
    { value: 3, key: 'wednesday', short: t('reminders.daysShort.wednesday') },
    { value: 4, key: 'thursday', short: t('reminders.daysShort.thursday') },
    { value: 5, key: 'friday', short: t('reminders.daysShort.friday') },
    { value: 6, key: 'saturday', short: t('reminders.daysShort.saturday') },
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
      title: t('reminders.templates.readBook.title'),
      message: t('reminders.templates.readBook.message'),
    },
    {
      title: t('reminders.templates.emotionCards.title'),
      message: t('reminders.templates.emotionCards.message'),
    },
    {
      title: t('reminders.templates.park.title'),
      message: t('reminders.templates.park.message'),
    },
    {
      title: t('reminders.templates.buggyStroll.title'),
      message: t('reminders.templates.buggyStroll.message'),
    },
    // UK mum activities
    {
      title: t('reminders.templates.schoolRun.title'),
      message: t('reminders.templates.schoolRun.message'),
    },
    {
      title: t('reminders.templates.nurseryDropoff.title'),
      message: t('reminders.templates.nurseryDropoff.message'),
    },
    {
      title: t('reminders.templates.toddlerGroup.title'),
      message: t('reminders.templates.toddlerGroup.message'),
    },
    {
      title: t('reminders.templates.softPlay.title'),
      message: t('reminders.templates.softPlay.message'),
    },
    {
      title: t('reminders.templates.foodShop.title'),
      message: t('reminders.templates.foodShop.message'),
    },
    {
      title: t('reminders.templates.swimming.title'),
      message: t('reminders.templates.swimming.message'),
    },
    {
      title: t('reminders.templates.libraryStoryTime.title'),
      message: t('reminders.templates.libraryStoryTime.message'),
    },
    {
      title: t('reminders.templates.coffeeWithFriends.title'),
      message: t('reminders.templates.coffeeWithFriends.message'),
    },
    {
      title: t('reminders.templates.bedtimeRoutine.title'),
      message: t('reminders.templates.bedtimeRoutine.message'),
    },
    {
      title: t('reminders.templates.morningStretch.title'),
      message: t('reminders.templates.morningStretch.message'),
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
        t('alerts.unsavedChanges.title', { defaultValue: 'Unsaved Changes' }),
        t('alerts.unsavedChanges.message', { defaultValue: 'You have unsaved changes. Are you sure you want to leave without saving?' }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.yes'), style: 'destructive', onPress: onBack }
        ]
      );
    } else {
      onBack();
    }
  };

  const handleCreateReminder = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert(t('alerts.missingTitle.title'), t('alerts.missingTitle.message'));
      return;
    }

    if (!message.trim()) {
      Alert.alert(t('alerts.missingMessage.title'), t('alerts.missingMessage.message'));
      return;
    }

    if (selectedDay === null) {
      Alert.alert(t('alerts.missingDay.title'), t('alerts.missingDay.message'));
      return;
    }

    // Check for time slot conflict
    const timeString = formatTime(selectedTime);
    if (isTimeSlotTaken(selectedDay, timeString)) {
      Alert.alert(
        t('alerts.timeConflict.title'),
        t('alerts.timeConflict.message', { day: t(`reminders.days.${['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][selectedDay]}`), time: ReminderService.formatTime(timeString) }),
        [{ text: t('common.ok') }]
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
      Alert.alert(t('common.error'), t('alerts.createFailed.message', { defaultValue: 'Failed to create reminder. Please try again.' }));
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={isTablet ? { alignItems: 'center' } : undefined}>
        <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 50) }]}>
          <Pressable onPress={handleBack} style={[styles.backButton, { minHeight: scaledButtonSize(40) }]}>
            <Ionicons name="arrow-back" size={scaledButtonSize(24)} color="rgba(255, 255, 255, 0.8)" />
          </Pressable>
          <Text style={[styles.title, { fontSize: scaledFontSize(20) }]}>{t('reminders.createTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Exercise Templates */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(16) }]}>{t('reminders.quickTemplates')}</Text>
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
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(16) }]}>{t('reminders.reminderDetails')}</Text>

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: scaledFontSize(14) }]}>{t('reminders.titleLabel')}</Text>
            <TextInput
              style={[styles.textInput, { fontSize: scaledFontSize(16), padding: scaledPadding(12) }]}
              value={title}
              onChangeText={setTitle}
              placeholder={t('reminders.titlePlaceholder')}
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              maxLength={50}
            />
          </View>

          {/* Message Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: scaledFontSize(14) }]}>{t('reminders.messageLabel')}</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput, { fontSize: scaledFontSize(16), padding: scaledPadding(12) }]}
              value={message}
              onChangeText={setMessage}
              placeholder={t('reminders.messagePlaceholder')}
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          {/* Day Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: scaledFontSize(14) }]}>{t('reminders.dayOfWeek')}</Text>
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
            <Text style={[styles.inputLabel, { fontSize: scaledFontSize(14) }]}>{t('reminders.timeLabel')}</Text>
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
                  ? t('reminders.timeSlotTaken')
                  : selectedDay !== null
                    ? t('reminders.conflictHint')
                    : t('reminders.selectDayHint')}
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
              {creating ? t('reminders.creating') : t('reminders.createButton')}
            </Text>
          </Pressable>
        </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

// Content-only component for embedding in horizontal scroll (no background/header)
export const CreateReminderContent: React.FC<CreateReminderContentProps> = ({
  paddingTop = 0,
  onBack,
  onSuccess,
  refreshTrigger = 0,
  isActive = false,
}) => {
  const { t } = useTranslation();
  const { scaledFontSize, scaledButtonSize, scaledPadding, isTablet, contentMaxWidth } = useAccessibility();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const getDefaultTime = () => {
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);
    return defaultTime;
  };

  const [selectedTime, setSelectedTime] = useState(getDefaultTime());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTimeOptions, setShowTimeOptions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [existingReminders, setExistingReminders] = useState<CustomReminder[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const changed = title.trim() !== '' || message.trim() !== '' || selectedDay !== null;
    setHasUnsavedChanges(changed);
  }, [title, message, selectedDay]);

  const daysOfWeek = [
    { value: 0, key: 'sunday', short: t('reminders.daysShort.sunday') },
    { value: 1, key: 'monday', short: t('reminders.daysShort.monday') },
    { value: 2, key: 'tuesday', short: t('reminders.daysShort.tuesday') },
    { value: 3, key: 'wednesday', short: t('reminders.daysShort.wednesday') },
    { value: 4, key: 'thursday', short: t('reminders.daysShort.thursday') },
    { value: 5, key: 'friday', short: t('reminders.daysShort.friday') },
    { value: 6, key: 'saturday', short: t('reminders.daysShort.saturday') },
  ];

  const timeOptions = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30'
  ];

  const exerciseTemplates = [
    { title: t('reminders.templates.readBook.title'), message: t('reminders.templates.readBook.message') },
    { title: t('reminders.templates.emotionCards.title'), message: t('reminders.templates.emotionCards.message') },
    { title: t('reminders.templates.park.title'), message: t('reminders.templates.park.message') },
    { title: t('reminders.templates.buggyStroll.title'), message: t('reminders.templates.buggyStroll.message') },
    { title: t('reminders.templates.schoolRun.title'), message: t('reminders.templates.schoolRun.message') },
    { title: t('reminders.templates.nurseryDropoff.title'), message: t('reminders.templates.nurseryDropoff.message') },
    { title: t('reminders.templates.toddlerGroup.title'), message: t('reminders.templates.toddlerGroup.message') },
    { title: t('reminders.templates.softPlay.title'), message: t('reminders.templates.softPlay.message') },
    { title: t('reminders.templates.foodShop.title'), message: t('reminders.templates.foodShop.message') },
    { title: t('reminders.templates.swimming.title'), message: t('reminders.templates.swimming.message') },
    { title: t('reminders.templates.libraryStoryTime.title'), message: t('reminders.templates.libraryStoryTime.message') },
    { title: t('reminders.templates.coffeeWithFriends.title'), message: t('reminders.templates.coffeeWithFriends.message') },
    { title: t('reminders.templates.bedtimeRoutine.title'), message: t('reminders.templates.bedtimeRoutine.message') },
    { title: t('reminders.templates.morningStretch.title'), message: t('reminders.templates.morningStretch.message') },
  ];

  // Reload existing reminders when:
  // - Component becomes active (user navigates to this screen)
  // - refreshTrigger changes (a reminder was created/modified elsewhere)
  useEffect(() => {
    if (isActive) {
      loadExistingReminders();
    }
  }, [isActive, refreshTrigger]);

  const loadExistingReminders = async () => {
    try {
      const reminders = await reminderService.getAllReminders();
      console.log('[CreateReminderContent] Loaded existing reminders:', reminders.length);
      setExistingReminders(reminders);
    } catch (error) {
      console.error('Failed to load existing reminders:', error);
    }
  };

  const isTimeSlotTaken = (dayOfWeek: number, timeString: string): boolean => {
    return existingReminders.some(reminder =>
      reminder.dayOfWeek === dayOfWeek && reminder.time === timeString && reminder.isActive
    );
  };

  const handleTimeOptionSelect = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const newTime = new Date();
    newTime.setHours(hours, minutes, 0, 0);
    setSelectedTime(newTime);
    setShowTimeOptions(false);
  };

  const formatTime = (date: Date): string => {
    return date.toTimeString().slice(0, 5);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setSelectedTime(selectedDate);
    }
  };

  const handleCreateReminder = async () => {
    if (!title.trim()) {
      Alert.alert(t('alerts.missingTitle.title'), t('alerts.missingTitle.message'));
      return;
    }
    if (!message.trim()) {
      Alert.alert(t('alerts.missingMessage.title'), t('alerts.missingMessage.message'));
      return;
    }
    if (selectedDay === null) {
      Alert.alert(t('alerts.missingDay.title'), t('alerts.missingDay.message'));
      return;
    }

    const timeString = formatTime(selectedTime);
    if (isTimeSlotTaken(selectedDay, timeString)) {
      Alert.alert(
        t('alerts.timeConflict.title'),
        t('alerts.timeConflict.message', { day: t(`reminders.days.${['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][selectedDay]}`), time: ReminderService.formatTime(timeString) }),
        [{ text: t('common.ok') }]
      );
      return;
    }

    try {
      setCreating(true);
      await reminderService.createReminder(title.trim(), message.trim(), selectedDay, timeString);
      setHasUnsavedChanges(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to create reminder:', error);
      Alert.alert(t('common.error'), t('alerts.createFailed.message', { defaultValue: 'Failed to create reminder. Please try again.' }));
    } finally {
      setCreating(false);
    }
  };

  const handleUseTemplate = (template: typeof exerciseTemplates[0]) => {
    setTitle(template.title);
    setMessage(template.message);
  };

  return (
    <View style={{ flex: 1 }}>
      <StarBackground />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={[{ paddingTop }, isTablet ? { alignItems: 'center' } : undefined]}>
        <View style={isTablet ? { maxWidth: contentMaxWidth, width: '100%' } : undefined}>
          {/* Exercise Templates */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(16) }]}>{t('reminders.quickTemplates')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
            {exerciseTemplates.map((template, index) => (
              <Pressable key={index} onPress={() => handleUseTemplate(template)} style={[styles.templateCard, { padding: scaledPadding(12) }]}>
                <Text style={[styles.templateTitle, { fontSize: scaledFontSize(14) }]}>{template.title}</Text>
                <Text style={[styles.templateMessage, { fontSize: scaledFontSize(12) }]} numberOfLines={2}>{template.message}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Form */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaledFontSize(16) }]}>{t('reminders.reminderDetails')}</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: scaledFontSize(14) }]}>{t('reminders.titleLabel')}</Text>
            <TextInput
              style={[styles.textInput, { fontSize: scaledFontSize(16), padding: scaledPadding(12) }]}
              value={title}
              onChangeText={setTitle}
              placeholder={t('reminders.titlePlaceholder')}
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: scaledFontSize(14) }]}>{t('reminders.messageLabel')}</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput, { fontSize: scaledFontSize(16), padding: scaledPadding(12) }]}
              value={message}
              onChangeText={setMessage}
              placeholder={t('reminders.messagePlaceholder')}
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: scaledFontSize(14) }]}>{t('reminders.dayOfWeek')}</Text>
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
                  <Text style={[styles.dayButtonText, { fontSize: scaledFontSize(12) }, selectedDay === day.value && styles.dayButtonTextSelected]}>
                    {day.short}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { fontSize: scaledFontSize(14) }]}>{t('reminders.timeLabel')}</Text>
            <Pressable onPress={() => setShowTimeOptions(!showTimeOptions)} style={[styles.timeButton, { minHeight: scaledButtonSize(44), paddingVertical: scaledPadding(12), paddingHorizontal: scaledPadding(16) }]}>
              <Ionicons name="time-outline" size={scaledButtonSize(20)} color="rgba(255, 255, 255, 0.8)" />
              <Text style={[styles.timeButtonText, { fontSize: scaledFontSize(16) }]}>{ReminderService.formatTime(formatTime(selectedTime))}</Text>
              <Ionicons name={showTimeOptions ? "chevron-up" : "chevron-down"} size={scaledButtonSize(16)} color="rgba(255, 255, 255, 0.6)" />
            </Pressable>
          </View>

          {showTimeOptions && (
            <View style={styles.timeOptionsContainer}>
              <View style={styles.timeOptionsGrid}>
                {timeOptions.map((time) => {
                  const isConflict = selectedDay !== null && isTimeSlotTaken(selectedDay, time);
                  const isSelected = formatTime(selectedTime) === time;
                  return (
                    <Pressable
                      key={time}
                      onPress={() => !isConflict && handleTimeOptionSelect(time)}
                      disabled={isConflict}
                      style={[
                        styles.timeOptionButton,
                        { minHeight: scaledButtonSize(36), paddingVertical: scaledPadding(8), paddingHorizontal: scaledPadding(12) },
                        isSelected && styles.timeOptionButtonSelected,
                        isConflict && styles.timeOptionButtonConflict
                      ]}
                    >
                      <Text style={[styles.timeOptionText, { fontSize: scaledFontSize(12) }, isSelected && styles.timeOptionTextSelected, isConflict && styles.timeOptionTextConflict]}>
                        {ReminderService.formatTime(time)}
                      </Text>
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
                  ? t('reminders.timeSlotTaken')
                  : selectedDay !== null
                    ? t('reminders.conflictHint')
                    : t('reminders.selectDayHint')}
              </Text>
            </View>
          )}

          {showTimePicker && (
            <DateTimePicker value={selectedTime} mode="time" is24Hour={false} display="default" onChange={handleTimeChange} />
          )}
        </View>

        <View style={styles.section}>
            <Pressable
              onPress={handleCreateReminder}
              disabled={creating}
              style={[styles.createButton, { minHeight: scaledButtonSize(48), paddingVertical: scaledPadding(14) }, creating && styles.createButtonDisabled]}
            >
              <Text style={[styles.createButtonText, { fontSize: scaledFontSize(16) }]}>{creating ? t('reminders.creating') : t('reminders.createButton')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
