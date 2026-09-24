import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient, ApiError } from './api-client';
import { reminderService } from './reminder-service';
import { setStoredLanguage, type SupportedLanguage } from './i18n';
import { ChildDocument, LocalChildState, mergeChildDocuments, toChildDocument } from './child-document';
import { useAppStore, type AppState } from '@/store/app-store';
import { resolveAgeGroup, type AgeGroup } from '@/types/story';
import { Logger } from '@/utils/logger';

const log = Logger.create('ChildSync');

const BASE_KEY = 'child_sync_base';
const LANGUAGE_KEY = '@app_language';
const FIRST_CHILD_ID = 'main';
const MAX_ATTEMPTS = 3;
const DEBOUNCE_MS = 2000;
const CONSENT_SCOPE = 'core';

const AGE_IN_MONTHS: Record<AgeGroup, number> = { '0-2': 18, '2-4': 36, '4-6': 60 };

export type SyncOutcome = 'synced' | 'skipped' | 'failed';

let inFlight: Promise<SyncOutcome> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let applying = false;

async function readLocal(): Promise<LocalChildState> {
  const state = useAppStore.getState();
  const language = await AsyncStorage.getItem(LANGUAGE_KEY).catch(() => null);
  return {
    userNickname: state.userNickname,
    userAvatarType: state.userAvatarType,
    userAvatarId: state.userAvatarId,
    childAgeInMonths: state.childAgeInMonths,
    language,
    textSizeScale: state.textSizeScale,
    favoriteStoryIds: state.favoriteStoryIds,
    favoriteActivityIds: state.favoriteActivityIds,
    favoriteSongIds: state.favoriteSongIds,
    storyProgress: state.storyProgress,
    finishedStoryIds: state.finishedStoryIds,
    challengeCounts: state.challengeCounts,
    achievements: state.earnedAchievementIds,
    screenTimeEnabled: state.screenTimeEnabled,
    notificationsEnabled: state.notificationsEnabled,
    customReminders: reminderService.getSavedReminders(),
  };
}

async function loadBase(): Promise<ChildDocument | null> {
  try {
    const raw = await AsyncStorage.getItem(BASE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveBase(doc: ChildDocument): Promise<void> {
  await AsyncStorage.setItem(BASE_KEY, JSON.stringify(doc)).catch(() => undefined);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, sortKeys((value as Record<string, unknown>)[k])]));
  }
  return value;
}

function sameContent(a: ChildDocument, b: ChildDocument): boolean {
  const strip = ({ version: _v, childId: _c, ...rest }: ChildDocument) => sortKeys(rest);
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

async function applyToDevice(doc: ChildDocument, local: LocalChildState): Promise<void> {
  applying = true;
  try {
    const state = useAppStore.getState();
    const now = new Date().toISOString();
    const storyProgress: AppState['storyProgress'] = {};
    for (const [id, entry] of Object.entries(doc.storyProgress)) {
      const existing = state.storyProgress[id];
      const moved = !existing || existing.pageIndex !== entry.pageIndex || existing.totalPages !== entry.totalPages;
      storyProgress[id] = {
        pageIndex: entry.pageIndex,
        totalPages: entry.totalPages,
        completedCount: entry.finishedCount,
        updatedAt: moved ? now : existing.updatedAt,
      };
    }
    const update: Partial<AppState> = {
      favoriteStoryIds: doc.favorites.stories,
      favoriteActivityIds: doc.favorites.activities,
      favoriteSongIds: doc.favorites.songs,
      storyProgress,
      finishedStoryIds: doc.finishedStoryIds,
      challengeCounts: doc.challengeCounts,
      earnedAchievementIds: doc.achievements,
    };
    if (doc.nickname && doc.avatarType && doc.avatarId) {
      update.userNickname = doc.nickname;
      update.userAvatarType = doc.avatarType;
      update.userAvatarId = doc.avatarId;
    }
    if (doc.ageBucket && resolveAgeGroup(state.childAgeInMonths) !== doc.ageBucket) {
      update.childAgeInMonths = AGE_IN_MONTHS[doc.ageBucket];
    }
    if (typeof doc.textSizeScale === 'number') update.textSizeScale = doc.textSizeScale;
    if (typeof doc.settings.screenTimeEnabled === 'boolean') update.screenTimeEnabled = doc.settings.screenTimeEnabled;
    if (typeof doc.settings.smartRemindersEnabled === 'boolean') update.notificationsEnabled = doc.settings.smartRemindersEnabled;
    useAppStore.setState(update);

    const localReminders = local.customReminders.map(({ id, title, message, dayOfWeek, time, isActive }) => ({
      id, title, message, dayOfWeek, time, isActive,
    }));
    if (JSON.stringify(localReminders) !== JSON.stringify(doc.settings.customReminders)) {
      await reminderService.applySyncedReminders(doc.settings.customReminders);
    }
    if (doc.language && doc.language !== local.language) {
      await setStoredLanguage(doc.language as SupportedLanguage);
    }
  } finally {
    applying = false;
  }
}

async function run(): Promise<SyncOutcome> {
  const { isGuestMode, currentChildId } = useAppStore.getState();
  if (isGuestMode || !(await ApiClient.isAuthenticated())) return 'skipped';

  try {
    const local = await readLocal();
    const base = await loadBase();
    const { children } = await ApiClient.request<{ children: ChildDocument[] }>('/api/children');
    let remote: ChildDocument | undefined = children.find(c => c.childId === currentChildId) ?? children[0];

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const mine = toChildDocument(local, remote?.childId ?? currentChildId ?? FIRST_CHILD_ID, remote?.version ?? 0);
      const merged = remote ? mergeChildDocuments(mine, remote, base) : mine;

      if (!sameContent(merged, mine)) {
        await applyToDevice(merged, local);
      }
      if (remote && sameContent(merged, remote)) {
        await saveBase(remote);
        useAppStore.setState({ currentChildId: remote.childId });
        return 'synced';
      }

      try {
        const saved = await ApiClient.request<ChildDocument>(`/api/children/${merged.childId}`, {
          method: 'PUT',
          body: JSON.stringify(merged),
        });
        await saveBase(saved);
        useAppStore.setState({ currentChildId: saved.childId });
        return 'synced';
      } catch (error) {
        const current = error instanceof ApiError && error.status === 409
          ? (error.body as { errorCode?: string; details?: { current?: ChildDocument } } | null)
          : null;
        if (current?.errorCode !== 'GTW-414') throw error;
        remote = current.details?.current;
        log.debug(`Another device wrote first; merging (attempt ${attempt + 1})`);
      }
    }
    log.warn('Gave up after repeated conflicts; will try again later');
    return 'failed';
  } catch (error) {
    log.warn('Child sync failed; keeping local changes for later', error);
    return 'failed';
  }
}

async function recordConsentIfNeeded(): Promise<void> {
  const { isGuestMode, consentTimestamp, consentPolicyVersion, consentRecordedVersion } = useAppStore.getState();
  if (isGuestMode || !consentTimestamp || !consentPolicyVersion || consentRecordedVersion === consentPolicyVersion) return;
  if (!(await ApiClient.isAuthenticated())) return;
  try {
    await ApiClient.request('/api/consents', {
      method: 'POST',
      body: JSON.stringify({ policyVersion: consentPolicyVersion, scope: CONSENT_SCOPE, acceptedAt: consentTimestamp }),
    });
    useAppStore.setState({ consentRecordedVersion: consentPolicyVersion });
  } catch (error) {
    log.warn('Could not record consent; will try again', error);
  }
}

const SYNCED_FIELDS: (keyof AppState)[] = [
  'userNickname', 'userAvatarType', 'userAvatarId', 'childAgeInMonths', 'textSizeScale',
  'favoriteStoryIds', 'favoriteActivityIds', 'favoriteSongIds', 'storyProgress',
  'finishedStoryIds', 'challengeCounts', 'earnedAchievementIds', 'screenTimeEnabled', 'notificationsEnabled',
];

export const ChildSyncService = {
  sync(): Promise<SyncOutcome> {
    if (!inFlight) {
      inFlight = run().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  },

  requestSync(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      ChildSyncService.sync();
    }, DEBOUNCE_MS);
  },

  recordConsentIfNeeded,

  startAutoSync(): () => void {
    const unsubscribeStore = useAppStore.subscribe((state, previous) => {
      if (applying) return;
      if (SYNCED_FIELDS.some(field => state[field] !== previous[field])) {
        ChildSyncService.requestSync();
      }
      if (state.consentPolicyVersion !== previous.consentPolicyVersion) {
        recordConsentIfNeeded();
      }
    });
    const unsubscribeReminders = reminderService.onRemindersCommitted(() => ChildSyncService.requestSync());
    return () => {
      unsubscribeStore();
      unsubscribeReminders();
    };
  },

  async forgetAccount(): Promise<void> {
    await AsyncStorage.removeItem(BASE_KEY).catch(() => undefined);
    useAppStore.setState({ currentChildId: null, consentRecordedVersion: null });
  },
};
