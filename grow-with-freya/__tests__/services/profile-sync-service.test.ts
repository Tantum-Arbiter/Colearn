/**
 * Pulling the family's profile from the server restores it on this device,
 * takes only the fields it understands, and never lets a missing or
 * malformed field wipe what the device already has.
 */

const mockActions = {
  setUserProfile: jest.fn(),
  setScreenTimeEnabled: jest.fn(),
  setNotificationsEnabled: jest.fn(),
  setChildAge: jest.fn(),
};
jest.mock('@/store/app-store', () => ({ useAppStore: { getState: () => mockActions } }));
jest.mock('@/services/reminder-service', () => ({ reminderService: { syncFromBackend: jest.fn() } }));

import { ProfileSyncService } from '@/services/profile-sync-service';
import { reminderService } from '@/services/reminder-service';

describe('ProfileSyncService.syncProfileData', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('should change nothing when the profile is %s', async (_label, profile) => {
    await ProfileSyncService.syncProfileData(profile);

    Object.values(mockActions).forEach(action => expect(action).not.toHaveBeenCalled());
  });

  it('should restore the nickname and avatar', async () => {
    await ProfileSyncService.syncProfileData({ nickname: 'Freya', avatarType: 'girl', avatarId: 'owl' });

    expect(mockActions.setUserProfile).toHaveBeenCalledWith('Freya', 'girl', 'owl');
  });

  it.each([
    ['no nickname', { avatarType: 'girl', avatarId: 'owl' }],
    ['an empty nickname', { nickname: '', avatarType: 'girl', avatarId: 'owl' }],
    ['no avatar type', { nickname: 'Freya', avatarId: 'owl' }],
    ['no avatar id', { nickname: 'Freya', avatarType: 'girl' }],
  ])('should leave the profile alone when it has %s', async (_label, profile) => {
    await ProfileSyncService.syncProfileData(profile);

    expect(mockActions.setUserProfile).not.toHaveBeenCalled();
  });

  it.each([
    [true, false],
    [false, true],
  ])('should restore screen time %s and reminders %s', async (screenTime, reminders) => {
    await ProfileSyncService.syncProfileData({
      notifications: { screenTimeEnabled: screenTime, smartRemindersEnabled: reminders },
    });

    expect(mockActions.setScreenTimeEnabled).toHaveBeenCalledWith(screenTime);
    expect(mockActions.setNotificationsEnabled).toHaveBeenCalledWith(reminders);
  });

  it.each([
    ['strings', { screenTimeEnabled: 'true', smartRemindersEnabled: 'false' }],
    ['nulls', { screenTimeEnabled: null, smartRemindersEnabled: null }],
    ['nothing', {}],
  ])('should ignore notification settings sent as %s', async (_label, notifications) => {
    await ProfileSyncService.syncProfileData({ notifications });

    expect(mockActions.setScreenTimeEnabled).not.toHaveBeenCalled();
    expect(mockActions.setNotificationsEnabled).not.toHaveBeenCalled();
  });

  it.each([
    ['18-24m', 21],
    ['2-6y', 48],
    ['6+', 84],
    ['an unknown range', 24],
  ])('should set the child age for %s to %i months', async (range, months) => {
    await ProfileSyncService.syncProfileData({ schedule: { childAgeRange: range } });

    expect(mockActions.setChildAge).toHaveBeenCalledWith(months);
  });

  it.each([
    ['no schedule', {}],
    ['a schedule without an age range', { schedule: {} }],
    ['an empty age range', { schedule: { childAgeRange: '' } }],
  ])('should leave the child age alone when there is %s', async (_label, profile) => {
    await ProfileSyncService.syncProfileData(profile);

    expect(mockActions.setChildAge).not.toHaveBeenCalled();
  });
});

describe('ProfileSyncService.fullSync', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should restore the profile and then the reminders', async () => {
    await ProfileSyncService.fullSync({ nickname: 'Freya', avatarType: 'girl', avatarId: 'owl' });

    expect(mockActions.setUserProfile).toHaveBeenCalled();
    expect(reminderService.syncFromBackend).toHaveBeenCalledTimes(1);
  });

  it('should still sync reminders when there is no profile', async () => {
    await ProfileSyncService.fullSync();

    expect(mockActions.setUserProfile).not.toHaveBeenCalled();
    expect(reminderService.syncFromBackend).toHaveBeenCalledTimes(1);
  });

  it('should not throw when the reminders cannot be fetched', async () => {
    (reminderService.syncFromBackend as jest.Mock).mockRejectedValueOnce(new Error('offline'));

    await expect(ProfileSyncService.fullSync()).resolves.toBeUndefined();
  });
});
