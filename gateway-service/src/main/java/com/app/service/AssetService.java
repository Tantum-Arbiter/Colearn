package com.app.service;

import com.app.config.GcsConfig.GcsProperties;
import com.app.dto.AssetSyncResponse.AssetInfo;
import com.app.model.AssetVersion;
import com.app.repository.AssetVersionRepository;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class AssetService {

    private static final Logger logger = LoggerFactory.getLogger(AssetService.class);

    private final Storage storage;
    private final GcsProperties gcsProperties;
    private final AssetVersionRepository assetVersionRepository;
    private final ApplicationMetricsService metricsService;
    private final String emulatorHost;

    @Autowired
    public AssetService(Storage storage, GcsProperties gcsProperties,
                        AssetVersionRepository assetVersionRepository,
                        ApplicationMetricsService metricsService) {
        this.storage = storage;
        this.gcsProperties = gcsProperties;
        this.assetVersionRepository = assetVersionRepository;
        this.metricsService = metricsService;

        String envHost = System.getenv("GCS_EMULATOR_HOST");
        this.emulatorHost = (envHost != null && !envHost.isEmpty()) ? envHost : null;
        if (this.emulatorHost != null) {
            logger.info("Asset service using GCS emulator at: {}", this.emulatorHost);
        }
    }

    /**
     * Generate a URL for accessing an asset.
     * Priority: Emulator URL > CDN URL > GCS Signed URL
     * - Emulator mode: returns direct URL to fake-gcs-server
     * - CDN mode: returns Cloudflare-proxied URL (caches at edge)
     * - Fallback: returns V4 signed URL directly to GCS
     */
    public String generateSignedUrl(String assetPath) {
        long startTime = System.currentTimeMillis();
        try {
            String url;
            if (emulatorHost != null) {
                url = generateEmulatorUrl(assetPath);
            } else if (gcsProperties.hasCdnHost()) {
                url = generateCdnUrl(assetPath);
            } else {
                url = generateProductionSignedUrl(assetPath);
            }

            long duration = System.currentTimeMillis() - startTime;
            metricsService.recordGcsOperation("signUrl", true, duration);
            logger.debug("Generated URL for asset: {}", assetPath);

            return url;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            metricsService.recordGcsOperation("signUrl", false, duration);
            logger.error("Error generating URL for asset: {}", assetPath, e);
            throw new RuntimeException("Failed to generate signed URL", e);
        }
    }

    private String generateEmulatorUrl(String assetPath) {
        // fake-gcs-server with -public-host uses the simple URL format:
        // http://{host}/{bucket}/{object}
        String url = String.format("%s/%s/%s",
                emulatorHost, gcsProperties.bucketName(), assetPath);
        logger.debug("Generated emulator URL for path '{}': {}", assetPath, url);
        return url;
    }

    private String generateCdnUrl(String assetPath) {
        // Cloudflare CDN URL format:
        // https://{cdn-host}/{bucket}/{path}
        // Cloudflare caches at edge, reducing GCS egress costs
        String url = String.format("https://%s/%s/%s",
                gcsProperties.cdnHost(), gcsProperties.bucketName(), assetPath);
        logger.debug("Generated CDN URL for path '{}': {}", assetPath, url);
        return url;
    }

    private String generateProductionSignedUrl(String assetPath) {
        BlobInfo blobInfo = BlobInfo.newBuilder(
                BlobId.of(gcsProperties.bucketName(), assetPath)
        ).build();

        URL signedUrl = storage.signUrl(
                blobInfo,
                gcsProperties.signedUrlDurationMinutes(),
                TimeUnit.MINUTES,
                Storage.SignUrlOption.withV4Signature()
        );

        return signedUrl.toString();
    }

    /**
     * Get current asset version for delta-sync.
     */
    public CompletableFuture<AssetVersion> getCurrentAssetVersion() {
        logger.debug("Getting current asset version");
        return assetVersionRepository.getCurrent()
                .thenApply(opt -> opt.orElse(new AssetVersion()));
    }

    /**
     * Get assets that need to be synced based on client's checksums.
     * Returns signed URLs for changed or new assets.
     */
    public CompletableFuture<List<AssetInfo>> getAssetsToSync(Map<String, String> clientChecksums) {
        logger.debug("Getting assets to sync. Client has {} assets", clientChecksums.size());

        return assetVersionRepository.getCurrent()
                .thenApply(versionOpt -> {
                    if (versionOpt.isEmpty()) {
                        logger.debug("No asset version found, returning empty list");
                        return List.<AssetInfo>of();
                    }

                    AssetVersion serverVersion = versionOpt.get();
                    Map<String, String> serverChecksums = serverVersion.getAssetChecksums();

                    // Find assets that are new or have changed
                    return serverChecksums.entrySet().stream()
                            .filter(entry -> {
                                String assetPath = entry.getKey();
                                String serverChecksum = entry.getValue();
                                String clientChecksum = clientChecksums.get(assetPath);
                                return clientChecksum == null || !clientChecksum.equals(serverChecksum);
                            })
                            .map(entry -> {
                                String assetPath = entry.getKey();
                                String checksum = entry.getValue();
                                String signedUrl = generateSignedUrl(assetPath);
                                return new AssetInfo(assetPath, signedUrl, checksum);
                            })
                            .collect(Collectors.toList());
                });
    }

    /**
     * Check if an asset exists in the bucket.
     */
    public boolean assetExists(String assetPath) {
        try {
            BlobId blobId = BlobId.of(gcsProperties.bucketName(), assetPath);
            return storage.get(blobId) != null;
        } catch (Exception e) {
            logger.error("Error checking asset existence: {}", assetPath, e);
            return false;
        }
    }

    public String getBucketName() {
        return gcsProperties.bucketName();
    }
}

