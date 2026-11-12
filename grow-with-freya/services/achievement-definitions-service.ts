import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AchievementDefinition } from '@/components/progress/achievements';
import { AssetDownloadUtils } from './asset-download-utils';
import { CacheManager } from './cache-manager';
import { Logger } from '@/utils/logger';

const log = Logger.create('AchievementDefinitions');

const STORAGE_KEY = '@achievement_definitions';

export type RemoteAchievementDefinition = AchievementDefinition & { checksum: string };

const listeners = new Set<() => void>();

function isCmsArt(art: string): boolean {
  return art.includes('/') && !/^(https?|file):\/\//.test(art);
}

async function load(): Promise<RemoteAchievementDefinition[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function fetchArt(definitions: RemoteAchievementDefinition[]): Promise<void> {
  const paths = [...new Set(definitions.filter(d => isCmsArt(d.art)).map(d => AssetDownloadUtils.normalizePath(d.art)))];
  if (paths.length === 0) return;
  try {
    const uncached = await AssetDownloadUtils.filterUncachedAssets(paths);
    if (uncached.length === 0) return;
    const { urls } = await AssetDownloadUtils.getBatchSignedUrls(uncached);
    await AssetDownloadUtils.downloadAssetsInBatches(urls);
  } catch (error) {
    log.warn('Badge art not fetched; the default art shows until the next sync', error);
  }
}

export const AchievementDefinitionsService = {
  async getDefinitions(): Promise<AchievementDefinition[]> {
    const stored = await load();
    return Promise.all(stored.map(async ({ checksum: _checksum, ...definition }) => {
      if (!isCmsArt(definition.art)) return definition;
      const local = await CacheManager.getAssetUri(AssetDownloadUtils.normalizePath(definition.art)).catch(() => null);
      return local ? { ...definition, art: local } : definition;
    }));
  },

  async getChecksums(): Promise<Record<string, string>> {
    const stored = await load();
    return Object.fromEntries(stored.map(d => [d.id, d.checksum]));
  },

  async applyDelta(changed: RemoteAchievementDefinition[], deletedIds: string[]): Promise<void> {
    if (changed.length === 0 && deletedIds.length === 0) return;
    const byId = new Map(changed.map(d => [d.id, d]));
    const deleted = new Set(deletedIds);
    const stored = await load();
    const kept = stored.filter(d => !deleted.has(d.id)).map(d => byId.get(d.id) ?? d);
    const storedIds = new Set(stored.map(d => d.id));
    const next = [...kept, ...changed.filter(d => !storedIds.has(d.id))];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    await fetchArt(changed);
    listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        log.warn('Definitions listener failed', error);
      }
    });
  },

  onDefinitionsUpdated(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  },
};
