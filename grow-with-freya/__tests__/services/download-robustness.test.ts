/**
 * Tests for download robustness features:
 * - CacheManager.downloadAndCacheAsset: per-asset timeout via Promise.race
 * - AssetDownloadUtils.downloadAssetsInBatches: retry loop with exponential backoff
 *
 * These tests exercise the REAL implementations, only mocking at the
 * lowest layer (expo-file-system/legacy) so we verify the actual
 * timeout/retry/error-handling code paths.
 */

import { CacheManager } from '../../services/cache-manager';
import { AssetDownloadUtils } from '../../services/asset-download-utils';

// ── Mocks at the filesystem layer ────────────────────────────────────

const mockDownloadAsync = jest.fn();
const mockGetInfoAsync = jest.fn();
const mockMakeDirectoryAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock/documents/',
  downloadAsync: (...args: any[]) => mockDownloadAsync(...args),
  getInfoAsync: (...args: any[]) => mockGetInfoAsync(...args),
  makeDirectoryAsync: (...args: any[]) => mockMakeDirectoryAsync(...args),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Suppress Logger output in tests
jest.mock('@/utils/logger', () => ({
  Logger: {
    create: () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────

/** Simulate a successful FileSystem.downloadAsync */
function successDownload(delayMs = 0) {
  return new Promise<{ uri: string; status: number; headers: Record<string, string> }>((resolve) => {
    setTimeout(() => resolve({ uri: '/mock/path', status: 200, headers: {} }), delayMs);
  });
}

/** Simulate a download that never resolves (hangs forever) */
function hangingDownload() {
  return new Promise<never>(() => {}); // never resolves
}

/** Simulate a download that fails with an HTTP error */
function failedDownload(status = 500) {
  return Promise.resolve({ uri: '/mock/path', status, headers: {} });
}

// =====================================================================
// CacheManager.downloadAndCacheAsset -timeout via Promise.race
// =====================================================================
describe('CacheManager.downloadAndCacheAsset -real timeout logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset CacheManager initialization state
    (CacheManager as any).initialized = false;
    // Make initialize() pass
    mockGetInfoAsync.mockResolvedValue({ exists: true, isDirectory: true });
    mockMakeDirectoryAsync.mockResolvedValue(undefined);
  });

  it('should resolve successfully when download completes before timeout', async () => {
    mockDownloadAsync.mockImplementation(() => successDownload(10));

    const result = await CacheManager.downloadAndCacheAsset(
      'https://example.com/asset.webp',
      'stories/test/asset.webp'
    );

    expect(result).toContain('asset.webp');
    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);
  });

  it('should reject with timeout error when download hangs', async () => {
    // Temporarily lower the timeout so the test doesn't take 30s
    const originalTimeout = CacheManager.ASSET_DOWNLOAD_TIMEOUT_MS;
    (CacheManager as any).ASSET_DOWNLOAD_TIMEOUT_MS = 100; // 100ms

    mockDownloadAsync.mockImplementation(() => hangingDownload());

    await expect(
      CacheManager.downloadAndCacheAsset('https://example.com/slow.webp', 'stories/test/slow.webp')
    ).rejects.toThrow(/timed out/i);

    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);

    // Restore
    (CacheManager as any).ASSET_DOWNLOAD_TIMEOUT_MS = originalTimeout;
  });

  it('should throw when download returns non-200 status', async () => {
    mockDownloadAsync.mockImplementation(() => failedDownload(403));

    await expect(
      CacheManager.downloadAndCacheAsset('https://example.com/denied.webp', 'stories/test/denied.webp')
    ).rejects.toThrow(/403/);
  });

  it('should create parent directory if it does not exist', async () => {
    // First getInfoAsync call = initialize (exists), second = parent dir check (not exists)
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true }) // initialize cache dir
      .mockResolvedValueOnce({ exists: true }) // initialize assets dir
      .mockResolvedValueOnce({ exists: false }); // parent dir doesn't exist
    mockDownloadAsync.mockImplementation(() => successDownload(0));

    await CacheManager.downloadAndCacheAsset('https://example.com/a.webp', 'deep/nested/a.webp');

    expect(mockMakeDirectoryAsync).toHaveBeenCalled();
  });
});

// =====================================================================
// AssetDownloadUtils.downloadAssetsInBatches -real retry logic
// =====================================================================
describe('AssetDownloadUtils.downloadAssetsInBatches -real retry logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset CacheManager initialization so downloadAndCacheAsset works
    (CacheManager as any).initialized = false;
    mockGetInfoAsync.mockResolvedValue({ exists: true, isDirectory: true });
    mockMakeDirectoryAsync.mockResolvedValue(undefined);
  });

  it('should succeed on first attempt with no retries', async () => {
    mockDownloadAsync.mockImplementation(() => successDownload(0));

    const result = await AssetDownloadUtils.downloadAssetsInBatches(
      [{ path: 'a.webp', signedUrl: 'https://example.com/a.webp' }]
    );

    expect(result.downloaded).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockDownloadAsync).toHaveBeenCalledTimes(1);
  });

  it('should retry once and succeed on second attempt', async () => {
    // First call: reject (simulating network error)
    // Second call: succeed
    mockDownloadAsync
      .mockRejectedValueOnce(new Error('Connection reset'))
      .mockImplementationOnce(() => successDownload(0));

    const result = await AssetDownloadUtils.downloadAssetsInBatches(
      [{ path: 'b.webp', signedUrl: 'https://example.com/b.webp' }]
    );

    expect(result.downloaded).toBe(1);
    expect(result.failed).toBe(0);
    // Initial attempt + 1 retry = 2 calls
    expect(mockDownloadAsync).toHaveBeenCalledTimes(2);
  }, 10000);

  it('should retry twice and succeed on third attempt', async () => {
    mockDownloadAsync
      .mockRejectedValueOnce(new Error('Timeout 1'))
      .mockRejectedValueOnce(new Error('Timeout 2'))
      .mockImplementationOnce(() => successDownload(0));

    const result = await AssetDownloadUtils.downloadAssetsInBatches(
      [{ path: 'c.webp', signedUrl: 'https://example.com/c.webp' }]
    );

    expect(result.downloaded).toBe(1);
    expect(result.failed).toBe(0);
    // Initial + 2 retries = 3 calls
    expect(mockDownloadAsync).toHaveBeenCalledTimes(3);
  }, 15000);

  it('should fail after exhausting all 3 attempts (initial + 2 retries)', async () => {
    mockDownloadAsync
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockRejectedValueOnce(new Error('Fail 3'));

    const result = await AssetDownloadUtils.downloadAssetsInBatches(
      [{ path: 'd.webp', signedUrl: 'https://example.com/d.webp' }]
    );

    expect(result.downloaded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('d.webp');
    expect(mockDownloadAsync).toHaveBeenCalledTimes(3);
  }, 15000);

  it('should handle mix of successful and failing assets', async () => {
    // Asset A: succeeds immediately
    // Asset B: fails all 3 attempts
    mockDownloadAsync
      // Asset A (first in batch)
      .mockImplementationOnce(() => successDownload(0))
      // Asset B attempt 1
      .mockRejectedValueOnce(new Error('Fail'))
      // Asset B attempt 2
      .mockRejectedValueOnce(new Error('Fail'))
      // Asset B attempt 3
      .mockRejectedValueOnce(new Error('Fail'));

    const result = await AssetDownloadUtils.downloadAssetsInBatches([
      { path: 'good.webp', signedUrl: 'https://example.com/good.webp' },
      { path: 'bad.webp', signedUrl: 'https://example.com/bad.webp' },
    ]);

    expect(result.downloaded).toBe(1);
    expect(result.failed).toBe(1);
    // A: 1 call, B: 3 calls = 4 total
    expect(mockDownloadAsync).toHaveBeenCalledTimes(4);
  }, 15000);

  it('should report progress via callback', async () => {
    mockDownloadAsync.mockImplementation(() => successDownload(0));

    const progressCalls: { current: number; total: number }[] = [];
    await AssetDownloadUtils.downloadAssetsInBatches(
      [
        { path: 'x.webp', signedUrl: 'https://example.com/x.webp' },
        { path: 'y.webp', signedUrl: 'https://example.com/y.webp' },
      ],
      (current, total, _bytes, _totalBytes) => {
        progressCalls.push({ current, total });
      }
    );

    // At least one progress callback should fire
    expect(progressCalls.length).toBeGreaterThan(0);
    // Total should always be 2
    expect(progressCalls[progressCalls.length - 1].total).toBe(2);
  });

  it('should handle non-200 status as a failure and retry', async () => {
    // Non-200 throws inside downloadAndCacheAsset, triggering retry
    mockDownloadAsync
      .mockImplementationOnce(() => failedDownload(500))
      .mockImplementationOnce(() => failedDownload(500))
      .mockImplementationOnce(() => failedDownload(500));

    const result = await AssetDownloadUtils.downloadAssetsInBatches(
      [{ path: 'server-error.webp', signedUrl: 'https://example.com/err.webp' }]
    );

    expect(result.downloaded).toBe(0);
    expect(result.failed).toBe(1);
    expect(mockDownloadAsync).toHaveBeenCalledTimes(3);
  }, 15000);

  it('should download multiple assets successfully', async () => {
    mockDownloadAsync.mockImplementation(() => successDownload(0));

    const result = await AssetDownloadUtils.downloadAssetsInBatches([
      { path: 'p.webp', signedUrl: 'https://example.com/p.webp' },
      { path: 'q.webp', signedUrl: 'https://example.com/q.webp' },
    ]);

    expect(result.downloaded).toBe(2);
    expect(result.failed).toBe(0);
    // bytesDownloaded is best-effort (dynamic import for size tracking)
    expect(result.bytesDownloaded).toBeGreaterThanOrEqual(0);
  });
});
