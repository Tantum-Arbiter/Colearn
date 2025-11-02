import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

export interface CustomReminder {
  id: string;
  title: string;
  message: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  time: string; // HH:MM format
  isActive: boolean;
  createdAt: string;
  notificationId?: string; // Expo notification identifier
  advanceNotificationId?: string; // 30-minute advance notification
}

export interface ReminderStats {
  totalReminders: number;
  activeReminders: number;
  upcomingToday: CustomReminder[];
}

const REMINDERS_STORAGE_KEY = 'custom_reminders';

export class ReminderService {
  private static instance: ReminderService;
  private reminders: CustomReminder[] = [];

  private constructor() {
    this.loadReminders();
  }

  static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  // Load reminders from storage
  private async loadReminders(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
      if (stored) {
        this.reminders = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load reminders:', error);
      this.reminders = [];
    }
  }

  // Save reminders to storage
  private async saveReminders(): Promise<void> {
    try {
      await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(this.reminders));
    } catch (error) {
      console.error('Failed to save reminders:', error);
    }
  }

  // Create a new reminder
  async createReminder(
    title: string,
    message: string,
    dayOfWeek: number,
    time: string
  ): Promise<CustomReminder> {
    const reminder: CustomReminder = {
      id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      dayOfWeek,
      time,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    // Schedule the notification
    const notificationId = await this.scheduleNotification(reminder);
    if (notificationId) {
      reminder.notificationId = notificationId;
    }

    this.reminders.push(reminder);
    await this.saveReminders();
    
    return reminder;
  }

  // Delete a reminder
  async deleteReminder(reminderId: string): Promise<boolean> {
    const reminderIndex = this.reminders.findIndex(r => r.id === reminderId);
    if (reminderIndex === -1) {
      return false;
    }

    const reminder = this.reminders[reminderIndex];
    
    // Cancel both scheduled notifications
    if (reminder.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
    }
    if (reminder.advanceNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(reminder.advanceNotificationId);
    }

    this.reminders.splice(reminderIndex, 1);
    await this.saveReminders();
    
    return true;
  }

  // Toggle reminder active state
  async toggleReminder(reminderId: string): Promise<boolean> {
    const reminder = this.reminders.find(r => r.id === reminderId);
    if (!reminder) {
      return false;
    }

    reminder.isActive = !reminder.isActive;

    if (reminder.isActive) {
      // Re-schedule both notifications
      const notificationId = await this.scheduleNotification(reminder);
      if (notificationId) {
        reminder.notificationId = notificationId;
      }
    } else {
      // Cancel both notifications
      if (reminder.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
        reminder.notificationId = undefined;
      }
      if (reminder.advanceNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminder.advanceNotificationId);
        reminder.advanceNotificationId = undefined;
      }
    }

    await this.saveReminders();
    return true;
  }

  // Get all reminders
  async getAllReminders(): Promise<CustomReminder[]> {
    await this.loadReminders();
    return [...this.reminders];
  }

  // Get reminders for a specific day
  async getRemindersForDay(dayOfWeek: number): Promise<CustomReminder[]> {
    await this.loadReminders();
    return this.reminders.filter(r => r.dayOfWeek === dayOfWeek && r.isActive);
  }

  // Get reminder statistics
  async getReminderStats(): Promise<ReminderStats> {
    await this.loadReminders();
    
    const today = new Date().getDay();
    const upcomingToday = this.reminders.filter(r => 
      r.dayOfWeek === today && r.isActive
    );

    return {
      totalReminders: this.reminders.length,
      activeReminders: this.reminders.filter(r => r.isActive).length,
      upcomingToday,
    };
  }

  // Schedule notifications for a reminder (main + 30min advance)
  private async scheduleNotification(reminder: CustomReminder): Promise<string | null> {
    try {
      const [hours, minutes] = reminder.time.split(':').map(Number);

      // Schedule main notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.message,
          sound: 'default',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.CALENDAR,
          weekday: reminder.dayOfWeek + 1, // Expo uses 1-7 (Sunday = 1)
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      // Schedule 30-minute advance notification
      const advanceTime = new Date();
      advanceTime.setHours(hours, minutes, 0, 0);
      advanceTime.setMinutes(advanceTime.getMinutes() - 30);

      const advanceNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Upcoming: ${reminder.title}`,
          body: `${reminder.message} (in 30 minutes)`,
          sound: 'default',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.CALENDAR,
          weekday: reminder.dayOfWeek + 1,
          hour: advanceTime.getHours(),
          minute: advanceTime.getMinutes(),
          repeats: true,
        },
      });

      // Store the advance notification ID
      if (advanceNotificationId) {
        reminder.advanceNotificationId = advanceNotificationId;
      }

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  // Get day name from day number
  static getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }

  // Get short day name from day number
  static getShortDayName(dayOfWeek: number): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayOfWeek] || 'Unknown';
  }

  // Format time for display
  static formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }
}

export const reminderService = ReminderService.getInstance();
