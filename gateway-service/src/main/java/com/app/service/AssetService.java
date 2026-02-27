package com.app.service;

import com.app.config.GcsConfig.GcsProperties;
import com.app.config.UrlGenerationStrategy;
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

import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@Service
public class AssetService {

    private static final Logger logger = LoggerFactory.getLogger(AssetService.class);

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

    public void validateAssetPath(String assetPath) {
        if (assetPath == null || assetPath.isBlank()) {
            throw new InvalidAssetPathException(assetPath, "Path cannot be null or empty");
        }

        if (assetPath.contains("..")) {
            throw new InvalidAssetPathException(assetPath, "Path traversal sequences are not allowed");
        }

        if (assetPath.startsWith("/")) {
            throw new InvalidAssetPathException(assetPath, "Absolute paths are not allowed");
        }

        if (assetPath.contains("\0") || assetPath.contains("%00") || assetPath.contains("%2500")) {
            throw new InvalidAssetPathException(assetPath, "Null bytes are not allowed in path");
        }

        boolean hasValidPrefix = ALLOWED_PREFIXES.stream()
                .anyMatch(assetPath::startsWith);
        if (!hasValidPrefix) {
            throw new InvalidAssetPathException(assetPath,
                    "Path must start with one of: " + String.join(", ", ALLOWED_PREFIXES));
        }
    }

    public String generateSignedUrl(String assetPath) {
        validateAssetPath(assetPath);

        long startTime = System.currentTimeMillis();
        try {
            String url = urlStrategy.generateUrl(assetPath, gcsProperties.bucketName());

            long duration = System.currentTimeMillis() - startTime;
            metricsService.recordGcsOperation("signUrl", true, duration);
            logger.debug("Generated URL for asset: {} using strategy: {}", assetPath, urlStrategy.getStrategyName());

            return url;
        } catch (InvalidAssetPathException e) {
            throw e;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            metricsService.recordGcsOperation("signUrl", false, duration);
            logger.error("Error generating URL for asset: {}", assetPath, e);
            throw new AssetUrlGenerationException(assetPath, e);
        }
    }

    public CompletableFuture<AssetVersion> getCurrentAssetVersion() {
        logger.debug("Getting current asset version");
        return assetVersionRepository.getCurrent()
                .thenApply(opt -> opt.orElse(new AssetVersion()));
    }

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

