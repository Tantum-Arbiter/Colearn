import * as FileSystem from 'expo-file-system';
import { AuthenticatedImageService } from '../../services/authenticated-image-service';

jest.mock('expo-file-system');
jest.mock('../../services/api-client');

describe('AuthenticatedImageService', () => {
  const mockCacheDir = 'file:///cache/story-images/';
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the memory cache between tests
    AuthenticatedImageService.clearCache();
    
    // Mock FileSystem.cacheDirectory
    (FileSystem as any).cacheDirectory = 'file:///cache/';
    (FileSystem as any).documentDirectory = 'file:///documents/';
  });

  describe('downloadAndCacheAsset', () => {
    const signedUrl = 'https://storage.googleapis.com/bucket/asset.webp?token=abc';
    const assetPath = 'stories/test-story/page-1/props/test-prop.webp';
    const expectedCacheFilename = 'test-prop.webp';
    const expectedCachePath = `${mockCacheDir}${expectedCacheFilename}`;

    beforeEach(() => {
      // Mock directory exists
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    });

    it('should skip download if file already cached and forceUpdate is false', async () => {
      // Mock file already exists
      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ exists: true }) // cache dir exists
        .mockResolvedValueOnce({ exists: true }); // cached file exists

      const result = await AuthenticatedImageService.downloadAndCacheAsset(
        signedUrl,
        assetPath,
        undefined,
        false // forceUpdate = false (default)
      );

      expect(result).toContain('test-prop.webp');
      expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
    });

    it('should download even if file exists when forceUpdate is true', async () => {
      // Mock file already exists
      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ exists: true }) // cache dir exists
        .mockResolvedValueOnce({ exists: true }); // cached file exists (but we should still download)
      
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({ status: 200 });
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthenticatedImageService.downloadAndCacheAsset(
        signedUrl,
        assetPath,
        undefined,
        true // forceUpdate = true
      );

      expect(result).toContain('test-prop.webp');
      expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
        signedUrl,
        expect.stringContaining('test-prop.webp')
      );
    });

    it('should delete existing file before downloading when forceUpdate is true', async () => {
      // Mock cache dir exists
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({ status: 200 });
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

      await AuthenticatedImageService.downloadAndCacheAsset(
        signedUrl,
        assetPath,
        undefined,
        true // forceUpdate = true
      );

      // Should attempt to delete the existing file
      expect(FileSystem.deleteAsync).toHaveBeenCalled();
      // Then download the new version
      expect(FileSystem.downloadAsync).toHaveBeenCalled();
    });

    it('should download file when not cached', async () => {
      // Mock file does not exist
      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ exists: true }) // cache dir exists
        .mockResolvedValueOnce({ exists: false }); // cached file does not exist

      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({ status: 200 });

      const result = await AuthenticatedImageService.downloadAndCacheAsset(
        signedUrl,
        assetPath
      );

      expect(result).toContain('test-prop.webp');
      expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
        signedUrl,
        expect.stringContaining('test-prop.webp')
      );
    });

    it('should throw error if download fails', async () => {
      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ exists: true }) // cache dir exists
        .mockResolvedValueOnce({ exists: false }); // cached file does not exist

      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({ status: 404 });

      await expect(
        AuthenticatedImageService.downloadAndCacheAsset(signedUrl, assetPath)
      ).rejects.toThrow('Download failed with status 404');
    });

    it('should create cache directory if it does not exist', async () => {
      // Mock directory does not exist, then file does not exist
      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ exists: false }) // cache dir does not exist
        .mockResolvedValueOnce({ exists: false }); // cached file does not exist

      (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({ status: 200 });

      await AuthenticatedImageService.downloadAndCacheAsset(signedUrl, assetPath);

      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        expect.stringContaining('story-images'),
        { intermediates: true }
      );
    });
  });

  describe('clearCache', () => {
    it('should clear memory cache and file cache', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

      await AuthenticatedImageService.clearCache();

      expect(FileSystem.deleteAsync).toHaveBeenCalled();
    });
  });
});

