package com.app.health;

import com.app.config.GcsConfig.GcsProperties;
import com.google.cloud.storage.Bucket;
import com.google.cloud.storage.Storage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GcsHealthIndicatorTest {

    private static final String BUCKET_NAME = "test-bucket";

    @Mock
    private Storage storage;

    @Mock
    private Bucket bucket;

    private GcsProperties gcsProperties;
    private GcsHealthIndicator healthIndicator;

    @BeforeEach
    void setUp() {
        gcsProperties = new GcsProperties(BUCKET_NAME, 60, null, null);
        healthIndicator = new GcsHealthIndicator(storage, gcsProperties);
    }

    @Test
    void health_WhenBucketExists_ReturnsUp() {
        // Arrange
        when(storage.get(BUCKET_NAME)).thenReturn(bucket);

        // Act
        Health health = healthIndicator.health();

        // Assert
        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails()).containsKey("responseTime");
        assertThat(health.getDetails()).containsEntry("service", "gcs");
        assertThat(health.getDetails()).containsEntry("bucket", BUCKET_NAME);
    }

    @Test
    void health_WhenBucketNotFound_ReturnsDown() {
        // Arrange
        when(storage.get(BUCKET_NAME)).thenReturn(null);

        // Act
        Health health = healthIndicator.health();

        // Assert
        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
        assertThat(health.getDetails()).containsKey("responseTime");
        assertThat(health.getDetails()).containsEntry("service", "gcs");
        assertThat(health.getDetails()).containsEntry("bucket", BUCKET_NAME);
        assertThat(health.getDetails()).containsEntry("error", "Bucket not found");
    }

    @Test
    void health_WhenStorageThrowsException_ReturnsDown() {
        // Arrange
        when(storage.get(BUCKET_NAME)).thenThrow(new RuntimeException("Connection failed"));

        // Act
        Health health = healthIndicator.health();

        // Assert
        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
        assertThat(health.getDetails()).containsKey("responseTime");
        assertThat(health.getDetails()).containsEntry("service", "gcs");
        assertThat(health.getDetails()).containsEntry("error", "Connection failed");
    }

    @Test
    void health_WhenStorageTimesOut_ReturnsDownWithError() {
        // Arrange
        when(storage.get(BUCKET_NAME)).thenThrow(new RuntimeException("Timeout"));

        // Act
        Health health = healthIndicator.health();

        // Assert
        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
        assertThat(health.getDetails()).containsKey("error");
    }
}

