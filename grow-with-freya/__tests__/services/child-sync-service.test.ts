/**
 * The family's app keeps one child document on the server. Signing in on a
 * new phone restores it; a change on this phone is sent; two phones that
 * disagree are merged by the written rules and never lose progress.
 */

jest.unmock('@/store/app-store');

const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

const mockRequest = jest.fn();
const mockIsAuthenticated = jest.fn();
jest.mock('@/services/api-client', () => {
  class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(code: number, payload: unknown) {
      super(`API request failed: ${code}`);
      this.status = code;
      this.body = payload;
    }
  }
  return {
    ApiError,
    ApiClient: {
      request: (...args: unknown[]) => mockRequest(...args),
      isAuthenticated: () => mockIsAuthenticated(),
    },
  };
});

const mockReminders = {
  getSavedReminders: jest.fn(() => [] as unknown[]),
  applySyncedReminders: jest.fn(() => Promise.resolve()),
  onRemindersCommitted: jest.fn(),
};
jest.mock('@/services/reminder-service', () => ({
  get reminderService() {
    return mockReminders;
  },
}));

const mockSetStoredLanguage = jest.fn((language: unknown) => {
  mockStorage['@app_language'] = String(language);
  return Promise.resolve();
});
jest.mock('@/services/i18n', () => ({ setStoredLanguage: (language: unknown) => mockSetStoredLanguage(language) }));

import { ChildSyncService } from '@/services/child-sync-service';
import { useAppStore } from '@/store/app-store';
import type { ChildDocument } from '@/services/child-document';

const { ApiError } = jest.requireMock('@/services/api-client');

function remoteChild(overrides: Partial<ChildDocument> = {}): ChildDocument {
  return {
    childId: 'main',
    nickname: 'Freya',
    avatarType: 'girl',
    avatarId: 'owl',
    ageBucket: '4-6',
    language: 'pl',
    textSizeScale: 1.4,
    favorites: { stories: ['snowy-day'], activities: [], songs: [] },
    storyProgress: { 'snowy-day': { pageIndex: 5, totalPages: 12, finishedCount: 1 } },
    finishedStoryIds: ['snowy-day'],
    challengeCounts: { music: 2 },
    achievements: ['first-story'],
    settings: { screenTimeEnabled: true, smartRemindersEnabled: false, customReminders: [] },
    version: 4,
    ...overrides,
  };
}

function freshDevice() {
  useAppStore.setState({
    isGuestMode: false,
    userNickname: null,
    userAvatarType: null,
    userAvatarId: null,
    currentChildId: null,
    childAgeInMonths: 24,
    textSizeScale: 1,
    favoriteStoryIds: [],
    favoriteActivityIds: [],
    favoriteSongIds: [],
    storyProgress: {},
    finishedStoryIds: [],
    challengeCounts: {},
    earnedAchievementIds: [],
    screenTimeEnabled: false,
    notificationsEnabled: false,
    consentTimestamp: null,
    consentPolicyVersion: null,
    consentRecordedVersion: null,
  });
}

function puts() {
  return mockRequest.mock.calls.filter(([, init]) => init?.method === 'PUT');
}

function serverHas(children: ChildDocument[]) {
  mockRequest.mockImplementation((endpoint: string, init?: RequestInit) => {
    if (endpoint === '/api/children' && !init?.method) return Promise.resolve({ children });
    if (init?.method === 'PUT') {
      const body = JSON.parse(String(init.body));
      return Promise.resolve({ ...body, version: body.version + 1 });
    }
    return Promise.resolve({});
  });
}

describe('ChildSyncService.sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    freshDevice();
    mockIsAuthenticated.mockResolvedValue(true);
    mockReminders.getSavedReminders.mockReturnValue([]);
  });

  it('does nothing for a guest', async () => {
    useAppStore.setState({ isGuestMode: true });

    await expect(ChildSyncService.sync()).resolves.toBe('skipped');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('does nothing when signed out', async () => {
    mockIsAuthenticated.mockResolvedValue(false);

    await expect(ChildSyncService.sync()).resolves.toBe('skipped');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('restores the account onto a freshly installed app', async () => {
    serverHas([remoteChild()]);

    await expect(ChildSyncService.sync()).resolves.toBe('synced');

    const state = useAppStore.getState();
    expect(state.userNickname).toBe('Freya');
    expect(state.userAvatarId).toBe('owl');
    expect(state.childAgeInMonths).toBe(60);
    expect(state.textSizeScale).toBe(1.4);
    expect(state.favoriteStoryIds).toEqual(['snowy-day']);
    expect(state.storyProgress['snowy-day']).toEqual(expect.objectContaining({ pageIndex: 5, totalPages: 12, completedCount: 1 }));
    expect(state.finishedStoryIds).toEqual(['snowy-day']);
    expect(state.challengeCounts).toEqual({ music: 2 });
    expect(state.earnedAchievementIds).toEqual(['first-story']);
    expect(state.screenTimeEnabled).toBe(true);
    expect(state.currentChildId).toBe('main');
    expect(mockSetStoredLanguage).toHaveBeenCalledWith('pl');
  });

  it('writes nothing back when the device already matches the account', async () => {
    serverHas([remoteChild()]);
    await ChildSyncService.sync();
    mockRequest.mockClear();

    await ChildSyncService.sync();

    expect(puts()).toHaveLength(0);
  });

  it('creates the child on the server the first time a family signs in', async () => {
    useAppStore.setState({ userNickname: 'Freya', userAvatarType: 'girl', userAvatarId: 'owl' });
    serverHas([]);

    await expect(ChildSyncService.sync()).resolves.toBe('synced');

    expect(puts()).toHaveLength(1);
    const [endpoint, init] = puts()[0];
    expect(endpoint).toBe('/api/children/main');
    expect(JSON.parse(init.body)).toEqual(expect.objectContaining({ nickname: 'Freya', version: 0 }));
    expect(useAppStore.getState().currentChildId).toBe('main');
  });

  it('remembers what it sent, so a later change on another device is taken as it is', async () => {
    useAppStore.setState({ userNickname: 'Freya', userAvatarType: 'girl', userAvatarId: 'owl', favoriteStoryIds: ['a'] });
    serverHas([]);
    await ChildSyncService.sync();
    const sent = JSON.parse(puts()[0][1].body);
    serverHas([{ ...sent, version: 2, favorites: { ...sent.favorites, stories: ['b'] } }]);

    await ChildSyncService.sync();

    expect(useAppStore.getState().favoriteStoryIds).toEqual(['b']);
  });

  it('sends a change made on this device, on top of the server\'s version', async () => {
    serverHas([remoteChild()]);
    await ChildSyncService.sync();
    useAppStore.setState({ userNickname: 'Freya Rose' });

    await ChildSyncService.sync();

    const body = JSON.parse(puts()[0][1].body);
    expect(body.nickname).toBe('Freya Rose');
    expect(body.version).toBe(4);
  });

  it('merges and tries again when another device wrote first', async () => {
    serverHas([remoteChild()]);
    await ChildSyncService.sync();
    useAppStore.setState({ userNickname: 'Mine' });
    const theirs = remoteChild({ version: 5, achievements: ['first-story', 'bedtime-hero'] });
    let attempts = 0;
    mockRequest.mockImplementation((endpoint: string, init?: RequestInit) => {
      if (!init?.method) return Promise.resolve({ children: [remoteChild()] });
      attempts += 1;
      if (attempts === 1) return Promise.reject(new ApiError(409, { errorCode: 'GTW-414', details: { current: theirs } }));
      return Promise.resolve({ ...JSON.parse(String(init.body)), version: 6 });
    });

    await expect(ChildSyncService.sync()).resolves.toBe('synced');

    const second = JSON.parse(puts()[1][1].body);
    expect(second.version).toBe(5);
    expect(second.nickname).toBe('Mine');
    expect(second.achievements).toEqual(expect.arrayContaining(['first-story', 'bedtime-hero']));
    expect(useAppStore.getState().earnedAchievementIds).toEqual(expect.arrayContaining(['bedtime-hero']));
  });

  it('gives up after three conflicts and keeps the change for later', async () => {
    serverHas([remoteChild()]);
    await ChildSyncService.sync();
    useAppStore.setState({ userNickname: 'Mine' });
    mockRequest.mockImplementation((endpoint: string, init?: RequestInit) => {
      if (!init?.method) return Promise.resolve({ children: [remoteChild()] });
      return Promise.reject(new ApiError(409, { errorCode: 'GTW-414', details: { current: remoteChild({ version: 9 }) } }));
    });

    await expect(ChildSyncService.sync()).resolves.toBe('failed');

    expect(puts()).toHaveLength(3);
    expect(useAppStore.getState().userNickname).toBe('Mine');
  });

  it('keeps working offline and reports the sync as failed rather than throwing', async () => {
    mockRequest.mockRejectedValue(new TypeError('Network request failed'));
    useAppStore.setState({ userNickname: 'Freya' });

    await expect(ChildSyncService.sync()).resolves.toBe('failed');
    expect(useAppStore.getState().userNickname).toBe('Freya');
  });

  it('never sends a timestamp or a device identifier', async () => {
    useAppStore.setState({
      userNickname: 'Freya',
      storyProgress: { s: { pageIndex: 1, totalPages: 4, completedCount: 0, updatedAt: '2026-09-01T10:00:00Z' } },
    });
    mockReminders.getSavedReminders.mockReturnValue([
      { id: 'r1', title: 't', message: 'm', dayOfWeek: 1, time: '19:00', isActive: true, createdAt: '2026-09-01T10:00:00Z', notificationId: 'n1' },
    ]);
    serverHas([]);

    await ChildSyncService.sync();

    expect(puts()[0][1].body).not.toMatch(/updatedAt|createdAt|notificationId|2026-09-01/);
  });

  it('hands incoming reminders to the reminder service', async () => {
    const reminders = [{ id: 'r1', title: 'Bath', message: '', dayOfWeek: 1, time: '19:00', isActive: true }];
    serverHas([remoteChild({ settings: { customReminders: reminders } })]);

    await ChildSyncService.sync();

    expect(mockReminders.applySyncedReminders).toHaveBeenCalledWith(reminders);
  });

  it('runs one sync at a time', async () => {
    serverHas([remoteChild()]);

    await Promise.all([ChildSyncService.sync(), ChildSyncService.sync()]);

    expect(mockRequest.mock.calls.filter(([e, init]) => e === '/api/children' && !init?.method)).toHaveLength(1);
  });
});

describe('ChildSyncService.recordConsentIfNeeded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    freshDevice();
    mockIsAuthenticated.mockResolvedValue(true);
    mockRequest.mockResolvedValue({ status: 'recorded' });
  });

  it('records the consent the parent gave, with when they gave it', async () => {
    useAppStore.setState({ consentTimestamp: '2026-09-01T10:00:00.000Z', consentPolicyVersion: '1.0' });

    await ChildSyncService.recordConsentIfNeeded();

    const [endpoint, init] = mockRequest.mock.calls[0];
    expect(endpoint).toBe('/api/consents');
    expect(JSON.parse(init.body)).toEqual(expect.objectContaining({
      policyVersion: '1.0', scope: 'core', acceptedAt: '2026-09-01T10:00:00.000Z',
    }));
    expect(useAppStore.getState().consentRecordedVersion).toBe('1.0');
  });

  it('records a policy version once', async () => {
    useAppStore.setState({ consentTimestamp: '2026-09-01T10:00:00.000Z', consentPolicyVersion: '1.0', consentRecordedVersion: '1.0' });

    await ChildSyncService.recordConsentIfNeeded();

    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('records again when the parent accepts a newer policy', async () => {
    useAppStore.setState({ consentTimestamp: '2026-09-20T10:00:00.000Z', consentPolicyVersion: '1.1', consentRecordedVersion: '1.0' });

    await ChildSyncService.recordConsentIfNeeded();

    expect(JSON.parse(mockRequest.mock.calls[0][1].body).policyVersion).toBe('1.1');
  });

  it('records nothing when no consent has been given', async () => {
    await ChildSyncService.recordConsentIfNeeded();

    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('tries again next time when the server cannot record it', async () => {
    useAppStore.setState({ consentTimestamp: '2026-09-01T10:00:00.000Z', consentPolicyVersion: '1.0' });
    mockRequest.mockRejectedValueOnce(new TypeError('Network request failed'));

    await ChildSyncService.recordConsentIfNeeded();

    expect(useAppStore.getState().consentRecordedVersion).toBeNull();
  });

  it('records nothing for a guest', async () => {
    useAppStore.setState({ isGuestMode: true, consentTimestamp: '2026-09-01T10:00:00.000Z', consentPolicyVersion: '1.0' });

    await ChildSyncService.recordConsentIfNeeded();

    expect(mockRequest).not.toHaveBeenCalled();
  });
});

describe('ChildSyncService.requestSync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    freshDevice();
    mockIsAuthenticated.mockResolvedValue(true);
    serverHas([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits two seconds and syncs once however many changes arrive', async () => {
    ChildSyncService.requestSync();
    jest.advanceTimersByTime(1000);
    ChildSyncService.requestSync();
    jest.advanceTimersByTime(1999);
    for (let i = 0; i < 20; i++) await Promise.resolve();
    expect(mockRequest).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    for (let i = 0; i < 20; i++) await Promise.resolve();

    expect(mockRequest.mock.calls.filter(([e, init]) => e === '/api/children' && !init?.method)).toHaveLength(1);
  });
});

describe('ChildSyncService.forgetAccount', () => {
  it('forgets the last sync and the child, so the next account starts clean', async () => {
    mockStorage.child_sync_base = '{"childId":"main"}';
    useAppStore.setState({ currentChildId: 'main', consentRecordedVersion: '1.0' });

    await ChildSyncService.forgetAccount();

    expect(mockStorage.child_sync_base).toBeUndefined();
    expect(useAppStore.getState().currentChildId).toBeNull();
    expect(useAppStore.getState().consentRecordedVersion).toBeNull();
  });
});
