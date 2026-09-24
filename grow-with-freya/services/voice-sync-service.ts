import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { ApiClient, ApiError } from './api-client';
import { voiceRecordingService, type VoiceOver } from './voice-recording-service';
import { useAppStore } from '@/store/app-store';
import { Logger } from '@/utils/logger';

const log = Logger.create('VoiceSync');

const STATE_KEY = '@voice_sync_state';
const CONSENT_SCOPE = 'voiceSync';
const QUOTA_EXCEEDED = 'GTW-419';

export type VoiceSyncOutcome = 'synced' | 'skipped' | 'full' | 'failed';

interface RemotePage {
  pageIndex: number;
  bytes: number;
  url: string;
}

interface RemoteVoiceOver {
  id: string;
  storyId: string;
  label: string;
  pages: RemotePage[];
}

interface UploadPlan {
  uploads: { pageIndex: number; url: string; headers: Record<string, string> }[];
}

interface SyncState {
  kept: Record<string, Record<string, string>>;
  pendingDeletes: string[];
}

let inFlight: Promise<VoiceSyncOutcome> | null = null;

async function loadState(): Promise<SyncState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return { kept: parsed?.kept ?? {}, pendingDeletes: parsed?.pendingDeletes ?? [] };
  } catch {
    return { kept: {}, pendingDeletes: [] };
  }
}

async function saveState(state: SyncState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state)).catch(() => undefined);
}

async function fingerprint(uri: string): Promise<{ bytes: number; md5: string } | null> {
  const info = await FileSystem.getInfoAsync(uri, { md5: true });
  if (!info.exists || !('size' in info) || !info.size) return null;
  return { bytes: info.size, md5: info.md5 ?? String(info.size) };
}

function isFull(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403
    && (error.body as { errorCode?: string } | null)?.errorCode === QUOTA_EXCEEDED;
}

async function flushDeletes(state: SyncState): Promise<void> {
  const remaining: string[] = [];
  for (const id of state.pendingDeletes) {
    try {
      await ApiClient.request(`/api/voice-overs/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (error) {
      log.debug(`Deletion of ${id} not sent yet`, error);
      remaining.push(id);
    }
  }
  state.pendingDeletes = remaining;
}

async function bringDown(remote: RemoteVoiceOver[], local: VoiceOver[], state: SyncState): Promise<void> {
  for (const voiceOver of remote) {
    if (state.pendingDeletes.includes(voiceOver.id)) continue;
    const existing = local.find((vo) => vo.id === voiceOver.id);
    if (!existing) {
      await voiceRecordingService.importVoiceOver({
        id: voiceOver.id,
        storyId: voiceOver.storyId,
        name: voiceOver.label,
        createdAt: Date.now(),
        pageRecordings: {},
      });
    }
    const kept = state.kept[voiceOver.id] ?? {};
    for (const page of voiceOver.pages) {
      if (existing?.pageRecordings[page.pageIndex]) continue;
      const target = await voiceRecordingService.recordingPath(voiceOver.id, page.pageIndex);
      const result = await FileSystem.downloadAsync(page.url, target);
      if (result.status !== 200) {
        log.warn(`Page ${page.pageIndex} of ${voiceOver.id} did not come down (${result.status})`);
        continue;
      }
      await voiceRecordingService.addPageRecording(voiceOver.id, page.pageIndex, target, 0);
      const print = await fingerprint(target);
      if (print) kept[page.pageIndex] = print.md5;
    }
    state.kept[voiceOver.id] = kept;
  }
}

async function removeDeletedElsewhere(remote: RemoteVoiceOver[], local: VoiceOver[], state: SyncState): Promise<VoiceOver[]> {
  const online = new Set(remote.map((vo) => vo.id));
  const survivors: VoiceOver[] = [];
  for (const voiceOver of local) {
    const wasKept = Object.keys(state.kept[voiceOver.id] ?? {}).length > 0;
    if (wasKept && !online.has(voiceOver.id)) {
      await voiceRecordingService.deleteVoiceOver(voiceOver.id);
      delete state.kept[voiceOver.id];
    } else {
      survivors.push(voiceOver);
    }
  }
  return survivors;
}

async function sendUp(local: VoiceOver[], state: SyncState): Promise<'synced' | 'full'> {
  for (const voiceOver of local) {
    const kept = state.kept[voiceOver.id] ?? {};
    const pending: { pageIndex: number; uri: string; bytes: number; md5: string }[] = [];
    for (const recording of Object.values(voiceOver.pageRecordings)) {
      const print = await fingerprint(recording.uri);
      if (print && kept[recording.pageIndex] !== print.md5) {
        pending.push({ pageIndex: recording.pageIndex, uri: recording.uri, ...print });
      }
    }
    if (pending.length === 0) continue;

    let plan: UploadPlan;
    try {
      plan = await ApiClient.request<UploadPlan>(`/api/voice-overs/${encodeURIComponent(voiceOver.id)}/uploads`, {
        method: 'POST',
        body: JSON.stringify({
          storyId: voiceOver.storyId,
          label: voiceOver.name,
          pages: pending.map(({ pageIndex, bytes }) => ({ pageIndex, bytes })),
        }),
      });
    } catch (error) {
      if (isFull(error)) return 'full';
      throw error;
    }

    for (const target of plan.uploads) {
      const page = pending.find((p) => p.pageIndex === target.pageIndex);
      if (!page) continue;
      const result = await FileSystem.uploadAsync(target.url, page.uri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: target.headers,
      });
      if (result.status >= 200 && result.status < 300) {
        kept[page.pageIndex] = page.md5;
      } else {
        log.warn(`Page ${page.pageIndex} of ${voiceOver.id} did not go up (${result.status})`);
      }
    }
    state.kept[voiceOver.id] = kept;
  }
  return 'synced';
}

async function run(): Promise<VoiceSyncOutcome> {
  const { voiceSyncEnabled, isGuestMode } = useAppStore.getState();
  if (!VoiceSyncService.isAvailable() || !voiceSyncEnabled || isGuestMode) return 'skipped';
  if (!(await ApiClient.isAuthenticated())) return 'skipped';

  const state = await loadState();
  try {
    await flushDeletes(state);
    const { voiceOvers: remote } = await ApiClient.request<{ voiceOvers: RemoteVoiceOver[] }>('/api/voice-overs');
    const local = await removeDeletedElsewhere(remote, await voiceRecordingService.getVoiceOvers(), state);
    await bringDown(remote, local, state);
    return await sendUp(await voiceRecordingService.getVoiceOvers(), state);
  } catch (error) {
    log.warn('Voice sync failed; will try again', error);
    return 'failed';
  } finally {
    await saveState(state);
  }
}

export const VoiceSyncService = {
  isAvailable(): boolean {
    return Constants.expoConfig?.extra?.voiceSyncAvailable === true;
  },

  sync(): Promise<VoiceSyncOutcome> {
    if (!inFlight) {
      inFlight = run().catch((): VoiceSyncOutcome => 'failed').finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  },

  async forget(voiceOverId: string): Promise<void> {
    if (!useAppStore.getState().voiceSyncEnabled) return;
    const state = await loadState();
    delete state.kept[voiceOverId];
    try {
      await ApiClient.request(`/api/voice-overs/${encodeURIComponent(voiceOverId)}`, { method: 'DELETE' });
    } catch (error) {
      log.debug('Deletion kept for the next sync', error);
      if (!state.pendingDeletes.includes(voiceOverId)) state.pendingDeletes.push(voiceOverId);
    }
    await saveState(state);
  },

  async enable(): Promise<boolean> {
    const { consentPolicyVersion } = useAppStore.getState();
    try {
      await ApiClient.request('/api/consents', {
        method: 'POST',
        body: JSON.stringify({ policyVersion: consentPolicyVersion ?? '1.0', scope: CONSENT_SCOPE, acceptedAt: new Date().toISOString() }),
      });
    } catch (error) {
      log.warn('Agreement to keep recordings online not recorded; sync stays off', error);
      return false;
    }
    useAppStore.getState().setVoiceSyncEnabled(true);
    await VoiceSyncService.sync();
    return true;
  },

  async disable({ removeOnlineCopies }: { removeOnlineCopies: boolean }): Promise<boolean> {
    if (removeOnlineCopies) {
      try {
        await ApiClient.request('/api/voice-overs', { method: 'DELETE' });
      } catch (error) {
        log.warn('Online copies not removed; sync stays on', error);
        return false;
      }
    }
    useAppStore.getState().setVoiceSyncEnabled(false);
    await AsyncStorage.removeItem(STATE_KEY).catch(() => undefined);
    return true;
  },
};
