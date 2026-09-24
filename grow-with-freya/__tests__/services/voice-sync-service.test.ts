/**
 * Recordings follow the family to a new phone only when a grown-up has
 * turned that on. New pages go up, voice-overs recorded on another phone come
 * down, and a voice-over deleted anywhere is deleted everywhere — even when
 * the phone was offline at the time.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { VoiceSyncService } from '@/services/voice-sync-service';
import { ApiClient, ApiError } from '@/services/api-client';
import { voiceRecordingService, type VoiceOver } from '@/services/voice-recording-service';

jest.unmock('@/store/app-store');
const { useAppStore } = jest.requireActual<typeof import('@/store/app-store')>('@/store/app-store');

const mockExtra = { voiceSyncAvailable: true };
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: mockExtra };
    },
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  uploadAsync: jest.fn(),
  downloadAsync: jest.fn(),
  FileSystemUploadType: { BINARY_CONTENT: 0 },
}));

jest.mock('@/services/api-client', () => {
  class MockApiError extends Error {
    status: number;
    body: unknown;

    constructor(mockStatus: number, mockBody: unknown) {
      super(`API request failed: ${mockStatus}`);
      this.status = mockStatus;
      this.body = mockBody;
    }
  }
  return { ApiClient: { request: jest.fn(), isAuthenticated: jest.fn() }, ApiError: MockApiError };
});

let mockLocal: VoiceOver[] = [];

jest.mock('@/services/voice-recording-service', () => ({
  voiceRecordingService: {
    getVoiceOvers: jest.fn(async () => mockLocal.map((vo) => ({ ...vo, pageRecordings: { ...vo.pageRecordings } }))),
    importVoiceOver: jest.fn(async (vo) => {
      mockLocal.push({ ...vo, pageRecordings: { ...vo.pageRecordings } });
    }),
    addPageRecording: jest.fn(async (id: string, pageIndex: number, uri: string, duration: number) => {
      const vo = mockLocal.find((v) => v.id === id);
      if (vo) vo.pageRecordings[pageIndex] = { pageIndex, uri, duration };
    }),
    deleteVoiceOver: jest.fn(async (id: string) => {
      mockLocal = mockLocal.filter((v) => v.id !== id);
      return { success: true, orphanedFiles: [] };
    }),
    recordingPath: jest.fn(async (id: string, pageIndex: number) => `file:///rec/${id}_page${pageIndex}.m4a`),
  },
}));

const request = ApiClient.request as jest.Mock;
const isAuthenticated = ApiClient.isAuthenticated as jest.Mock;
const getInfo = FileSystem.getInfoAsync as jest.Mock;
const upload = FileSystem.uploadAsync as jest.Mock;
const download = FileSystem.downloadAsync as jest.Mock;
let storage: Record<string, string>;
let remote: { id: string; storyId: string; label: string; pages: { pageIndex: number; bytes: number; url: string }[] }[];

function voiceOver(id: string, pages: number[], storyId = 'snowy'): VoiceOver {
  return {
    id,
    storyId,
    name: 'Mum',
    createdAt: 1,
    pageRecordings: Object.fromEntries(pages.map((p) => [p, { pageIndex: p, uri: `file:///rec/${id}_page${p}.m4a`, duration: 3 }])),
  };
}

function routes() {
  request.mockImplementation(async (endpoint: string, options?: { method?: string; body?: string }) => {
    const method = options?.method ?? 'GET';
    if (endpoint === '/api/voice-overs' && method === 'GET') return { voiceOvers: remote };
    if (endpoint === '/api/consents') return {};
    const uploads = endpoint.match(/^\/api\/voice-overs\/(.+)\/uploads$/);
    if (uploads) {
      const body = JSON.parse(options!.body!);
      return {
        uploads: body.pages.map((p: { pageIndex: number; bytes: number }) => ({
          pageIndex: p.pageIndex,
          url: `https://upload/${uploads[1]}/${p.pageIndex}`,
          headers: { 'Content-Type': 'audio/mp4', 'x-goog-content-length-range': `0,${p.bytes}` },
        })),
        usedBytes: 0,
        limitBytes: 209715200,
      };
    }
    return undefined;
  });
}

const calls = (method: string, endpoint?: string | RegExp) =>
  request.mock.calls.filter(([e, o]) => (o?.method ?? 'GET') === method && (!endpoint || (typeof endpoint === 'string' ? e === endpoint : endpoint.test(e))));

beforeEach(async () => {
  jest.clearAllMocks();
  storage = {};
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
  });
  mockLocal = [];
  remote = [];
  isAuthenticated.mockResolvedValue(true);
  getInfo.mockImplementation(async (uri: string) => ({ exists: true, size: 1000, md5: `md5-${uri}` }));
  upload.mockResolvedValue({ status: 200 });
  download.mockImplementation(async (_url: string, target: string) => ({ status: 200, uri: target }));
  routes();
  useAppStore.setState({ voiceSyncEnabled: true, isGuestMode: false, consentPolicyVersion: '1.0' });
  mockExtra.voiceSyncAvailable = true;
});

describe('VoiceSyncService.sync', () => {
  it('does nothing until a grown-up turns it on', async () => {
    useAppStore.setState({ voiceSyncEnabled: false });
    mockLocal = [voiceOver('vo_1', [1])];

    expect(await VoiceSyncService.sync()).toBe('skipped');
    expect(request).not.toHaveBeenCalled();
  });

  it('does nothing for a guest', async () => {
    useAppStore.setState({ isGuestMode: true });

    expect(await VoiceSyncService.sync()).toBe('skipped');
  });

  it('does nothing when signed out', async () => {
    isAuthenticated.mockResolvedValue(false);

    expect(await VoiceSyncService.sync()).toBe('skipped');
    expect(request).not.toHaveBeenCalled();
  });

  it('uploads each page not yet kept online, with the headers the signed link requires', async () => {
    mockLocal = [voiceOver('vo_1', [1, 2])];

    expect(await VoiceSyncService.sync()).toBe('synced');

    const [, options] = calls('POST', '/api/voice-overs/vo_1/uploads')[0];
    expect(JSON.parse(options.body)).toEqual({ storyId: 'snowy', label: 'Mum', pages: [{ pageIndex: 1, bytes: 1000 }, { pageIndex: 2, bytes: 1000 }] });
    expect(upload).toHaveBeenCalledWith('https://upload/vo_1/1', 'file:///rec/vo_1_page1.m4a', {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': 'audio/mp4', 'x-goog-content-length-range': '0,1000' },
    });
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('uploads a page once, and again only when it is recorded again', async () => {
    mockLocal = [voiceOver('vo_1', [1])];
    await VoiceSyncService.sync();
    remote = [{ id: 'vo_1', storyId: 'snowy', label: 'Mum', pages: [{ pageIndex: 1, bytes: 1000, url: 'https://download/1' }] }];

    await VoiceSyncService.sync();
    expect(upload).toHaveBeenCalledTimes(1);

    getInfo.mockImplementation(async (uri: string) => ({ exists: true, size: 1200, md5: `new-${uri}` }));
    await VoiceSyncService.sync();
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('tries a failed upload again next time', async () => {
    mockLocal = [voiceOver('vo_1', [1])];
    upload.mockResolvedValueOnce({ status: 500 });

    await VoiceSyncService.sync();
    remote = [{ id: 'vo_1', storyId: 'snowy', label: 'Mum', pages: [] }];
    await VoiceSyncService.sync();

    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('brings down a voice-over recorded on another phone', async () => {
    remote = [{ id: 'vo_9', storyId: 'owl', label: 'Grandad', pages: [
      { pageIndex: 1, bytes: 900, url: 'https://download/9/1' },
      { pageIndex: 2, bytes: 900, url: 'https://download/9/2' },
    ] }];

    await VoiceSyncService.sync();

    expect(download).toHaveBeenCalledWith('https://download/9/1', 'file:///rec/vo_9_page1.m4a');
    expect(mockLocal).toHaveLength(1);
    expect(mockLocal[0]).toMatchObject({ id: 'vo_9', storyId: 'owl', name: 'Grandad' });
    expect(Object.keys(mockLocal[0].pageRecordings)).toEqual(['1', '2']);
    expect(upload).not.toHaveBeenCalled();
  });

  it('adds pages another phone recorded to a voice-over this phone already has', async () => {
    mockLocal = [voiceOver('vo_1', [1])];
    await VoiceSyncService.sync();
    remote = [{ id: 'vo_1', storyId: 'snowy', label: 'Mum', pages: [
      { pageIndex: 1, bytes: 1000, url: 'https://download/1' },
      { pageIndex: 2, bytes: 1000, url: 'https://download/2' },
    ] }];

    await VoiceSyncService.sync();

    expect(download).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith('https://download/2', 'file:///rec/vo_1_page2.m4a');
  });

  it('skips a page it could not download, and tries again next time', async () => {
    remote = [{ id: 'vo_9', storyId: 'owl', label: 'Grandad', pages: [{ pageIndex: 1, bytes: 900, url: 'https://download/9/1' }] }];
    download.mockResolvedValueOnce({ status: 403, uri: 'x' });

    await VoiceSyncService.sync();
    await VoiceSyncService.sync();

    expect(download).toHaveBeenCalledTimes(2);
    expect(Object.keys(mockLocal[0].pageRecordings)).toEqual(['1']);
  });

  it('removes a voice-over another phone deleted', async () => {
    mockLocal = [voiceOver('vo_1', [1])];
    await VoiceSyncService.sync();
    remote = [];

    await VoiceSyncService.sync();

    expect(voiceRecordingService.deleteVoiceOver).toHaveBeenCalledWith('vo_1');
    expect(mockLocal).toEqual([]);
  });

  it('never removes a voice-over that was never kept online', async () => {
    mockLocal = [voiceOver('vo_1', [1])];
    upload.mockResolvedValue({ status: 500 });

    await VoiceSyncService.sync();
    await VoiceSyncService.sync();

    expect(voiceRecordingService.deleteVoiceOver).not.toHaveBeenCalled();
  });

  it('stops uploading when the account is full, and says so', async () => {
    mockLocal = [voiceOver('vo_1', [1]), voiceOver('vo_2', [1])];
    request.mockImplementation(async (endpoint: string, options?: { method?: string }) => {
      if (endpoint === '/api/voice-overs' && (options?.method ?? 'GET') === 'GET') return { voiceOvers: [] };
      throw new ApiError(403, { errorCode: 'GTW-419' });
    });

    expect(await VoiceSyncService.sync()).toBe('full');
    expect(calls('POST', /uploads$/)).toHaveLength(1);
  });

  it('reports a failure without throwing', async () => {
    request.mockRejectedValue(new Error('offline'));

    expect(await VoiceSyncService.sync()).toBe('failed');
  });
});

describe('VoiceSyncService.forget', () => {
  it('deletes a voice-over online when it is deleted on the phone', async () => {
    await VoiceSyncService.forget('vo_1');

    expect(calls('DELETE', '/api/voice-overs/vo_1')).toHaveLength(1);
  });

  it('remembers a deletion made offline, and makes it at the next sync before anything comes down', async () => {
    request.mockRejectedValueOnce(new Error('offline'));
    await VoiceSyncService.forget('vo_1');
    remote = [{ id: 'vo_1', storyId: 'snowy', label: 'Mum', pages: [{ pageIndex: 1, bytes: 1000, url: 'https://download/1' }] }];
    request.mockImplementation(async (endpoint: string, options?: { method?: string }) => {
      if (endpoint === '/api/voice-overs/vo_1' && options?.method === 'DELETE') {
        remote = [];
        return undefined;
      }
      if (endpoint === '/api/voice-overs') return { voiceOvers: remote };
      return undefined;
    });

    await VoiceSyncService.sync();

    expect(download).not.toHaveBeenCalled();
    expect(calls('DELETE', '/api/voice-overs/vo_1')).toHaveLength(2);
    await VoiceSyncService.sync();
    expect(calls('DELETE', '/api/voice-overs/vo_1')).toHaveLength(2);
  });

  it('never brings back a voice-over whose deletion has not reached the server yet', async () => {
    remote = [{ id: 'vo_1', storyId: 'snowy', label: 'Mum', pages: [{ pageIndex: 1, bytes: 1000, url: 'https://download/1' }] }];
    request.mockImplementation(async (endpoint: string, options?: { method?: string }) => {
      if (options?.method === 'DELETE') throw new Error('offline');
      if (endpoint === '/api/voice-overs') return { voiceOvers: remote };
      return undefined;
    });
    await VoiceSyncService.forget('vo_1');

    await VoiceSyncService.sync();
    await VoiceSyncService.sync();

    expect(download).not.toHaveBeenCalled();
    expect(calls('DELETE', '/api/voice-overs/vo_1')).toHaveLength(3);
  });

  it('does nothing while sync is off', async () => {
    useAppStore.setState({ voiceSyncEnabled: false });

    await VoiceSyncService.forget('vo_1');

    expect(request).not.toHaveBeenCalled();
  });
});

describe('turning sync on and off', () => {
  it('records the grown-up\'s agreement, then turns sync on and syncs', async () => {
    useAppStore.setState({ voiceSyncEnabled: false });
    mockLocal = [voiceOver('vo_1', [1])];

    expect(await VoiceSyncService.enable()).toBe(true);

    const [, options] = calls('POST', '/api/consents')[0];
    expect(JSON.parse(options.body)).toMatchObject({ policyVersion: '1.0', scope: 'voiceSync' });
    expect(useAppStore.getState().voiceSyncEnabled).toBe(true);
    expect(upload).toHaveBeenCalled();
  });

  it('stays off when the agreement cannot be recorded', async () => {
    useAppStore.setState({ voiceSyncEnabled: false });
    request.mockRejectedValue(new Error('offline'));

    expect(await VoiceSyncService.enable()).toBe(false);
    expect(useAppStore.getState().voiceSyncEnabled).toBe(false);
  });

  it('turns off and keeps the online copies when asked to', async () => {
    expect(await VoiceSyncService.disable({ removeOnlineCopies: false })).toBe(true);

    expect(useAppStore.getState().voiceSyncEnabled).toBe(false);
    expect(calls('DELETE')).toHaveLength(0);
  });

  it('turns off and removes every online copy when asked to', async () => {
    mockLocal = [voiceOver('vo_1', [1])];
    await VoiceSyncService.sync();

    expect(await VoiceSyncService.disable({ removeOnlineCopies: true })).toBe(true);

    expect(calls('DELETE', '/api/voice-overs')).toHaveLength(1);
    expect(useAppStore.getState().voiceSyncEnabled).toBe(false);
    expect(mockLocal).toHaveLength(1);
  });

  it('stays on when the online copies could not be removed, so the grown-up can try again', async () => {
    request.mockRejectedValue(new Error('offline'));

    expect(await VoiceSyncService.disable({ removeOnlineCopies: true })).toBe(false);
    expect(useAppStore.getState().voiceSyncEnabled).toBe(true);
  });

  it('starts afresh after being turned off, so turning it on again uploads everything', async () => {
    mockLocal = [voiceOver('vo_1', [1])];
    await VoiceSyncService.sync();
    await VoiceSyncService.disable({ removeOnlineCopies: true });

    await VoiceSyncService.enable();

    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('is offered only in builds that have it', async () => {
    expect(VoiceSyncService.isAvailable()).toBe(true);

    mockExtra.voiceSyncAvailable = false;

    expect(VoiceSyncService.isAvailable()).toBe(false);
    expect(await VoiceSyncService.sync()).toBe('skipped');
    expect(request).not.toHaveBeenCalled();
  });
});
