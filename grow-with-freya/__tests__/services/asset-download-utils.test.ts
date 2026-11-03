import { AssetDownloadUtils } from '../../services/asset-download-utils';

const mockRequest = jest.fn();
jest.mock('../../services/api-client', () => ({
  ApiClient: { request: (...args: unknown[]) => mockRequest(...args) },
}));
jest.mock('../../services/cache-manager', () => ({
  CacheManager: { hasAsset: jest.fn(), downloadAndCacheAsset: jest.fn() },
}));

describe('AssetDownloadUtils.getBatchSignedUrls', () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it('asks for the paths it was given and keeps every signed URL that answers one of them', async () => {
    mockRequest.mockResolvedValue({
      urls: [
        { path: 'stories/wombat/page-1.webp', signedUrl: 'https://signed/1' },
        { path: 'stories/wombat/page-2.webp', signedUrl: 'https://signed/2' },
      ],
      failed: [],
    });

    const result = await AssetDownloadUtils.getBatchSignedUrls(['stories/wombat/page-1.webp', 'stories/wombat/page-2.webp']);

    expect(mockRequest).toHaveBeenCalledWith('/api/assets/batch-urls', expect.objectContaining({ method: 'POST' }));
    expect(result.urls.map((entry) => entry.path)).toEqual(['stories/wombat/page-1.webp', 'stories/wombat/page-2.webp']);
    expect(result.apiCalls).toBe(1);
  });

  it('ignores a signed URL for a path this device never asked for, so the server cannot choose where a file lands', async () => {
    mockRequest.mockResolvedValue({
      urls: [
        { path: 'stories/wombat/page-1.webp', signedUrl: 'https://signed/1' },
        { path: '../../somewhere/else.bin', signedUrl: 'https://signed/evil' },
        { path: 'stories/other/page-9.webp', signedUrl: 'https://signed/other' },
      ],
      failed: ['stories/wombat/page-3.webp'],
    });

    const result = await AssetDownloadUtils.getBatchSignedUrls(['stories/wombat/page-1.webp', 'stories/wombat/page-3.webp']);

    expect(result.urls).toEqual([{ path: 'stories/wombat/page-1.webp', signedUrl: 'https://signed/1' }]);
    expect(result.failed).toEqual(['stories/wombat/page-3.webp']);
  });

  it('counts a whole batch as failed when the request itself fails', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));

    const result = await AssetDownloadUtils.getBatchSignedUrls(['stories/a/x.webp', 'stories/a/y.webp']);

    expect(result.urls).toEqual([]);
    expect(result.failed).toEqual(['stories/a/x.webp', 'stories/a/y.webp']);
    expect(result.apiCalls).toBe(1);
  });
});
