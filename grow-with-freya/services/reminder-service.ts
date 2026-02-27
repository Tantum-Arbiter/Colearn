import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { ApiClient } from './api-client';

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
  private reminders: CustomReminder[] = []; // Current working state (may have unsaved changes)
  private savedReminders: CustomReminder[] = []; // Last saved state (to AsyncStorage)
  private lastSyncedReminders: CustomReminder[] = []; // Last synced state (to backend)

  private constructor() {
    this.loadReminders();
  }

  static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  private async loadReminders(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
      if (stored) {
        this.reminders = JSON.parse(stored);
        this.savedReminders = JSON.parse(JSON.stringify(this.reminders)); // Deep copy
        this.lastSyncedReminders = JSON.parse(JSON.stringify(this.reminders)); // Deep copy

        // Reschedule all active notifications on app startup
        // iOS may have cleared scheduled notifications, so we need to reschedule
        console.log('[ReminderService] Loaded reminders, rescheduling notifications...');
        await this.rescheduleAllNotifications();
      }
    } catch (error) {
      console.error('Failed to load reminders:', error);
      this.reminders = [];
    }
  }

  private async saveReminders(): Promise<void> {
    try {
      await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(this.reminders));
    } catch (error) {
      console.error('Failed to save reminders:', error);
    }
  }

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

    // Don't save to AsyncStorage - wait for user to click "Save Settings"
    console.log('[ReminderService] Reminder created (not yet saved)');

    return reminder;
  }

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

    // Remove from in-memory array (don't save to AsyncStorage yet)
    this.reminders.splice(reminderIndex, 1);

    // Don't save to AsyncStorage - wait for user to click "Save Settings"
    console.log('[ReminderService] Reminder deleted (not yet saved)');

    return true;
  }

  async toggleReminder(reminderId: string): Promise<boolean> {
    const reminder = this.reminders.find(r => r.id === reminderId);
    if (!reminder) {
      return false;
    }

    const oldState = reminder.isActive;
    reminder.isActive = !reminder.isActive;
    console.log(`[ReminderService] Toggling reminder ${reminderId}: ${oldState} -> ${reminder.isActive}`);

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

    // Don't save to AsyncStorage - wait for user to click "Save Settings"
    console.log('[ReminderService] Reminder toggled (not yet saved). Current state:', this.reminders.map(r => ({ id: r.id, isActive: r.isActive })));
    return true;
  }

  async getAllReminders(): Promise<CustomReminder[]> {
    console.log('[ReminderService] getAllReminders() called. Current state:', this.reminders.map(r => ({ id: r.id, title: r.title, isActive: r.isActive })));
    return [...this.reminders];
  }

  async getRemindersForDay(dayOfWeek: number): Promise<CustomReminder[]> {
    return this.reminders.filter(r => r.dayOfWeek === dayOfWeek && r.isActive);
  }

  async getReminderStats(): Promise<ReminderStats> {
    
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

  private getSecondsUntilNextOccurrence(dayOfWeek: number, hours: number, minutes: number): number {
    const now = new Date();
    const target = new Date();

    // Set target time
    target.setHours(hours, minutes, 0, 0);

    // Calculate days until target day
    const currentDay = now.getDay(); // 0-6 (Sunday = 0)
    let daysUntil = dayOfWeek - currentDay;

    // If target day is today, check if time has passed
    if (daysUntil === 0) {
      if (target <= now) {
        // Time has passed today, schedule for next week
        daysUntil = 7;
      }
    } else if (daysUntil < 0) {
      // Target day is earlier in the week, schedule for next week
      daysUntil += 7;
    }

    target.setDate(now.getDate() + daysUntil);

    const seconds = Math.floor((target.getTime() - now.getTime()) / 1000);
    return Math.max(seconds, 1); // Ensure at least 1 second
  }

  // Uses TIME_INTERVAL trigger (CALENDAR trigger broken in Expo SDK 52)
  private async scheduleNotification(reminder: CustomReminder): Promise<string | null> {
    try {
      const [hours, minutes] = reminder.time.split(':').map(Number);

      // Calculate seconds until the main notification
      const secondsUntilMain = this.getSecondsUntilNextOccurrence(reminder.dayOfWeek, hours, minutes);

      // Calculate seconds until the advance notification (30 minutes before main)
      // Subtract 30 minutes (1800 seconds) from the main notification time
      let advanceHours = hours;
      let advanceMinutes = minutes - 30;
      if (advanceMinutes < 0) {
        advanceMinutes += 60;
        advanceHours -= 1;
        if (advanceHours < 0) {
          advanceHours = 23;
        }
      }
      const secondsUntilAdvance = this.getSecondsUntilNextOccurrence(reminder.dayOfWeek, advanceHours, advanceMinutes);

      console.log(`[ReminderService] Scheduling reminder for ${ReminderService.getDayName(reminder.dayOfWeek)} at ${reminder.time}`);
      console.log(`[ReminderService] Main notification in ${secondsUntilMain} seconds`);
      console.log(`[ReminderService] Advance notification in ${secondsUntilAdvance} seconds`);

      // Schedule main notification using TIME_INTERVAL (works on both iOS and Android)
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.message,
          sound: 'default',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntilMain,
          repeats: false, // We'll reschedule after each occurrence
        },
      });

      // Schedule 30-minute advance notification
      const advanceNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Upcoming: ${reminder.title}`,
          body: `${reminder.message} (in 30 minutes)`,
          sound: 'default',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntilAdvance,
          repeats: false, // We'll reschedule after each occurrence
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

  static getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }

  static getShortDayName(dayOfWeek: number): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayOfWeek] || 'Unknown';
  }

  static formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  hasUnsavedChanges(): boolean {
    // Compare current reminders with last saved state (not synced state)
    if (this.reminders.length !== this.savedReminders.length) {
      return true;
    }

    // Deep comparison of reminder IDs and properties
    const currentIds = this.reminders.map(r => r.id).sort();
    const savedIds = this.savedReminders.map(r => r.id).sort();

    if (JSON.stringify(currentIds) !== JSON.stringify(savedIds)) {
      return true;
    }

    // Check if any reminder properties changed
    for (const reminder of this.reminders) {
      const saved = this.savedReminders.find(r => r.id === reminder.id);
      if (!saved) return true;

      if (
        reminder.title !== saved.title ||
        reminder.message !== saved.message ||
        reminder.dayOfWeek !== saved.dayOfWeek ||
        reminder.time !== saved.time ||
        reminder.isActive !== saved.isActive
      ) {
        return true;
      }
    }

    return false;
  }

  async revertChanges(): Promise<void> {
    this.reminders = JSON.parse(JSON.stringify(this.savedReminders));
    await this.rescheduleAllNotifications();
    console.log('[ReminderService] Reverted to last saved state');
  }

  async commitChanges(): Promise<void> {
    await this.saveReminders();
    this.savedReminders = JSON.parse(JSON.stringify(this.reminders));
    console.log('[ReminderService] Changes committed to local storage');
  }

  async syncToBackend(): Promise<void> {
    try {
      // Only sync if user is authenticated
      const isAuthenticated = await ApiClient.isAuthenticated();
      if (!isAuthenticated) {
        console.log('[ReminderService] Skipping backend sync - not authenticated');
        return;
      }

      console.log('[ReminderService] Syncing reminders to backend...');

      // First commit to local storage
      await this.commitChanges();

      // Then sync to backend
      await ApiClient.syncReminders(this.reminders);

      // Update last synced state
      this.lastSyncedReminders = JSON.parse(JSON.stringify(this.reminders));

      console.log('[ReminderService] Reminders synced to backend');
    } catch (error) {
      console.error('[ReminderService] Failed to sync reminders to backend:', error);
      throw error; // Throw so Screen Time page can show error
    }
  }

  async syncFromBackend(): Promise<void> {
    try {
      const isAuthenticated = await ApiClient.isAuthenticated();
      if (!isAuthenticated) {
        console.log('[ReminderService] Skipping backend pull - not authenticated');
        return;
      }

      console.log('[ReminderService] Pulling reminders from backend...');
      const backendReminders = await ApiClient.getReminders();

      if (backendReminders && backendReminders.length > 0) {
        // Merge backend reminders with local (backend is source of truth)
        this.reminders = backendReminders;
        await this.saveReminders();

        // Update last synced state
        this.lastSyncedReminders = JSON.parse(JSON.stringify(this.reminders));

        // Reschedule all notifications
        await this.rescheduleAllNotifications();

        console.log(`[ReminderService] Pulled ${backendReminders.length} reminders from backend`);
      } else {
        // No reminders on backend - mark current state as synced
        this.lastSyncedReminders = JSON.parse(JSON.stringify(this.reminders));
      }
    } catch (error) {
      console.error('[ReminderService] Failed to pull reminders from backend:', error);
      // Continue with local reminders
    }
  }

  private async rescheduleAllNotifications(): Promise<void> {
    for (const reminder of this.reminders) {
      if (reminder.isActive) {
        // Cancel existing notifications
        if (reminder.notificationId) {
          await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
        }
        if (reminder.advanceNotificationId) {
          await Notifications.cancelScheduledNotificationAsync(reminder.advanceNotificationId);
        }

        // Reschedule
        const notificationId = await this.scheduleNotification(reminder);
        if (notificationId) {
          reminder.notificationId = notificationId;
        }
      }
    }
    await this.saveReminders();
  }

  async clearAllReminders(): Promise<void> {
    this.reminders = [];
    this.savedReminders = [];
    this.lastSyncedReminders = [];
    await AsyncStorage.removeItem(REMINDERS_STORAGE_KEY);
  }
}

export const reminderService = ReminderService.getInstance();
