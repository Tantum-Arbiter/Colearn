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
import org.springframework.context.annotation.Profile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Configuration
public class GcsConfig {

    private static final Logger logger = LoggerFactory.getLogger(GcsConfig.class);

    @Value("${gcs.project-id:test-project}")
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
    @Profile("emulator")
    public Storage emulatorStorage() {
        logger.info("Using GCS emulator at {}", emulatorHost);

        return StorageOptions.newBuilder()
                .setHost(emulatorHost)
                .setProjectId(projectId)
                .setCredentials(NoCredentials.getInstance())
                .build()
                .getService();
    }

    @Bean
    @Profile("!emulator")
    public Storage productionStorage() {
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
        logger.info("GCS configuration: bucket={}, cdnHost={}, emulatorHost={}",
                bucketName, cdnHost, emulatorHost);
        return new GcsProperties(bucketName, signedUrlDurationMinutes, cdnHost, emulatorHost);
    }

    public record GcsProperties(String bucketName, int signedUrlDurationMinutes, String cdnHost, String emulatorHost) {
        public boolean hasCdnHost() {
            return cdnHost != null && !cdnHost.isEmpty();
        }

        public boolean hasEmulatorHost() {
            return emulatorHost != null && !emulatorHost.isEmpty();
        }
    }
}

