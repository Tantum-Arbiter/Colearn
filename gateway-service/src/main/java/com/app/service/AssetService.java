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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Service
public class AssetService {

    private static final Logger logger = LoggerFactory.getLogger(AssetService.class);

    // Allowed path prefixes for asset paths
    private static final Set<String> ALLOWED_PREFIXES = Set.of(
            "stories/",
            "audio/",
            "images/",
            "thumbnails/"
    );

    private final Storage storage;
    private final GcsProperties gcsProperties;
    private final UrlGenerationStrategy urlStrategy;
    private final AssetVersionRepository assetVersionRepository;
    private final ApplicationMetricsService metricsService;

    // Dedicated executor for async URL generation to avoid blocking ForkJoinPool
    private final Executor urlGenerationExecutor;

    @Autowired
    public AssetService(Storage storage, GcsProperties gcsProperties,
                        UrlGenerationStrategy urlStrategy,
                        AssetVersionRepository assetVersionRepository,
                        ApplicationMetricsService metricsService) {
        this.storage = storage;
        this.gcsProperties = gcsProperties;
        this.urlStrategy = urlStrategy;
        this.assetVersionRepository = assetVersionRepository;
        this.metricsService = metricsService;
        this.urlGenerationExecutor = Executors.newFixedThreadPool(
                Runtime.getRuntime().availableProcessors(),
                r -> {
                    Thread t = new Thread(r, "url-generation-worker");
                    t.setDaemon(true);
                    return t;
                }
        );

        logger.info("Asset service initialized with URL strategy: {}", urlStrategy.getStrategyName());
    }

    /**
     * Validate an asset path for security.
     * Checks for path traversal attacks and ensures path is within allowed prefixes.
     *
     * @param assetPath the path to validate
     * @throws InvalidAssetPathException if the path is invalid or potentially malicious
     */
    public void validateAssetPath(String assetPath) {
        if (assetPath == null || assetPath.isBlank()) {
            throw new InvalidAssetPathException(assetPath, "Path cannot be null or empty");
        }

        // Check for path traversal sequences
        if (assetPath.contains("..")) {
            throw new InvalidAssetPathException(assetPath, "Path traversal sequences are not allowed");
        }

        // Check for absolute paths
        if (assetPath.startsWith("/")) {
            throw new InvalidAssetPathException(assetPath, "Absolute paths are not allowed");
        }

        // Check for null bytes (could be used to bypass validation)
        // Check both actual null bytes and URL-encoded null bytes that may not have been decoded
        if (assetPath.contains("\0") || assetPath.contains("%00") || assetPath.contains("%2500")) {
            throw new InvalidAssetPathException(assetPath, "Null bytes are not allowed in path");
        }

        // Ensure path starts with an allowed prefix
        boolean hasValidPrefix = ALLOWED_PREFIXES.stream()
                .anyMatch(assetPath::startsWith);
        if (!hasValidPrefix) {
            throw new InvalidAssetPathException(assetPath,
                    "Path must start with one of: " + String.join(", ", ALLOWED_PREFIXES));
        }
    }

    /**
     * Generate a URL for accessing an asset.
     * Uses the injected UrlGenerationStrategy based on active Spring profile:
     * - 'emulator' profile: returns direct URL to fake-gcs-server
     * - 'cdn' profile: returns Cloudflare-proxied URL (caches at edge)
     * - default: returns V4 signed URL directly to GCS
     *
     * @param assetPath the path to the asset (must start with allowed prefix)
     * @return the URL for accessing the asset
     * @throws InvalidAssetPathException if the path is invalid
     * @throws AssetUrlGenerationException if URL generation fails
     */
    public String generateSignedUrl(String assetPath) {
        // Validate path before generating URL
        validateAssetPath(assetPath);

        long startTime = System.currentTimeMillis();
        try {
            String url = urlStrategy.generateUrl(assetPath, gcsProperties.bucketName());

            long duration = System.currentTimeMillis() - startTime;
            metricsService.recordGcsOperation("signUrl", true, duration);
            logger.debug("Generated URL for asset: {} using strategy: {}", assetPath, urlStrategy.getStrategyName());

            return url;
        } catch (InvalidAssetPathException e) {
            // Re-throw validation exceptions as-is
            throw e;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            metricsService.recordGcsOperation("signUrl", false, duration);
            logger.error("Error generating URL for asset: {}", assetPath, e);
            throw new AssetUrlGenerationException(assetPath, e);
        }
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
     * Uses a dedicated thread pool for URL generation to avoid blocking the common ForkJoin pool.
     */
    public CompletableFuture<List<AssetInfo>> getAssetsToSync(Map<String, String> clientChecksums) {
        logger.debug("Getting assets to sync. Client has {} assets", clientChecksums.size());

        return assetVersionRepository.getCurrent()
                .thenApplyAsync(versionOpt -> {
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
                }, urlGenerationExecutor);
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

