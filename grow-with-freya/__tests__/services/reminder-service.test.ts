/**
 * Tests for ReminderService.
 *
 * The service keeps three copies of the reminder list: the working set the
 * parent is editing, the last state written to AsyncStorage, and the last state
 * pushed to the backend. Edits deliberately do not persist until the Screen
 * Time page saves, so most of what matters here is which copy moves when.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { ReminderService } from '../../services/reminder-service';
import { ApiClient } from '../../services/api-client';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../services/api-client', () => ({
  ApiClient: {
    isAuthenticated: jest.fn().mockResolvedValue(false),
    syncReminders: jest.fn().mockResolvedValue(undefined),
    getReminders: jest.fn().mockResolvedValue([]),
  },
}));

describe('ReminderService', () => {
  let underTest: ReminderService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notif-1');
    (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(undefined);
    (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(false);

    // the service is a singleton, so each test starts from an empty slate
    underTest = ReminderService.getInstance();
    await underTest.clearAllReminders();
    jest.clearAllMocks();
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notif-1');
    (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(undefined);
    (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(false);
  });

  const addReminder = (overrides: { day?: number; time?: string; title?: string } = {}) =>
    underTest.createReminder(
      overrides.title ?? 'Story time',
      'Time to read together',
      overrides.day ?? 1,
      overrides.time ?? '18:30'
    );

  describe('creating', () => {
    it('adds the reminder to the working set without persisting it', async () => {
      const reminder = await addReminder();

      expect(await underTest.getAllReminders()).toHaveLength(1);
      expect(reminder).toMatchObject({
        title: 'Story time',
        dayOfWeek: 1,
        time: '18:30',
        isActive: true,
      });
      // the parent has not saved yet
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      expect(underTest.hasUnsavedChanges()).toBe(true);
    });

    it('schedules a notification and keeps its id', async () => {
      const reminder = await addReminder();

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
      expect(reminder.notificationId).toBe('notif-1');
    });

    it('gives every reminder its own id', async () => {
      const first = await addReminder({ title: 'One' });
      const second = await addReminder({ title: 'Two' });

      expect(first.id).not.toBe(second.id);
    });

    it('hands out a copy, so callers cannot mutate the working set', async () => {
      await addReminder();

      const list = await underTest.getAllReminders();
      list.pop();

      expect(await underTest.getAllReminders()).toHaveLength(1);
    });
  });

  describe('deleting', () => {
    it('removes the reminder and cancels its notification', async () => {
      const reminder = await addReminder();

      await expect(underTest.deleteReminder(reminder.id)).resolves.toBe(true);

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
      expect(await underTest.getAllReminders()).toHaveLength(0);
    });

    it('reports back when the reminder is not there', async () => {
      await expect(underTest.deleteReminder('nope')).resolves.toBe(false);
    });
  });

  describe('toggling', () => {
    it('cancels the notification when switched off', async () => {
      const reminder = await addReminder();

      await expect(underTest.toggleReminder(reminder.id)).resolves.toBe(true);

      const [stored] = await underTest.getAllReminders();
      expect(stored.isActive).toBe(false);
      expect(stored.notificationId).toBeUndefined();
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
    });

    it('reschedules when switched back on', async () => {
      const reminder = await addReminder();
      await underTest.toggleReminder(reminder.id);
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notif-2');

      await underTest.toggleReminder(reminder.id);

      const [stored] = await underTest.getAllReminders();
      expect(stored.isActive).toBe(true);
      expect(stored.notificationId).toBe('notif-2');
    });

    it('reports back when the reminder is not there', async () => {
      await expect(underTest.toggleReminder('nope')).resolves.toBe(false);
    });
  });

  describe('querying', () => {
    it('returns only active reminders for the given day', async () => {
      const monday = await addReminder({ day: 1, title: 'Monday' });
      await addReminder({ day: 2, title: 'Tuesday' });
      const alsoMonday = await addReminder({ day: 1, title: 'Monday off' });
      await underTest.toggleReminder(alsoMonday.id); // switch it off

      const forMonday = await underTest.getRemindersForDay(1);

      expect(forMonday.map(r => r.id)).toEqual([monday.id]);
    });

    it('counts totals and actives in its stats', async () => {
      const first = await addReminder({ day: 1 });
      await addReminder({ day: 2 });
      await underTest.toggleReminder(first.id);

      const stats = await underTest.getReminderStats();

      expect(stats.totalReminders).toBe(2);
      expect(stats.activeReminders).toBe(1);
    });

    it('lists what is still to come today', async () => {
      const today = new Date().getDay();
      const dueToday = await addReminder({ day: today, title: 'Today' });
      await addReminder({ day: (today + 1) % 7, title: 'Tomorrow' });

      const stats = await underTest.getReminderStats();

      expect(stats.upcomingToday.map(r => r.id)).toEqual([dueToday.id]);
    });
  });

  describe('draft state', () => {
    it('is clean before anything is edited', () => {
      expect(underTest.hasUnsavedChanges()).toBe(false);
    });

    it('is clean again once the changes are committed', async () => {
      await addReminder();

      await underTest.commitChanges();

      expect(underTest.hasUnsavedChanges()).toBe(false);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'custom_reminders',
        expect.stringContaining('Story time')
      );
    });

    it('notices a reminder being removed after a commit', async () => {
      const reminder = await addReminder();
      await underTest.commitChanges();

      await underTest.deleteReminder(reminder.id);

      expect(underTest.hasUnsavedChanges()).toBe(true);
    });

    it('notices a property changing rather than only the count', async () => {
      const reminder = await addReminder();
      await underTest.commitChanges();

      await underTest.toggleReminder(reminder.id); // same count, different isActive

      expect(underTest.hasUnsavedChanges()).toBe(true);
    });

    it('throws away edits on revert, restoring the committed list', async () => {
      const kept = await addReminder({ title: 'Kept' });
      await underTest.commitChanges();
      await addReminder({ title: 'Discarded' });

      await underTest.revertChanges();

      const remaining = await underTest.getAllReminders();
      expect(remaining.map(r => r.title)).toEqual([kept.title]);
      expect(underTest.hasUnsavedChanges()).toBe(false);
    });
  });

  describe('backend sync', () => {
    it('does nothing while signed out', async () => {
      await addReminder();
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(false);

      await underTest.syncToBackend();

      expect(ApiClient.syncReminders).not.toHaveBeenCalled();
      // and the edit is still pending locally
      expect(underTest.hasUnsavedChanges()).toBe(true);
    });

    it('commits locally and pushes when signed in', async () => {
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(true);
      await addReminder();

      await underTest.syncToBackend();

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      expect(ApiClient.syncReminders).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ title: 'Story time' })])
      );
      expect(underTest.hasUnsavedChanges()).toBe(false);
    });

    it('rethrows so the settings page can surface the failure', async () => {
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (ApiClient.syncReminders as jest.Mock).mockRejectedValue(new Error('offline'));
      await addReminder();

      await expect(underTest.syncToBackend()).rejects.toThrow('offline');
    });
  });

  describe('clearing', () => {
    it('empties every copy and the stored list', async () => {
      await addReminder();
      await underTest.commitChanges();

      await underTest.clearAllReminders();

      expect(await underTest.getAllReminders()).toHaveLength(0);
      expect(underTest.hasUnsavedChanges()).toBe(false);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('custom_reminders');
    });
  });

  describe('pulling from the backend', () => {
    it('does nothing while signed out', async () => {
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(false);

      await underTest.syncFromBackend();

      expect(ApiClient.getReminders).not.toHaveBeenCalled();
    });

    it('lets the backend list replace the local one', async () => {
      await addReminder({ title: 'Local only' });
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (ApiClient.getReminders as jest.Mock).mockResolvedValue([
        {
          id: 'from-server',
          title: 'Server reminder',
          message: 'Pulled down',
          dayOfWeek: 3,
          time: '09:00',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ]);

      await underTest.syncFromBackend();

      const all = await underTest.getAllReminders();
      expect(all.map(r => r.title)).toEqual(['Server reminder']);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('keeps the local list when the backend has nothing', async () => {
      await addReminder({ title: 'Local only' });
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (ApiClient.getReminders as jest.Mock).mockResolvedValue([]);

      await underTest.syncFromBackend();

      const all = await underTest.getAllReminders();
      expect(all.map(r => r.title)).toEqual(['Local only']);
    });

    it('carries on with the local list when the pull fails', async () => {
      await addReminder({ title: 'Local only' });
      (ApiClient.isAuthenticated as jest.Mock).mockResolvedValue(true);
      (ApiClient.getReminders as jest.Mock).mockRejectedValue(new Error('offline'));

      // unlike pushing, a failed pull must not throw at the caller
      await expect(underTest.syncFromBackend()).resolves.toBeUndefined();
      expect(await underTest.getAllReminders()).toHaveLength(1);
    });
  });

  describe('storage failures', () => {
    it('does not throw when the list cannot be written', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('disk full'));
      await addReminder();

      await expect(underTest.commitChanges()).resolves.toBeUndefined();
    });
  });

  describe('day names', () => {
    it.each([
      [0, 'Sunday'],
      [1, 'Monday'],
      [6, 'Saturday'],
    ])('names day %i', (day, expected) => {
      expect(ReminderService.getDayName(day)).toBe(expected);
    });
  });
});
