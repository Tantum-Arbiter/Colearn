import { CacheManager } from '../../services/cache-manager';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Story } from '../../types/story';

jest.mock('expo-file-system');
jest.mock('@react-native-async-storage/async-storage');

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Type for FileInfo that exists (file or directory)
type FileInfoExists = {
  exists: true;
  uri: string;
  size: number;
  isDirectory: boolean;
  modificationTime: number;
  md5?: string;
};

// Type for FileInfo that doesn't exist
type FileInfoMissing = {
  exists: false;
  uri: string;
  isDirectory: false;
};

type MockFileInfo = FileInfoExists | FileInfoMissing;

// Helper functions to create properly typed FileInfo mocks
const createFileInfo = (overrides: Partial<Omit<FileInfoExists, 'exists'>> = {}): MockFileInfo => ({
  exists: true,
  isDirectory: overrides.isDirectory ?? false,
  uri: overrides.uri ?? '',
  size: overrides.size ?? 1024,
  modificationTime: overrides.modificationTime ?? Date.now(),
});

const createDirInfo = (uri: string = ''): MockFileInfo => ({
  exists: true,
  isDirectory: true,
  uri,
  size: 0,
  modificationTime: Date.now(),
});

const createMissingInfo = (): MockFileInfo => ({
  exists: false,
  isDirectory: false,
  uri: '',
});

// Mock story factory
const createMockStory = (id: string, title: string): Story => ({
  id,
  title,
  category: 'adventure',
  tag: 'test',
  emoji: '📖',
  isAvailable: true,
  checksum: `checksum-${id}`,
});

describe('CacheManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset initialized state
    (CacheManager as any).initialized = false;

    // Default mock implementations
    mockFileSystem.getInfoAsync.mockResolvedValue(createDirInfo());
    mockFileSystem.makeDirectoryAsync.mockResolvedValue();
    (mockFileSystem as any).documentDirectory = 'file://docs/';
  });

  describe('initialize', () => {
    it('should create cache directories if they do not exist', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue(createMissingInfo());

      await CacheManager.initialize();

      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledTimes(2);
    });

    it('should not create directories if they already exist', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue(createDirInfo());

      await CacheManager.initialize();

      expect(mockFileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
    });

    it('should only initialize once', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue(createMissingInfo());

      await CacheManager.initialize();
      await CacheManager.initialize();

      // Only 2 calls (for 2 directories), not 4
      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('Story Cache', () => {
    describe('getStories', () => {
      it('should return empty array when no stories cached', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);
        
        const result = await CacheManager.getStories();
        
        expect(result).toEqual([]);
      });

      it('should return cached stories', async () => {
        const stories = [createMockStory('1', 'Story 1'), createMockStory('2', 'Story 2')];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));
        
        const result = await CacheManager.getStories();
        
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('1');
      });

      it('should return empty array on parse error', async () => {
        mockAsyncStorage.getItem.mockResolvedValue('invalid json');
        
        const result = await CacheManager.getStories();
        
        expect(result).toEqual([]);
      });
    });

    describe('getStory', () => {
      it('should return single story by ID', async () => {
        const stories = [createMockStory('1', 'Story 1'), createMockStory('2', 'Story 2')];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));
        
        const result = await CacheManager.getStory('2');
        
        expect(result?.id).toBe('2');
        expect(result?.title).toBe('Story 2');
      });

      it('should return null for non-existent story', async () => {
        const stories = [createMockStory('1', 'Story 1')];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stories));
        
        const result = await CacheManager.getStory('999');
        
        expect(result).toBeNull();
      });
    });

    describe('saveStories', () => {
      it('should save stories and metadata', async () => {
        const stories = [createMockStory('1', 'Story 1')];
        mockAsyncStorage.setItem.mockResolvedValue();
        
        await CacheManager.saveStories(stories);
        
        expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2); // Stories + metadata
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          '@story_cache',
          expect.any(String)
        );
      });
    });

    describe('updateStories', () => {
      it('should merge new stories with existing', async () => {
        const existing = [createMockStory('1', 'Story 1')];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));
        mockAsyncStorage.setItem.mockResolvedValue();
        
        const updates = [createMockStory('2', 'Story 2')];
        await CacheManager.updateStories(updates);
        
        const savedStories = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
        expect(savedStories).toHaveLength(2);
      });

      it('should update existing story with same ID', async () => {
        const existing = [createMockStory('1', 'Old Title')];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));
        mockAsyncStorage.setItem.mockResolvedValue();

        const updates = [createMockStory('1', 'New Title')];
        await CacheManager.updateStories(updates);

        const savedStories = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
        expect(savedStories).toHaveLength(1);
        expect(savedStories[0].title).toBe('New Title');
      });
    });

    describe('removeStories', () => {
      it('should remove stories by ID', async () => {
        const existing = [
          createMockStory('1', 'Story 1'),
          createMockStory('2', 'Story 2'),
          createMockStory('3', 'Story 3'),
        ];
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));
        mockAsyncStorage.setItem.mockResolvedValue();

        await CacheManager.removeStories(['1', '3']);

        const savedStories = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
        expect(savedStories).toHaveLength(1);
        expect(savedStories[0].id).toBe('2');
      });
    });
  });

  describe('Asset Cache', () => {
    describe('getAssetUri', () => {
      it('should return local URI when asset is cached', async () => {
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo({ uri: 'file://docs/content_cache/assets/test.png' }));

        const result = await CacheManager.getAssetUri('test.png');

        expect(result).toContain('test.png');
      });

      it('should return null when asset is not cached', async () => {
        mockFileSystem.getInfoAsync
          .mockResolvedValueOnce(createDirInfo()) // Cache dir
          .mockResolvedValueOnce(createDirInfo()) // Assets dir
          .mockResolvedValueOnce(createMissingInfo()); // Asset file

        const result = await CacheManager.getAssetUri('missing.png');

        expect(result).toBeNull();
      });
    });

    describe('hasAsset', () => {
      it('should return true when asset exists', async () => {
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo());

        const result = await CacheManager.hasAsset('test.png');

        expect(result).toBe(true);
      });

      it('should return false when asset does not exist', async () => {
        mockFileSystem.getInfoAsync
          .mockResolvedValueOnce(createDirInfo())
          .mockResolvedValueOnce(createDirInfo())
          .mockResolvedValueOnce(createMissingInfo());

        const result = await CacheManager.hasAsset('missing.png');

        expect(result).toBe(false);
      });
    });

    describe('downloadAndCacheAsset', () => {
      it('should download and cache asset', async () => {
        mockFileSystem.downloadAsync.mockResolvedValue({
          uri: 'file://cached/asset.png',
          status: 200,
          headers: {},
          mimeType: 'image/png',
          md5: undefined,
        });

        const result = await CacheManager.downloadAndCacheAsset(
          'https://example.com/asset.png',
          'stories/asset.png'
        );

        expect(result).toContain('asset.png');
        expect(mockFileSystem.downloadAsync).toHaveBeenCalled();
      });

      it('should throw on download failure', async () => {
        mockFileSystem.downloadAsync.mockResolvedValue({
          uri: '',
          status: 404,
          headers: {},
          mimeType: null,
          md5: undefined,
        });

        await expect(
          CacheManager.downloadAndCacheAsset('https://example.com/missing.png', 'missing.png')
        ).rejects.toThrow('Failed to download asset');
      });
    });
  });

  describe('Cache Management', () => {
    describe('clearAll', () => {
      it('should clear all cached data', async () => {
        // Mock multiRemove - it may not exist in the mock by default
        (mockAsyncStorage as any).multiRemove = jest.fn().mockResolvedValue(undefined);
        mockFileSystem.getInfoAsync.mockResolvedValue(createDirInfo());
        mockFileSystem.deleteAsync.mockResolvedValue();

        await CacheManager.clearAll();

        expect((mockAsyncStorage as any).multiRemove).toHaveBeenCalled();
        expect(mockFileSystem.deleteAsync).toHaveBeenCalled();
      });
    });

    describe('getStats', () => {
      it('should return cache statistics', async () => {
        const stories = [createMockStory('1', 'Story 1')];
        mockAsyncStorage.getItem
          .mockResolvedValueOnce(JSON.stringify(stories)) // Stories
          .mockResolvedValueOnce(JSON.stringify({ lastUpdated: '2024-01-15' })); // Metadata
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo({ isDirectory: true }));

        const stats = await CacheManager.getStats();

        expect(stats.storyCount).toBe(1);
        expect(stats.lastUpdated).toBe('2024-01-15');
      });
    });

    describe('validateAssetIntegrity', () => {
      it('should return valid for existing file with content', async () => {
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo({ uri: 'file://path/asset.png' }));

        const result = await CacheManager.validateAssetIntegrity('stories/1/cover.png');

        expect(result.valid).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should return invalid for non-existent file', async () => {
        mockFileSystem.getInfoAsync.mockResolvedValue(createMissingInfo());

        const result = await CacheManager.validateAssetIntegrity('stories/1/missing.png');

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('File does not exist');
      });

      it('should return invalid for empty file (0 bytes)', async () => {
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo({ size: 0, uri: 'file://path/empty.png' }));

        const result = await CacheManager.validateAssetIntegrity('stories/1/empty.png');

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('File is empty (0 bytes)');
      });

      it('should return invalid when file check throws error', async () => {
        mockFileSystem.getInfoAsync.mockRejectedValue(new Error('Permission denied'));

        const result = await CacheManager.validateAssetIntegrity('stories/1/error.png');

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Error checking file');
      });
    });

    describe('validateAllAssets', () => {
      it('should validate all assets from cached stories', async () => {
        const storyWithAssets = {
          ...createMockStory('1', 'Story with Assets'),
          coverImage: 'stories/1/cover.png', // Use coverImage (string path)
          pages: [
            { id: 'p1', pageNumber: 1, text: 'Page 1', backgroundImage: 'stories/1/page1.png', characterImage: 'stories/1/char1.png' },
          ],
        };

        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([storyWithAssets]));
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo({ uri: 'file://path' }));

        const result = await CacheManager.validateAllAssets();

        expect(result.totalAssets).toBe(3); // cover + backgroundImage + characterImage
        expect(result.validAssets).toBe(3);
        expect(result.corruptedAssets).toHaveLength(0);
      });

      it('should identify corrupted assets', async () => {
        const storyWithAssets = {
          ...createMockStory('1', 'Story with Assets'),
          coverImage: 'stories/1/cover.png', // Use coverImage (string path)
          pages: [
            { id: 'p1', pageNumber: 1, text: 'Page 1', backgroundImage: 'stories/1/page1.png' },
          ],
        };

        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([storyWithAssets]));

        // Mock getInfoAsync to return different results based on call order
        // Initialize calls (cache dir + assets dir) + cover (valid) + page1 (missing)
        mockFileSystem.getInfoAsync
          .mockResolvedValueOnce(createDirInfo()) // cache dir check
          .mockResolvedValueOnce(createDirInfo()) // assets dir check
          .mockResolvedValueOnce(createFileInfo()) // cover - valid
          .mockResolvedValueOnce(createMissingInfo()); // page1 - missing

        const result = await CacheManager.validateAllAssets();

        expect(result.totalAssets).toBe(2);
        expect(result.validAssets).toBe(1);
        expect(result.corruptedAssets).toHaveLength(1);
        expect(result.corruptedAssets[0]).toBe('stories/1/page1.png');
      });
    });

    describe('removeCorruptedAssets', () => {
      it('should remove specified corrupted assets', async () => {
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo());
        mockFileSystem.deleteAsync.mockResolvedValue();

        const removed = await CacheManager.removeCorruptedAssets([
          'stories/1/corrupt1.png',
          'stories/1/corrupt2.png',
        ]);

        expect(removed).toBe(2);
        expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(2);
      });

      it('should continue removing even if some fail', async () => {
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo());
        mockFileSystem.deleteAsync
          .mockRejectedValueOnce(new Error('Permission denied'))
          .mockResolvedValueOnce();

        const removed = await CacheManager.removeCorruptedAssets([
          'stories/1/locked.png',
          'stories/1/removable.png',
        ]);

        expect(removed).toBe(1);
      });
    });
  });

  describe('URL Resolution', () => {
    describe('getStoriesWithResolvedUrls', () => {
      it('should return empty array when no stories cached', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);

        const result = await CacheManager.getStoriesWithResolvedUrls();

        expect(result).toEqual([]);
      });

      it('should resolve cover image URL to local path when file exists', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          coverImage: 'stories/story-1/cover.webp',
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo());

        const result = await CacheManager.getStoriesWithResolvedUrls();

        expect(result[0].coverImage).toContain('content_cache/assets/stories/story-1/cover.webp');
      });

      it('should keep original URL when file does not exist locally', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          coverImage: 'stories/story-1/cover.webp',
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));
        mockFileSystem.getInfoAsync.mockResolvedValue(createMissingInfo());

        const result = await CacheManager.getStoriesWithResolvedUrls();

        expect(result[0].coverImage).toBe('stories/story-1/cover.webp');
      });

      it('should resolve full API URL to local path', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          coverImage: 'https://api.colearnwithfreya.co.uk/api/assets/stories/story-1/cover.webp',
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo());

        const result = await CacheManager.getStoriesWithResolvedUrls();

        expect(result[0].coverImage).toContain('content_cache/assets/stories/story-1/cover.webp');
      });

      it('should handle paths starting with assets/', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          coverImage: 'assets/stories/story-1/cover.webp',
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo());

        const result = await CacheManager.getStoriesWithResolvedUrls();

        // Should strip "assets/" prefix and resolve to local path
        expect(result[0].coverImage).toContain('content_cache/assets/stories/story-1/cover.webp');
        // Should not have double "assets/"
        expect(result[0].coverImage).not.toContain('assets/assets/');
      });

      it('should preserve file:// URLs as-is', async () => {
        const localPath = 'file:///some/local/path/cover.webp';
        const story = {
          ...createMockStory('1', 'Story 1'),
          coverImage: localPath,
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));

        const result = await CacheManager.getStoriesWithResolvedUrls();

        expect(result[0].coverImage).toBe(localPath);
        // Should not call getInfoAsync for file:// URLs
        expect(mockFileSystem.getInfoAsync).not.toHaveBeenCalled();
      });

      it('should preserve unknown http URLs as-is', async () => {
        const externalUrl = 'https://example.com/image.webp';
        const story = {
          ...createMockStory('1', 'Story 1'),
          coverImage: externalUrl,
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));

        const result = await CacheManager.getStoriesWithResolvedUrls();

        expect(result[0].coverImage).toBe(externalUrl);
      });

      it('should resolve page background images', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          pages: [
            { id: 'p1', pageNumber: 1, text: 'Page 1', backgroundImage: 'stories/story-1/page-1/bg.webp' },
          ],
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo());

        const result = await CacheManager.getStoriesWithResolvedUrls();

        expect(result[0].pages![0].backgroundImage).toContain('content_cache/assets/stories/story-1/page-1/bg.webp');
      });

      it('should resolve page character images', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          pages: [
            { id: 'p1', pageNumber: 1, text: 'Page 1', characterImage: 'stories/story-1/page-1/char.webp' },
          ],
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo());

        const result = await CacheManager.getStoriesWithResolvedUrls();

        expect(result[0].pages![0].characterImage).toContain('content_cache/assets/stories/story-1/page-1/char.webp');
      });

      it('should resolve interactive element images', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          pages: [
            {
              id: 'p1',
              pageNumber: 1,
              text: 'Page 1',
              interactiveElements: [
                {
                  id: 'elem1',
                  type: 'reveal' as const,
                  image: 'stories/story-1/page-1/element.webp',
                  position: { x: 0.5, y: 0.5 },
                  size: { width: 0.1, height: 0.1 },
                },
              ],
            },
          ],
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo());

        const result = await CacheManager.getStoriesWithResolvedUrls();

        expect(result[0].pages![0].interactiveElements![0].image).toContain(
          'content_cache/assets/stories/story-1/page-1/element.webp'
        );
      });

      it('should preserve numeric cover images (bundled assets from require())', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          coverImage: 12345 as unknown as string, // require() result is a number
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));

        const result = await CacheManager.getStoriesWithResolvedUrls();

        // Numeric images should be preserved as-is (no resolution needed)
        expect(result[0].coverImage).toBe(12345);
      });

      it('should preserve numeric background images (bundled assets from require())', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          pages: [
            {
              id: 'p1',
              pageNumber: 1,
              text: 'Page 1',
              backgroundImage: 12345 as unknown as string, // require() result is a number
            },
          ],
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));

        const result = await CacheManager.getStoriesWithResolvedUrls();

        // Numeric images should be preserved as-is
        expect(result[0].pages![0].backgroundImage).toBe(12345);
      });

      it('should preserve numeric interactive element images (bundled assets)', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          pages: [
            {
              id: 'p1',
              pageNumber: 1,
              text: 'Page 1',
              interactiveElements: [
                {
                  id: 'elem1',
                  type: 'reveal' as const,
                  image: 12345, // require() result is a number
                  position: { x: 0.5, y: 0.5 },
                  size: { width: 0.1, height: 0.1 },
                },
              ],
            },
          ],
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));

        const result = await CacheManager.getStoriesWithResolvedUrls();

        // Numeric images should be preserved as-is
        expect(result[0].pages![0].interactiveElements![0].image).toBe(12345);
      });

      it('should handle stories without pages', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          coverImage: 'stories/story-1/cover.webp',
          // No pages property
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo());

        const result = await CacheManager.getStoriesWithResolvedUrls();

        expect(result).toHaveLength(1);
        expect(result[0].coverImage).toContain('content_cache/assets/');
      });

      it('should handle stories without cover image', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          // No coverImage property
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));

        const result = await CacheManager.getStoriesWithResolvedUrls();

        expect(result).toHaveLength(1);
        expect(result[0].coverImage).toBeUndefined();
      });

      it('should handle empty string URLs gracefully', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          coverImage: '',
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));

        const result = await CacheManager.getStoriesWithResolvedUrls();

        expect(result[0].coverImage).toBe('');
      });

      it('should handle FileSystem errors gracefully', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          coverImage: 'stories/story-1/cover.webp',
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));
        mockFileSystem.getInfoAsync.mockRejectedValue(new Error('FileSystem error'));

        const result = await CacheManager.getStoriesWithResolvedUrls();

        // Should fall back to original URL on error
        expect(result[0].coverImage).toBe('stories/story-1/cover.webp');
      });
    });

    describe('getStories vs getStoriesWithResolvedUrls', () => {
      it('getStories should return raw URLs without resolution', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          coverImage: 'stories/story-1/cover.webp',
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo());

        const result = await CacheManager.getStories();

        // Should return original URL, not resolved
        expect(result[0].coverImage).toBe('stories/story-1/cover.webp');
        // Should not call getInfoAsync for URL resolution
        expect(mockFileSystem.getInfoAsync).not.toHaveBeenCalled();
      });

      it('getStoriesWithResolvedUrls should resolve URLs', async () => {
        const story = {
          ...createMockStory('1', 'Story 1'),
          coverImage: 'stories/story-1/cover.webp',
        };
        mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([story]));
        mockFileSystem.getInfoAsync.mockResolvedValue(createFileInfo());

        const result = await CacheManager.getStoriesWithResolvedUrls();

        // Should return resolved local path
        expect(result[0].coverImage).toContain('content_cache/assets/');
        expect(mockFileSystem.getInfoAsync).toHaveBeenCalled();
      });
    });
  });
});

