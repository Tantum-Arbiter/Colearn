package com.app.service;

import com.app.config.GcsConfig.GcsProperties;
import com.app.config.UrlGenerationStrategy;
import com.app.dto.AssetSyncResponse.AssetInfo;
import com.app.exception.AssetUrlGenerationException;
import com.app.exception.InvalidAssetPathException;
import com.app.model.AssetVersion;
import com.app.repository.AssetVersionRepository;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.Storage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssetServiceTest {

    @Mock
    private Storage storage;

    @Mock
    private UrlGenerationStrategy urlStrategy;

    @Mock
    private AssetVersionRepository assetVersionRepository;

    @Mock
    private ApplicationMetricsService metricsService;

    private AssetService assetService;
    private GcsProperties gcsProperties;
    private AssetVersion testAssetVersion;

    @BeforeEach
    void setUp() {
        // GcsProperties(bucketName, signedUrlDurationMinutes, cdnHost, emulatorHost)
        gcsProperties = new GcsProperties("test-bucket", 60, null, null);

        // Mock the strategy name for logging
        when(urlStrategy.getStrategyName()).thenReturn("mock");

        assetService = new AssetService(storage, gcsProperties, urlStrategy, assetVersionRepository, metricsService);

        testAssetVersion = new AssetVersion();
        testAssetVersion.setId("current");
        testAssetVersion.setVersion(1);
        testAssetVersion.setLastUpdated(Instant.now());
        Map<String, String> checksums = new HashMap<>();
        checksums.put("stories/story-1/cover.webp", "abc123");
        checksums.put("stories/story-1/page-1/background.webp", "def456");
        checksums.put("stories/story-2/cover.webp", "ghi789");
        testAssetVersion.setAssetChecksums(checksums);
        testAssetVersion.setTotalAssets(3);
    }

    @Test
    void generateSignedUrl_CallsUrlStrategy() {
        String assetPath = "stories/story-1/cover.webp";
        String mockUrl = "https://storage.googleapis.com/test-bucket/stories/story-1/cover.webp?X-Goog-Signature=abc";

        when(urlStrategy.generateUrl(assetPath, "test-bucket")).thenReturn(mockUrl);

        String result = assetService.generateSignedUrl(assetPath);

        // Verify urlStrategy.generateUrl was called with correct parameters
        verify(urlStrategy).generateUrl(assetPath, "test-bucket");
        assertEquals(mockUrl, result);
        verify(metricsService).recordGcsOperation(eq("signUrl"), eq(true), anyLong());
    }

    @Test
    void generateSignedUrl_WhenStrategyThrows_RecordsFailureMetric() {
        String assetPath = "stories/story-1/cover.webp";
        when(urlStrategy.generateUrl(anyString(), anyString()))
                .thenThrow(new RuntimeException("GCS error"));

        assertThrows(AssetUrlGenerationException.class, () -> assetService.generateSignedUrl(assetPath));
        verify(metricsService).recordGcsOperation(eq("signUrl"), eq(false), anyLong());
    }

    @Test
    void generateSignedUrl_WithPathTraversal_ThrowsInvalidAssetPathException() {
        String maliciousPath = "stories/../../../etc/passwd";

        InvalidAssetPathException exception = assertThrows(InvalidAssetPathException.class,
                () -> assetService.generateSignedUrl(maliciousPath));

        assertTrue(exception.getMessage().contains("Path traversal"));
        verify(urlStrategy, never()).generateUrl(anyString(), anyString());
    }

    @Test
    void generateSignedUrl_WithAbsolutePath_ThrowsInvalidAssetPathException() {
        String absolutePath = "/stories/story-1/cover.webp";

        InvalidAssetPathException exception = assertThrows(InvalidAssetPathException.class,
                () -> assetService.generateSignedUrl(absolutePath));

        assertTrue(exception.getMessage().contains("Absolute paths"));
        verify(urlStrategy, never()).generateUrl(anyString(), anyString());
    }

    @Test
    void generateSignedUrl_WithInvalidPrefix_ThrowsInvalidAssetPathException() {
        String invalidPath = "secrets/api-key.txt";

        InvalidAssetPathException exception = assertThrows(InvalidAssetPathException.class,
                () -> assetService.generateSignedUrl(invalidPath));

        assertTrue(exception.getMessage().contains("must start with one of"));
        verify(urlStrategy, never()).generateUrl(anyString(), anyString());
    }

    @Test
    void generateSignedUrl_WithNullPath_ThrowsInvalidAssetPathException() {
        assertThrows(InvalidAssetPathException.class,
                () -> assetService.generateSignedUrl(null));
        verify(urlStrategy, never()).generateUrl(anyString(), anyString());
    }

    @Test
    void generateSignedUrl_WithEmptyPath_ThrowsInvalidAssetPathException() {
        assertThrows(InvalidAssetPathException.class,
                () -> assetService.generateSignedUrl(""));
        verify(urlStrategy, never()).generateUrl(anyString(), anyString());
    }

    @Test
    void getCurrentAssetVersion_ReturnsVersionFromRepository() throws Exception {
        when(assetVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testAssetVersion)));

        AssetVersion result = assetService.getCurrentAssetVersion().get();

        assertEquals("current", result.getId());
        assertEquals(1, result.getVersion());
        assertEquals(3, result.getTotalAssets());
        verify(assetVersionRepository).getCurrent();
    }

    @Test
    void getCurrentAssetVersion_WhenEmpty_ReturnsDefaultVersion() throws Exception {
        when(assetVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        AssetVersion result = assetService.getCurrentAssetVersion().get();

        assertNotNull(result);
        assertEquals("current", result.getId());
        assertEquals(1, result.getVersion());
    }

    @Test
    void getAssetsToSync_NoClientChecksums_ReturnsAllAssets() throws Exception {
        when(assetVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testAssetVersion)));

        when(urlStrategy.generateUrl(anyString(), eq("test-bucket")))
                .thenReturn("https://storage.googleapis.com/signed-url");

        Map<String, String> clientChecksums = new HashMap<>();
        List<AssetInfo> result = assetService.getAssetsToSync(clientChecksums).get();

        assertEquals(3, result.size());
        verify(urlStrategy, times(3)).generateUrl(anyString(), eq("test-bucket"));
    }

    @Test
    void getAssetsToSync_MatchingChecksums_ReturnsEmpty() throws Exception {
        when(assetVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testAssetVersion)));

        Map<String, String> clientChecksums = new HashMap<>();
        clientChecksums.put("stories/story-1/cover.webp", "abc123");
        clientChecksums.put("stories/story-1/page-1/background.webp", "def456");
        clientChecksums.put("stories/story-2/cover.webp", "ghi789");

        List<AssetInfo> result = assetService.getAssetsToSync(clientChecksums).get();

        assertEquals(0, result.size());
        verify(urlStrategy, never()).generateUrl(anyString(), anyString());
    }

    @Test
    void getAssetsToSync_OutdatedChecksums_ReturnsChangedAssets() throws Exception {
        when(assetVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testAssetVersion)));

        when(urlStrategy.generateUrl(anyString(), eq("test-bucket")))
                .thenReturn("https://storage.googleapis.com/signed-url");

        Map<String, String> clientChecksums = new HashMap<>();
        clientChecksums.put("stories/story-1/cover.webp", "outdated-checksum");
        clientChecksums.put("stories/story-1/page-1/background.webp", "def456");

        List<AssetInfo> result = assetService.getAssetsToSync(clientChecksums).get();

        assertEquals(2, result.size());
        verify(urlStrategy, times(2)).generateUrl(anyString(), eq("test-bucket"));
    }

    @Test
    void getAssetsToSync_NoAssetVersion_ReturnsEmptyList() throws Exception {
        when(assetVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        List<AssetInfo> result = assetService.getAssetsToSync(new HashMap<>()).get();

        assertEquals(0, result.size());
        verify(urlStrategy, never()).generateUrl(anyString(), anyString());
    }

    @Test
    void assetExists_WhenBlobExists_ReturnsTrue() {
        when(storage.get(any(BlobId.class))).thenReturn(mock(com.google.cloud.storage.Blob.class));

        boolean exists = assetService.assetExists("stories/story-1/cover.webp");

        assertTrue(exists);
        verify(storage).get(BlobId.of("test-bucket", "stories/story-1/cover.webp"));
    }

    @Test
    void assetExists_WhenBlobNotExists_ReturnsFalse() {
        when(storage.get(any(BlobId.class))).thenReturn(null);

        boolean exists = assetService.assetExists("stories/nonexistent/cover.webp");

        assertFalse(exists);
    }

    @Test
    void assetExists_WhenStorageThrows_ReturnsFalse() {
        when(storage.get(any(BlobId.class))).thenThrow(new RuntimeException("GCS error"));

        boolean exists = assetService.assetExists("stories/story-1/cover.webp");

        assertFalse(exists);
    }

    @Test
    void getBucketName_ReturnsBucketFromProperties() {
        assertEquals("test-bucket", assetService.getBucketName());
    }
}

