import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../utils/logger';

const log = Logger.create('StorySync');

const STORAGE_KEY = 'story_sync_metadata';

export class StorySyncService {
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem('cached_cover_paths');
      log.debug('Cache cleared');
    } catch (error) {
      log.error('Error clearing cache:', error);
      throw error;
    }
  }
}
