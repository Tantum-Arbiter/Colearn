import { resolveAgeGroup, type AgeGroup } from '@/types/story';
import type { CustomReminder } from './reminder-service';

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
    const value = local[key] === undefined ? remote[key] : lww(key);
    if (value !== undefined) {
      (merged as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}
