package com.app.service;

import com.app.config.GcsConfig.GcsProperties;
import com.app.dto.AssetSyncResponse.AssetInfo;
import com.app.model.AssetVersion;
import com.app.repository.AssetVersionRepository;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.net.URL;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssetServiceTest {

    @Mock
    private Storage storage;

    @Mock
    private AssetVersionRepository assetVersionRepository;

    @Mock
    private ApplicationMetricsService metricsService;

    private AssetService assetService;
    private GcsProperties gcsProperties;
    private AssetVersion testAssetVersion;

    @BeforeEach
    void setUp() {
        gcsProperties = new GcsProperties("test-bucket", 60);
        assetService = new AssetService(storage, gcsProperties, assetVersionRepository, metricsService);

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
    void generateSignedUrl_ProductionMode_CallsStorageWithCorrectParameters() throws Exception {
        String assetPath = "stories/story-1/cover.webp";
        URL mockUrl = new URL("https://storage.googleapis.com/test-bucket/stories/story-1/cover.webp?X-Goog-Signature=abc");
        
        when(storage.signUrl(any(BlobInfo.class), anyLong(), any(TimeUnit.class), any()))
                .thenReturn(mockUrl);

        String result = assetService.generateSignedUrl(assetPath);

        ArgumentCaptor<BlobInfo> blobInfoCaptor = ArgumentCaptor.forClass(BlobInfo.class);
        ArgumentCaptor<Long> durationCaptor = ArgumentCaptor.forClass(Long.class);
        ArgumentCaptor<TimeUnit> timeUnitCaptor = ArgumentCaptor.forClass(TimeUnit.class);

        verify(storage).signUrl(blobInfoCaptor.capture(), durationCaptor.capture(), 
                               timeUnitCaptor.capture(), any(Storage.SignUrlOption.class));

        BlobInfo capturedBlobInfo = blobInfoCaptor.getValue();
        assertEquals("test-bucket", capturedBlobInfo.getBucket());
        assertEquals(assetPath, capturedBlobInfo.getName());
        assertEquals(60L, durationCaptor.getValue());
        assertEquals(TimeUnit.MINUTES, timeUnitCaptor.getValue());
        assertEquals(mockUrl.toString(), result);
        verify(metricsService).recordGcsOperation("signUrl", true, anyLong());
    }

    @Test
    void generateSignedUrl_WhenStorageThrows_RecordsFailureMetric() {
        String assetPath = "stories/story-1/cover.webp";
        when(storage.signUrl(any(), anyLong(), any(), any()))
                .thenThrow(new RuntimeException("GCS error"));

        assertThrows(RuntimeException.class, () -> assetService.generateSignedUrl(assetPath));
        verify(metricsService).recordGcsOperation("signUrl", false, anyLong());
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
        
        URL mockUrl = new URL("https://storage.googleapis.com/signed-url");
        when(storage.signUrl(any(), anyLong(), any(), any())).thenReturn(mockUrl);

        Map<String, String> clientChecksums = new HashMap<>();
        List<AssetInfo> result = assetService.getAssetsToSync(clientChecksums).get();

        assertEquals(3, result.size());
        verify(storage, times(3)).signUrl(any(), anyLong(), any(), any());
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
        verify(storage, never()).signUrl(any(), anyLong(), any(), any());
    }

    @Test
    void getAssetsToSync_OutdatedChecksums_ReturnsChangedAssets() throws Exception {
        when(assetVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testAssetVersion)));
        
        URL mockUrl = new URL("https://storage.googleapis.com/signed-url");
        when(storage.signUrl(any(), anyLong(), any(), any())).thenReturn(mockUrl);

        Map<String, String> clientChecksums = new HashMap<>();
        clientChecksums.put("stories/story-1/cover.webp", "outdated-checksum");
        clientChecksums.put("stories/story-1/page-1/background.webp", "def456");

        List<AssetInfo> result = assetService.getAssetsToSync(clientChecksums).get();

        assertEquals(2, result.size());
        verify(storage, times(2)).signUrl(any(), anyLong(), any(), any());
    }

    @Test
    void getAssetsToSync_NoAssetVersion_ReturnsEmptyList() throws Exception {
        when(assetVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        List<AssetInfo> result = assetService.getAssetsToSync(new HashMap<>()).get();

        assertEquals(0, result.size());
        verify(storage, never()).signUrl(any(), anyLong(), any(), any());
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

