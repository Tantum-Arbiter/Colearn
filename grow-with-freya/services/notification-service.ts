import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { ScheduleRecommendation } from './screen-time-service';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}

class NotificationService {
  private static instance: NotificationService;
  private permissionStatus: NotificationPermissionStatus | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermissions(): Promise<NotificationPermissionStatus> {
    if (!Device.isDevice) {
      console.warn('Notifications only work on physical devices');
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied' as Notifications.PermissionStatus,
      };
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    this.permissionStatus = {
      granted: finalStatus === 'granted',
      canAskAgain: finalStatus !== 'denied',
      status: finalStatus,
    };

    return this.permissionStatus;
  }

  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    if (this.permissionStatus) {
      return this.permissionStatus;
    }

    const { status } = await Notifications.getPermissionsAsync();
    this.permissionStatus = {
      granted: status === 'granted',
      canAskAgain: status !== 'denied',
      status,
    };

    return this.permissionStatus;
  }

  async scheduleRecommendedReminders(schedule: ScheduleRecommendation[]): Promise<void> {
    const permissionStatus = await this.getPermissionStatus();
    if (!permissionStatus.granted) {
      console.warn('Notification permissions not granted');
      return;
    }

    // Cancel existing scheduled notifications
    await this.cancelAllScheduledNotifications();

    // Schedule new notifications
    for (const recommendation of schedule) {
      await this.scheduleRecommendationNotification(recommendation);
    }
  }

  private async scheduleRecommendationNotification(recommendation: ScheduleRecommendation): Promise<void> {
    const [hours, minutes] = recommendation.time.split(':').map(Number);
    
    const trigger: Notifications.NotificationTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: hours,
      minute: minutes,
      repeats: true,
    };

    const content: Notifications.NotificationContentInput = {
      title: 'Time for Grow with Freya! 🌟',
      body: this.getNotificationMessage(recommendation),
      sound: true,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
      categoryIdentifier: 'screen-time-reminder',
    };

    try {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger,
      });
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  async sendScreenTimeWarning(message: string, type: 'warning' | 'limit_reached'): Promise<void> {
    const permissionStatus = await this.getPermissionStatus();
    if (!permissionStatus.granted) {
      return;
    }

    const content: Notifications.NotificationContentInput = {
      title: type === 'warning' ? 'Screen Time Warning ⏰' : 'Screen Time Limit Reached 🛑',
      body: message,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      categoryIdentifier: 'screen-time-warning',
    };

    try {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Failed to send screen time warning:', error);
    }
  }

  async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  async setupNotificationCategories(): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('screen-time-reminder', [
        {
          identifier: 'open-app',
          buttonTitle: 'Open App',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'remind-later',
          buttonTitle: 'Remind Later',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('screen-time-warning', [
        {
          identifier: 'continue',
          buttonTitle: 'Continue',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'close-app',
          buttonTitle: 'Close App',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
    }
  }

  setupNotificationResponseHandler(): void {
    Notifications.addNotificationResponseReceivedListener(response => {
      const { actionIdentifier, notification } = response;
      const categoryIdentifier = notification.request.content.categoryIdentifier;

      if (categoryIdentifier === 'screen-time-reminder') {
        if (actionIdentifier === 'remind-later') {
          // Schedule a reminder in 30 minutes
          this.scheduleDelayedReminder();
        }
      } else if (categoryIdentifier === 'screen-time-warning') {
        if (actionIdentifier === 'close-app') {
          // This would need to be handled by the app
          console.log('User chose to close app from notification');
        }
      }
    });
  }

  private async scheduleDelayedReminder(): Promise<void> {
    const content: Notifications.NotificationContentInput = {
      title: 'Reminder: Time for Grow with Freya! 🌟',
      body: 'Don\'t forget your learning time with Freya!',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
    };

    const trigger: Notifications.NotificationTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 30 * 60, // 30 minutes
    };

    try {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger,
      });
    } catch (error) {
      console.error('Failed to schedule delayed reminder:', error);
    }
  }

  private getNotificationMessage(recommendation: ScheduleRecommendation): string {
    const activityMessages = {
      story: `Time for a ${recommendation.duration}-minute story adventure! 📚`,
      emotions: `Let's explore emotions together for ${recommendation.duration} minutes! 😊`,
      sensory: `Time for ${recommendation.duration} minutes of sensory play! 🧠`,
      music: `Relax with ${recommendation.duration} minutes of calming music! 🎵`,
    };

    return activityMessages[recommendation.activity] || 'Time for some learning fun!';
  }
}

export default NotificationService;
