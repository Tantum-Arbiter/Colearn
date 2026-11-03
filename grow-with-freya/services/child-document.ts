import { normaliseAgeGroup, resolveAgeGroup, type AgeGroup } from '@/types/story';
import type { CustomReminder } from './reminder-service';
import type { SupportedLanguage } from './i18n';

export interface ChildProgressEntry {
  pageIndex: number;
  totalPages: number;
  finishedCount: number;
}

export interface ChildReminder {
  id: string;
  title: string;
  message: string;
  dayOfWeek: number;
  time: string;
  isActive: boolean;
}

export interface ChildSettings {
  screenTimeEnabled?: boolean;
  smartRemindersEnabled?: boolean;
  customReminders: ChildReminder[];
}

export interface ChildDocument {
  childId: string;
  nickname?: string;
  avatarType?: 'boy' | 'girl';
  avatarId?: string;
  ageBucket?: AgeGroup;
  language?: string;
  textSizeScale?: number;
  favorites: { stories: string[]; activities: string[]; songs: string[] };
  storyProgress: Record<string, ChildProgressEntry>;
  finishedStoryIds: string[];
  challengeCounts: Record<string, number>;
  achievements: string[];
  settings: ChildSettings;
  version: number;
}

export interface LocalChildState {
  userNickname: string | null;
  userAvatarType: 'boy' | 'girl' | null;
  userAvatarId: string | null;
  childAgeInMonths: number;
  language: string | null;
  textSizeScale: number;
  favoriteStoryIds: string[];
  favoriteActivityIds: string[];
  favoriteSongIds: string[];
  storyProgress: Record<string, { pageIndex: number; totalPages: number; completedCount: number; updatedAt?: string }>;
  finishedStoryIds: string[];
  challengeCounts: Record<string, number>;
  achievements: string[];
  screenTimeEnabled: boolean;
  notificationsEnabled: boolean;
  customReminders: CustomReminder[];
}

export function toChildDocument(state: LocalChildState, childId: string, version: number): ChildDocument {
  const doc: ChildDocument = {
    childId,
    ageBucket: resolveAgeGroup(state.childAgeInMonths),
    textSizeScale: state.textSizeScale,
    favorites: {
      stories: [...state.favoriteStoryIds],
      activities: [...state.favoriteActivityIds],
      songs: [...state.favoriteSongIds],
    },
    storyProgress: Object.fromEntries(
      Object.entries(state.storyProgress).map(([id, p]) => [
        id,
        { pageIndex: p.pageIndex, totalPages: p.totalPages, finishedCount: p.completedCount },
      ]),
    ),
    finishedStoryIds: [...state.finishedStoryIds],
    challengeCounts: { ...state.challengeCounts },
    achievements: [...state.achievements],
    settings: {
      screenTimeEnabled: state.screenTimeEnabled,
      smartRemindersEnabled: state.notificationsEnabled,
      customReminders: state.customReminders.map(({ id, title, message, dayOfWeek, time, isActive }) => ({
        id, title, message, dayOfWeek, time, isActive,
      })),
    },
    version,
  };
  if (state.userNickname) doc.nickname = state.userNickname;
  if (state.userAvatarType) doc.avatarType = state.userAvatarType;
  if (state.userAvatarId) doc.avatarId = state.userAvatarId;
  if (state.language) doc.language = state.language;
  return doc;
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function union(remote: string[], local: string[]): string[] {
  return [...remote, ...local.filter(id => !remote.includes(id))];
}

function pick<T>(local: T, remote: T, base: T | undefined, hasBase: boolean): T {
  if (!hasBase) return remote !== undefined ? remote : local;
  return !same(local, base) ? local : remote;
}

function pickList(local: string[], remote: string[], base: string[] | undefined, hasBase: boolean): string[] {
  return hasBase ? pick(local, remote, base, true) : union(remote, local);
}

export function mergeChildDocuments(local: ChildDocument, remote: ChildDocument, base: ChildDocument | null): ChildDocument {
  const hasBase = base !== null;
  const lww = <K extends keyof ChildDocument>(key: K) => pick(local[key], remote[key], base?.[key], hasBase);

  const storyProgress: Record<string, ChildProgressEntry> = {};
  const storyIds = new Set([...Object.keys(remote.storyProgress), ...Object.keys(local.storyProgress)]);
  for (const id of storyIds) {
    const mine = local.storyProgress[id];
    const theirs = remote.storyProgress[id];
    const before = base?.storyProgress[id];
    const chosen = hasBase ? (!same(mine, before) ? mine : theirs) : theirs ?? mine;
    if (!chosen) continue;
    storyProgress[id] = {
      ...chosen,
      finishedCount: Math.max(mine?.finishedCount ?? 0, theirs?.finishedCount ?? 0),
    };
  }

  const challengeCounts: Record<string, number> = { ...remote.challengeCounts };
  for (const [kind, count] of Object.entries(local.challengeCounts)) {
    challengeCounts[kind] = Math.max(count, challengeCounts[kind] ?? 0);
  }

  const merged: ChildDocument = {
    childId: remote.childId,
    favorites: {
      stories: pickList(local.favorites.stories, remote.favorites.stories, base?.favorites.stories, hasBase),
      activities: pickList(local.favorites.activities, remote.favorites.activities, base?.favorites.activities, hasBase),
      songs: pickList(local.favorites.songs, remote.favorites.songs, base?.favorites.songs, hasBase),
    },
    storyProgress,
    finishedStoryIds: union(remote.finishedStoryIds, local.finishedStoryIds),
    challengeCounts,
    achievements: union(remote.achievements, local.achievements),
    settings: lww('settings'),
    version: remote.version,
  };
  for (const key of ['nickname', 'avatarType', 'avatarId', 'ageBucket', 'language', 'textSizeScale'] as const) {
    const picked = local[key] === undefined ? remote[key] : lww(key);
    const value = key === 'ageBucket' ? normaliseAgeGroup(picked) : picked;
    if (value !== undefined) {
      (merged as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}

const ID = /^[A-Za-z0-9_-]{1,100}$/;
const AVATAR_ID = /^[a-z0-9-]{1,40}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const LANGUAGES: readonly SupportedLanguage[] = ['en', 'pl', 'es', 'de', 'fr', 'it', 'pt', 'ar', 'tr', 'nl', 'da', 'la', 'ja', 'zh'];
const CHALLENGES = ['music', 'jigsaw', 'reading'];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isInt = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max && /\S/.test(value);
const ids = (value: unknown, max: number): string[] =>
  Array.isArray(value) ? value.filter((each): each is string => typeof each === 'string' && ID.test(each)).slice(0, max) : [];

function reminderOf(value: unknown): ChildReminder | null {
  if (!isRecord(value)) return null;
  const { id, title, message = '', dayOfWeek, time, isActive } = value;
  if (!isText(id, 100) || !isText(title, 100) || typeof message !== 'string' || message.length > 500) return null;
  if (!isInt(dayOfWeek, 0, 6) || typeof time !== 'string' || !TIME.test(time) || typeof isActive !== 'boolean') return null;
  return { id, title, message, dayOfWeek, time, isActive };
}

/**
 * An account document arrives from the gateway, which arrives from any device on the account.
 * It is applied to this device and written back, so nothing in it is trusted until it has been
 * checked against the same bounds the gateway enforces. A document that cannot be trusted at
 * all (no usable child id or version) is refused; a field that fails is dropped, not kept.
 */
export function sanitiseChildDocument(input: unknown): ChildDocument | null {
  if (!isRecord(input) || typeof input.childId !== 'string' || !ID.test(input.childId) || !isInt(input.version, 0, Number.MAX_SAFE_INTEGER)) {
    return null;
  }
  const favorites = isRecord(input.favorites) ? input.favorites : {};
  const settings = isRecord(input.settings) ? input.settings : {};

  const storyProgress: Record<string, ChildProgressEntry> = {};
  if (isRecord(input.storyProgress)) {
    for (const [storyId, entry] of Object.entries(input.storyProgress)) {
      if (Object.keys(storyProgress).length >= 1000) break;
      if (!ID.test(storyId) || !isRecord(entry)) continue;
      const { pageIndex, totalPages, finishedCount } = entry;
      if (isInt(pageIndex, 0, 1000) && isInt(totalPages, 0, 1000) && isInt(finishedCount, 0, 100_000)) {
        storyProgress[storyId] = { pageIndex, totalPages, finishedCount };
      }
    }
  }

  const challengeCounts: Record<string, number> = {};
  if (isRecord(input.challengeCounts)) {
    for (const [name, count] of Object.entries(input.challengeCounts)) {
      if (CHALLENGES.includes(name) && isInt(count, 0, 1_000_000)) challengeCounts[name] = count;
    }
  }

  const out: ChildDocument = {
    childId: input.childId,
    version: input.version,
    favorites: { stories: ids(favorites.stories, 500), activities: ids(favorites.activities, 500), songs: ids(favorites.songs, 500) },
    storyProgress,
    finishedStoryIds: ids(input.finishedStoryIds, 1000),
    challengeCounts,
    achievements: ids(input.achievements, 500),
    settings: {
      customReminders: Array.isArray(settings.customReminders)
        ? settings.customReminders.map(reminderOf).filter((each): each is ChildReminder => each !== null).slice(0, 50)
        : [],
    },
  };
  if (typeof settings.screenTimeEnabled === 'boolean') out.settings.screenTimeEnabled = settings.screenTimeEnabled;
  if (typeof settings.smartRemindersEnabled === 'boolean') out.settings.smartRemindersEnabled = settings.smartRemindersEnabled;
  if (isText(input.nickname, 20)) out.nickname = input.nickname;
  if (input.avatarType === 'boy' || input.avatarType === 'girl') out.avatarType = input.avatarType;
  if (typeof input.avatarId === 'string' && AVATAR_ID.test(input.avatarId)) out.avatarId = input.avatarId;
  const ageBucket = normaliseAgeGroup(input.ageBucket);
  if (ageBucket) out.ageBucket = ageBucket;
  if (typeof input.language === 'string' && (LANGUAGES as readonly string[]).includes(input.language)) out.language = input.language;
  if (typeof input.textSizeScale === 'number' && Number.isFinite(input.textSizeScale) && input.textSizeScale >= 0.5 && input.textSizeScale <= 2) {
    out.textSizeScale = input.textSizeScale;
  }
  return out;
}
