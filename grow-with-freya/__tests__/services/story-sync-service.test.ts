import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorySyncService } from '../../services/story-sync-service';

jest.mock('@react-native-async-storage/async-storage');

describe('StorySyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('clearCache', () => {
    it.each(['story_sync_metadata', 'cached_cover_paths'])('should remove %s from AsyncStorage', async (key) => {
      await StorySyncService.clearCache();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
    });

    it('should pass a storage failure on, so a reset can report it', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

      await expect(StorySyncService.clearCache()).rejects.toThrow('disk full');
    });
  });
});
