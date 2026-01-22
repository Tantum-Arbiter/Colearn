package com.app.health;

import com.google.cloud.storage.Bucket;
import com.google.cloud.storage.Storage;
import com.app.config.GcsConfig.GcsProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * Health indicator for Google Cloud Storage connectivity.
 * Checks if the configured bucket is accessible.
 */
@Component("gcs")
public class GcsHealthIndicator implements HealthIndicator {

    private static final Logger logger = LoggerFactory.getLogger(GcsHealthIndicator.class);

    private final Storage storage;
    private final GcsProperties gcsProperties;

    public GcsHealthIndicator(Storage storage, GcsProperties gcsProperties) {
        this.storage = storage;
        this.gcsProperties = gcsProperties;
    }

    @Override
    public Health health() {
        long startTime = System.currentTimeMillis();
        String bucketName = gcsProperties.bucketName();

        try {
            // Check if the bucket exists and is accessible
            Bucket bucket = storage.get(bucketName);

            if (bucket != null) {
                long duration = System.currentTimeMillis() - startTime;
                logger.debug("GCS health check passed for bucket '{}' in {}ms", bucketName, duration);

                return Health.up()
                        .withDetail("responseTime", duration + "ms")
                        .withDetail("service", "gcs")
                        .withDetail("bucket", bucketName)
                        .build();
            } else {
                long duration = System.currentTimeMillis() - startTime;
                logger.warn("GCS health check failed: bucket '{}' not found", bucketName);

                return Health.down()
                        .withDetail("responseTime", duration + "ms")
                        .withDetail("service", "gcs")
                        .withDetail("bucket", bucketName)
                        .withDetail("error", "Bucket not found")
                        .build();
            }

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            logger.warn("GCS health check failed for bucket '{}' after {}ms: {}",
                    bucketName, duration, e.getMessage());

            return Health.down()
                    .withDetail("responseTime", duration + "ms")
                    .withDetail("service", "gcs")
                    .withDetail("bucket", bucketName)
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}

