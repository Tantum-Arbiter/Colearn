package com.app.health;

import com.app.config.GcsConfig.GcsProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for GcsHealthIndicator.
 *
 * Note: Since GcsHealthIndicator now uses HTTP to check GCS connectivity,
 * we test the actual behavior by using real network calls to storage.googleapis.com.
 * This provides more realistic tests than mocking the URL connection.
 */
class GcsHealthIndicatorTest {

    private static final String VALID_BUCKET_NAME = "colearnwithfreya-assets";
    private static final String INVALID_BUCKET_NAME = "nonexistent-bucket-12345";

    private GcsProperties gcsProperties;
    private GcsHealthIndicator healthIndicator;

    @BeforeEach
    void setUp() {
        gcsProperties = new GcsProperties(VALID_BUCKET_NAME, 60, null, null);
        healthIndicator = new GcsHealthIndicator(gcsProperties);
    }

    @Test
    void health_WhenGcsReachable_ReturnsUp() {
        // Act - this will make a real HTTP call to storage.googleapis.com
        Health health = healthIndicator.health();

        // Assert - any response from GCS means UP (even 403/404)
        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails()).containsKey("responseTime");
        assertThat(health.getDetails()).containsEntry("service", "gcs");
        assertThat(health.getDetails()).containsEntry("bucket", VALID_BUCKET_NAME);
        assertThat(health.getDetails()).containsKey("statusCode");
    }

    @Test
    void health_WhenBucketNotFound_StillReturnsUp() {
        // Arrange - use a bucket that likely doesn't exist
        gcsProperties = new GcsProperties(INVALID_BUCKET_NAME, 60, null, null);
        healthIndicator = new GcsHealthIndicator(gcsProperties);

        // Act
        Health health = healthIndicator.health();

        // Assert - 404 is still UP because GCS is reachable
        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails()).containsKey("statusCode");
        assertThat(health.getDetails()).containsEntry("bucket", INVALID_BUCKET_NAME);
    }

    @Test
    void health_IncludesResponseTimeDetail() {
        // Act
        Health health = healthIndicator.health();

        // Assert
        assertThat(health.getDetails()).containsKey("responseTime");
        String responseTime = (String) health.getDetails().get("responseTime");
        assertThat(responseTime).endsWith("ms");
    }

    @Test
    void health_IncludesServiceDetail() {
        // Act
        Health health = healthIndicator.health();

        // Assert
        assertThat(health.getDetails()).containsEntry("service", "gcs");
    }
}

