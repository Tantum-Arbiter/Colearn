package com.app.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.NoCredentials;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Google Cloud Storage Configuration for Asset Delivery.
 * Supports both emulator mode (for testing) and production mode.
 */
@Configuration
public class GcsConfig {

    private static final Logger logger = LoggerFactory.getLogger(GcsConfig.class);

    @Value("${gcs.project-id:#{null}}")
    private String projectId;

    @Value("${gcs.bucket:colearnwithfreya-assets}")
    private String bucketName;

    @Value("${gcs.cdn-host:#{null}}")
    private String cdnHost;

    @Value("${gcs.emulator-host:#{null}}")
    private String emulatorHost;

    @Value("${gcs.signed-url-duration-minutes:60}")
    private int signedUrlDurationMinutes;

    @Value("${gcs.service-account-key:#{null}}")
    private String serviceAccountKey;

    @Bean
    public Storage storage() {
        // Check for emulator host from environment variable first (Docker), then config
        String emulatorUrl = System.getenv("GCS_EMULATOR_HOST");
        if (emulatorUrl == null || emulatorUrl.isEmpty()) {
            emulatorUrl = emulatorHost;
        }

        if (emulatorUrl != null && !emulatorUrl.isEmpty()) {
            return createEmulatorStorage(emulatorUrl);
        } else {
            return createProductionStorage();
        }
    }

    private Storage createEmulatorStorage(String emulatorUrl) {
        logger.info("Using GCS emulator at {}", emulatorUrl);

        String effectiveProjectId = projectId != null ? projectId : "test-project";

        return StorageOptions.newBuilder()
                .setHost(emulatorUrl)
                .setProjectId(effectiveProjectId)
                .setCredentials(NoCredentials.getInstance())
                .build()
                .getService();
    }

    private Storage createProductionStorage() {
        logger.info("Creating production GCS client for project: {}", projectId);

        try {
            StorageOptions.Builder builder = StorageOptions.newBuilder();

            if (projectId != null && !projectId.isEmpty()) {
                builder.setProjectId(projectId);
            }

            if (serviceAccountKey != null && !serviceAccountKey.trim().isEmpty()) {
                logger.info("Using service account key from configuration");
                GoogleCredentials credentials = GoogleCredentials.fromStream(
                        new ByteArrayInputStream(serviceAccountKey.getBytes(StandardCharsets.UTF_8))
                );
                builder.setCredentials(credentials);
            } else {
                logger.info("Using Application Default Credentials for GCS");
            }

            return builder.build().getService();
        } catch (IOException e) {
            logger.error("Failed to initialize GCS credentials", e);
            throw new RuntimeException("Failed to initialize GCS client", e);
        }
    }

    @Bean
    public GcsProperties gcsProperties() {
        String effectiveBucket = System.getenv("GCS_BUCKET");
        if (effectiveBucket == null || effectiveBucket.isEmpty()) {
            effectiveBucket = bucketName;
        }
        String effectiveCdnHost = System.getenv("GCS_CDN_HOST");
        if (effectiveCdnHost == null || effectiveCdnHost.isEmpty()) {
            effectiveCdnHost = cdnHost;
        }
        return new GcsProperties(effectiveBucket, signedUrlDurationMinutes, effectiveCdnHost);
    }

    public record GcsProperties(String bucketName, int signedUrlDurationMinutes, String cdnHost) {
        public boolean hasCdnHost() {
            return cdnHost != null && !cdnHost.isEmpty();
        }
    }
}

