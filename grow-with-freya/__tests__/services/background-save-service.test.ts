/**
 * A profile edit made offline, or while the server is failing, is kept and
 * sent later. Only the newest edit is sent, an older one never comes back
 * after a newer one, and an edit made while another is in flight is not lost.
 */

type SaveData = { nickname: string; avatarType: 'boy' | 'girl'; avatarId: string };

const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key];
    return Promise.resolve();
  }),
}));
jest.mock('@/services/api-client', () => ({
  ApiClient: { isAuthenticated: jest.fn(), updateProfile: jest.fn() },
}));

const KEY = 'pending-profile-saves';

function edit(nickname: string): SaveData {
  return { nickname, avatarType: 'girl', avatarId: 'owl' };
}

function load() {
  const { backgroundSaveService } = require('@/services/background-save-service');
  const { ApiClient } = require('@/services/api-client');
  return { underTest: backgroundSaveService, api: ApiClient };
}

async function settle() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

function queued(): SaveData[] {
  return store[KEY] ? JSON.parse(store[KEY]).map((s: { data: SaveData }) => s.data) : [];
}

describe('backgroundSaveService', () => {
  let now = 1_000;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    Object.keys(store).forEach(k => delete store[k]);
    now = 1_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now++);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should send the edit and leave nothing queued', async () => {
    const { underTest, api } = load();
    api.isAuthenticated.mockResolvedValue(true);
    api.updateProfile.mockResolvedValue({});

    await underTest.queueProfileSave(edit('Freya'));
    await settle();

    expect(api.updateProfile).toHaveBeenCalledWith(edit('Freya'));
    expect(await underTest.hasPendingSaves()).toBe(false);
  });

  it('should keep the edit queued while signed out, and send it once signed in', async () => {
    const { underTest, api } = load();
    api.isAuthenticated.mockResolvedValue(false);

    await underTest.queueProfileSave(edit('Freya'));
    await settle();

    expect(api.updateProfile).not.toHaveBeenCalled();
    expect(queued()).toEqual([edit('Freya')]);

    api.isAuthenticated.mockResolvedValue(true);
    api.updateProfile.mockResolvedValue({});
    await underTest.retryPendingSaves();
    await settle();

    expect(api.updateProfile).toHaveBeenCalledWith(edit('Freya'));
    expect(queued()).toEqual([]);
  });

  it('should send only the newest of several queued edits', async () => {
    const { underTest, api } = load();
    api.isAuthenticated.mockResolvedValue(false);
    await underTest.queueProfileSave(edit('Old'));
    await settle();
    await underTest.queueProfileSave(edit('New'));
    await settle();

    api.isAuthenticated.mockResolvedValue(true);
    api.updateProfile.mockResolvedValue({});
    await underTest.retryPendingSaves();
    await settle();

    expect(api.updateProfile).toHaveBeenCalledTimes(1);
    expect(api.updateProfile).toHaveBeenCalledWith(edit('New'));
    expect(queued()).toEqual([]);
  });

  it.each([
    [1, 2000],
    [2, 4000],
  ])('should retry after failure %i with a %ims backoff', async (failures, delay) => {
    const { underTest, api } = load();
    api.isAuthenticated.mockResolvedValue(true);
    api.updateProfile.mockRejectedValue(new Error('503'));

    await underTest.queueProfileSave(edit('Freya'));
    await settle();
    for (let i = 1; i < failures; i++) {
      jest.advanceTimersByTime(2000 * Math.pow(2, i - 1));
      await settle();
    }
    expect(api.updateProfile).toHaveBeenCalledTimes(failures);

    jest.advanceTimersByTime(delay - 1);
    await settle();
    expect(api.updateProfile).toHaveBeenCalledTimes(failures);

    jest.advanceTimersByTime(1);
    await settle();
    expect(api.updateProfile).toHaveBeenCalledTimes(failures + 1);
  });

  it('should give up after three failures and drop the edit', async () => {
    const { underTest, api } = load();
    api.isAuthenticated.mockResolvedValue(true);
    api.updateProfile.mockRejectedValue(new Error('503'));

    await underTest.queueProfileSave(edit('Freya'));
    await settle();
    jest.advanceTimersByTime(2000);
    await settle();
    jest.advanceTimersByTime(4000);
    await settle();
    jest.advanceTimersByTime(60_000);
    await settle();

    expect(api.updateProfile).toHaveBeenCalledTimes(3);
    expect(queued()).toEqual([]);
  });

  it('should not send an older edit after giving up on a newer one', async () => {
    const { underTest, api } = load();
    api.isAuthenticated.mockResolvedValue(false);
    await underTest.queueProfileSave(edit('Old'));
    await settle();
    await underTest.queueProfileSave(edit('New'));
    await settle();
    api.isAuthenticated.mockResolvedValue(true);
    api.updateProfile.mockRejectedValue(new Error('503'));
    await underTest.retryPendingSaves();
    await settle();
    jest.advanceTimersByTime(2000);
    await settle();
    jest.advanceTimersByTime(4000);
    await settle();

    api.updateProfile.mockReset();
    api.updateProfile.mockResolvedValue({});
    await underTest.retryPendingSaves();
    await settle();

    expect(api.updateProfile).not.toHaveBeenCalledWith(edit('Old'));
    expect(queued()).toEqual([]);
  });

  it('should send an edit made while an earlier one was in flight', async () => {
    const { underTest, api } = load();
    api.isAuthenticated.mockResolvedValue(true);
    let finishFirst: (v: unknown) => void = () => undefined;
    api.updateProfile
      .mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }))
      .mockResolvedValue({});

    await underTest.queueProfileSave(edit('First'));
    await settle();
    await underTest.queueProfileSave(edit('Second'));
    await settle();
    finishFirst({});
    await settle();

    expect(api.updateProfile).toHaveBeenLastCalledWith(edit('Second'));
    expect(queued()).toEqual([]);
  });

  it('should keep two edits made in the same millisecond apart', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(5_000);
    const { underTest, api } = load();
    api.isAuthenticated.mockResolvedValue(false);

    await underTest.queueProfileSave(edit('One'));
    await settle();
    await underTest.queueProfileSave(edit('Two'));
    await settle();

    const ids = JSON.parse(store[KEY]).map((s: { id: string }) => s.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('should treat a corrupt queue as empty rather than crash', async () => {
    store[KEY] = '{not json';
    const { underTest } = load();

    expect(await underTest.hasPendingSaves()).toBe(false);
  });

  it('should stop a scheduled retry when cancelled', async () => {
    const { underTest, api } = load();
    api.isAuthenticated.mockResolvedValue(true);
    api.updateProfile.mockRejectedValue(new Error('503'));
    await underTest.queueProfileSave(edit('Freya'));
    await settle();

    underTest.cancelPendingRetries();
    jest.advanceTimersByTime(60_000);
    await settle();

    expect(api.updateProfile).toHaveBeenCalledTimes(1);
  });
});
